import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'User ID marking the message as read',
    example: 'userB_456',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
