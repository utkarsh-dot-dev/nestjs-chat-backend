import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat, ChatMember } from '../../database/entities';
import { UserService } from '../user/user.service';

describe('ChatService Unit Tests', () => {
  let service: ChatService;
  let mockChatRepo: any;
  let mockMemberRepo: any;
  let mockUserService: any;

  beforeEach(async () => {
    mockChatRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockMemberRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entities) => entities),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    mockUserService = {
      ensureUsersExist: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Chat), useValue: mockChatRepo },
        { provide: getRepositoryToken(ChatMember), useValue: mockMemberRepo },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('createOrGetDirectChat', () => {
    it('should reject if users are identical', async () => {
      await expect(
        service.createOrGetDirectChat({ userAId: 'u1', userBId: 'u1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing chat if already present', async () => {
      mockUserService.ensureUsersExist.mockResolvedValue(undefined);

      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'existing-chat-id' }),
      };
      mockChatRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.createOrGetDirectChat({
        userAId: 'u1',
        userBId: 'u2',
      });
      expect(res).toEqual({ chatId: 'existing-chat-id', isExisting: true });
    });

    it('should create new chat if none exists', async () => {
      mockUserService.ensureUsersExist.mockResolvedValue(undefined);

      const qb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockChatRepo.createQueryBuilder.mockReturnValue(qb);
      mockChatRepo.create.mockReturnValue({ id: 'new-chat-id', isGroup: false });
      mockChatRepo.save.mockResolvedValue({ id: 'new-chat-id', isGroup: false });

      const res = await service.createOrGetDirectChat({
        userAId: 'u1',
        userBId: 'u2',
      });
      expect(res).toEqual({ chatId: 'new-chat-id', isExisting: false });
      expect(mockMemberRepo.save).toHaveBeenCalled();
    });
  });

  describe('getUserChats', () => {
    it('should return user chats with memberIds', async () => {
      mockUserService.findById.mockResolvedValue({ id: 'u1' });
      mockMemberRepo.find.mockResolvedValue([{ chatId: 'c1' }]);
      mockChatRepo.find.mockResolvedValue([
        {
          id: 'c1',
          isGroup: false,
          name: null,
          createdBy: 'u1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getUserChats('u1');
      expect(result).toHaveLength(1);
      expect(result[0].chatId).toBe('c1');
      expect(result[0].memberIds).toEqual(['u1', 'u2']);
    });
  });
});
