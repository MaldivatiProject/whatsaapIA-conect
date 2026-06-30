import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SESSION_SOCKET } from '../../src/application/ports/session-socket.port';
import { SESSION_REPOSITORY } from '../../src/domain/session/session.repository';
import { InMemorySessionRepository } from '../../src/infrastructure/persistence/in-memory.session.repository';
import type { SessionSocketPort } from '../../src/application/ports/session-socket.port';
import { EVENT_PUBLISHER } from '../../src/application/ports/event-publisher.port';
import type { EventPublisherPort } from '../../src/application/ports/event-publisher.port';

class NoopSocketAdapter implements SessionSocketPort {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async sendMessage(): Promise<string> { return 'msg-e2e'; }
  async sendMedia(): Promise<string> { return 'msg-e2e'; }
  isActive(): boolean { return false; }
  getActiveSessions(): never[] { return []; }
}

class NoopEventPublisher implements EventPublisherPort {
  async publish(): Promise<void> {}
  async publishMany(): Promise<void> {}
}

describe('Sessions API (e2e)', () => {
  let app: INestApplication;
  let repo: InMemorySessionRepository;

  beforeAll(async () => {
    repo = new InMemorySessionRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SESSION_SOCKET)
      .useValue(new NoopSocketAdapter())
      .overrideProvider(SESSION_REPOSITORY)
      .useValue(repo)
      .overrideProvider(EVENT_PUBLISHER)
      .useValue(new NoopEventPublisher())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repo.clear();
  });

  describe('GET /sessions', () => {
    it('returns empty array when no sessions', () => {
      return request(app.getHttpServer()).get('/sessions').expect(200).expect([]);
    });
  });

  describe('POST /sessions', () => {
    it('creates a session and returns 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .send({ sessionId: 'e2e-session' })
        .expect(201);

      expect(response.body).toEqual({ sessionId: 'e2e-session' });
    });

    it('returns 409 when session already exists', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .send({ sessionId: 'duplicate' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/sessions')
        .send({ sessionId: 'duplicate' })
        .expect(409);

      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('correlationId');
    });

    it('returns 422 when sessionId has invalid format', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .send({ sessionId: 'invalid id!' })
        .expect(422);
    });
  });

  describe('DELETE /sessions/:id', () => {
    it('deletes existing session and returns 204', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .send({ sessionId: 'to-delete' })
        .expect(201);

      await request(app.getHttpServer()).delete('/sessions/to-delete').expect(204);
    });

    it('returns 404 for non-existent session', async () => {
      await request(app.getHttpServer()).delete('/sessions/ghost').expect(404);
    });
  });

  describe('GET /health', () => {
    it('returns health status', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);
      expect(response.body).toHaveProperty('status');
    });
  });
});
