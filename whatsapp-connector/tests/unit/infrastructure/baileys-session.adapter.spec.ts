import { downloadMediaMessage } from '@whiskeysockets/baileys';
import type { WAMessage } from '@whiskeysockets/baileys';
import { BaileysSessionAdapter } from '../../../src/infrastructure/baileys/baileys-session.adapter';
import { SessionManagerService } from '../../../src/infrastructure/baileys/session-manager.service';
import { MessageReceivedEvent } from '../../../src/domain/session/session.events';
import type { SessionRepository } from '../../../src/domain/session/session.repository';
import type { EventPublisherPort } from '../../../src/application/ports/event-publisher.port';
import type { AppConfig } from '../../../src/config/app.config';

type PrivateAdapter = { handleIncomingMessage: (sessionId: string, msg: WAMessage) => Promise<void> };

function buildAdapter(publishMany: jest.Mock): BaileysSessionAdapter {
  const sessions: SessionRepository = {
    findById: jest.fn(),
    findByIdAndOwner: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAllByOwner: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteOwned: jest.fn(),
    count: jest.fn(),
  };
  const eventPublisher: EventPublisherPort = { publish: jest.fn(), publishMany };
  const config = { MAX_MEDIA_SIZE_MB: 1 } as AppConfig;
  return new BaileysSessionAdapter(new SessionManagerService(), sessions, eventPublisher, config, null);
}

function documentMessage(overrides: {
  mimetype?: string;
  fileName?: string;
  id?: string;
}): WAMessage {
  return {
    key: { id: overrides.id ?? 'msg-1', remoteJid: '573000000000@s.whatsapp.net', fromMe: false },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: 'Tester',
    message: {
      documentMessage: {
        mimetype: overrides.mimetype ?? 'text/csv',
        fileName: overrides.fileName ?? 'traslados.csv',
      },
    },
  } as unknown as WAMessage;
}

describe('BaileysSessionAdapter — CSV attachment download', () => {
  beforeEach(() => {
    (downloadMediaMessage as jest.Mock).mockReset();
  });

  it('downloads a CSV document and embeds it as base64 on MessageReceivedEvent', async () => {
    (downloadMediaMessage as jest.Mock).mockResolvedValue(Buffer.from('Cedula;Nombre\n123;Ana'));
    const publishMany = jest.fn();
    const adapter = buildAdapter(publishMany);

    await (adapter as unknown as PrivateAdapter).handleIncomingMessage(
      'session-1',
      documentMessage({}),
    );

    const events = publishMany.mock.calls[0][0] as MessageReceivedEvent[];
    const received = events.find((e) => e instanceof MessageReceivedEvent) as MessageReceivedEvent;
    expect(received.attachment).toEqual({
      mimeType: 'text/csv',
      fileName: 'traslados.csv',
      base64: Buffer.from('Cedula;Nombre\n123;Ana').toString('base64'),
    });
  });

  it('recognizes .csv by filename even with a generic mimetype', async () => {
    (downloadMediaMessage as jest.Mock).mockResolvedValue(Buffer.from('data'));
    const publishMany = jest.fn();
    const adapter = buildAdapter(publishMany);

    await (adapter as unknown as PrivateAdapter).handleIncomingMessage(
      'session-1',
      documentMessage({ mimetype: 'application/octet-stream', fileName: 'traslados.CSV' }),
    );

    const events = publishMany.mock.calls[0][0] as MessageReceivedEvent[];
    const received = events.find((e) => e instanceof MessageReceivedEvent) as MessageReceivedEvent;
    expect(received.attachment?.base64).toBe(Buffer.from('data').toString('base64'));
  });

  it('does not download or attach non-CSV documents', async () => {
    const publishMany = jest.fn();
    const adapter = buildAdapter(publishMany);

    await (adapter as unknown as PrivateAdapter).handleIncomingMessage(
      'session-1',
      documentMessage({ mimetype: 'application/pdf', fileName: 'contrato.pdf' }),
    );

    expect(downloadMediaMessage).not.toHaveBeenCalled();
    const events = publishMany.mock.calls[0][0] as MessageReceivedEvent[];
    const received = events.find((e) => e instanceof MessageReceivedEvent) as MessageReceivedEvent;
    expect(received.attachment).toBeUndefined();
  });

  it('drops the attachment (but keeps the message) when it exceeds MAX_MEDIA_SIZE_MB', async () => {
    (downloadMediaMessage as jest.Mock).mockResolvedValue(Buffer.alloc(2 * 1024 * 1024));
    const publishMany = jest.fn();
    const adapter = buildAdapter(publishMany);

    await (adapter as unknown as PrivateAdapter).handleIncomingMessage(
      'session-1',
      documentMessage({}),
    );

    const events = publishMany.mock.calls[0][0] as MessageReceivedEvent[];
    const received = events.find((e) => e instanceof MessageReceivedEvent) as MessageReceivedEvent;
    expect(received.attachment).toBeUndefined();
  });

  it('drops the attachment (but keeps the message) when the download throws', async () => {
    (downloadMediaMessage as jest.Mock).mockRejectedValue(new Error('media expired'));
    const publishMany = jest.fn();
    const adapter = buildAdapter(publishMany);

    await (adapter as unknown as PrivateAdapter).handleIncomingMessage(
      'session-1',
      documentMessage({}),
    );

    const events = publishMany.mock.calls[0][0] as MessageReceivedEvent[];
    const received = events.find((e) => e instanceof MessageReceivedEvent) as MessageReceivedEvent;
    expect(received.attachment).toBeUndefined();
  });
});
