import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SendMessageHandler, type SendMessageResult } from '../../application/messages/commands/send-message/send-message.handler';
import { SendMediaHandler, type SendMediaResult } from '../../application/messages/commands/send-media/send-media.handler';
import { SendMessageCommand } from '../../application/messages/commands/send-message/send-message.command';
import { SendMediaCommand } from '../../application/messages/commands/send-media/send-media.command';
import { SendMessageDto } from './dto/send-message.dto';
import { SendMediaDto } from './dto/send-media.dto';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly sendMessageHandler: SendMessageHandler,
    private readonly sendMediaHandler: SendMediaHandler,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: SendMessageDto): Promise<SendMessageResult> {
    return this.sendMessageHandler.execute(
      new SendMessageCommand(
        dto.sessionId,
        dto.to,
        dto.text,
        dto.quotedMessageId,
      ),
    );
  }

  @Post('send-media')
  @HttpCode(HttpStatus.OK)
  async sendMedia(@Body() dto: SendMediaDto): Promise<SendMediaResult> {
    const data = Buffer.from(dto.data, 'base64');
    return this.sendMediaHandler.execute(
      new SendMediaCommand(
        dto.sessionId,
        dto.to,
        dto.mimeType,
        dto.fileName,
        data,
        dto.caption,
      ),
    );
  }
}
