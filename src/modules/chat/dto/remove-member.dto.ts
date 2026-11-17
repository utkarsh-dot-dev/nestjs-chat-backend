import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveMemberDto {
  @ApiProperty({
    description: 'Admin user ID performing the action',
    example: 'userA_123',
  })
  @IsString()
  @IsNotEmpty()
  adminId!: string;

  @ApiProperty({
    description: 'User ID to remove from the group',
    example: 'userD_999',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
