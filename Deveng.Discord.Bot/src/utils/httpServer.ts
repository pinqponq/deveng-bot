import { Server } from 'http';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendReactionRoleToChannel, deleteReactionRoleMessage } from './reactionRoleSender';
import { sendTicketPanelToChannel } from './ticketPanelSender';
import { sendTicketStaffMessageToChannel } from './ticketStaffMessageSender';
import { sendEmbedMessageToChannel } from './embedMessageSender';
import { sendPollToChannel, sendPollResultToChannel } from './pollSender';
import { sendGiveawayToChannel } from './giveawaySender';
import { updateAllStatisticsChannels, updateStatisticsChannelByType, createStatisticsChannel, deleteStatisticsChannel } from './statisticsChannel';
import { deleteDiscordLogChannels } from './logChannelDiscordCleanup';
import { getClient } from '../botEntry';
import { registerGuildCommands } from './registerCommands';
import { customBotManager } from './customBotManager';
import { getBotClientIdFromHeaders, getBotClient } from './botClientHelper';
import { runWithApiToken, apiRequest } from './apiClient';
import { logError } from './logger';
import { tryAcquireRedisLock } from './redisCache';
import { musicManager } from '../music/musicManager';
import type { PendingReminderPayload } from '../events/reminderDelivery';

// HMAC-SHA256 shared secret — boş olamaz (fail-closed)
const BOT_SHARED_SECRET = (process.env.BOT_SHARED_SECRET || '').trim();
const BOT_CORS_ORIGIN = (process.env.BOT_CORS_ORIGIN || '').trim();
/** Dar pencere: replay süresini kısaltır (eski: 5 dk). */
const TIMESTAMP_TOLERANCE_MS = 90 * 1000;
/** Resource exhaustion protection: body 256 KB üstü reddedilir (mevcut payload'lar çok altında). */
const MAX_BODY_BYTES = 256 * 1024;
/** Slowloris koruması: tek isteğin (header + gövde) tamamlanması için üst süre sınırı. */
const REQUEST_TIMEOUT_MS = 30 * 1000;

/**
 * Gelen isteğin HMAC-SHA256 imzasını doğrular.
 * Header'lar: X-Bot-Timestamp (ms), X-Bot-Signature (hex)
 * İmzalanan mesaj: timestamp + rawBody
 */
function verifyHmacSignature(ts: string, rawBody: string, sig: string): boolean {
  if (!BOT_SHARED_SECRET) return false;
  const drift = Math.abs(Date.now() - Number(ts));
  if (isNaN(drift) || drift > TIMESTAMP_TOLERANCE_MS) return false;
  const expected = createHmac('sha256', BOT_SHARED_SECRET)
    .update(ts + rawBody)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

/** İsteğin HMAC imzasını doğrular. Health endpoint hariç tüm route'lara uygulanır. */
async function authenticateRequest(req: IncomingMessage, rawBody: string): Promise<boolean> {
  const ts = (req.headers['x-bot-timestamp'] as string) || '';
  const sig = (req.headers['x-bot-signature'] as string) || '';

  if (!ts || !sig) return false;
  return verifyHmacSignature(ts, rawBody, sig);
}

function resolveCorsAllowOrigin(): string {
  if (BOT_CORS_ORIGIN) return BOT_CORS_ORIGIN;
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] BOT_CORS_ORIGIN tanımlı değil');
    process.exit(1);
  }
  return 'http://localhost:9000';
}

let httpServer: Server | null = null;

function classifyMusicError(message: string): number {
  const normalized = message.toLowerCase();
  if (
    message.includes('Spotify') ||
    message.includes('Şarkı bulunamadı') ||
    message.includes('ses kanalı') ||
    message.includes('aktif müzik oynatıcısı yok') ||
    message.includes('Müzik isteği bağlantı kesme sonrası iptal edildi') ||
    message.includes('Bu YouTube videosu kısıtlı') ||
    normalized.includes('requires login') ||
    normalized.includes('allclientsfailed') ||
    normalized.includes('player configuration') ||
    normalized.includes('sign in to confirm') ||
    normalized.includes('not a bot') ||
    normalized.includes('invalid status code for player api response') ||
    message.includes('desteklenmiyor') ||
    message.includes('geçersiz') ||
    message.includes('Söz aramak') ||
    message.includes('söz bulunamadı') ||
    message.includes('aktif şarkı yok')
  ) {
    return 422;
  }

  if (message.includes('Lavalink arama hatası') || message.includes('Lavalink bağlantısı') || message.includes('fetch failed') || message.includes('timeout')) {
    return 502;
  }

  if (normalized.includes('hazır değil')) {
    return 503;
  }

  return 500;
}

export function startHttpServer(port: number = 3005): Promise<void> {
  if (httpServer) {
    console.log('[WARN] HTTP server zaten çalışıyor.');
    return Promise.resolve();
  }

  if (!BOT_SHARED_SECRET) {
    console.error('[FATAL] BOT_SHARED_SECRET zorunludur. Bot HTTP sunucusu başlatılamıyor.');
    process.exit(1);
  }

  const allowedOrigin = resolveCorsAllowOrigin();

  const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
    if (res.headersSent) return;
    try {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } catch (error) {
      logError('httpServer:sendJson', error, 'debug');
    }
  };

  httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Dış try: auth/body aşaması da dahil — async handler unhandledRejection üretmesin.
    try {
    // Slowloris / asılı istek koruması: soket verilen süre içinde tamamlanmazsa bağlantıyı düşür.
    // (Gövde tamponlaması MAX_BODY_BYTES ile boyutu, bu da SÜREYİ sınırlar.)
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      sendJson(res, 408, { error: 'Request timeout' });
      req.destroy();
    });

    const origin = req.headers['origin'] || '';

    // CORS — yalnızca yapılandırılmış origin
    if (!origin || origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bot-Token, X-Bot-Timestamp, X-Bot-Signature, X-Bot-ClientId');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const startTime = Date.now();
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const botClientIdHeader = (req.headers['x-bot-clientid'] as string) || 'N/A';
    console.log(`[Bot HTTP] --> ${req.method} ${pathname} trace=${traceId} botClientId=${botClientIdHeader}`);

    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function (statusCode: number, ...args: any[]) {
      const durationMs = Date.now() - startTime;
      console.log(`[Bot HTTP] <-- ${req.method} ${pathname} ${statusCode} (${durationMs}ms)`);
      return originalWriteHead(statusCode as any, ...args);
    };

    // Body'yi önce tampon olarak oku (HMAC doğrulaması + JSON parse için).
    // Body cap: MAX_BODY_BYTES'in üstüne çıkarsa bağlantı kapatılır (DoS koruması).
    let bodyTooLarge = false;
    const rawBody: string = await new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let total = 0;
      req.on('data', (chunk) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buf.length;
        if (total > MAX_BODY_BYTES) {
          bodyTooLarge = true;
          req.destroy();
          resolve('');
          return;
        }
        chunks.push(buf);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      req.on('error', () => resolve(''));
      // Soket timeout/abort ile düşerse promise askıda kalmasın (resolve tek sefer etkilidir).
      req.on('aborted', () => resolve(''));
      req.on('close', () => resolve(''));
    });

    if (bodyTooLarge) {
      sendJson(res, 413, { error: 'Payload too large' });
      return;
    }

    // /health endpoint'i auth gerektirmez
    if (pathname !== '/health') {
      const authed = await authenticateRequest(req, rawBody);
      if (!authed) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const ts = (req.headers['x-bot-timestamp'] as string) || '';
      const sig = (req.headers['x-bot-signature'] as string) || '';
      // Redis yok/hata → fail-closed (API ServiceHmacVerifier ile aynı posture)
      const replayOk = await tryAcquireRedisLock(`bot:http:hmac:${ts}:${sig.slice(0, 64)}`, 130);
      if (!replayOk) {
        sendJson(res, 401, { error: 'Replay or duplicate request' });
        return;
      }
    }

    try {

      // Reaction role gönderme endpoint'i (panel Id)
      if (pathname.startsWith('/api/bot/send-reaction-role/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/send-reaction-role/', '').replace(/\/$/, '');
        const reactionRoleId = parseInt(idStr, 10);
        if (!idStr || Number.isNaN(reactionRoleId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli reaction role panel Id gerekli' }));
          return;
        }

        // Bot clientId ve API token'ı header'dan al (API'den gelen token 401 önlemek için)
        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;

        try {
          await runWithApiToken(apiToken, () => sendReactionRoleToChannel(reactionRoleId, botClientId));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Reaction role mesajı gönderildi',
            reactionRoleId,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Reaction role gönderme hatası (PanelId: ${reactionRoleId}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            reactionRoleId,
          }));
        }
        return;
      }

      // Reaction role kanal mesajını sil (panel Id)
      if (pathname.startsWith('/api/bot/delete-reaction-role-message/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/delete-reaction-role-message/', '').replace(/\/$/, '');
        const reactionRoleId = parseInt(idStr, 10);
        if (!idStr || Number.isNaN(reactionRoleId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli reaction role panel Id gerekli' }));
          return;
        }

        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;

        try {
          await runWithApiToken(apiToken, () => deleteReactionRoleMessage(reactionRoleId, botClientId));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              message: 'Reaction role kanal mesajı kaldırıldı',
              reactionRoleId,
            })
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Reaction role mesaj silme (PanelId: ${reactionRoleId}):`, errorMessage);

          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: errorMessage,
              reactionRoleId,
            })
          );
        }
        return;
      }

      // Ticket panel gönderme endpoint'i
      if (pathname.startsWith('/api/bot/send-ticket-panel/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/send-ticket-panel/', '');
        
        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        // Bot clientId'sini header'dan al
        const botClientId = getBotClientIdFromHeaders(req.headers);

        try {
          await sendTicketPanelToChannel(guildId, botClientId);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Ticket panel mesajı gönderildi',
            guildId 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Ticket panel gönderme hatası (GuildId: ${guildId}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            guildId 
          }));
        }
        return;
      }

      // Talep kanalına panel yetkilisi mesajı
      if (pathname.startsWith('/api/bot/send-ticket-staff-message/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/send-ticket-staff-message/', '').replace(/\/$/, '');
        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }
        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;
        let parsed: {
          channelId?: string;
          content?: string;
          embedTitle?: string | null;
          embedDescription?: string | null;
          embedColor?: string | null;
          staffUserId?: string;
        };
        try {
          parsed = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçersiz JSON' }));
          return;
        }
        if (!parsed.channelId || !parsed.staffUserId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'channelId ve staffUserId gerekli' }));
          return;
        }
        try {
          await runWithApiToken(apiToken, () =>
            sendTicketStaffMessageToChannel(
              guildId,
              {
                channelId: parsed.channelId!,
                content: parsed.content || '',
                embedTitle: parsed.embedTitle,
                embedDescription: parsed.embedDescription,
                embedColor: parsed.embedColor,
                staffUserId: parsed.staffUserId!,
              },
              botClientId
            )
          );
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, guildId }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Ticket staff mesajı (GuildId: ${guildId}):`, errorMessage);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage }));
        }
        return;
      }

      // Düz metin kanal mesajı (GitHub webhook vb.)
      if (pathname === '/api/bot/post-plain-text' && req.method === 'POST') {
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;
        try {
          const payload = JSON.parse(rawBody || '{}') as { guildId?: string; channelId?: string; content?: string };
          if (!payload.guildId || !payload.channelId || !payload.content) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'guildId, channelId ve content zorunlu' }));
            return;
          }
          const text = String(payload.content).slice(0, 2000);
          await runWithApiToken(apiToken, async () => {
            const client = getClient();
            if (!client) throw new Error('Bot istemcisi hazır değil');
            const gid = payload.guildId!;
            const cid = payload.channelId!;
            const guild = client.guilds.cache.get(gid) ?? await client.guilds.fetch(gid).catch((error) => { logError('httpServer:fetchGuildPlainText', error, 'debug'); return null; });
            if (!guild) throw new Error('Guild bulunamadı');
            const ch =
              guild.channels.cache.get(cid) ?? (await guild.channels.fetch(cid).catch((error) => { logError('httpServer:fetchChannelPlainText', error, 'debug'); return null; }));
            if (!ch?.isTextBased()) throw new Error('Kanal bulunamadı veya metin kanalı değil');
            await ch.send({ content: text });
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, traceId }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] post-plain-text (GuildId: ${(JSON.parse(rawBody || '{}') as { guildId?: string }).guildId}):`, errorMessage);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage, traceId }));
        }
        return;
      }

      // Embed mesaj gönderme endpoint'i
      if (pathname.startsWith('/api/bot/send-embed-message/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/send-embed-message/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        // Bot clientId ve API token'ı header'dan al (API'den gelen token 401 önlemek için kullanılır)
        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;
        console.log(`[Bot HTTP][embed] accepted request trace=${traceId} id=${id} botClientId=${botClientId || 'N/A'} apiTokenProvided=${!!apiToken}`);
        
        try {
          const sendStart = Date.now();
          console.log(`[Bot HTTP][embed] start sendEmbedMessageToChannel trace=${traceId} id=${id}`);
          await sendEmbedMessageToChannel(id, botClientId, apiToken);
          console.log(`[Bot HTTP][embed] sendEmbedMessageToChannel completed trace=${traceId} id=${id} durationMs=${Date.now() - sendStart}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Embed mesajı gönderildi',
            id,
            traceId
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Embed mesaj gönderme hatası trace=${traceId} (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id,
            traceId
          }));
        }
        return;
      }

      // Anket gönderme endpoint'i
      if (pathname.startsWith('/api/bot/send-poll/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/send-poll/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        // Bot clientId ve API token'ı header'dan al (API'den gelen token geri çağrılarda kullanılır)
        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;

        try {
          await sendPollToChannel(id, botClientId, apiToken);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Anket mesajı gönderildi',
            id 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Anket gönderme hatası (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id 
          }));
        }
        return;
      }

      // Anket sonuç mesajı gönderme endpoint'i
      if (pathname.startsWith('/api/bot/send-poll-result/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/send-poll-result/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        // Bot clientId ve API token'ı header'dan al (API'den gelen token geri çağrılarda kullanılır)
        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;

        try {
          await sendPollResultToChannel(id, botClientId, apiToken);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Anket sonuç mesajı gönderildi',
            id 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Anket sonuç mesajı gönderme hatası (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id 
          }));
        }
        return;
      }

      // Çekiliş gönderme endpoint'i
      if (pathname.startsWith('/api/bot/send-giveaway/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/send-giveaway/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        // Bot clientId ve API token'ı header'dan al (API'den gelen token geri çağrılarda kullanılır)
        const botClientId = getBotClientIdFromHeaders(req.headers);
        const apiToken = (req.headers['x-bot-token'] as string) || undefined;

        try {
          await sendGiveawayToChannel(id, botClientId, apiToken);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Çekiliş mesajı gönderildi',
            id 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Çekiliş gönderme hatası (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id 
          }));
        }
        return;
      }

      // İstatistik kanalı oluşturma endpoint'i
      if (pathname.startsWith('/api/bot/create-statistics-channel/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/create-statistics-channel/', '');
        
        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        // Bot clientId'sini header'dan al
        const botClientId = getBotClientIdFromHeaders(req.headers);

        try {
          if (!rawBody) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body gerekli' }));
            return;
          }

          const parsed = JSON.parse(rawBody);
          const { counterType, channelNameFormat } = parsed;

          if (!counterType) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'CounterType gerekli' }));
            return;
          }

          const result = await createStatisticsChannel(guildId, counterType, channelNameFormat, botClientId);
          
          if (!result) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Kanal oluşturulamadı',
              guildId 
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'İstatistik kanalı oluşturuldu',
            guildId,
            counterType,
            channelId: result.channelId,
            channelName: result.channelName
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] İstatistik kanalı oluşturma hatası (GuildId: ${guildId}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            guildId 
          }));
        }
        return;
      }

      // İstatistik kanalı silme endpoint'i
      if (pathname.startsWith('/api/bot/delete-statistics-channel/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/delete-statistics-channel/', '');
        
        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        // Bot clientId'sini header'dan al
        const botClientId = getBotClientIdFromHeaders(req.headers);

        try {
          if (!rawBody) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body gerekli' }));
            return;
          }

          const parsed = JSON.parse(rawBody);
          const { channelId } = parsed;

          if (!channelId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'ChannelId gerekli' }));
            return;
          }

          const result = await deleteStatisticsChannel(guildId, channelId, botClientId);
          
          if (!result) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Kanal silinemedi',
              guildId,
              channelId
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'İstatistik kanalı silindi',
            guildId,
            channelId
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] İstatistik kanalı silme hatası (GuildId: ${guildId}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            guildId 
          }));
        }
        return;
      }

      // Log kanallarını Discord'dan toplu sil (API panel — HMAC korumalı)
      if (pathname.startsWith('/api/bot/delete-log-channels/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/delete-log-channels/', '').replace(/\/$/, '');

        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        const botClientId = getBotClientIdFromHeaders(req.headers);

        try {
          if (!rawBody) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body gerekli' }));
            return;
          }

          const parsed = JSON.parse(rawBody) as { channelIds?: unknown };
          const rawList = parsed.channelIds;
          const channelIds = Array.isArray(rawList)
            ? rawList.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            : [];

          if (channelIds.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'channelIds dizisi gerekli' }));
            return;
          }

          const { deleted, skipped } = await deleteDiscordLogChannels(guildId, channelIds, botClientId);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              message: 'Log kanalı silme isteği işlendi',
              guildId,
              deleted,
              skipped,
            })
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Log kanalları Discord silme (GuildId: ${guildId}):`, errorMessage);

          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: errorMessage,
              guildId,
            })
          );
        }
        return;
      }

      // İstatistik kanalı güncelleme endpoint'i
      if (pathname.startsWith('/api/bot/update-statistics-channel/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/update-statistics-channel/', '');
        
        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        // Bot clientId'sini header'dan al
        const botClientId = getBotClientIdFromHeaders(req.headers);

        try {
          let counterType: string | undefined;
          if (rawBody) {
            const parsed = JSON.parse(rawBody);
            counterType = parsed.counterType;
          }

          if (counterType) {
            await updateStatisticsChannelByType(guildId, counterType, botClientId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: 'İstatistik kanalı güncellendi',
              guildId,
              counterType
            }));
          } else {
            await updateAllStatisticsChannels(guildId, botClientId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Tüm istatistik kanalları güncellendi',
              guildId
            }));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] İstatistik kanalı güncelleme hatası (GuildId: ${guildId}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            guildId 
          }));
        }
        return;
      }

      // Worker/planlanmış işler: dağıtık poll sonlandırma + istatistik taraması + tek hatırlatıcı teslimi (HMAC zorunlu)
      if (pathname === '/api/bot/run-expired-poll-scan' && req.method === 'POST') {
        try {
          const host = getClient();
          if (!host) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Discord client hazır değil' }));
            return;
          }
          const { runDistributedExpiredPollSweep } = await import('./shardDistributedJobs.js');
          await runDistributedExpiredPollSweep(host);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[ERROR] run-expired-poll-scan:', errorMessage);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage }));
        }
        return;
      }

      if (pathname === '/api/bot/run-statistics-refresh-scan' && req.method === 'POST') {
        try {
          const host = getClient();
          if (!host) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Discord client hazır değil' }));
            return;
          }
          const { runDistributedStatisticsSweep } = await import('./shardDistributedJobs.js');
          await runDistributedStatisticsSweep(host);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[ERROR] run-statistics-refresh-scan:', errorMessage);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage }));
        }
        return;
      }

      if (pathname === '/api/bot/dispatch-reminder' && req.method === 'POST') {
        try {
          if (!rawBody) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body gerekli' }));
            return;
          }
          const body = JSON.parse(rawBody) as {
            reminderId?: number;
            dedupeKey?: string;
            correlationId?: string;
            messageId?: string;
          };
          const reminderId = Number(body.reminderId);
          if (!Number.isFinite(reminderId) || reminderId <= 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Geçerli reminderId gerekli' }));
            return;
          }

          const correlationId =
            (req.headers['x-correlation-id'] as string)?.trim() || body.correlationId?.trim();
          const messageId = (req.headers['x-message-id'] as string)?.trim() || body.messageId?.trim();
          const dedupeKey =
            typeof body.dedupeKey === 'string' && body.dedupeKey.trim().length > 0
              ? body.dedupeKey.trim()
              : `reminder:${reminderId}`;

          const { tryReminderDispatchDedupe } = await import('./redisCache.js');
          const dedupeOk = await tryReminderDispatchDedupe(dedupeKey, 180);
          if (!dedupeOk) {
            const msg = `[dispatch-reminder] dedupe skip reminderId=${reminderId} dedupeKey=${dedupeKey} correlationId=${correlationId || '-'} messageId=${messageId || '-'}`;
            console.warn(msg);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, reminderId, deduped: true }));
            return;
          }

          const botClientIdHeader = getBotClientIdFromHeaders(req.headers);
          const apiToken = (req.headers['x-bot-token'] as string) || undefined;

          await runWithApiToken(apiToken, async () => {
            const reminder = await apiRequest<PendingReminderPayload>(
              `/api/Reminder/${reminderId}`,
              { method: 'GET' },
              botClientIdHeader || undefined,
              apiToken
            );
            const client = getBotClient(botClientIdHeader || undefined);
            const { dispatchReminderForShard } = await import('../events/reminderShardDispatch.js');
            await dispatchReminderForShard(client, reminder);
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, reminderId }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[ERROR] dispatch-reminder:', errorMessage);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errorMessage }));
        }
        return;
      }

      // Komutları yeniden kaydetme endpoint'i (özellik durumu değiştiğinde)
      if (pathname.startsWith('/api/bot/reload-commands/') && req.method === 'POST') {
        const guildId = pathname.replace('/api/bot/reload-commands/', '');
        
        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        // Bot clientId'sini header'dan al
        const botClientId = getBotClientIdFromHeaders(req.headers);

        try {
          let client = botClientId ? customBotManager.getBotByClientId(botClientId)?.client : undefined;
          if (!client) {
            for (const instance of customBotManager.getAllBots()) {
              if (
                instance.status === 'Active' &&
                instance.client.isReady() &&
                instance.client.guilds.cache.has(guildId)
              ) {
                client = instance.client;
                break;
              }
            }
          }
          if (!client) {
            client = getClient() ?? undefined;
          }

          if (!client) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Discord client hazır değil',
              guildId 
            }));
            return;
          }

          const reloadStart = Date.now();
          await registerGuildCommands(client, guildId);
          const reloadMs = Date.now() - reloadStart;
          if (reloadMs > 10000) {
            console.warn(`[Bot] reload-commands guild ${guildId} yavas tamamlandi: ${reloadMs}ms`);
          } else {
            console.log(`[Bot] reload-commands guild ${guildId} tamamlandi: ${reloadMs}ms`);
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Komutlar yeniden kaydedildi',
            guildId 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Komut yeniden yükleme hatası (GuildId: ${guildId}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            guildId 
          }));
        }
        return;
      }

      // Custom bot başlatma endpoint'i
      if (pathname.startsWith('/api/bot/custom-bot/start/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/custom-bot/start/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        try {
          if (!rawBody) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body gerekli' }));
            return;
          }

          const parsed = JSON.parse(rawBody);
          const { botToken, clientId, ownerId, botName } = parsed;

          if (!botToken || !clientId || !ownerId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'BotToken, ClientId ve OwnerId gerekli' }));
            return;
          }

          const result = await customBotManager.startBot(id, botToken, clientId, ownerId, botName);
          
          if (!result) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Bot başlatılamadı',
              id 
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Custom bot başlatıldı',
            id 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Custom bot başlatma hatası (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id 
          }));
        }
        return;
      }

      // Custom bot durdurma endpoint'i
      if (pathname.startsWith('/api/bot/custom-bot/stop/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/custom-bot/stop/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        try {
          const result = await customBotManager.stopBot(id);
          
          if (!result) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Bot bulunamadı veya zaten durdurulmuş',
              id 
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Custom bot durduruldu',
            id 
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Custom bot durdurma hatası (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id 
          }));
        }
        return;
      }

      // Custom bot profil kişiselleştirme uygulama
      if (pathname.startsWith('/api/bot/custom-bot/apply-profile/') && req.method === 'POST') {
        const idStr = pathname.replace('/api/bot/custom-bot/apply-profile/', '');
        const id = parseInt(idStr, 10);

        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        try {
          const result = await customBotManager.applyProfile(id);

          if (!result.success) {
            res.writeHead(result.error?.includes('çalışmıyor') ? 404 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: result.error,
              warnings: result.warnings,
              id,
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            warnings: result.warnings,
            id,
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Custom bot profil uygulama hatası (Id: ${id}):`, errorMessage);

          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: errorMessage,
            id,
          }));
        }
        return;
      }

      // Custom bot durum kontrolü endpoint'i
      if (pathname.startsWith('/api/bot/custom-bot/status/') && req.method === 'GET') {
        const idStr = pathname.replace('/api/bot/custom-bot/status/', '');
        const id = parseInt(idStr, 10);
        
        if (isNaN(id) || id <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Geçerli bir ID gerekli' }));
          return;
        }

        try {
          const bot = customBotManager.getBot(id);
          
          if (!bot) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: false, 
              error: 'Bot bulunamadı',
              id 
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            id: bot.id,
            clientId: bot.clientId,
            ownerId: bot.ownerId,
            botName: bot.botName,
            status: bot.status,
            errorMessage: bot.errorMessage,
            isReady: bot.client.isReady()
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] Custom bot durum kontrolü hatası (Id: ${id}):`, errorMessage);
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorMessage,
            id 
          }));
        }
        return;
      }

      if (pathname.startsWith('/api/bot/music/') && req.method === 'GET') {
        const segments = pathname.split('/').filter(Boolean);
        const guildId = segments[3];
        const action = segments[4];
        const botClientId = getBotClientIdFromHeaders(req.headers);

        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        try {
          if (action === 'state') {
            const state = await musicManager.getState(guildId, botClientId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state));
            return;
          }

          if (action === 'search') {
            const query = url.searchParams.get('query') || '';
            const source = (url.searchParams.get('source') || 'auto') as any;
            const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 10)));
            const tracks = await musicManager.search({ query, source, limit });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ tracks }));
            return;
          }

          if (action === 'lyrics') {
            const query = url.searchParams.get('query') || undefined;
            const lyrics = await musicManager.getLyrics(guildId, query, botClientId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(lyrics));
            return;
          }

          if (action === 'favorites') {
            const userId = url.searchParams.get('userId') || '';
            if (!userId) throw new Error('Favorileri almak için userId gerekli.');
            const tracks = await musicManager.getFavorites(guildId, userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ tracks }));
            return;
          }

          if (action === 'history') {
            const userId = url.searchParams.get('userId') || undefined;
            const tracks = await musicManager.getHistory(guildId, userId, botClientId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ tracks }));
            return;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const statusCode = classifyMusicError(errorMessage);
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errorMessage, statusCode }));
          return;
        }
      }

      if (pathname.startsWith('/api/bot/music/') && req.method === 'POST') {
        const segments = pathname.split('/').filter(Boolean);
        const guildId = segments[3];
        const action = segments[4];
        const botClientId = getBotClientIdFromHeaders(req.headers);

        if (!guildId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GuildId gerekli' }));
          return;
        }

        let payload: any = {};
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Geçersiz JSON body' }));
            return;
          }
        }

        try {
          if (action === 'play' && segments[5] === 'bulk') {
            const state = await musicManager.bulkPlay({
              guildId,
              clientId: botClientId,
              mode: payload.mode || 'enqueue',
              tracks: Array.isArray(payload.tracks) ? payload.tracks : [],
              requester: payload.requester,
              voiceChannelId: payload.voiceChannelId,
              textChannelId: payload.textChannelId,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state));
            return;
          }

          if (action === 'play') {
            const state = await musicManager.play({
              guildId,
              clientId: botClientId,
              query: String(payload.query || ''),
              source: payload.source || 'auto',
              track: payload.track,
              requester: payload.requester,
              voiceChannelId: payload.voiceChannelId,
              textChannelId: payload.textChannelId,
              playNext: Boolean(payload.playNext),
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state));
            return;
          }

          if (action === 'control') {
            const state = await musicManager.control({
              guildId,
              clientId: botClientId,
              action: payload.action,
              volume: payload.volume,
              seekMs: payload.seekMs,
              deltaMs: payload.deltaMs,
              position: payload.position,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state));
            return;
          }

          if (action === 'join') {
            const state = await musicManager.join(
              guildId,
              String(payload.voiceChannelId || ''),
              payload.textChannelId,
              botClientId,
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state));
            return;
          }

          if (action === 'queue') {
            if (payload.operation === 'remove') {
              const state = await musicManager.remove(guildId, String(payload.queueItemId || ''), botClientId);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(state));
              return;
            }
            if (payload.operation === 'move') {
              const state = await musicManager.move(guildId, String(payload.queueItemId || ''), Number(payload.position || 1), botClientId);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(state));
              return;
            }
            if (payload.operation === 'clear' || payload.operation === 'removedupes' || payload.operation === 'shuffle') {
              const state = await musicManager.control({
                guildId,
                clientId: botClientId,
                action: payload.operation === 'removedupes' ? 'removedupes' : payload.operation,
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(state));
              return;
            }
          }

          if (action === 'favorite') {
            const userId = String(payload.userId || payload.requester?.id || '');
            if (!userId) throw new Error('Favori işlemi için userId gerekli.');
            const result = await musicManager.toggleFavorite(guildId, userId, payload.track, botClientId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Music endpoint bulunamadı' }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const statusCode = classifyMusicError(errorMessage);
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errorMessage, statusCode }));
        }
        return;
      }

      // Health check endpoint
      if (pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'discord-bot' }));
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint bulunamadı' }));
    } catch (error) {
      console.error('[ERROR] HTTP server route hatası:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
    } catch (error) {
      console.error('[ERROR] HTTP server isteği işlenemedi:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  });

  // Resource exhaustion koruması: header ve toplam istek süresi üst sınırları (slowloris/yavaş-gövde).
  httpServer!.headersTimeout = 15 * 1000;
  httpServer!.requestTimeout = REQUEST_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const onListenError = (error: Error) => {
      httpServer = null;
      reject(error);
    };

    httpServer!.once('error', onListenError);
    httpServer!.listen(port, () => {
      httpServer!.off('error', onListenError);
      httpServer!.on('error', (error) => {
        console.error('[ERROR] HTTP server hatası:', error);
      });

      console.log(`[INFO] HTTP server dinleniyor (port ${port})`);
      console.log(`[INFO] Reaction role: POST /api/bot/send-reaction-role/{reactionRoleId}`);
      console.log(`[INFO] Reaction role: POST /api/bot/delete-reaction-role-message/{reactionRoleId}`);
      console.log(`[INFO] Ticket panel: POST /api/bot/send-ticket-panel/{guildId}`);
      console.log(`[INFO] Ticket staff mesajı: POST /api/bot/send-ticket-staff-message/{guildId}`);
      console.log(`[INFO] Embed message: POST /api/bot/send-embed-message/{id}`);
      console.log(`[INFO] Plain text: POST /api/bot/post-plain-text`);
      console.log(`[INFO] Poll: POST /api/bot/send-poll/{id}`);
      console.log(`[INFO] Poll result: POST /api/bot/send-poll-result/{id}`);
      console.log(`[INFO] Giveaway: POST /api/bot/send-giveaway/{id}`);
      console.log(`[INFO] Create statistics channel: POST /api/bot/create-statistics-channel/{guildId}`);
      console.log(`[INFO] Update statistics channel: POST /api/bot/update-statistics-channel/{guildId}`);
      console.log(`[INFO] Delete statistics channel: POST /api/bot/delete-statistics-channel/{guildId}`);
      console.log(`[INFO] Delete log Discord channels: POST /api/bot/delete-log-channels/{guildId}`);
      console.log(`[INFO] Reload commands: POST /api/bot/reload-commands/{guildId}`);
      console.log(`[INFO] Custom bot start: POST /api/bot/custom-bot/start/{id}`);
      console.log(`[INFO] Custom bot stop: POST /api/bot/custom-bot/stop/{id}`);
      console.log(`[INFO] Custom bot apply-profile: POST /api/bot/custom-bot/apply-profile/{id}`);
      console.log(`[INFO] Custom bot status: GET /api/bot/custom-bot/status/{id}`);
      resolve();
    });
  });
}

export function stopHttpServer(): void {
  if (httpServer) {
    httpServer.close(() => {
      console.log('[INFO] HTTP server kapatıldı.');
    });
    httpServer = null;
  }
}

