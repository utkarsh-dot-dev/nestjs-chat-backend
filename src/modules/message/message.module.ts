import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { ChatModule } from '../chat/chat.module';
import { FirebaseModule } from '../../firebase/firebase.module';

@Module({
  imports: [ChatModule, FirebaseModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
