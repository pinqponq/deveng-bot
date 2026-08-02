import { BotConfig, LavalinkNodeConfig } from '../types/config';

let config: BotConfig | null = null;

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(
      `Ortam değişkeni zorunlu: ${name}. Compose/env veya proje kökündeki .env ile sağlayın.`,
    );
  }
  return v;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

function normalizeLavalinkNode(node: Partial<LavalinkNodeConfig>, index: number): LavalinkNodeConfig {
  const id = (node.id || `lavalink-${index + 1}`).trim();
  const host = (node.host || '').trim();
  const password = (node.password || '').trim();
  const port = Number(node.port || 2333);
  if (!host) throw new Error(`Lavalink node host eksik (${id})`);
  if (!password) throw new Error(`Lavalink node password eksik (${id})`);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Lavalink node port geçersiz (${id})`);
  return {
    id,
    host,
    port,
    password,
    secure: Boolean(node.secure),
  };
}

function parseLavalinkNodesFromJson(raw: string): LavalinkNodeConfig[] {
  const parsed = JSON.parse(raw) as Array<Partial<LavalinkNodeConfig>>;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('LAVALINK_NODES boş olmayan JSON dizi olmalı');
  }
  return parsed.map((node, index) => normalizeLavalinkNode(node, index));
}

function parseIndexedLavalinkNodes(): LavalinkNodeConfig[] {
  const nodes: LavalinkNodeConfig[] = [];
  for (let index = 0; index < 20; index += 1) {
    const prefix = `LAVALINK_NODE_${index}`;
    const host = (process.env[`${prefix}_HOST`] || '').trim();
    const password = (process.env[`${prefix}_PASSWORD`] || '').trim();
    if (!host && !password) continue;
    nodes.push(normalizeLavalinkNode({
      id: process.env[`${prefix}_ID`] || `lavalink-${index + 1}`,
      host,
      password,
      port: Number(process.env[`${prefix}_PORT`] || 2333),
      secure: parseBoolean(process.env[`${prefix}_SECURE`]),
    }, index));
  }
  return nodes;
}

/**
 * Yapılandırmayı yalnızca ortam değişkenlerinden yükler (.env / .env.local, dotenv).
 * @see Deveng.Discord.Bot/.env.example
 */
export function loadConfig(): BotConfig {
  if (config) {
    return config;
  }

  const token = requireEnv('BOT_TOKEN');
  const apiBaseUrl = requireEnv('API_BASE_URL').replace(/\/$/, '');
  const defaultLanguage = (process.env.DEFAULT_LANGUAGE || 'tr').trim();
  const httpPort = parseInt(process.env.HTTP_SERVER_PORT || '3005', 10);
  if (Number.isNaN(httpPort) || httpPort <= 0) {
    throw new Error('HTTP_SERVER_PORT geçersiz');
  }

  const redisUrl = (process.env.REDIS_URL || '').trim();
  const panelBaseUrl = (process.env.PANEL_BASE_URL || '').trim() || undefined;
  const clientId = (process.env.BOT_CLIENT_ID || '').trim() || undefined;
  const lavalinkNodesRaw = (process.env.LAVALINK_NODES || '').trim();
  const lavalinkHost = (process.env.LAVALINK_HOST || '').trim();
  const lavalinkPassword = (process.env.LAVALINK_PASSWORD || '').trim();
  const lavalinkPortRaw = (process.env.LAVALINK_PORT || '2333').trim();
  const lavalinkPort = parseInt(lavalinkPortRaw, 10);

  const botConfig: BotConfig = {
    token,
    clientId,
    defaultLanguage,
    panelBaseUrl,
    api: { baseUrl: apiBaseUrl },
    httpServer: { port: httpPort },
  };

  if (redisUrl) {
    botConfig.redis = {
      url: redisUrl,
      user: (process.env.REDIS_USER || '').trim() || undefined,
      password: (process.env.REDIS_PASSWORD || '').trim() || undefined,
    };
  }

  const lavalinkNodes = lavalinkNodesRaw
    ? parseLavalinkNodesFromJson(lavalinkNodesRaw)
    : parseIndexedLavalinkNodes();

  if (lavalinkNodes.length > 0) {
    const primary = lavalinkNodes[0];
    botConfig.lavalink = {
      ...primary,
      nodes: lavalinkNodes,
    };
  } else if (lavalinkHost || lavalinkPassword) {
    if (!lavalinkHost) {
      throw new Error('LAVALINK_HOST tanımlı olmalı');
    }
    if (!lavalinkPassword) {
      throw new Error('LAVALINK_PASSWORD tanımlı olmalı');
    }
    if (Number.isNaN(lavalinkPort) || lavalinkPort <= 0) {
      throw new Error('LAVALINK_PORT geçersiz');
    }
    botConfig.lavalink = {
      id: 'deveng-main',
      host: lavalinkHost,
      port: lavalinkPort,
      password: lavalinkPassword,
      secure: parseBoolean(process.env.LAVALINK_SECURE),
      nodes: [{
        id: 'deveng-main',
        host: lavalinkHost,
        port: lavalinkPort,
        password: lavalinkPassword,
        secure: parseBoolean(process.env.LAVALINK_SECURE),
      }],
    };
  }

  config = botConfig;
  return config;
}

/** Test veya sıcak yeniden yükleme için (opsiyonel) */
export function resetConfigForTests(): void {
  config = null;
}
