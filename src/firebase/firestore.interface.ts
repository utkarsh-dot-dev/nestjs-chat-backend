export interface ChatMessageDoc {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
  readBy: string[];
  readReceipts: Record<string, { readAt: string }>;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface LastSeenDoc {
  userId: string;
  chatId: string;
  messageId: string;
  updatedAt: string; // ISO string
}

export interface IFirestoreService {
  sendMessage(
    chatId: string,
    message: Omit<ChatMessageDoc, 'id'>,
  ): Promise<ChatMessageDoc>;

  getMessages(
    chatId: string,
    limit?: number,
  ): Promise<ChatMessageDoc[]>;

  getMessage(
    chatId: string,
    messageId: string,
  ): Promise<ChatMessageDoc | null>;

  markMessageRead(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<{ messageId: string; userId: string; readAt: string }>;

  updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string,
  ): Promise<LastSeenDoc>;

  getLastSeen(
    chatId: string,
    userId: string,
  ): Promise<LastSeenDoc | null>;

  editMessage(
    chatId: string,
    messageId: string,
    newText: string,
    senderId: string,
  ): Promise<ChatMessageDoc>;

  deleteMessage(
    chatId: string,
    messageId: string,
    senderId: string,
  ): Promise<{ messageId: string; deleted: boolean }>;
}
