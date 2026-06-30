import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BaileysModule } from './infrastructure/baileys/baileys.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
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
import { ApiKeyService } from './shared/auth/api-key.service';
import { ApiKeyAuthGuard } from './shared/auth/api-key.guard';
import { getConfig } from './config/app.config';

const config = getConfig();

@Module({
  imports: [
    BaileysModule,
    TerminusModule,
    ObservabilityModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: config.HTTP_RATE_LIMIT_TTL_MS, limit: config.HTTP_RATE_LIMIT_MAX }],
    }),
  ],
  controllers: [
    SessionsController,
    MessagesController,
    HealthController,
  ],
  providers: [
    // Security: API-key authentication runs first, then per-IP throttling.
    ApiKeyService,
    { provide: APP_GUARD, useClass: ApiKeyAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
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
