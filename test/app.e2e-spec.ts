import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('Chat Backend (e2e)', () => {
  let app: INestApplication;
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let chatId: string;
  let messageId1: string;
  let messageId2: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_DATABASE = ':memory:';
    process.env.USE_MOCK_FIRESTORE = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Provisioning', () => {
    it('should create test users', async () => {
      userAId = `test_alice_${Date.now()}`;
      userBId = `test_bob_${Date.now()}`;
      userCId = `test_charlie_${Date.now()}`;

      await request(app.getHttpServer())
        .post('/user')
        .send({ id: userAId, name: 'Alice Smith', email: `${userAId}@test.com` })
        .expect(201);

      await request(app.getHttpServer())
        .post('/user')
        .send({ id: userBId, name: 'Bob Jones', email: `${userBId}@test.com` })
        .expect(201);

      await request(app.getHttpServer())
        .post('/user')
        .send({ id: userCId, name: 'Charlie Brown', email: `${userCId}@test.com` })
        .expect(201);
    });
  });

  describe('1. Create or Get Chat (POST /chat/create)', () => {
    it('should create a new 1:1 chat between userA and userB', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat/create')
        .send({ userAId, userBId })
        .expect(200);

      expect(res.body).toHaveProperty('chatId');
      expect(res.body.isExisting).toBe(false);
      chatId = res.body.chatId;
    });

    it('should return the existing chatId when called again for the same users (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat/create')
        .send({ userAId: userBId, userBId: userAId })
        .expect(200);

      expect(res.body.chatId).toBe(chatId);
      expect(res.body.isExisting).toBe(true);
    });

    it('should fail if userAId and userBId are identical', async () => {
      await request(app.getHttpServer())
        .post('/chat/create')
        .send({ userAId, userBId: userAId })
        .expect(400);
    });

    it('should fail if a user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/chat/create')
        .send({ userAId, userBId: 'non_existent_user' })
        .expect(404);
    });
  });

  describe('2. Send Message (POST /chat/:chatId/message/send)', () => {
    it('should send a message from userA and store in Firestore', async () => {
      const res = await request(app.getHttpServer())
        .post(`/chat/${chatId}/message/send`)
        .send({
          senderId: userAId,
          text: 'Hello Bob! This is message 1.',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.chatId).toBe(chatId);
      expect(res.body.senderId).toBe(userAId);
      expect(res.body.text).toBe('Hello Bob! This is message 1.');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.readBy).toContain(userAId);
      messageId1 = res.body.id;
    });

    it('should send a reply message from userB', async () => {
      const res = await request(app.getHttpServer())
        .post(`/chat/${chatId}/message/send`)
        .send({
          senderId: userBId,
          text: 'Hi Alice! Received your message.',
        })
        .expect(201);

      expect(res.body.senderId).toBe(userBId);
      messageId2 = res.body.id;
    });

    it('should forbid sending messages from non-members of the chat', async () => {
      await request(app.getHttpServer())
        .post(`/chat/${chatId}/message/send`)
        .send({
          senderId: userCId, // Not a member of this 1:1 chat
          text: 'Sneaking into the chat!',
        })
        .expect(403);
    });
  });

  describe('3. Get Messages (GET /chat/:chatId/messages?limit=50)', () => {
    it('should retrieve messages ordered chronologically by timestamp', async () => {
      const res = await request(app.getHttpServer())
        .get(`/chat/${chatId}/messages?limit=50`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].id).toBe(messageId1);
      expect(res.body[1].id).toBe(messageId2);
      expect(
        new Date(res.body[0].timestamp).getTime(),
      ).toBeLessThanOrEqual(new Date(res.body[1].timestamp).getTime());
    });

    it('should respect the limit query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/chat/${chatId}/messages?limit=1`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(messageId1);
    });
  });

  describe('4. Mark Message Read (POST /chat/:chatId/message/:messageId/read)', () => {
    it('should allow userB to mark message1 as read', async () => {
      const res = await request(app.getHttpServer())
        .post(`/chat/${chatId}/message/${messageId1}/read`)
        .send({ userId: userBId })
        .expect(200);

      expect(res.body.messageId).toBe(messageId1);
      expect(res.body.userId).toBe(userBId);
      expect(res.body).toHaveProperty('readAt');

      // Verify that getMessages reflects the read status
      const msgRes = await request(app.getHttpServer())
        .get(`/chat/${chatId}/messages`)
        .expect(200);

      const updatedMsg1 = msgRes.body.find((m: any) => m.id === messageId1);
      expect(updatedMsg1.readBy).toContain(userBId);
      expect(updatedMsg1.readReceipts[userBId]).toBeDefined();
    });

    it('should fail if non-member attempts to mark message as read', async () => {
      await request(app.getHttpServer())
        .post(`/chat/${chatId}/message/${messageId1}/read`)
        .send({ userId: userCId })
        .expect(403);
    });
  });

  describe('5. Update Last Seen Message (POST /chat/:chatId/lastseen)', () => {
    it('should update the last seen message for userB', async () => {
      const res = await request(app.getHttpServer())
        .post(`/chat/${chatId}/lastseen`)
        .send({
          userId: userBId,
          messageId: messageId2,
        })
        .expect(200);

      expect(res.body.chatId).toBe(chatId);
      expect(res.body.userId).toBe(userBId);
      expect(res.body.messageId).toBe(messageId2);
      expect(res.body).toHaveProperty('updatedAt');
    });

    it('should get last seen message for userB', async () => {
      const res = await request(app.getHttpServer())
        .get(`/chat/${chatId}/lastseen/${userBId}`)
        .expect(200);

      expect(res.body.messageId).toBe(messageId2);
      expect(res.body.userId).toBe(userBId);
    });
  });

  describe('6. List User Chats (GET /user/:userId/chats)', () => {
    it('should return all chats for userA with member IDs from relational DB', async () => {
      const res = await request(app.getHttpServer())
        .get(`/user/${userAId}/chats`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      const chat = res.body[0];
      expect(chat.chatId).toBe(chatId);
      expect(chat.isGroup).toBe(false);
      expect(chat.memberIds).toContain(userAId);
      expect(chat.memberIds).toContain(userBId);
    });

    it('should return empty list for user who is in no chats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/user/${userCId}/chats`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('Bonus: Group Chat & Message Edit/Delete', () => {
    let groupChatId: string;
    let groupMessageId: string;

    it('should create a group chat with creator and members', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat/group/create')
        .send({
          name: 'Core Team',
          creatorId: userAId,
          memberIds: [userBId, userCId],
        })
        .expect(201);

      expect(res.body.isGroup).toBe(true);
      expect(res.body.name).toBe('Core Team');
      expect(res.body.memberIds).toContain(userAId);
      expect(res.body.memberIds).toContain(userBId);
      expect(res.body.memberIds).toContain(userCId);
      groupChatId = res.body.chatId;
    });

    it('should list the new group chat in user chats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/user/${userAId}/chats`)
        .expect(200);

      expect(res.body.length).toBe(2);
    });

    it('should send a message in group chat', async () => {
      const res = await request(app.getHttpServer())
        .post(`/chat/${groupChatId}/message/send`)
        .send({
          senderId: userAId,
          text: 'Welcome team!',
        })
        .expect(201);

      groupMessageId = res.body.id;
    });

    it('should edit the message by original sender', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/chat/${groupChatId}/message/${groupMessageId}`)
        .send({
          senderId: userAId,
          text: 'Welcome team! (Updated Announcement)',
        })
        .expect(200);

      expect(res.body.text).toBe('Welcome team! (Updated Announcement)');
      expect(res.body.isEdited).toBe(true);
    });

    it('should forbid editing message by another user', async () => {
      await request(app.getHttpServer())
        .patch(`/chat/${groupChatId}/message/${groupMessageId}`)
        .send({
          senderId: userBId,
          text: 'Tampering with Alice message',
        })
        .expect(403);
    });

    it('should delete the message by original sender', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/chat/${groupChatId}/message/${groupMessageId}`)
        .send({
          senderId: userAId,
        })
        .expect(200);

      expect(res.body.deleted).toBe(true);

      // Verify messages show deleted text
      const listRes = await request(app.getHttpServer())
        .get(`/chat/${groupChatId}/messages`)
        .expect(200);

      const deletedMsg = listRes.body.find((m: any) => m.id === groupMessageId);
      expect(deletedMsg.isDeleted).toBe(true);
      expect(deletedMsg.text).toBe('[This message was deleted]');
    });
  });
});
