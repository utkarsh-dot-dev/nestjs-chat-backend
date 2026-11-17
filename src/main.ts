import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Strict DTO validation and transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Chat Backend API')
    .setDescription(
      'Hybrid Chat Backend: Users & Chats in Relational DB (PostgreSQL/MySQL), Messages & Read Receipts in Firebase Firestore',
    )
    .setVersion('1.0.0')
    .addTag('Chat', 'Direct and group chat management')
    .addTag('Message', 'Message dispatch, history, read receipts, and last seen pointers in Firestore')
    .addTag('User', 'User management and chat lookup')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(` Chat Backend is running on: http://localhost:${port}`);
  logger.log(` Interactive Swagger API Docs: http://localhost:${port}/api/docs`);
  logger.log(`=======================================================`);
}

bootstrap();
