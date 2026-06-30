import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BaileysModule } from './infrastructure/baileys/baileys.module';
import { SessionsController } from './api/sessions/sessions.controller';
import { MessagesController } from './api/messages/messages.controller';
import { HealthController } from './api/health/health.controller';
import { CreateSessionHandler } from './application/sessions/commands/create-session/create-session.handler';
import { DeleteSessionHandler } from './application/sessions/commands/delete-session/delete-session.handler';
import { DisconnectSessionHandler } from './application/sessions/commands/disconnect-session/disconnect-session.handler';
import { ListSessionsHandler } from './application/sessions/queries/list-sessions/list-sessions.handler';
import { GetSessionQrHandler } from './application/sessions/queries/get-session-qr/get-session-qr.handler';
import { SendMessageHandler } from './application/messages/commands/send-message/send-message.handler';
import { SendMediaHandler } from './application/messages/commands/send-media/send-media.handler';

@Module({
  imports: [
    BaileysModule,
    TerminusModule,
  ],
  controllers: [
    SessionsController,
    MessagesController,
    HealthController,
  ],
  providers: [
    // Session Commands
    CreateSessionHandler,
    DeleteSessionHandler,
    DisconnectSessionHandler,
    // Session Queries
    ListSessionsHandler,
    GetSessionQrHandler,
    // Message Commands
    SendMessageHandler,
    SendMediaHandler,
  ],
})
export class AppModule {}
