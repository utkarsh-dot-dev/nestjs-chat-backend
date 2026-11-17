import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, Chat, ChatMember } from '../database/entities';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const dbType = (process.env.DB_TYPE || 'postgres').toLowerCase();

  const commonOptions = {
    entities: [User, Chat, ChatMember],
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    logging: process.env.DB_LOGGING === 'true',
  };

  if (dbType === 'mysql') {
    return {
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chat_db',
      ...commonOptions,
    };
  }

  if (dbType === 'sqlite') {
    return {
      type: 'sqlite',
      database: process.env.DB_DATABASE || 'chat_backend.sqlite',
      ...commonOptions,
    };
  }

  // Default to PostgreSQL
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ...commonOptions,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chat_db',
    ...commonOptions,
  };
};
