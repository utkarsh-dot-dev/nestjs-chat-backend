import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupChatDto {
  @ApiProperty({
    description: 'Name of the group chat',
    example: 'Backend Engineers',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'User ID creating the group',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @ApiProperty({
    description: 'List of initial member user IDs (excluding creator)',
    example: ['userB_456', 'userC_789'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  memberIds!: string[];
}
