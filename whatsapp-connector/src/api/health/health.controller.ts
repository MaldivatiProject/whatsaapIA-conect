import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SessionManagerService } from '../../infrastructure/baileys/session-manager.service';
import { Public } from '../../shared/auth/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { SESSION_REPOSITORY, type SessionRepository } from '../../domain/session/session.repository';
import { APP_CONFIG } from '../../application/shared/tokens';
import type { AppConfig } from '../../config/app.config';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly sessionManager: SessionManagerService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('events-monitor')
  @ApiExcludeEndpoint()
  eventsMonitor(@Res() res: Response): void {
    const events = [
      'MESSAGE_RECEIVED', 'PRIVATE_MESSAGE_RECEIVED', 'GROUP_MESSAGE_RECEIVED',
      'MEDIA_RECEIVED', 'MESSAGE_SENT',
      'SESSION_CREATED', 'SESSION_CONNECTED', 'SESSION_DISCONNECTED',
      'SESSION_RECONNECTED', 'QR_GENERATED',
    ];
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Events Monitor — whatsapp-connector</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #0d1117; color: #c9d1d9; min-height: 100vh; display: flex; flex-direction: column; }
    header {
      background: #161b22; border-bottom: 1px solid #30363d;
      padding: 12px 20px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0;
    }
    header h1 { font-size: 14px; font-weight: 600; color: #f0f6fc; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #f85149; }
    .dot.connected { background: #3fb950; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .status { font-size: 12px; color: #8b949e; }
    .filters { margin-left: auto; display: flex; gap: 8px; align-items: center; }
    .filters label { font-size: 12px; color: #8b949e; }
    .filters select, .filters button {
      background: #21262d; border: 1px solid #30363d; color: #c9d1d9;
      border-radius: 6px; padding: 4px 10px; font-size: 12px; font-family: monospace; cursor: pointer;
    }
    .filters button:hover { background: #30363d; }
    #log {
      flex: 1; overflow-y: auto; padding: 12px 20px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .entry {
      background: #161b22; border: 1px solid #21262d; border-radius: 6px;
      padding: 8px 12px; font-size: 12px; line-height: 1.6;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
    .entry.msg    { border-left: 3px solid #3fb950; }
    .entry.sess   { border-left: 3px solid #58a6ff; }
    .entry.media  { border-left: 3px solid #d29922; }
    .entry.error  { border-left: 3px solid #f85149; }
    .ts    { color: #8b949e; margin-right: 8px; }
    .badge {
      display: inline-block; border-radius: 4px; padding: 1px 6px;
      font-size: 11px; font-weight: 600; margin-right: 8px;
    }
    .badge.msg   { background: #1f4a2c; color: #3fb950; }
    .badge.sess  { background: #1a3a5c; color: #58a6ff; }
    .badge.media { background: #3d2c00; color: #d29922; }
    .badge.other { background: #21262d; color: #8b949e; }
    .payload { color: #8b949e; white-space: pre-wrap; word-break: break-all; margin-top: 4px; font-size: 11px; }
    .empty { text-align: center; color: #8b949e; margin-top: 60px; font-size: 14px; }
  </style>
</head>
<body>
<header>
  <div class="dot" id="dot"></div>
  <h1>Events Monitor</h1>
  <span class="status" id="status">Conectando...</span>
  <div class="filters">
    <label>Filtro:</label>
    <select id="filter">
      <option value="all">Todos</option>
      <option value="msg">Mensajes</option>
      <option value="sess">Sesiones</option>
      <option value="media">Media</option>
    </select>
    <button onclick="clearLog()">Limpiar</button>
  </div>
</header>
<div id="log"><div class="empty" id="empty">Esperando eventos...</div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
  const EVENTS = ${JSON.stringify(events)};
  const CATEGORY = {
    MESSAGE_RECEIVED: 'msg', PRIVATE_MESSAGE_RECEIVED: 'msg', GROUP_MESSAGE_RECEIVED: 'msg',
    MEDIA_RECEIVED: 'media', MESSAGE_SENT: 'msg',
    SESSION_CREATED: 'sess', SESSION_CONNECTED: 'sess', SESSION_DISCONNECTED: 'sess',
    SESSION_RECONNECTED: 'sess', QR_GENERATED: 'sess',
  };
  let count = 0;
  const logEl = document.getElementById('log');
  const emptyEl = document.getElementById('empty');
  const dotEl = document.getElementById('dot');
  const statusEl = document.getElementById('status');

  function clearLog() { logEl.innerHTML = ''; count = 0; logEl.appendChild(emptyEl); emptyEl.style.display = ''; }

  function addEntry(name, data) {
    const cat = CATEGORY[name] || 'other';
    const filter = document.getElementById('filter').value;
    const show = filter === 'all' || filter === cat;
    emptyEl.style.display = 'none';
    const ts = new Date().toLocaleTimeString('es', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'entry ' + cat;
    entry.dataset.cat = cat;
    // Don't log qrCode payload (can be large)
    const payload = { ...data };
    if (payload.qrCode) payload.qrCode = '[QR omitido]';
    const tsNode = document.createElement('span');
    tsNode.className = 'ts';
    tsNode.textContent = ts;
    const badge = document.createElement('span');
    badge.className = 'badge ' + cat;
    badge.textContent = name;
    const payloadNode = document.createElement('span');
    payloadNode.className = 'payload';
    payloadNode.textContent = JSON.stringify(payload, null, 2);
    entry.append(tsNode, badge, payloadNode);
    entry.style.display = show ? '' : 'none';
    logEl.insertBefore(entry, logEl.firstChild);
    count++;
    statusEl.textContent = 'Conectado · ' + count + ' evento(s)';
  }

  document.getElementById('filter').addEventListener('change', (e) => {
    const v = e.target.value;
    document.querySelectorAll('.entry').forEach(el => {
      el.style.display = (v === 'all' || el.dataset.cat === v) ? '' : 'none';
    });
  });

  // Reuse the same API key used to open this page so the socket authenticates as the same owner.
  const apiKey = window.sessionStorage.getItem('whatsappConnectorApiKey') || window.prompt('API key') || '';
  if (apiKey) window.sessionStorage.setItem('whatsappConnectorApiKey', apiKey);
  const socket = io({ transports: ['websocket'], auth: { token: apiKey } });
  socket.on('connect', () => {
    dotEl.classList.add('connected');
    statusEl.textContent = 'Conectado · 0 eventos';
  });
  socket.on('unauthorized', (e) => {
    statusEl.textContent = 'No autorizado — recarga e introduce una API key válida';
  });
  socket.on('disconnect', () => {
    dotEl.classList.remove('connected');
    statusEl.textContent = 'Desconectado';
  });
  EVENTS.forEach(name => socket.on(name, data => addEntry(name, data)));
</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
  }

  // Liveness/readiness must succeed without credentials (k8s probes) and must not be throttled.
  @Get()
  @Public()
  @SkipThrottle()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', this.config.HEALTH_MAX_HEAP_MB * 1024 * 1024),
      async () => {
        const activeSessions = this.sessionManager.getActiveSessions();
        await this.sessions.count();
        return {
          whatsapp_sessions: {
            status: 'up' as const,
            activeSessions: activeSessions.length,
          },
        };
      },
    ]);
  }
}
