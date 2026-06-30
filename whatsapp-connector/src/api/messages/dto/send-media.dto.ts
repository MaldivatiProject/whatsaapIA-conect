import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMediaDto {
  @ApiProperty({ description: 'Session to send from.', example: 'acme-bot' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ description: 'Destination WhatsApp JID.', example: '5491122334455@s.whatsapp.net' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'MIME type of the media (must be in ALLOWED_MIME_TYPES).', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ description: 'File name shown to the recipient.', example: 'invoice.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'Base64-encoded file content. Size (decoded) must be <= MAX_MEDIA_SIZE_MB.',
    example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
  })
  @IsString()
  @IsNotEmpty()
  data!: string;

  @ApiPropertyOptional({ description: 'Optional caption for image/video/document.', example: 'Your invoice', maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}
