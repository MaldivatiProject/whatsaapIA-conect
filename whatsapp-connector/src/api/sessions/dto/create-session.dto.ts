import { IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'acme-bot', pattern: '^[a-zA-Z0-9_-]{1,64}$' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  sessionId!: string;
}
