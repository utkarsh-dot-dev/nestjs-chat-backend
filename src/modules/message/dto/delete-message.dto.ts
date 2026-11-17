import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteMessageDto {
  @ApiProperty({
    description: 'User ID of the sender requesting deletion',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  senderId!: string;
}
