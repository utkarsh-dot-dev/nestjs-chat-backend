import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLastSeenDto {
  @ApiProperty({
    description: 'User ID updating their last seen position',
    example: 'userB_456',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Message ID up to which the user has seen',
    example: 'msg-uuid-1234',
  })
  @IsString()
  @IsNotEmpty()
  messageId!: string;
}
