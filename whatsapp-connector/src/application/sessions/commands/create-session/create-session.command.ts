export class CreateSessionCommand {
  constructor(
    readonly sessionId: string,
    readonly ownerId: string,
  ) {}
}
