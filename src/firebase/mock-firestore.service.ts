import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatMessageDoc,
  IFirestoreService,
  LastSeenDoc,
} from './firestore.interface';

@Injectable()
export class MockFirestoreService implements IFirestoreService {
  private readonly logger = new Logger(MockFirestoreService.name);

  // In-memory store: chatId -> messageId -> ChatMessageDoc
  private readonly messages = new Map<string, Map<string, ChatMessageDoc>>();

  // In-memory store: chatId -> userId -> LastSeenDoc
  private readonly lastSeen = new Map<string, Map<string, LastSeenDoc>>();

  constructor() {
    this.logger.log('MockFirestoreService initialized for in-memory message storage.');
  }

  async sendMessage(
    chatId: string,
    message: Omit<ChatMessageDoc, 'id'>,
  ): Promise<ChatMessageDoc> {
    const id = uuidv4();
    const chatMessages = this.messages.get(chatId) || new Map<string, ChatMessageDoc>();

    const doc: ChatMessageDoc = {
      ...message,
      id,
      timestamp: message.timestamp || new Date().toISOString(),
      readBy: Array.from(new Set(message.readBy || [message.senderId])),
      readReceipts: message.readReceipts || {
        [message.senderId]: { readAt: new Date().toISOString() },
      },
    };

    chatMessages.set(id, doc);
    this.messages.set(chatId, chatMessages);

    // Also update sender's last seen automatically
    await this.updateLastSeen(chatId, message.senderId, id);

    return doc;
  }

  async getMessages(
    chatId: string,
    limit: number = 50,
  ): Promise<ChatMessageDoc[]> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages) {
      return [];
    }

    const all = Array.from(chatMessages.values());
    // Order by timestamp ascending (chronological chat history)
    all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return all.slice(0, Math.min(limit, 100));
  }

  async getMessage(
    chatId: string,
    messageId: string,
  ): Promise<ChatMessageDoc | null> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages) return null;
    return chatMessages.get(messageId) || null;
  }

  async markMessageRead(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<{ messageId: string; userId: string; readAt: string }> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages || !chatMessages.has(messageId)) {
      throw new NotFoundException(`Message ${messageId} not found in chat ${chatId}`);
    }

    const msg = chatMessages.get(messageId)!;
    const nowIso = new Date().toISOString();

    if (!msg.readBy.includes(userId)) {
      msg.readBy.push(userId);
    }
    msg.readReceipts = msg.readReceipts || {};
    msg.readReceipts[userId] = { readAt: nowIso };

    chatMessages.set(messageId, msg);

    return { messageId, userId, readAt: nowIso };
  }

  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string,
  ): Promise<LastSeenDoc> {
    const chatLastSeen = this.lastSeen.get(chatId) || new Map<string, LastSeenDoc>();
    const doc: LastSeenDoc = {
      chatId,
      userId,
      messageId,
      updatedAt: new Date().toISOString(),
    };
    chatLastSeen.set(userId, doc);
    this.lastSeen.set(chatId, chatLastSeen);
    return doc;
  }

  async getLastSeen(
    chatId: string,
    userId: string,
  ): Promise<LastSeenDoc | null> {
    const chatLastSeen = this.lastSeen.get(chatId);
    if (!chatLastSeen) return null;
    return chatLastSeen.get(userId) || null;
  }

  async editMessage(
    chatId: string,
    messageId: string,
    newText: string,
    senderId: string,
  ): Promise<ChatMessageDoc> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages || !chatMessages.has(messageId)) {
      throw new NotFoundException(`Message ${messageId} not found in chat ${chatId}`);
    }

    const msg = chatMessages.get(messageId)!;
    if (msg.senderId !== senderId) {
      throw new ForbiddenException('Only the sender can edit this message');
    }
    if (msg.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    msg.text = newText;
    msg.isEdited = true;
    msg.editedAt = new Date().toISOString();

    chatMessages.set(messageId, msg);
    return msg;
  }

  async deleteMessage(
    chatId: string,
    messageId: string,
    senderId: string,
  ): Promise<{ messageId: string; deleted: boolean }> {
    const chatMessages = this.messages.get(chatId);
    if (!chatMessages || !chatMessages.has(messageId)) {
      throw new NotFoundException(`Message ${messageId} not found in chat ${chatId}`);
    }

    const msg = chatMessages.get(messageId)!;
    if (msg.senderId !== senderId) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    msg.isDeleted = true;
    msg.deletedAt = new Date().toISOString();
    msg.text = '[This message was deleted]';

    chatMessages.set(messageId, msg);
    return { messageId, deleted: true };
  }
}
