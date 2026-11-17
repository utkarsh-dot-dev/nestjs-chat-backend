import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  ChatMessageDoc,
  IFirestoreService,
  LastSeenDoc,
} from './firestore.interface';

@Injectable()
export class FirebaseService implements IFirestoreService {
  private readonly logger = new Logger(FirebaseService.name);
  private firestore!: admin.firestore.Firestore;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
          );
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
          });
          this.logger.log('Firebase initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
        } catch (err: any) {
          this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ' + err.message);
          admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project' });
        }
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        this.logger.log('Firebase initialized via service account env variables');
      } else {
        // Fallback to application default credentials or demo project
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
        });
        this.logger.log('Firebase initialized via default credentials / project ID');
      }
    }

    this.firestore = admin.firestore();
  }

  async sendMessage(
    chatId: string,
    message: Omit<ChatMessageDoc, 'id'>,
  ): Promise<ChatMessageDoc> {
    const col = this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages');
    const docRef = col.doc();
    const nowIso = new Date().toISOString();

    const docData: ChatMessageDoc = {
      ...message,
      id: docRef.id,
      timestamp: message.timestamp || nowIso,
      readBy: message.readBy?.length ? message.readBy : [message.senderId],
      readReceipts: message.readReceipts || {
        [message.senderId]: { readAt: nowIso },
      },
    };

    await docRef.set(docData);
    await this.updateLastSeen(chatId, message.senderId, docRef.id);

    return docData;
  }

  async getMessages(
    chatId: string,
    limit: number = 50,
  ): Promise<ChatMessageDoc[]> {
    const col = this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages');
    const snapshot = await col
      .orderBy('timestamp', 'asc')
      .limit(Math.min(limit, 100))
      .get();

    return snapshot.docs.map((doc) => doc.data() as ChatMessageDoc);
  }

  async getMessage(
    chatId: string,
    messageId: string,
  ): Promise<ChatMessageDoc | null> {
    const doc = await this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .get();

    if (!doc.exists) {
      return null;
    }
    return doc.data() as ChatMessageDoc;
  }

  async markMessageRead(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<{ messageId: string; userId: string; readAt: string }> {
    const docRef = this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${messageId} not found in chat ${chatId}`);
    }

    const nowIso = new Date().toISOString();

    await docRef.update({
      readBy: admin.firestore.FieldValue.arrayUnion(userId),
      [`readReceipts.${userId}`]: { readAt: nowIso },
    });

    return { messageId, userId, readAt: nowIso };
  }

  async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string,
  ): Promise<LastSeenDoc> {
    const docRef = this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('lastSeen')
      .doc(userId);

    const nowIso = new Date().toISOString();
    const data: LastSeenDoc = {
      userId,
      chatId,
      messageId,
      updatedAt: nowIso,
    };

    await docRef.set(data, { merge: true });
    return data;
  }

  async getLastSeen(
    chatId: string,
    userId: string,
  ): Promise<LastSeenDoc | null> {
    const doc = await this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('lastSeen')
      .doc(userId)
      .get();

    if (!doc.exists) {
      return null;
    }
    return doc.data() as LastSeenDoc;
  }

  async editMessage(
    chatId: string,
    messageId: string,
    newText: string,
    senderId: string,
  ): Promise<ChatMessageDoc> {
    const docRef = this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${messageId} not found in chat ${chatId}`);
    }

    const existing = doc.data() as ChatMessageDoc;
    if (existing.senderId !== senderId) {
      throw new ForbiddenException('Only the sender can edit this message');
    }
    if (existing.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    const nowIso = new Date().toISOString();
    await docRef.update({
      text: newText,
      isEdited: true,
      editedAt: nowIso,
    });

    return { ...existing, text: newText, isEdited: true, editedAt: nowIso };
  }

  async deleteMessage(
    chatId: string,
    messageId: string,
    senderId: string,
  ): Promise<{ messageId: string; deleted: boolean }> {
    const docRef = this.firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Message ${messageId} not found in chat ${chatId}`);
    }

    const existing = doc.data() as ChatMessageDoc;
    if (existing.senderId !== senderId) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    const nowIso = new Date().toISOString();
    await docRef.update({
      isDeleted: true,
      deletedAt: nowIso,
      text: '[This message was deleted]',
    });

    return { messageId, deleted: true };
  }
}
