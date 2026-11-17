import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UserService } from './modules/user/user.service';
import { ChatService } from './modules/chat/chat.service';
import { MessageService } from './modules/message/message.service';

async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userService = app.get(UserService);
    const chatService = app.get(ChatService);
    const messageService = app.get(MessageService);

    logger.log('--- Seeding Users ---');
    const usersData = [
      { id: 'user_alice', name: 'Alice Smith', email: 'alice@example.com' },
      { id: 'user_bob', name: 'Bob Jones', email: 'bob@example.com' },
      { id: 'user_charlie', name: 'Charlie Brown', email: 'charlie@example.com' },
      { id: 'user_diana', name: 'Diana Prince', email: 'diana@example.com' },
    ];

    for (const u of usersData) {
      try {
        await userService.create(u);
        logger.log(`Created user: ${u.id} (${u.name})`);
      } catch (e: any) {
        logger.warn(`User ${u.id} may already exist: ${e.message}`);
      }
    }

    logger.log('--- Creating Seed 1:1 Chat ---');
    const directChat = await chatService.createOrGetDirectChat({
      userAId: 'user_alice',
      userBId: 'user_bob',
    });
    logger.log(`Direct chat between Alice and Bob: ${directChat.chatId} (existing: ${directChat.isExisting})`);

    logger.log('--- Sending Initial Messages ---');
    const msg1 = await messageService.sendMessage(directChat.chatId, {
      senderId: 'user_alice',
      text: 'Hey Bob! Welcome to the chat backend.',
    });
    logger.log(`Sent message 1: ${msg1.id}`);

    const msg2 = await messageService.sendMessage(directChat.chatId, {
      senderId: 'user_bob',
      text: 'Hey Alice! Glad to be here. Messages in Firestore, relations in PostgreSQL!',
    });
    logger.log(`Sent message 2: ${msg2.id}`);

    logger.log('--- Marking Message Read & Updating Last Seen ---');
    await messageService.markMessageRead(directChat.chatId, msg1.id, {
      userId: 'user_bob',
    });
    await messageService.updateLastSeen(directChat.chatId, {
      userId: 'user_bob',
      messageId: msg2.id,
    });

    logger.log('Seeding completed successfully!');
  } catch (err: any) {
    logger.error(`Seeding error: ${err.message}`, err.stack);
  } finally {
    await app.close();
  }
}

seed();
