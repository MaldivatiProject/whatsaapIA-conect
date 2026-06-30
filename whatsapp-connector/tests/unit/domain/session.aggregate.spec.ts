import { Session } from '../../../src/domain/session/session.aggregate';
import { SessionCreatedEvent, QrGeneratedEvent, SessionConnectedEvent } from '../../../src/domain/session/session.events';
import { SessionQrNotAvailableError } from '../../../src/domain/session/session.errors';

describe('Session Aggregate', () => {
  describe('create()', () => {
    it('creates session with pending status and emits SessionCreatedEvent', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });

      expect(session.id).toBe('test-session');
      expect(session.status.kind).toBe('pending');
      expect(session.isConnected).toBe(false);
      expect(session.domainEvents).toHaveLength(1);
      expect(session.domainEvents[0]).toBeInstanceOf(SessionCreatedEvent);
    });

    it('throws when sessionId is empty', () => {
      expect(() => Session.create({ id: '', ownerId: 'tenantA' })).toThrow();
    });

    it('throws when sessionId has invalid characters', () => {
      expect(() => Session.create({ id: 'invalid id!', ownerId: 'tenantA' })).toThrow();
    });

    it('throws when ownerId is empty', () => {
      expect(() => Session.create({ id: 'test-session', ownerId: '' })).toThrow();
    });
  });

  describe('isOwnedBy()', () => {
    it('is true only for the owning tenant', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });
      expect(session.ownerId).toBe('tenantA');
      expect(session.isOwnedBy('tenantA')).toBe(true);
      expect(session.isOwnedBy('tenantB')).toBe(false);
    });
  });

  describe('markQrReady()', () => {
    it('transitions to qr_ready and emits QrGeneratedEvent', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });
      session.clearDomainEvents();

      session.markQrReady('qr-code-data');

      expect(session.status.kind).toBe('qr_ready');
      expect(session.getQrCode()).toBe('qr-code-data');
      expect(session.domainEvents).toHaveLength(1);
      expect(session.domainEvents[0]).toBeInstanceOf(QrGeneratedEvent);
    });
  });

  describe('markConnected()', () => {
    it('transitions to open and emits SessionConnectedEvent', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });
      session.clearDomainEvents();

      session.markConnected('5491122334455');

      expect(session.status.kind).toBe('open');
      expect(session.isConnected).toBe(true);
      expect(session.domainEvents[0]).toBeInstanceOf(SessionConnectedEvent);
    });
  });

  describe('markDisconnected()', () => {
    it('transitions to disconnected status', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });
      session.markConnected('5491122334455');
      session.clearDomainEvents();

      session.markDisconnected('connection_closed');

      expect(session.status.kind).toBe('disconnected');
      expect(session.isConnected).toBe(false);
    });
  });

  describe('getQrCode()', () => {
    it('throws SessionQrNotAvailableError when status is not qr_ready', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });

      expect(() => session.getQrCode()).toThrow(SessionQrNotAvailableError);
    });
  });

  describe('clearDomainEvents()', () => {
    it('clears all accumulated events', () => {
      const session = Session.create({ id: 'test-session', ownerId: 'tenantA' });
      expect(session.domainEvents.length).toBeGreaterThan(0);

      session.clearDomainEvents();

      expect(session.domainEvents).toHaveLength(0);
    });
  });

  describe('reconstitute()', () => {
    it('reconstitutes from snapshot without emitting events', () => {
      const original = Session.create({ id: 'test-session', ownerId: 'tenantA' });
      original.markConnected('5491122334455');
      const snapshot = original.toSnapshot();

      const reconstituted = Session.reconstitute(snapshot);

      expect(reconstituted.id).toBe('test-session');
      expect(reconstituted.ownerId).toBe('tenantA');
      expect(reconstituted.status.kind).toBe('open');
      expect(reconstituted.domainEvents).toHaveLength(0);
    });
  });
});
