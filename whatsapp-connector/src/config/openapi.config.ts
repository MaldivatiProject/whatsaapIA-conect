import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { isSwaggerEnabled, type AppConfig } from './app.config';

/**
 * Builds the OpenAPI 3 document from controller/DTO decorators, serves Swagger UI
 * at /docs (when enabled) and persists the spec to api/openapi/ as a deliverable
 * consumable by frontend, QA and integration.
 */
export function setupOpenApi(app: INestApplication, config: AppConfig): void {
  const logger = new Logger('OpenAPI');

  const docConfig = new DocumentBuilder()
    .setTitle('WhatsApp Connector API')
    .setDescription(
      'Adapter/Gateway service for WhatsApp connectivity (Baileys). ' +
        'Manages sessions and sends messages/media. All endpoints (except /health) ' +
        'require an API key in the `x-api-key` header; sessions are isolated per owner.',
    )
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'ApiKey')
    .addSecurityRequirements('ApiKey')
    .addTag('sessions', 'WhatsApp session lifecycle: create, QR, reconnect, delete')
    .addTag('messages', 'Outbound text and media messages')
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);

  if (isSwaggerEnabled(config)) {
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'WhatsApp Connector API',
    });
    logger.log('Swagger UI available at /docs');
  }

  // Persist the spec as a build artifact (best-effort — filesystem may be read-only).
  try {
    const dir = join(process.cwd(), 'api', 'openapi');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'whatsapp-connector.openapi.json'),
      JSON.stringify(document, null, 2),
      'utf-8',
    );
  } catch {
    // Non-fatal: the served /docs spec is the source of truth.
  }
}
