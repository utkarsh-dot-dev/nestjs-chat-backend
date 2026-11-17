import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpdateLastSeenDto } from './dto/update-last-seen.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';

@ApiTags('Message')
@Controller('chat/:chatId')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * API 2: Send Message
   * POST /chat/:chatId/message/send
   * Input: senderId, text
   * Store message in Firestore with timestamp
   */
  @Post('message/send')
  @ApiOperation({
    summary: 'Send Message',
    description: 'Stores a new message in Firebase Firestore with timestamp and sender read status.',
  })
  @ApiParam({ name: 'chatId', description: 'Chat UUID' })
  @ApiResponse({
    status: 201,
    description: 'Message successfully created in Firestore',
    schema: {
      example: {
        id: '9b3e1008-8e6c-4828-b80c-e1bc14582f3a',
        chatId: '8f6b6417-6ff5-4e76-8802-cb40ea0c3098',
        senderId: 'userA_123',
        text: 'Hello there!',
        timestamp: '2026-11-17T06:15:00.000Z',
        readBy: ['userA_123'],
        readReceipts: {
          userA_123: {
            readAt: '2026-11-17T06:15:00.000Z',
          },
        },
      },
    },
  })
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendMessage(chatId, dto);
  }

  /**
   * API 3: Get Messages
   * GET /chat/:chatId/messages?limit=50
   * Output: List of messages ordered by timestamp
   */
  @Get('messages')
  @ApiOperation({
    summary: 'Get Messages',
    description:
      'Fetches messages for a chat from Firebase Firestore ordered chronologically by timestamp.',
  })
  @ApiParam({ name: 'chatId', description: 'Chat UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages to retrieve (default 50, max 100)',
    type: Number,
  })
  async getMessages(
    @Param('chatId') chatId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messageService.getMessages(chatId, query.limit);
  }

  /**
   * API 4: Mark Message Read
   * POST /chat/:chatId/message/:messageId/read
   * Input: userId
   * Update read receipt in Firestore
   */
  @Post('message/:messageId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark Message Read',
    description: 'Updates read receipt and readBy set in Firestore for a given message.',
  })
  @ApiParam({ name: 'chatId', description: 'Chat UUID' })
  @ApiParam({ name: 'messageId', description: 'Firestore Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Read receipt recorded',
    schema: {
      example: {
        messageId: '9b3e1008-8e6c-4828-b80c-e1bc14582f3a',
        userId: 'userB_456',
        readAt: '2026-11-17T06:16:00.000Z',
      },
    },
  })
  async markMessageRead(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.messageService.markMessageRead(chatId, messageId, dto);
  }

  /**
   * API 5: Update Last Seen Message
   * POST /chat/:chatId/lastseen
   * Input: userId, messageId
   * Update last seen message per user in Firestore
   */
  @Post('lastseen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Last Seen Message',
    description: 'Updates the last seen message pointer per user in Firebase Firestore.',
  })
  @ApiParam({ name: 'chatId', description: 'Chat UUID' })
  @ApiResponse({
    status: 200,
    description: 'Last seen message updated',
    schema: {
      example: {
        chatId: '8f6b6417-6ff5-4e76-8802-cb40ea0c3098',
        userId: 'userB_456',
        messageId: '9b3e1008-8e6c-4828-b80c-e1bc14582f3a',
        updatedAt: '2026-11-17T06:16:30.000Z',
      },
    },
  })
  async updateLastSeen(
    @Param('chatId') chatId: string,
    @Body() dto: UpdateLastSeenDto,
  ) {
    return this.messageService.updateLastSeen(chatId, dto);
  }

  /**
   * Get Last Seen Message for a user
   * GET /chat/:chatId/lastseen/:userId
   */
  @Get('lastseen/:userId')
  @ApiOperation({
    summary: 'Get Last Seen Message',
    description: 'Retrieves the last seen message status for a given user in the chat.',
  })
  async getLastSeen(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
  ) {
    return this.messageService.getLastSeen(chatId, userId);
  }

  /**
   * Bonus API: Edit Message
   * PATCH /chat/:chatId/message/:messageId
   */
  @Patch('message/:messageId')
  @ApiOperation({
    summary: 'Edit Message',
    description: 'Allows sender to edit the message text in Firestore.',
  })
  async editMessage(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messageService.editMessage(chatId, messageId, dto);
  }

  /**
   * Bonus API: Delete Message
   * DELETE /chat/:chatId/message/:messageId
   */
  @Delete('message/:messageId')
  @ApiOperation({
    summary: 'Delete Message',
    description: 'Allows sender to soft-delete a message in Firestore.',
  })
  async deleteMessage(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: DeleteMessageDto,
  ) {
    return this.messageService.deleteMessage(chatId, messageId, dto);
  }
}
