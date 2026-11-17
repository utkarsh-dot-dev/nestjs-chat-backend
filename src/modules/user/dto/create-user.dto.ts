import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Custom user ID (e.g. user_1, alice). If omitted, a UUID is generated.',
    example: 'user_1',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Display name of the user',
    example: 'Alice Smith',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Email address of the user',
    example: 'alice@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'URL to avatar image',
    example: 'https://example.com/alice.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
