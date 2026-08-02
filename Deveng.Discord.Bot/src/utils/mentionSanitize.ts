/**
 * Discord mention abuse riskini azaltır (user içerikleri + embed URL).
 */

export function stripMassMentions(text: string): string {
  if (!text) return text;
  return text
    .replace(/@everyone/gi, '@​everyone')
    .replace(/@here/gi, '@​here');
}

/**
 * Yalnızca http/https şemalarına izin verir; private/internal CIDR ve
 * SSRF metadata host'larını reddeder. javascript:/data:/vbscript: kapatır.
 */
export function sanitizeOptionalUrl(url: string | null | undefined): string | null {
  if (url == null || url === '') return null;
  const t = url.trim();
  if (t.length > 2048) return null;
  const lower = t.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:'))
    return null;

  let parsed: URL;
  try {
    parsed = new URL(t);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  if (!host) return null;

  // SSRF / metadata / loopback / private CIDR koruması
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^fc[0-9a-f]{2}:/i.test(host) ||
    /^fe80:/i.test(host) ||
    host === '::1' ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return null;
  }

  return parsed.toString();
}

/**
 * Embed/anchor URL'leri için domain allowlist; kullanıcı içerikli alanlardan
 * gelen URL'lerde phishing/open-redirect riskini düşürür.
 */
const DEFAULT_ALLOWED_HOSTS = new Set<string>([
  'discord.com',
  'discordapp.com',
  'cdn.discordapp.com',
  'media.discordapp.net',
  'images-ext-1.discordapp.net',
  'images-ext-2.discordapp.net',
  'youtube.com',
  'youtu.be',
  'img.youtube.com',
  'i.ytimg.com',
  'spotify.com',
  'open.spotify.com',
  'i.scdn.co',
  'twitch.tv',
  'soundcloud.com',
  'thedeveng.com',
  'deveng.app',
  'panel-api.thedeveng.com',
]);

function getExtraAllowedHosts(): Set<string> {
  const env = (process.env.EMBED_URL_ALLOWED_HOSTS || '').trim();
  if (!env) return new Set();
  return new Set(env.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

/**
 * Sanitize edilmiş URL'in domain'ini allowlist ile karşılaştırır. Eşleşme yoksa null döner.
 * EMBED_URL_ALLOWED_HOSTS env (virgül listesi) ile genişletilebilir.
 */
export function sanitizeAllowlistedUrl(url: string | null | undefined): string | null {
  const safe = sanitizeOptionalUrl(url);
  if (!safe) return null;
  let parsed: URL;
  try {
    parsed = new URL(safe);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const extras = getExtraAllowedHosts();
  for (const allowed of [...DEFAULT_ALLOWED_HOSTS, ...extras]) {
    if (host === allowed || host.endsWith('.' + allowed)) return safe;
  }
  return null;
}
