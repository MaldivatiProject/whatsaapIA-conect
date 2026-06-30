import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation, ApiCreatedResponse, ApiResponse } from '@nestjs/swagger';
import { SendMessageHandler, type SendMessageResult } from '../../application/messages/commands/send-message/send-message.handler';
import { SendMediaHandler, type SendMediaResult } from '../../application/messages/commands/send-media/send-media.handler';
import { SendMessageCommand } from '../../application/messages/commands/send-message/send-message.command';
import { SendMediaCommand } from '../../application/messages/commands/send-media/send-media.command';
import { SendMessageDto } from './dto/send-message.dto';
import { SendMediaDto } from './dto/send-media.dto';
import { CurrentOwner } from '../../shared/auth/current-owner.decorator';
import { ProblemDetail } from '../../shared/http/problem-detail.dto';

@ApiTags('messages')
@ApiSecurity('ApiKey')
@ApiResponse({ status: 401, description: 'Missing or invalid API key', type: ProblemDetail })
@ApiResponse({ status: 404, description: 'Session not found (or not owned by caller)', type: ProblemDetail })
@ApiResponse({ status: 409, description: 'Session not connected', type: ProblemDetail })
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly sendMessageHandler: SendMessageHandler,
    private readonly sendMediaHandler: SendMediaHandler,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a text message' })
  @ApiCreatedResponse({ description: 'Message accepted and sent' })
  async send(
    @Body() dto: SendMessageDto,
    @CurrentOwner() ownerId: string,
  ): Promise<SendMessageResult> {
    return this.sendMessageHandler.execute(
      new SendMessageCommand(
        dto.sessionId,
        ownerId,
        dto.to,
        dto.text,
        dto.quotedMessageId,
      ),
    );
  }

  @Post('send-media')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send media (image, video, audio, document)' })
  @ApiCreatedResponse({ description: 'Media accepted and sent' })
  @ApiResponse({ status: 413, description: 'Media exceeds MAX_MEDIA_SIZE_MB', type: ProblemDetail })
  @ApiResponse({ status: 415, description: 'MIME type not allowed', type: ProblemDetail })
  async sendMedia(
    @Body() dto: SendMediaDto,
    @CurrentOwner() ownerId: string,
  ): Promise<SendMediaResult> {
    const data = Buffer.from(dto.data, 'base64');
    return this.sendMediaHandler.execute(
      new SendMediaCommand(
        dto.sessionId,
        ownerId,
        dto.to,
        dto.mimeType,
        dto.fileName,
        data,
        dto.caption,
      ),
    );
  }
}
