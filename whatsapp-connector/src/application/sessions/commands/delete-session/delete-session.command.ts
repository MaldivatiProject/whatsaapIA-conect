export class DeleteSessionCommand {
  constructor(readonly sessionId: string, readonly ownerId: string) {}
}
