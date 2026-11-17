import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { FIRESTORE_SERVICE_TOKEN } from '../../firebase/firebase.module';
import {
  IFirestoreService,
  ChatMessageDoc,
  LastSeenDoc,
} from '../../firebase/firestore.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpdateLastSeenDto } from './dto/update-last-seen.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly chatService: ChatService,
    @Inject(FIRESTORE_SERVICE_TOKEN)
    private readonly firestoreService: IFirestoreService,
  ) {}

  /**
   * API 2: Send Message
   * POST /chat/:chatId/message/send
   * Stores message in Firestore with timestamp.
   */
  async sendMessage(
    chatId: string,
    dto: SendMessageDto,
  ): Promise<ChatMessageDoc> {
    // Verify chat exists in relational DB
    await this.chatService.getChatById(chatId);

    // Verify sender is a member of the chat
    await this.chatService.verifyMembership(chatId, dto.senderId);

    const nowIso = new Date().toISOString();

    const createdDoc = await this.firestoreService.sendMessage(chatId, {
      chatId,
      senderId: dto.senderId,
      text: dto.text,
      timestamp: nowIso,
      readBy: [dto.senderId],
      readReceipts: {
        [dto.senderId]: { readAt: nowIso },
      },
    });

    return createdDoc;
  }

  /**
   * API 3: Get Messages
   * GET /chat/:chatId/messages?limit=50
   * Output: List of messages ordered by timestamp
   */
  async getMessages(
    chatId: string,
    limit: number = 50,
  ): Promise<ChatMessageDoc[]> {
    // Verify chat exists in relational DB
    await this.chatService.getChatById(chatId);

    return this.firestoreService.getMessages(chatId, limit);
  }

  /**
   * API 4: Mark Message Read
   * POST /chat/:chatId/message/:messageId/read
   * Input: userId
   * Update read receipt in Firestore
   */
  async markMessageRead(
    chatId: string,
    messageId: string,
    dto: MarkReadDto,
  ): Promise<{ messageId: string; userId: string; readAt: string }> {
    // Verify chat exists
    await this.chatService.getChatById(chatId);

    // Verify user is a member of the chat
    await this.chatService.verifyMembership(chatId, dto.userId);

    // Verify message exists
    const message = await this.firestoreService.getMessage(chatId, messageId);
    if (!message) {
      throw new NotFoundException(
        `Message '${messageId}' not found in chat '${chatId}'`,
      );
    }

    const receipt = await this.firestoreService.markMessageRead(
      chatId,
      messageId,
      dto.userId,
    );

    // Automatically update last seen up to this message
    await this.firestoreService.updateLastSeen(chatId, dto.userId, messageId);

    return receipt;
  }

  /**
   * API 5: Update Last Seen Message
   * POST /chat/:chatId/lastseen
   * Input: userId, messageId
   * Update last seen message per user in Firestore
   */
  async updateLastSeen(
    chatId: string,
    dto: UpdateLastSeenDto,
  ): Promise<LastSeenDoc> {
    // Verify chat exists in relational DB
    await this.chatService.getChatById(chatId);

    // Verify user is a member
    await this.chatService.verifyMembership(chatId, dto.userId);

    // Verify message exists in this chat
    const message = await this.firestoreService.getMessage(chatId, dto.messageId);
    if (!message) {
      throw new NotFoundException(
        `Message '${dto.messageId}' not found in chat '${chatId}'`,
      );
    }

    return this.firestoreService.updateLastSeen(
      chatId,
      dto.userId,
      dto.messageId,
    );
  }

  /**
   * Get Last Seen position of a user in a chat
   */
  async getLastSeen(
    chatId: string,
    userId: string,
  ): Promise<LastSeenDoc | null> {
    await this.chatService.getChatById(chatId);
    return this.firestoreService.getLastSeen(chatId, userId);
  }

  /**
   * Bonus: Edit Message
   * PATCH /chat/:chatId/message/:messageId
   */
  async editMessage(
    chatId: string,
    messageId: string,
    dto: EditMessageDto,
  ): Promise<ChatMessageDoc> {
    await this.chatService.getChatById(chatId);
    await this.chatService.verifyMembership(chatId, dto.senderId);

    return this.firestoreService.editMessage(
      chatId,
      messageId,
      dto.text,
      dto.senderId,
    );
  }

  /**
   * Bonus: Delete Message
   * DELETE /chat/:chatId/message/:messageId
   */
  async deleteMessage(
    chatId: string,
    messageId: string,
    dto: DeleteMessageDto,
  ): Promise<{ messageId: string; deleted: boolean }> {
    await this.chatService.getChatById(chatId);
    await this.chatService.verifyMembership(chatId, dto.senderId);

    return this.firestoreService.deleteMessage(
      chatId,
      messageId,
      dto.senderId,
    );
  }
}
