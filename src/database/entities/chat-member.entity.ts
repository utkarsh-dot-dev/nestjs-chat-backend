import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from './user.entity';

export enum ChatMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('chat_members')
@Unique(['chatId', 'userId'])
export class ChatMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  chatId!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ChatMemberRole.MEMBER,
  })
  role!: ChatMemberRole;

  @CreateDateColumn()
  joinedAt!: Date;

  @ManyToOne(() => Chat, (chat) => chat.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  chat!: Chat;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
