import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChatMember } from './chat-member.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'boolean', default: false })
  isGroup!: boolean;

  @Column({ type: 'varchar', length: 256, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ChatMember, (member) => member.chat, { cascade: true })
  members!: ChatMember[];
}
