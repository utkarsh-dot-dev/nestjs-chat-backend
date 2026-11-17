import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteChatDto {
  @ApiProperty({
    description: 'Admin user ID performing the deletion',
    example: 'user_alice',
  })
  @IsString()
  @IsNotEmpty()
  adminId!: string;
}
