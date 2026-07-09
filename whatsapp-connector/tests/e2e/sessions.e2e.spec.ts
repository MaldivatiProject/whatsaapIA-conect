import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SESSION_SOCKET } from '../../src/application/ports/session-socket.port';
import { SESSION_REPOSITORY } from '../../src/domain/session/session.repository';
import { InMemorySessionRepository } from '../../src/infrastructure/persistence/in-memory.session.repository';
import type { SessionSocketPort } from '../../src/application/ports/session-socket.port';
import { EVENT_PUBLISHER } from '../../src/application/ports/event-publisher.port';
import type { EventPublisherPort } from '../../src/application/ports/event-publisher.port';
import { DomainExceptionFilter } from '../../src/shared/filters/domain-exception.filter';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception.filter';

// Keys come from tests/setup.ts
const KEY_A = 'supersecretkey-aaaaaaaa';
const KEY_B = 'supersecretkey-bbbbbbbb';

class NoopSocketAdapter implements SessionSocketPort {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async delete(): Promise<void> {}
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(), new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repo.clear();
  });

  describe('authentication', () => {
    it('rejects requests without an API key (401)', async () => {
      await request(app.getHttpServer()).get('/sessions').expect(401);
    });

    it('rejects an invalid API key (401)', async () => {
      await request(app.getHttpServer()).get('/sessions').set('x-api-key', 'wrong').expect(401);
    });
  });

  describe('GET /sessions', () => {
    it('returns empty array for an authenticated owner with no sessions', () => {
      return request(app.getHttpServer()).get('/sessions').set('x-api-key', KEY_A).expect(200).expect([]);
    });
  });

  describe('POST /sessions', () => {
    it('creates a session and returns 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('x-api-key', KEY_A)
        .send({ sessionId: 'e2e-session' })
        .expect(201);

      expect(response.body).toEqual({ sessionId: 'e2e-session' });
    });

    it('returns 409 when session already exists', async () => {
      await request(app.getHttpServer()).post('/sessions').set('x-api-key', KEY_A).send({ sessionId: 'duplicate' }).expect(201);

      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('x-api-key', KEY_A)
        .send({ sessionId: 'duplicate' })
        .expect(409);

      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('correlationId');
    });

    it('returns 422 when sessionId has invalid format', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .set('x-api-key', KEY_A)
        .send({ sessionId: 'invalid id!' })
        .expect(422);
    });
  });

  describe('multi-tenant isolation (BOLA)', () => {
    it('does not list or expose another owner\'s session', async () => {
      await request(app.getHttpServer()).post('/sessions').set('x-api-key', KEY_A).send({ sessionId: 'owned-by-a' }).expect(201);

      // tenantB cannot see it
      await request(app.getHttpServer()).get('/sessions').set('x-api-key', KEY_B).expect(200).expect([]);
      // tenantB cannot delete it (404, not 403)
      await request(app.getHttpServer()).delete('/sessions/owned-by-a').set('x-api-key', KEY_B).expect(404);
      // Every id-taking endpoint must conceal cross-owner resources.
      await request(app.getHttpServer()).get('/sessions/owned-by-a/qr').set('x-api-key', KEY_B).expect(404);
      await request(app.getHttpServer()).post('/sessions/owned-by-a/disconnect').set('x-api-key', KEY_B).expect(404);
      await request(app.getHttpServer())
        .post('/messages/send')
        .set('x-api-key', KEY_B)
        .send({ sessionId: 'owned-by-a', to: '573001234567@s.whatsapp.net', text: 'blocked' })
        .expect(404);
      await request(app.getHttpServer())
        .post('/messages/send-media')
        .set('x-api-key', KEY_B)
        .send({
          sessionId: 'owned-by-a',
          to: '573001234567@s.whatsapp.net',
          mimeType: 'image/png',
          fileName: 'pixel.png',
          data: 'iVBORw0KGgo=',
        })
        .expect(404);
    });
  });

  describe('DELETE /sessions/:id', () => {
    it('deletes existing session and returns 204', async () => {
      await request(app.getHttpServer()).post('/sessions').set('x-api-key', KEY_A).send({ sessionId: 'to-delete' }).expect(201);
      await request(app.getHttpServer()).delete('/sessions/to-delete').set('x-api-key', KEY_A).expect(204);
    });

    it('returns 404 for non-existent session', async () => {
      await request(app.getHttpServer()).delete('/sessions/ghost').set('x-api-key', KEY_A).expect(404);
    });
  });

  describe('GET /health', () => {
    it('is public and returns health status', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);
      expect(response.body).toHaveProperty('status');
    });
  });
});
