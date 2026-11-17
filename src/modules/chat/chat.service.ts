import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Chat, ChatMember, ChatMemberRole } from '../../database/entities';
import { UserService } from '../user/user.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';

export interface ChatSummaryResponse {
  chatId: string;
  isGroup: boolean;
  name?: string;
  createdBy?: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(ChatMember)
    private readonly memberRepository: Repository<ChatMember>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  /**
   * API 1: Create or Get 1:1 Chat
   * Returns existing chatId if one exists, otherwise creates a new 1:1 chat.
   */
  async createOrGetDirectChat(
    dto: CreateChatDto,
  ): Promise<{ chatId: string; isExisting: boolean }> {
    const { userAId, userBId } = dto;

    if (!userAId || !userBId) {
      throw new BadRequestException('userAId and userBId are both required');
    }

    if (userAId === userBId) {
      throw new BadRequestException('A 1:1 chat requires two distinct users');
    }

    // Ensure both users exist in relational DB
    await this.userService.ensureUsersExist([userAId, userBId]);

    // Check if 1:1 chat already exists between userA and userB
    const existing = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'm1', 'm1.userId = :userAId', { userAId })
      .innerJoin('chat.members', 'm2', 'm2.userId = :userBId', { userBId })
      .where('chat.isGroup = :isGroup', { isGroup: false })
      .getOne();

    if (existing) {
      return { chatId: existing.id, isExisting: true };
    }

    // Create new direct chat
    const newChat = this.chatRepository.create({
      isGroup: false,
      createdBy: userAId,
    });
    const savedChat = await this.chatRepository.save(newChat);

    const memberA = this.memberRepository.create({
      chatId: savedChat.id,
      userId: userAId,
      role: ChatMemberRole.MEMBER,
    });
    const memberB = this.memberRepository.create({
      chatId: savedChat.id,
      userId: userBId,
      role: ChatMemberRole.MEMBER,
    });

    await this.memberRepository.save([memberA, memberB]);

    return { chatId: savedChat.id, isExisting: false };
  }

  /**
   * Bonus: Create Group Chat
   */
  async createGroupChat(
    dto: CreateGroupChatDto,
  ): Promise<{ chatId: string; name: string; isGroup: boolean; memberIds: string[] }> {
    const allMemberIds = Array.from(new Set([dto.creatorId, ...dto.memberIds]));
    await this.userService.ensureUsersExist(allMemberIds);

    const chat = this.chatRepository.create({
      isGroup: true,
      name: dto.name,
      createdBy: dto.creatorId,
    });
    const savedChat = await this.chatRepository.save(chat);

    const members = allMemberIds.map((userId) =>
      this.memberRepository.create({
        chatId: savedChat.id,
        userId,
        role: userId === dto.creatorId ? ChatMemberRole.ADMIN : ChatMemberRole.MEMBER,
      }),
    );
    await this.memberRepository.save(members);

    return {
      chatId: savedChat.id,
      name: savedChat.name!,
      isGroup: true,
      memberIds: allMemberIds,
    };
  }

  /**
   * API 6: List User Chats
   * Returns list of chats with member IDs from relational DB.
   */
  async getUserChats(userId: string): Promise<ChatSummaryResponse[]> {
    // Ensure user exists
    await this.userService.findById(userId);

    // Find all memberships for user
    const userMemberships = await this.memberRepository.find({
      where: { userId },
      select: ['chatId'],
    });

    if (!userMemberships.length) {
      return [];
    }

    const chatIds = userMemberships.map((m) => m.chatId);

    // Load chats with their full member lists
    const chats = await this.chatRepository.find({
      where: { id: In(chatIds) },
      relations: ['members'],
      order: { updatedAt: 'DESC' },
    });

    return chats.map((chat) => ({
      chatId: chat.id,
      isGroup: chat.isGroup,
      name: chat.name,
      createdBy: chat.createdBy,
      memberIds: chat.members.map((m) => m.userId),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  }

  /**
   * Find a chat by ID with members
   */
  async getChatById(chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['members'],
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID '${chatId}' not found`);
    }
    return chat;
  }

  /**
   * Verify membership of a user in a chat
   */
  async verifyMembership(chatId: string, userId: string): Promise<ChatMember> {
    const membership = await this.memberRepository.findOne({
      where: { chatId, userId },
    });

    if (!membership) {
      throw new ForbiddenException(
        `User '${userId}' is not a member of chat '${chatId}'`,
      );
    }
    return membership;
  }

  /**
   * Bonus: Add members to group chat
   */
  async addMembers(chatId: string, dto: AddMembersDto) {
    const chat = await this.getChatById(chatId);
    if (!chat.isGroup) {
      throw new BadRequestException('Cannot add members to a 1:1 chat');
    }

    const adminMembership = await this.verifyMembership(chatId, dto.adminId);
    if (adminMembership.role !== ChatMemberRole.ADMIN) {
      throw new ForbiddenException('Only a group admin can add members');
    }

    await this.userService.ensureUsersExist(dto.userIds);

    const existingMembers = await this.memberRepository.find({
      where: { chatId, userId: In(dto.userIds) },
    });
    const existingSet = new Set(existingMembers.map((m) => m.userId));
    const toAdd = dto.userIds.filter((id) => !existingSet.has(id));

    if (toAdd.length) {
      const newEntities = toAdd.map((userId) =>
        this.memberRepository.create({
          chatId,
          userId,
          role: ChatMemberRole.MEMBER,
        }),
      );
      await this.memberRepository.save(newEntities);
    }

    return this.getChatById(chatId);
  }

  /**
   * Bonus: Remove member from group chat
   */
  async removeMember(chatId: string, dto: RemoveMemberDto) {
    const chat = await this.getChatById(chatId);
    if (!chat.isGroup) {
      throw new BadRequestException('Cannot remove members from a 1:1 chat');
    }

    const requester = await this.verifyMembership(chatId, dto.adminId);
    // User can remove themselves, or an admin can remove others
    if (dto.adminId !== dto.userId && requester.role !== ChatMemberRole.ADMIN) {
      throw new ForbiddenException('Only a group admin can remove other members');
    }

    const targetMembership = await this.memberRepository.findOne({
      where: { chatId, userId: dto.userId },
    });
    if (!targetMembership) {
      throw new NotFoundException(`User '${dto.userId}' is not a member of this chat`);
    }

    await this.memberRepository.remove(targetMembership);
    return { success: true, removedUserId: dto.userId };
  }

  /**
   * Bonus: Delete entire group chat
   */
  async deleteChat(chatId: string, adminId: string) {
    const chat = await this.getChatById(chatId);
    if (!chat.isGroup) {
      throw new BadRequestException('Only group chats can be deleted');
    }

    const adminMembership = await this.verifyMembership(chatId, adminId);
    if (adminMembership.role !== ChatMemberRole.ADMIN) {
      throw new ForbiddenException('Only a group admin can delete the group');
    }

    await this.chatRepository.remove(chat);
    return { success: true, deletedChatId: chatId };
  }

  /**
   * Bonus: Leave group chat (any member can exit)
   */
  async leaveChat(chatId: string, userId: string) {
    const chat = await this.getChatById(chatId);
    if (!chat.isGroup) {
      throw new BadRequestException('Cannot leave a 1:1 chat');
    }

    const membership = await this.verifyMembership(chatId, userId);
    await this.memberRepository.remove(membership);
    return { success: true, leftUserId: userId, chatId };
  }
}
