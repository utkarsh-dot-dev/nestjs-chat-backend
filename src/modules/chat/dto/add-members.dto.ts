import { IsArray, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMembersDto {
  @ApiProperty({
    description: 'Admin user ID performing the action',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  adminId!: string;

  @ApiProperty({
    description: 'User IDs to add to the group',
    example: ['userD_999'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds!: string[];
}
