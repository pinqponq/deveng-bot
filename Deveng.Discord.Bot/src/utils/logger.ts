const INDEX_PREFIX = 'deveng-discord-bot-logs';
/** ES yoksa (local compose) asla fetch etme — undici havuzunu tıkar, API çağrıları timeout olur. */
const ES_LOG_DISABLED =
  process.env.ES_LOG_DISABLED === '1' ||
  process.env.ES_LOG_DISABLED === 'true' ||
  !(process.env.ES_URI || '').trim();
const ES_URI = (process.env.ES_URI || '').trim();

/**
 * Token / kimlik bilgisi maskeleme. Bot tarafında üretilen log dizgilerinde
 * Discord token, Bearer token, X-Bot-Token, X-Bot-Signature ve webhook URL'leri
 * çıkmadan önce ***REDACTED*** ile değiştirilir.
 */
const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [/(authorization\s*[:=]\s*bearer\s+)[A-Za-z0-9._\-+/=]+/gi, '$1***REDACTED***'],
  [/(x-bot-token\s*[:=]\s*)[A-Za-z0-9._\-+/=]+/gi, '$1***REDACTED***'],
  [/(x-bot-signature\s*[:=]\s*)[A-Fa-f0-9]+/gi, '$1***REDACTED***'],
  [/(cookie\s*[:=]\s*)[^,\s]+/gi, '$1***REDACTED***'],
  // Discord bot token kalıbı
  [/[A-Za-z0-9_-]{24,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,}/g, '***DISCORD_TOKEN***'],
  // Discord webhook URL'leri
  [/https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,
    'https://discord.com/api/webhooks/***REDACTED***'],
];

function redactSensitive(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function getIndex(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${INDEX_PREFIX}-${y}.${m}.${day}`;
}

function sendToEs(level: string, message: string): void {
  if (ES_LOG_DISABLED || !ES_URI) return;
  fetch(`${ES_URI}/${getIndex()}/_doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@timestamp': new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      app: 'deveng-discord-bot',
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}

function argsToString(args: unknown[]): string {
  const joined = args
    .map(a => (a instanceof Error ? a.stack ?? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  return redactSensitive(joined);
}

/**
 * Tüm console.log/info/warn/error çağrılarını yakalar ve Elasticsearch'e iletir.
 * index.ts'de bir kez çağrılması yeterli.
 */
export function initLogger(): void {
  const _log   = console.log.bind(console);
  const _info  = console.info.bind(console);
  const _warn  = console.warn.bind(console);
  const _error = console.error.bind(console);

  const redactArgs = (args: unknown[]): unknown[] =>
    args.map((a) =>
      typeof a === 'string'
        ? redactSensitive(a)
        : a instanceof Error
          ? Object.assign(new Error(redactSensitive(a.message)), { stack: a.stack ? redactSensitive(a.stack) : undefined })
          : a,
    );

  console.log = (...args: unknown[]) => {
    const safe = redactArgs(args);
    _log(...safe);
    sendToEs('info', argsToString(safe));
  };
  console.info = (...args: unknown[]) => {
    const safe = redactArgs(args);
    _info(...safe);
    sendToEs('info', argsToString(safe));
  };
  console.warn = (...args: unknown[]) => {
    const safe = redactArgs(args);
    _warn(...safe);
    sendToEs('warn', argsToString(safe));
  };
  console.error = (...args: unknown[]) => {
    const safe = redactArgs(args);
    _error(...safe);
    sendToEs('error', argsToString(safe));
  };
}

export const logger = {
  info:  (message: string) => { console.log(message); },
  warn:  (message: string) => { console.warn(message); },
  error: (message: string) => { console.error(message); },
  debug: (message: string) => { console.log(message); },
};

/**
 * Sessizce yutulan hataları tutarlı, maskelenmiş biçimde loglar (console üzerinden
 * Elasticsearch'e de gider). Böylece "sessiz catch" bloklarında hatalar görünmez kalmaz.
 *
 * Seviye seçimi:
 *  - 'error': beklenmeyen gerçek hata.
 *  - 'warn':  telafi edilebilir / kısmi başarısızlık.
 *  - 'debug': beklenen veya yüksek hacimli no-op (görünür ama alarm değil).
 *
 * @param context Kısa, greplenebilir etiket, ör. 'Music:join' veya 'logHandler:auditLog'.
 */
export function logError(
  context: string,
  error: unknown,
  level: 'error' | 'warn' | 'debug' = 'error',
): void {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const line = `[${context}] ${detail}`;
  if (level === 'warn') console.warn(`[WARN] ${line}`);
  else if (level === 'debug') console.log(`[DEBUG] ${line}`);
  else console.error(`[ERROR] ${line}`);
}
