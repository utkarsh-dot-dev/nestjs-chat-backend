import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'User ID of the sender',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  senderId!: string;

  @ApiProperty({
    description: 'Text content of the message',
    example: 'Hello! How are you doing today?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}
