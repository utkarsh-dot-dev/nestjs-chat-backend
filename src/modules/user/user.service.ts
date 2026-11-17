import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const id = dto.id || uuidv4();

    const existing = await this.userRepository.findOne({ where: { id } });
    if (existing) {
      throw new ConflictException(`User with ID '${id}' already exists`);
    }

    if (dto.email) {
      const emailExisting = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (emailExisting) {
        throw new ConflictException(
          `User with email '${dto.email}' already exists`,
        );
      }
    }

    const user = this.userRepository.create({
      id,
      name: dto.name,
      email: dto.email,
      avatarUrl: dto.avatarUrl,
    });

    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }
    return user;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return [];
    return this.userRepository.find({
      where: { id: In(ids) },
    });
  }

  async ensureUsersExist(ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids));
    const users = await this.findByIds(uniqueIds);
    if (users.length !== uniqueIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Users not found: ${missingIds.join(', ')}`,
      );
    }
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
