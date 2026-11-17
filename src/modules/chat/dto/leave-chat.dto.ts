import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LeaveChatDto {
  @ApiProperty({
    description: 'User ID of the member leaving the group chat',
    example: 'user_bob',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
