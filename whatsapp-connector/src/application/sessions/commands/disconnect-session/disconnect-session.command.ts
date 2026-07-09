export class DisconnectSessionCommand {
  constructor(readonly sessionId: string, readonly ownerId: string) {}
}
