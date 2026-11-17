import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChatMember } from './chat-member.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 256, unique: true, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ChatMember, (member) => member.user)
  memberships!: ChatMember[];
}
