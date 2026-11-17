import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { DeleteChatDto } from './dto/delete-chat.dto';
import { LeaveChatDto } from './dto/leave-chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * API 1: Create or Get Chat
   * POST /chat/create
   * Input: userAId, userBId
   * Output: chatId
   */
  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or Get 1:1 Chat',
    description:
      'Creates a new 1:1 chat between two users, or returns existing chatId if already created.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat created or retrieved successfully',
    schema: {
      example: {
        chatId: '8f6b6417-6ff5-4e76-8802-cb40ea0c3098',
        isExisting: false,
      },
    },
  })
  async createOrGetChat(@Body() dto: CreateChatDto) {
    return this.chatService.createOrGetDirectChat(dto);
  }

  /**
   * Bonus API: Create Group Chat
   * POST /chat/group/create
   */
  @Post('group/create')
  @ApiOperation({
    summary: 'Create Group Chat',
    description: 'Creates a new group chat with a name, creator, and initial members.',
  })
  async createGroupChat(@Body() dto: CreateGroupChatDto) {
    return this.chatService.createGroupChat(dto);
  }

  /**
   * Get Chat Details
   * GET /chat/:chatId
   */
  @Get(':chatId')
  @ApiOperation({
    summary: 'Get Chat by ID',
    description: 'Returns relational DB details of a chat and its members.',
  })
  @ApiParam({ name: 'chatId', description: 'UUID of the chat' })
  async getChat(@Param('chatId') chatId: string) {
    return this.chatService.getChatById(chatId);
  }

  /**
   * Bonus API: Add Members to Group Chat
   * POST /chat/:chatId/members/add
   */
  @Post(':chatId/members/add')
  @ApiOperation({
    summary: 'Add Members to Group Chat',
    description: 'Allows group admin to add new members.',
  })
  async addMembers(
    @Param('chatId') chatId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chatService.addMembers(chatId, dto);
  }

  /**
   * Bonus API: Remove Member from Group Chat
   * POST /chat/:chatId/members/remove
   */
  @Post(':chatId/members/remove')
  @ApiOperation({
    summary: 'Remove Member from Group Chat',
    description: 'Allows group admin to remove a member or a user to leave.',
  })
  async removeMember(
    @Param('chatId') chatId: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.chatService.removeMember(chatId, dto);
  }

  /**
   * Bonus API: Delete Group Chat
   * DELETE /chat/:chatId
   */
  @Delete(':chatId')
  @ApiOperation({
    summary: 'Delete Group Chat',
    description: 'Allows group admin to delete the group chat and all its memberships.',
  })
  async deleteChat(
    @Param('chatId') chatId: string,
    @Body() dto: DeleteChatDto,
  ) {
    return this.chatService.deleteChat(chatId, dto.adminId);
  }

  /**
   * Bonus API: Leave Group Chat
   * POST /chat/:chatId/leave
   */
  @Post(':chatId/leave')
  @ApiOperation({
    summary: 'Leave Group Chat',
    description: 'Allows any member (admin or non-admin) to exit/leave the group chat.',
  })
  async leaveChat(
    @Param('chatId') chatId: string,
    @Body() dto: LeaveChatDto,
  ) {
    return this.chatService.leaveChat(chatId, dto.userId);
  }
}
