export interface ApiConfig {
  baseUrl: string;
}

export interface RedisConfig {
  url: string;
  /** Redis 6 ACL kullanıcısı; URL'de yoksa buradan veya REDIS_USER env. */
  user?: string;
  /** URL'de yoksa buradan veya REDIS_PASSWORD env. */
  password?: string;
}

export interface LavalinkNodeConfig {
  id: string;
  host: string;
  port: number;
  password: string;
  secure: boolean;
}

export interface LavalinkConfig extends LavalinkNodeConfig {
  nodes: LavalinkNodeConfig[];
}

export interface BotConfig {
  token: string;
  clientId?: string;
  defaultLanguage: string;
  /** Web panel kök URL (ör. https://panel.example.com) — müzik kanal mesajındaki Panel linki için; PANEL_BASE_URL */
  panelBaseUrl?: string;
  api: ApiConfig;
  /** Bot HTTP server portu — HTTP_SERVER_PORT (.env) */
  httpServer?: { port: number };
  /** Redis — REDIS_URL ve isteğe bağlı REDIS_USER / REDIS_PASSWORD */
  redis?: RedisConfig;
  /** Lavalink v4 node ayarları — LAVALINK_* ortam değişkenleri */
  lavalink?: LavalinkConfig;
}

