import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CreateSessionCommand } from '../../application/sessions/commands/create-session/create-session.command';
import { CreateSessionHandler } from '../../application/sessions/commands/create-session/create-session.handler';
import { DeleteSessionCommand } from '../../application/sessions/commands/delete-session/delete-session.command';
import { DeleteSessionHandler } from '../../application/sessions/commands/delete-session/delete-session.handler';
import { DisconnectSessionCommand } from '../../application/sessions/commands/disconnect-session/disconnect-session.command';
import { DisconnectSessionHandler } from '../../application/sessions/commands/disconnect-session/disconnect-session.handler';
import { GetSessionQrHandler } from '../../application/sessions/queries/get-session-qr/get-session-qr.handler';
import { ListSessionsHandler, type SessionListItem } from '../../application/sessions/queries/list-sessions/list-sessions.handler';
import { CurrentOwner } from '../../shared/auth/current-owner.decorator';
import { ProblemDetail } from '../../shared/http/problem-detail.dto';
import { CreateSessionDto } from './dto/create-session.dto';

@ApiTags('sessions')
@ApiSecurity('ApiKey')
@ApiResponse({ status: 401, type: ProblemDetail })
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly createSession: CreateSessionHandler,
    private readonly deleteSession: DeleteSessionHandler,
    private readonly disconnectSession: DisconnectSessionHandler,
    private readonly listSessions: ListSessionsHandler,
    private readonly getQr: GetSessionQrHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List sessions owned by the caller' })
  list(@CurrentOwner() ownerId: string): Promise<SessionListItem[]> {
    return this.listSessions.execute(ownerId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Session created' })
  async create(@Body() dto: CreateSessionDto, @CurrentOwner() ownerId: string): Promise<{ sessionId: string }> {
    const sessionId = await this.createSession.execute(new CreateSessionCommand(dto.sessionId, ownerId));
    return { sessionId };
  }

  @Get(':id/qr')
  @ApiResponse({ status: 404, type: ProblemDetail })
  qr(@Param('id') id: string, @CurrentOwner() ownerId: string): Promise<{ qrCode: string; expiresAt: string }> {
    return this.getQr.execute(id, ownerId);
  }

  @Post(':id/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async disconnect(@Param('id') id: string, @CurrentOwner() ownerId: string): Promise<void> {
    await this.disconnectSession.execute(new DisconnectSessionCommand(id, ownerId));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param('id') id: string, @CurrentOwner() ownerId: string): Promise<void> {
    await this.deleteSession.execute(new DeleteSessionCommand(id, ownerId));
  }
}
