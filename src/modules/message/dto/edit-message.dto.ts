import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({
    description: 'User ID of the original sender requesting edit',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  senderId!: string;

  @ApiProperty({
    description: 'Updated message text',
    example: 'Updated message content',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}
