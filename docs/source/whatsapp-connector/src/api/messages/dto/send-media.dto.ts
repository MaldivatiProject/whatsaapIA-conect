import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class SendMediaDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  // Base64-encoded file content
  @IsString()
  @IsNotEmpty()
  data!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}
