import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({
    description: 'First participant user ID',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  userAId!: string;

  @ApiProperty({
    description: 'Second participant user ID',
    example: 'userB_456',
  })
  @IsString()
  @IsNotEmpty()
  userBId!: string;
}
