import { ApiProperty } from '@nestjs/swagger';

/** RFC 7807/9457 Problem Details — the error contract for every endpoint. */
export class ProblemDetail {
  @ApiProperty({ example: 'https://whatsapp-connector/errors/session-not-found' })
  type!: string;

  @ApiProperty({ example: 'SessionNotFoundError' })
  title!: string;

  @ApiProperty({ example: 404 })
  status!: number;

  @ApiProperty({ example: "Session 'acme-bot' not found" })
  detail!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  correlationId!: string;

  @ApiProperty({ example: '2026-06-30T12:00:00.000Z' })
  timestamp!: string;
}
