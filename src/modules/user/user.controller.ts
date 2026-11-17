import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChatService } from '../chat/chat.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly chatService: ChatService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create User',
    description: 'Registers or provisions a new user in the relational database.',
  })
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List Users',
    description: 'Returns all users in the relational database.',
  })
  async listUsers() {
    return this.userService.findAll();
  }

  @Get(':userId')
  @ApiOperation({
    summary: 'Get User by ID',
    description: 'Fetches user details from relational DB.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUser(@Param('userId') userId: string) {
    return this.userService.findById(userId);
  }

  /**
   * API 6: List User Chats
   * GET /user/:userId/chats
   * Output: List of chats with member IDs from relational DB
   */
  @Get(':userId/chats')
  @ApiOperation({
    summary: 'List User Chats',
    description:
      'Fetches all chats that the given user belongs to, including all member IDs from the relational DB.',
  })
  @ApiParam({ name: 'userId', description: 'User ID whose chats to retrieve' })
  @ApiResponse({
    status: 200,
    description: 'List of chats with member IDs',
    schema: {
      example: [
        {
          chatId: '8f6b6417-6ff5-4e76-8802-cb40ea0c3098',
          isGroup: false,
          name: null,
          createdBy: 'userA_123',
          memberIds: ['userA_123', 'userB_456'],
          createdAt: '2026-11-17T06:00:00.000Z',
          updatedAt: '2026-11-17T06:00:00.000Z',
        },
      ],
    },
  })
  async getUserChats(@Param('userId') userId: string) {
    return this.chatService.getUserChats(userId);
  }
}
