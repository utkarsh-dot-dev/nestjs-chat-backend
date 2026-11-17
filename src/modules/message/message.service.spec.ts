import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessageService } from './message.service';
import { ChatService } from '../chat/chat.service';
import { FIRESTORE_SERVICE_TOKEN } from '../../firebase/firebase.module';

describe('MessageService Unit Tests', () => {
  let service: MessageService;
  let mockChatService: any;
  let mockFirestoreService: any;

  beforeEach(async () => {
    mockChatService = {
      getChatById: jest.fn(),
      verifyMembership: jest.fn(),
    };

    mockFirestoreService = {
      sendMessage: jest.fn(),
      getMessages: jest.fn(),
      getMessage: jest.fn(),
      markMessageRead: jest.fn(),
      updateLastSeen: jest.fn(),
      getLastSeen: jest.fn(),
      editMessage: jest.fn(),
      deleteMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: ChatService, useValue: mockChatService },
        { provide: FIRESTORE_SERVICE_TOKEN, useValue: mockFirestoreService },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  describe('sendMessage', () => {
    it('should verify membership and send message to Firestore', async () => {
      mockChatService.getChatById.mockResolvedValue({ id: 'c1' });
      mockChatService.verifyMembership.mockResolvedValue({ id: 'm1' });
      mockFirestoreService.sendMessage.mockResolvedValue({
        id: 'msg-1',
        chatId: 'c1',
        senderId: 'u1',
        text: 'hello',
      });

      const res = await service.sendMessage('c1', {
        senderId: 'u1',
        text: 'hello',
      });
      expect(res.id).toBe('msg-1');
      expect(mockChatService.verifyMembership).toHaveBeenCalledWith('c1', 'u1');
    });

    it('should throw if user is not in chat', async () => {
      mockChatService.getChatById.mockResolvedValue({ id: 'c1' });
      mockChatService.verifyMembership.mockRejectedValue(
        new ForbiddenException('User is not a member'),
      );

      await expect(
        service.sendMessage('c1', { senderId: 'uX', text: 'hello' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markMessageRead', () => {
    it('should mark message read and update last seen', async () => {
      mockChatService.getChatById.mockResolvedValue({ id: 'c1' });
      mockChatService.verifyMembership.mockResolvedValue({ id: 'm1' });
      mockFirestoreService.getMessage.mockResolvedValue({ id: 'msg-1', chatId: 'c1' });
      mockFirestoreService.markMessageRead.mockResolvedValue({
        messageId: 'msg-1',
        userId: 'u2',
        readAt: '2026-11-17T00:00:00Z',
      });
      mockFirestoreService.updateLastSeen.mockResolvedValue({});

      const res = await service.markMessageRead('c1', 'msg-1', { userId: 'u2' });
      expect(res.messageId).toBe('msg-1');
      expect(mockFirestoreService.markMessageRead).toHaveBeenCalledWith('c1', 'msg-1', 'u2');
      expect(mockFirestoreService.updateLastSeen).toHaveBeenCalledWith('c1', 'u2', 'msg-1');
    });
  });
});
