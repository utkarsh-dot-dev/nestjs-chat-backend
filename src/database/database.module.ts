import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '../config/database.config';
import { User, Chat, ChatMember } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),
    TypeOrmModule.forFeature([User, Chat, ChatMember]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
