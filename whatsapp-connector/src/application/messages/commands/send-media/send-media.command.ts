export class SendMediaCommand {
  constructor(
    readonly sessionId: string,
    readonly ownerId: string,
    readonly to: string,
    readonly mimeType: string,
    readonly fileName: string,
    readonly data: Buffer,
    readonly caption?: string,
  ) {}
}
