import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Session to send from.', example: 'acme-bot' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({
    description: 'Destination WhatsApp JID (number@s.whatsapp.net or group@g.us).',
    example: '5491122334455@s.whatsapp.net',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Message body.', example: 'Hello from the connector!', maxLength: 4096 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text!: string;

  @ApiPropertyOptional({ description: 'Message id to quote/reply to.', example: '3EB0XXXX' })
  @IsOptional()
  @IsString()
  quotedMessageId?: string;
}
