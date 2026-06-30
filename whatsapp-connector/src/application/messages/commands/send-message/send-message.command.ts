export class SendMessageCommand {
  constructor(
    readonly sessionId: string,
    readonly ownerId: string,
    readonly to: string,
    readonly text: string,
    readonly quotedMessageId?: string,
  ) {}
}
