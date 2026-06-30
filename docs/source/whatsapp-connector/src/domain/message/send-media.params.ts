import type { SessionId } from '../session/session-id.vo';
import { MediaTooLargeError, MimeTypeNotAllowedError } from '../session/session.errors';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface SendMediaParams {
  readonly sessionId: SessionId;
  readonly to: string;
  readonly mediaType: MediaType;
  readonly mimeType: string;
  readonly fileName: string;
  readonly data: Buffer;
  readonly caption?: string;
}

export function validateMediaSize(data: Buffer, maxMb: number): void {
  const sizeMb = data.length / (1024 * 1024);
  if (sizeMb > maxMb) {
    throw new MediaTooLargeError(Math.round(sizeMb * 10) / 10, maxMb);
  }
}

export function validateMimeType(mimeType: string, allowed: string[]): void {
  if (!allowed.includes(mimeType)) {
    throw new MimeTypeNotAllowedError(mimeType);
  }
}

export function inferMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}
