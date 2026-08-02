import type { GuildAutomationApiRow } from '../automation/types';
import { BotConfig } from '../types/config';
import { getCustomBotToken } from './customBotTokenStore';
import { logError } from './logger';
import { createHmac } from 'crypto';

/**
 * API → Bot httpServer.ts ile aynı sözleşme: HEX(HMAC-SHA256(secret, ts + rawBody)).
 * Secret her istekte okunur (modül yüklenme sırası / dotenv sonrası boş kalmasın).
 */
function buildHmacHeaders(rawBody: string): Record<string, string> {
  const sharedSecret = (process.env.BOT_SHARED_SECRET || '').trim();
  if (!sharedSecret) return {};
  const ts = Date.now().toString();
  const sig = createHmac('sha256', sharedSecret)
    .update(ts + rawBody)
    .digest('hex');
  return {
    'X-Bot-Timestamp': ts,
    'X-Bot-Signature': sig,
  };
}
import type { MusicFavoriteResponse, MusicHistoryItem, MusicTrack } from '../music/types';
import { 
  WelcomeData, 
  GoodbyeData, 
  ReactionRoleData,
  ModeratorData,
  CustomCommandData,
  TicketPanelData,
  EmbedMessageData,
  PollData,
  TemporaryVoiceChannelLobbyData,
  TemporaryVoiceChannelData,
  BirthdayData,
  BirthdayUserData,
  LogChannelData,
  LogChannelTypeData,
  GiveawayData
} from '../types/database';

import type { EmbedExtendedOptionalFields } from '../types/embedConfig';

function mapEmbedExtendedFromApi(src: Record<string, unknown>): EmbedExtendedOptionalFields {
  return {
    embedTitleUrl: (src.embedTitleUrl as string | null | undefined) ?? null,
    embedAuthorName: (src.embedAuthorName as string | null | undefined) ?? null,
    embedAuthorIcon: (src.embedAuthorIcon as string | null | undefined) ?? null,
    embedAuthorUrl: (src.embedAuthorUrl as string | null | undefined) ?? null,
    embedFooterIcon: (src.embedFooterIcon as string | null | undefined) ?? null,
    embedUseTimestamp: src.embedUseTimestamp !== undefined ? Boolean(src.embedUseTimestamp) : undefined,
    embedFieldsJson: (src.embedFieldsJson as string | null | undefined) ?? null,
  };
}

let apiBaseUrl: string = '';
let botToken: string = '';
let defaultBotClientId: string = '';

export function initializeApiClient(config: BotConfig): void {
  apiBaseUrl = config.api.baseUrl;
  botToken = config.token;
  defaultBotClientId = config.clientId || '';
  console.log(`[INFO] API Client başlatıldı: ${apiBaseUrl}`);

  try {
    const u = new URL(apiBaseUrl);
    const localHttps =
      apiBaseUrl.startsWith('https://') &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (localHttps || (process.env.NODE_ENV !== 'production' && apiBaseUrl.startsWith('https://'))) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      console.log('[WARN] HTTPS self-signed sertifika doğrulaması devre dışı (development/localhost)');
    }
  } catch {
    if (process.env.NODE_ENV !== 'production' && apiBaseUrl.startsWith('https://')) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      console.log('[WARN] HTTPS self-signed sertifika doğrulaması devre dışı (sadece development)');
    }
  }
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

/**
 * API'ye bot isteği gönderirken kullanılacak header'ları döndürür.
 * fetch ile doğrudan API çağrısı yapan komutlar (örn. gömülü-mesaj) bu header'ları kullanmalı.
 * Custom bot kontekstinde clientId verilirse, o bot'un token'ı X-Bot-Token olarak kullanılır.
 * @param clientId Opsiyonel – çağıran bot'un client id'si (custom bot için; yoksa context/default kullanılır)
 */
export function getBotApiHeaders(clientId?: string, rawBody: string = ''): Record<string, string> {
  const botClientId = clientId || botClientIdContext.getStore() || defaultBotClientId;
  const token = apiTokenContext.getStore() ?? ((botClientId && getCustomBotToken(botClientId)) || botToken || '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Bot-Token': token,
    ...buildHmacHeaders(rawBody),
  };
  if (botClientId) {
    headers['X-Bot-ClientId'] = botClientId;
  }
  return headers;
}

// Bot clientId'sini context'te saklamak için AsyncLocalStorage kullan
import { AsyncLocalStorage } from 'async_hooks';

const botClientIdContext = new AsyncLocalStorage<string>();
/** API'ye geri çağrıda kullanılacak token (dashboard → bot → API akışında 401 önlemek için) */
const apiTokenContext = new AsyncLocalStorage<string>();

export function runWithApiToken<T>(token: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (token) return apiTokenContext.run(token, fn) as Promise<T>;
  return fn();
}

export function getCurrentApiToken(): string | undefined {
  return apiTokenContext.getStore();
}

export function setBotClientId(clientId: string): void {
  botClientIdContext.enterWith(clientId);
}

export function getBotClientId(): string | undefined {
  return botClientIdContext.getStore();
}

/** Async zincirde API istekleri için doğru X-Bot-ClientId / custom token eşlemesi (registerGuildCommands vb.) */
export function runWithBotClientId<T>(clientId: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (!clientId) return fn();
  return botClientIdContext.run(clientId, fn) as Promise<T>;
}

export async function toggleMusicFavorite(
  guildId: string,
  userId: string,
  track?: MusicTrack,
  clientId?: string,
): Promise<MusicFavoriteResponse> {
  return apiRequest<MusicFavoriteResponse>(`/api/Music/guild/${guildId}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ userId, track }),
  }, clientId);
}

export async function getMusicFavorites(guildId: string, userId: string, clientId?: string): Promise<MusicTrack[]> {
  const response = await apiRequest<{ tracks: MusicTrack[] }>(
    `/api/Music/guild/${guildId}/favorites?userId=${encodeURIComponent(userId)}`,
    undefined,
    clientId,
  );
  return response?.tracks ?? [];
}

export async function getMusicHistory(guildId: string, userId?: string, clientId?: string): Promise<MusicHistoryItem[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const response = await apiRequest<{ tracks: MusicHistoryItem[] }>(
    `/api/Music/guild/${guildId}/history${query}`,
    undefined,
    clientId,
  );
  return response?.tracks ?? [];
}

export async function getMusicSettings(
  guildId: string,
  clientId?: string,
): Promise<{ announceNowPlaying?: boolean; allowedTextChannelId?: string | null } | null> {
  return apiRequest<{ announceNowPlaying?: boolean; allowedTextChannelId?: string | null }>(
    `/api/Music/guild/${guildId}/settings`,
    undefined,
    clientId,
  );
}

export async function getGuildLocale(guildId: string, clientId?: string): Promise<{ defaultLocale: string; fallbackLocale: string } | null> {
  return apiRequest<{ defaultLocale: string; fallbackLocale: string } | null>(`/api/Locale/guild/${guildId}`, undefined, clientId);
}

export async function recordMusicHistory(
  guildId: string,
  item: {
    track: MusicTrack;
    userId?: string;
    requesterUsername?: string;
    voiceChannelId?: string;
    textChannelId?: string;
    positionMs?: number;
    source?: string;
  },
  clientId?: string,
): Promise<void> {
  await apiRequest(`/api/Music/guild/${guildId}/history`, {
    method: 'POST',
    body: JSON.stringify(item),
  }, clientId);
}

export async function apiRequest<T>(endpoint: string, options?: RequestInit, customBotClientId?: string, customApiToken?: string): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('[ERROR] API\'ye bağlanılamıyor: API base URL yapılandırılmamış. .env içinde API_BASE_URL ayarlayın.');
  }

  const url = `${apiBaseUrl}${endpoint}`;
  const method = options?.method ?? 'GET';
  const startTime = Date.now();
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  
  // Bot clientId'sini belirle: önce customBotClientId, sonra context'ten, sonra default
  const botClientId = customBotClientId || botClientIdContext.getStore() || defaultBotClientId;
  // Token: önce parametre, sonra context (dashboard→bot→API), sonra custom bot token'ı, sonra ana bot token'ı
  const token = customApiToken ?? apiTokenContext.getStore() ?? ((botClientId && getCustomBotToken(botClientId)) || botToken || '');
  
  try {
    // HMAC için body string'inin imzalanması — fetch body'sini değiştirmeden referans al
    const rawBody = typeof options?.body === 'string' ? options.body : '';
    const hmacHeaders = buildHmacHeaders(rawBody);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Bot token'ını header'a ekle (backend'de bot isteklerini tanımak için)
      'X-Bot-Token': token,
      ...hmacHeaders,
      ...options?.headers as Record<string, string>,
    };

    // Bot clientId'sini header'a ekle (custom bot'lar için)
    if (botClientId) {
      headers['X-Bot-ClientId'] = botClientId;
    }
    
    const hasAuthorization = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
    const hasXBotToken = Object.keys(headers).some((k) => k.toLowerCase() === 'x-bot-token');
    const headerClientId = headers['X-Bot-ClientId'] || headers['x-bot-clientid'] || 'N/A';
    console.log(`[Bot API] --> ${method} ${endpoint} trace=${traceId} hasAuthorization=${hasAuthorization} hasXBotToken=${hasXBotToken} botClientId=${headerClientId}`);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Bot API] <-- ${method} ${endpoint} trace=${traceId} status=${response.status} durationMs=${durationMs}`);

    if (!response.ok) {
      // GET/HEAD: 404 = kaynak yok (null). DELETE: idempotent sil — yoksa 404 kabul.
      if (response.status === 404 && (method === 'GET' || method === 'HEAD' || method === 'DELETE')) {
        return null as T;
      }
      // 409 Conflict - zaten mevcut (guild için normal durum)
      if (response.status === 409) {
        // Conflict durumunu başarı olarak kabul et (guild zaten var)
        return null as T;
      }
      throw new Error(`API isteği başarısız: ${response.status} ${response.statusText}`);
    }

    // 204 No Content için boş dönüş
    if (response.status === 204) {
      return null as T;
    }

    return await response.json() as T;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    // Timeout (AbortController)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[ERROR] API isteği zaman aşımına uğradı (15s): ${url} trace=${traceId} (${durationMs}ms)`);
      throw new Error(`API isteği zaman aşımına uğradı (15s): ${endpoint}`);
    }
    // Fetch hatalarını (network errors) yakala
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`[ERROR] API'ye baglanilamiyor: ${url} trace=${traceId} (${durationMs}ms)`);
      console.error(`[ERROR] API'nin calistigindan emin olun: ${apiBaseUrl}`);
      console.error(`[ERROR] Hata detayi:`, error.message);
      throw new Error(`API'ye baglanilamiyor. Lutfen API'nin calistigindan emin olun: ${apiBaseUrl}`);
    }
    
    // Diğer hatalar
    console.error(`[ERROR] API request hatası (${endpoint}) trace=${traceId} ${durationMs}ms:`, error);
    throw error;
  }
}

export async function createModerationActionLog(entry: {
  guildId: string;
  source: string;
  ruleType: string;
  userIdHash?: string;
  channelId?: string;
  messageId?: string;
  action: string;
  actionStatus: string;
  reasonKey?: string;
  reasonParamsJson?: string;
  scoreSnapshotJson?: string;
  actorType?: string;
  actorUserId?: string;
  reviewId?: number;
  errorCode?: string;
}): Promise<{ id: number } | null> {
  const { guildId, ...body } = entry;
  return apiRequest<{ id: number }>(`/api/ModerationLogs/guild/${guildId}/bot-action`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createModerationUserNotice(entry: {
  guildId: string;
  userIdHash?: string;
  messageId?: string;
  actionLogId: number;
  noticeType: string;
  noticeTextKey?: string;
  noticeParamsJson?: string;
  deliveryStatus: string;
  discordNoticeMessageId?: string;
}): Promise<void> {
  const { guildId, ...body } = entry;
  await apiRequest(`/api/ModerationLogs/guild/${guildId}/bot-notice`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface AIModerationSettings {
  guildId: string;
  enabled: boolean;
  sampleRate: number;
  mode?: string;
  thresholdLog?: number;
  thresholdDelete?: number;
  thresholdTimeout?: number;
  retentionDays?: number;
  excludedChannelIdsJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIModerationPolicyRow {
  id: number;
  guildId: string;
  category: string;
  logThreshold: number;
  deleteThreshold: number;
  timeoutThreshold: number;
  action: string;
  enabled: boolean;
}

export interface AIModerationQueueItem {
  id: number;
  guildId: string;
  channelId?: string | null;
  messageId?: string | null;
  userIdHash?: string | null;
  contentHash?: string | null;
  contentPreviewRedacted?: string | null;
  status?: string;
  attemptCount?: number;
  nextAttemptAt?: string | null;
  createdAt?: string;
}

export async function getAIModerationSettings(guildId: string): Promise<AIModerationSettings | null> {
  return apiRequest<AIModerationSettings | null>(`/api/AIModeration/guild/${guildId}/settings`);
}

export async function getAIModerationPolicies(guildId: string): Promise<AIModerationPolicyRow[]> {
  const list = await apiRequest<AIModerationPolicyRow[] | null>(`/api/AIModeration/guild/${guildId}/policies`);
  return list ?? [];
}

export async function getPendingAIModerationQueue(batchSize = 25): Promise<AIModerationQueueItem[]> {
  const list = await apiRequest<AIModerationQueueItem[] | null>(
    `/api/AIModeration/queue/pending?batchSize=${batchSize}`,
  );
  return list ?? [];
}

export async function completeAIModerationQueueWorker(
  queueId: number,
  body: Record<string, unknown>,
): Promise<void> {
  const raw = JSON.stringify(body);
  await apiRequest(`/api/AIModeration/queue/${queueId}/complete`, { method: 'POST', body: raw });
}

export async function failAIModerationQueueItem(queueId: number, errorCode: string): Promise<void> {
  const code = errorCode.trim().slice(0, 128) || 'unknown';
  const raw = JSON.stringify({ errorCode: code });
  await apiRequest(`/api/AIModeration/queue/${queueId}/fail`, { method: 'POST', body: raw });
}

export async function enqueueAIModeration(entry: {
  guildId: string;
  channelId?: string;
  messageId?: string;
  userIdHash?: string;
  contentHash?: string;
  contentPreviewRedacted?: string;
}): Promise<{ id: number } | null> {
  const { guildId, ...body } = entry;
  return apiRequest<{ id: number }>(`/api/AIModeration/guild/${guildId}/queue`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export interface AutoRoleConfig {
  guildId: string;
  enabled: boolean;
  delaySeconds: number;
  minAccountAgeDays?: number | null;
  roles: Array<{ roleId: string; sortOrder: number; enabled: boolean }>;
}

export async function getAutoRoleConfig(guildId: string): Promise<AutoRoleConfig | null> {
  return apiRequest<AutoRoleConfig | null>(`/api/AutoRole/guild/${guildId}`);
}

export async function createAutoRoleAudit(entry: {
  guildId: string;
  userIdHash: string;
  roleId: string;
  result: string;
  errorCode?: string;
}): Promise<void> {
  const { guildId, ...body } = entry;
  await apiRequest(`/api/AutoRole/guild/${guildId}/audit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Welcome API
export async function getWelcomeMessage(guildId: string, language: string = 'tr', fallbackLanguage: string = 'tr'): Promise<WelcomeData | null> {
  try {
    // Önce istenen dilde dene
    let welcome = await apiRequest<WelcomeData | null>(`/api/Welcome/guild/${guildId}?language=${language}`);
    
    // Bulunamazsa fallback dilde dene
    if (!welcome && fallbackLanguage !== language) {
      welcome = await apiRequest<WelcomeData | null>(`/api/Welcome/guild/${guildId}?language=${fallbackLanguage}`);
    }

    if (!welcome) {
      return null;
    }

    return {
      channelId: welcome.channelId,
      message: welcome.message,
      isEmbed: welcome.isEmbed,
      embedTitle: welcome.embedTitle,
      embedDescription: welcome.embedDescription,
      embedColor: welcome.embedColor,
      embedThumbnail: welcome.embedThumbnail,
      embedImage: welcome.embedImage,
      embedFooter: welcome.embedFooter,
      ...mapEmbedExtendedFromApi(welcome as unknown as Record<string, unknown>),
      sendWelcomeCard: welcome.sendWelcomeCard,
      cardTitle: welcome.cardTitle,
      cardUsernameText: welcome.cardUsernameText,
      cardMemberText: welcome.cardMemberText,
      cardBackgroundColor1: welcome.cardBackgroundColor1,
      cardBackgroundColor2: welcome.cardBackgroundColor2,
      cardTextColor: welcome.cardTextColor,
      cardBorderColor: welcome.cardBorderColor,
      sendDM: welcome.sendDM,
      dmMessage: welcome.dmMessage,
      isDMEmbed: welcome.isDMEmbed,
      dmEmbedTitle: welcome.dmEmbedTitle,
      dmEmbedDescription: welcome.dmEmbedDescription,
      dmEmbedColor: welcome.dmEmbedColor,
      dmEmbedThumbnail: welcome.dmEmbedThumbnail,
      dmEmbedImage: welcome.dmEmbedImage,
      dmEmbedFooter: welcome.dmEmbedFooter,
      dmEmbedTitleUrl: welcome.dmEmbedTitleUrl ?? null,
      dmEmbedAuthorName: welcome.dmEmbedAuthorName ?? null,
      dmEmbedAuthorIcon: welcome.dmEmbedAuthorIcon ?? null,
      dmEmbedAuthorUrl: welcome.dmEmbedAuthorUrl ?? null,
      dmEmbedFooterIcon: welcome.dmEmbedFooterIcon ?? null,
      dmEmbedUseTimestamp: welcome.dmEmbedUseTimestamp,
      dmEmbedFieldsJson: welcome.dmEmbedFieldsJson ?? null,
      sendDMCard: welcome.sendDMCard,
      dmCardTitle: welcome.dmCardTitle,
      dmCardUsernameText: welcome.dmCardUsernameText,
      dmCardMemberText: welcome.dmCardMemberText,
      dmCardBackgroundColor1: welcome.dmCardBackgroundColor1,
      dmCardBackgroundColor2: welcome.dmCardBackgroundColor2,
      dmCardTextColor: welcome.dmCardTextColor,
      dmCardBorderColor: welcome.dmCardBorderColor,
      giveRole: welcome.giveRole,
      roleId: welcome.roleId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Hosgeldin mesaji alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetWelcomeMessage API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

// Goodbye API
export async function getGoodbyeMessage(guildId: string, language: string = 'tr', fallbackLanguage: string = 'tr'): Promise<GoodbyeData | null> {
  try {
    // Önce istenen dilde dene
    let goodbye = await apiRequest<GoodbyeData | null>(`/api/Goodbye/guild/${guildId}?language=${language}`);
    
    // Bulunamazsa fallback dilde dene
    if (!goodbye && fallbackLanguage !== language) {
      goodbye = await apiRequest<GoodbyeData | null>(`/api/Goodbye/guild/${guildId}?language=${fallbackLanguage}`);
    }

    if (!goodbye) {
      return null;
    }

    // API'den gelen veriyi GoodbyeData formatına çevir
    return {
      channelId: goodbye.channelId,
      message: goodbye.message,
      isEmbed: goodbye.isEmbed,
      embedTitle: goodbye.embedTitle,
      embedDescription: goodbye.embedDescription,
      embedColor: goodbye.embedColor,
      embedThumbnail: goodbye.embedThumbnail,
      embedImage: goodbye.embedImage,
      embedFooter: goodbye.embedFooter,
      ...mapEmbedExtendedFromApi(goodbye as unknown as Record<string, unknown>),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Hoscakal mesaji alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetGoodbyeMessage API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

/** API ReactionRoleDto → bot ReactionRoleData */
function mapApiReactionRoleToData(reactionRole: Record<string, unknown>): ReactionRoleData {
  const emojis = (reactionRole.emojis as Array<Record<string, unknown>>) ?? [];
  const buttons = (reactionRole.buttons as Array<Record<string, unknown>>) ?? [];
  const menus = (reactionRole.menus as Array<Record<string, unknown>>) ?? [];
  return {
    id: reactionRole.id as number,
    guildId: reactionRole.guildId as string,
    channelId: (reactionRole.channelId as string | null) ?? null,
    normalMessage: (reactionRole.normalMessage as string | null) ?? null,
    isEmbed: Boolean(reactionRole.isEmbed),
    embedTitle: (reactionRole.embedTitle as string | null) ?? null,
    embedDescription: (reactionRole.embedDescription as string | null) ?? null,
    embedColor: (reactionRole.embedColor as string | null) ?? null,
    embedThumbnail: (reactionRole.embedThumbnail as string | null) ?? null,
    embedImage: (reactionRole.embedImage as string | null) ?? null,
    embedFooter: (reactionRole.embedFooter as string | null) ?? null,
    ...mapEmbedExtendedFromApi(reactionRole),
    messageId: (reactionRole.messageId as string | null) ?? null,
    enabled: Boolean(reactionRole.enabled),
    enableEmoji: Boolean(reactionRole.enableEmoji),
    enableButton: Boolean(reactionRole.enableButton),
    enableMenu: Boolean(reactionRole.enableMenu),
    emojis: emojis.map((e) => ({
      id: e.id as number,
      emoji: e.emoji as string,
      roleId: e.roleId as string,
      orderIndex: e.orderIndex as number,
      enabled: Boolean(e.enabled),
    })),
    buttons: buttons.map((b) => ({
      id: b.id as number,
      label: b.label as string,
      emoji: (b.emoji as string | null) ?? null,
      roleId: b.roleId as string,
      style: b.style as number,
      orderIndex: b.orderIndex as number,
      enabled: Boolean(b.enabled),
    })),
    menus: menus.map((m) => ({
      id: m.id as number,
      placeholder: (m.placeholder as string | null) ?? null,
      minValues: m.minValues as number,
      maxValues: m.maxValues as number,
      enabled: Boolean(m.enabled),
      options: ((m.options as Array<Record<string, unknown>>) ?? []).map((o) => ({
        id: o.id as number,
        label: o.label as string,
        description: (o.description as string | null) ?? null,
        roleId: o.roleId as string,
        emoji: (o.emoji as string | null) ?? null,
        orderIndex: o.orderIndex as number,
        enabled: Boolean(o.enabled),
      })),
    })),
  };
}

// ReactionRole API — guild başına birden fazla panel
export async function getReactionRoleConfigs(guildId: string): Promise<ReactionRoleData[]> {
  try {
    const list = await apiRequest<Record<string, unknown>[]>(`/api/ReactionRole/guild/${guildId}`);
    if (!Array.isArray(list)) return [];
    return list.map(mapApiReactionRoleToData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Reaction role listesi alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetReactionRoleConfigs API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

export async function getReactionRoleConfigById(id: number): Promise<ReactionRoleData | null> {
  try {
    const reactionRole = await apiRequest<Record<string, unknown> | null>(`/api/ReactionRole/panel/${id}`);
    if (!reactionRole || typeof reactionRole !== 'object') return null;
    return mapApiReactionRoleToData(reactionRole);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Reaction role panel alinamadi - API'ye baglanilamiyor (Id: ${id})`);
    } else {
      console.error(`[ERROR] GetReactionRoleConfigById API hatasi (Id: ${id}):`, errorMessage);
    }
    throw error;
  }
}

/** Geriye dönük: aynı guild’deki ilk panel (Id sırası) */
export async function getReactionRoleConfig(guildId: string): Promise<ReactionRoleData | null> {
  try {
    const list = await getReactionRoleConfigs(guildId);
    if (!list.length) return null;
    return [...list].sort((a, b) => a.id - b.id)[0];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Reaction role yapilandirmasi alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetReactionRoleConfig API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

// Guild API
export async function deleteGuildFromApi(guildId: string): Promise<void> {
  try {
    await apiRequest<null>(`/api/Guild/guild/${guildId}`, { method: 'DELETE' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Guild silme API'ye iletilemedi - baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] DeleteGuildFromApi hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

export async function syncGuildToApi(guildId: string, guildName: string, ownerId: string | null, memberCount: number): Promise<void> {
  try {
    const existing = await apiRequest<{ guildId: string } | null>(`/api/Guild/guild/${guildId}`);
    const method = existing ? 'PUT' : 'POST';
    const endpoint = existing ? `/api/Guild/guild/${guildId}` : '/api/Guild';
    const body = existing
      ? {
          guildName,
          ownerId,
          memberCount,
          lastSeen: new Date().toISOString(),
        }
      : {
          guildId,
          guildName,
          ownerId,
          memberCount,
          joinedAt: new Date().toISOString(),
        };

    await apiRequest(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Başarılı create/update durumunda işlem tamamlandı.
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 409 Conflict hatası değilse hata fırlat
    if (!errorMessage.includes('409')) {
      if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
        console.error(`[ERROR] Sunucu bilgileri API'ye gonderilemedi - API'ye baglanilamiyor (GuildId: ${guildId})`);
      } else {
        console.error(`[ERROR] SyncGuildToApi hatasi (GuildId: ${guildId}):`, errorMessage);
      }
      throw error;
    }
    // 409 Conflict durumunda sessizce devam et (guild zaten var)
  }
}

// Guild Automation API (panel kurallari)
const automationListCache = new Map<string, { t: number; list: GuildAutomationApiRow[] }>();
const AUTOMATION_CACHE_MS = 30_000;

export function invalidateGuildAutomationCache(guildId: string): void {
  automationListCache.delete(guildId);
}

export async function getGuildAutomations(guildId: string): Promise<GuildAutomationApiRow[]> {
  try {
    return await apiRequest<GuildAutomationApiRow[]>(`/api/Automation/guild/${guildId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes('API\'ye baglanilamiyor')) {
      console.error(`[ERROR] GetGuildAutomations API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return [];
  }
}

export async function getGuildAutomationsCached(guildId: string): Promise<GuildAutomationApiRow[]> {
  const hit = automationListCache.get(guildId);
  if (hit && Date.now() - hit.t < AUTOMATION_CACHE_MS) return hit.list;
  const list = await getGuildAutomations(guildId);
  automationListCache.set(guildId, { t: Date.now(), list });
  return list;
}

// Custom Command API
export async function getCustomCommands(guildId: string): Promise<CustomCommandData[]> {
  try {
    const commands = await apiRequest<Array<{
      id: number;
      guildId: string;
      commandName: string;
      actionType: number;
      targetChannelId: string | null;
      message: string | null;
      roleId: string | null;
      enabled: boolean;
    }>>(`/api/CustomCommand/guild/${guildId}`);

    return commands.map(cmd => ({
      id: cmd.id,
      guildId: cmd.guildId,
      commandName: cmd.commandName,
      actionType: cmd.actionType,
      targetChannelId: cmd.targetChannelId,
      message: cmd.message,
      roleId: cmd.roleId,
      enabled: cmd.enabled,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Custom commands alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetCustomCommands API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return [];
  }
}

export async function getCustomCommandByName(guildId: string, commandName: string): Promise<CustomCommandData | null> {
  try {
    const command = await apiRequest<{
      id: number;
      guildId: string;
      commandName: string;
      actionType: number;
      targetChannelId: string | null;
      message: string | null;
      roleId: string | null;
      enabled: boolean;
    } | null>(`/api/CustomCommand/guild/${guildId}/command/${commandName}`);

    if (!command) {
      return null;
    }

    return {
      id: command.id,
      guildId: command.guildId,
      commandName: command.commandName,
      actionType: command.actionType,
      targetChannelId: command.targetChannelId,
      message: command.message,
      roleId: command.roleId,
      enabled: command.enabled,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Custom command alinamadi - API'ye baglanilamiyor (GuildId: ${guildId}, CommandName: ${commandName})`);
    } else {
      console.error(`[ERROR] GetCustomCommandByName API hatasi (GuildId: ${guildId}, CommandName: ${commandName}):`, errorMessage);
    }
    return null;
  }
}

// Moderator API
export async function getModeratorConfig(guildId: string): Promise<ModeratorData | null> {
  try {
    const moderator = await apiRequest<{
      id: number;
      guildId: string;
      enabled: boolean;
      rules: Array<{
        id: number;
        moderatorId: number;
        ruleType: string;
        action: number;
        enabled: boolean;
      }>;
      forbiddenWords: Array<{
        id: number;
        moderatorId: number;
        word: string;
      }>;
    } | null>(`/api/Moderator/guild/${guildId}`);

    if (!moderator) {
      return null;
    }

    return {
      id: moderator.id,
      guildId: moderator.guildId,
      enabled: moderator.enabled,
      rules: moderator.rules.map((r) => ({
        id: r.id,
        moderatorId: r.moderatorId,
        ruleType: r.ruleType,
        action: r.action,
        enabled: r.enabled,
      })),
      forbiddenWords: moderator.forbiddenWords.map((fw) => ({
        id: fw.id,
        moderatorId: fw.moderatorId,
        word: fw.word,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Moderator yapilandirmasi alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetModeratorConfig API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return null; // Hata durumunda null döndür
  }
}

// TicketPanel API
export async function getTicketPanelConfig(guildId: string): Promise<TicketPanelData | null> {
  try {
    const ticketPanel = await apiRequest<{
      id: number;
      guildId: string;
      channelId: string;
      messageId: string | null;
      panelMessage: string | null;
      isEmbed: boolean;
      embedTitle: string | null;
      embedDescription: string | null;
      embedColor: string | null;
      embedThumbnail: string | null;
      embedImage: string | null;
      embedFooter: string | null;
      embedTitleUrl?: string | null;
      embedAuthorName?: string | null;
      embedAuthorIcon?: string | null;
      embedAuthorUrl?: string | null;
      embedFooterIcon?: string | null;
      embedUseTimestamp?: boolean;
      embedFieldsJson?: string | null;
      welcomeMessage: string | null;
      isWelcomeEmbed: boolean;
      welcomeEmbedTitle: string | null;
      welcomeEmbedDescription: string | null;
      welcomeEmbedColor: string | null;
      welcomeEmbedThumbnail: string | null;
      welcomeEmbedImage: string | null;
      welcomeEmbedFooter: string | null;
      transcriptChannelId: string | null;
      sendTranscriptToUser: boolean;
      openCategoryId: string | null;
      openCategoryName: string | null;
      claimedCategoryId: string | null;
      claimedCategoryName: string | null;
      closedCategoryId: string | null;
      closedCategoryName: string | null;
      enabled: boolean;
      roleIds: string[];
      ticketTypes: Array<{
        id: number;
        type: number;
        label: string;
        emoji: string | null;
        style: number;
        placeholder: string | null;
        orderIndex: number;
        openCategoryId: string | null;
        openCategoryName: string | null;
        claimedCategoryId: string | null;
        claimedCategoryName: string | null;
        closedCategoryId: string | null;
        closedCategoryName: string | null;
        enabled: boolean;
      }>;
    } | null>(`/api/TicketPanel/guild/${guildId}`);

    if (!ticketPanel) {
      return null;
    }

    return {
      id: ticketPanel.id,
      guildId: ticketPanel.guildId,
      channelId: ticketPanel.channelId,
      messageId: ticketPanel.messageId,
      panelMessage: ticketPanel.panelMessage,
      isEmbed: ticketPanel.isEmbed,
      embedTitle: ticketPanel.embedTitle,
      embedDescription: ticketPanel.embedDescription,
      embedColor: ticketPanel.embedColor,
      embedThumbnail: ticketPanel.embedThumbnail,
      embedImage: ticketPanel.embedImage,
      embedFooter: ticketPanel.embedFooter,
      ...mapEmbedExtendedFromApi(ticketPanel as unknown as Record<string, unknown>),
      welcomeMessage: ticketPanel.welcomeMessage,
      isWelcomeEmbed: ticketPanel.isWelcomeEmbed,
      welcomeEmbedTitle: ticketPanel.welcomeEmbedTitle,
      welcomeEmbedDescription: ticketPanel.welcomeEmbedDescription,
      welcomeEmbedColor: ticketPanel.welcomeEmbedColor,
      welcomeEmbedThumbnail: ticketPanel.welcomeEmbedThumbnail,
      welcomeEmbedImage: ticketPanel.welcomeEmbedImage,
      welcomeEmbedFooter: ticketPanel.welcomeEmbedFooter,
      transcriptChannelId: ticketPanel.transcriptChannelId,
      sendTranscriptToUser: ticketPanel.sendTranscriptToUser,
      openCategoryId: ticketPanel.openCategoryId,
      openCategoryName: ticketPanel.openCategoryName,
      claimedCategoryId: ticketPanel.claimedCategoryId,
      claimedCategoryName: ticketPanel.claimedCategoryName,
      closedCategoryId: ticketPanel.closedCategoryId,
      closedCategoryName: ticketPanel.closedCategoryName,
      enabled: ticketPanel.enabled,
      roleIds: ticketPanel.roleIds,
      ticketTypes: ticketPanel.ticketTypes.map(tt => ({
        id: tt.id,
        type: tt.type,
        label: tt.label,
        emoji: tt.emoji,
        style: tt.style,
        placeholder: tt.placeholder,
        orderIndex: tt.orderIndex,
        openCategoryId: tt.openCategoryId,
        openCategoryName: tt.openCategoryName,
        claimedCategoryId: tt.claimedCategoryId,
        claimedCategoryName: tt.claimedCategoryName,
        closedCategoryId: tt.closedCategoryId,
        closedCategoryName: tt.closedCategoryName,
        enabled: tt.enabled,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Ticket panel yapilandirmasi alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetTicketPanelConfig API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return null;
  }
}

/** Panel / ticket DB kaydı (bot). */
export async function apiCreateTicketRecord(
  guildId: string,
  body: { ticketPanelId: number; ticketTypeId: number | null; channelId: string; userId: string },
  customBotClientId?: string
): Promise<number | null> {
  const raw = JSON.stringify(body);
  try {
    const id = await apiRequest<number>(`/api/Ticket/guild/${guildId}/bot/tickets`, { method: 'POST', body: raw }, customBotClientId);
    return typeof id === 'number' ? id : null;
  } catch (e) {
    console.warn(`[WARN] apiCreateTicketRecord basarisiz (Guild: ${guildId}):`, e);
    return null;
  }
}

export async function apiUpdateTicketClaimed(
  guildId: string,
  channelId: string,
  userId: string,
  customBotClientId?: string
): Promise<void> {
  const raw = JSON.stringify({ userId });
  try {
    await apiRequest(`/api/Ticket/guild/${guildId}/bot/tickets/channel/${channelId}/claim`, { method: 'PATCH', body: raw }, customBotClientId);
  } catch (e) {
    console.warn(`[WARN] apiUpdateTicketClaimed basarisiz:`, e);
  }
}

export async function apiUpdateTicketClosed(
  guildId: string,
  channelId: string,
  closedByUserId: string,
  transcriptId: number | null,
  customBotClientId?: string
): Promise<void> {
  const raw = JSON.stringify({ closedByUserId, transcriptId });
  try {
    await apiRequest(`/api/Ticket/guild/${guildId}/bot/tickets/channel/${channelId}/close`, { method: 'PATCH', body: raw }, customBotClientId);
  } catch (e) {
    console.warn(`[WARN] apiUpdateTicketClosed basarisiz:`, e);
  }
}

export async function apiTouchTicketStaffPanelMessage(
  guildId: string,
  channelId: string,
  staffUserId: string,
  customBotClientId?: string
): Promise<void> {
  const raw = JSON.stringify({ staffUserId, occurredAtUtc: new Date().toISOString() });
  try {
    await apiRequest(
      `/api/Ticket/guild/${guildId}/bot/tickets/channel/${channelId}/staff-panel-touch`,
      { method: 'POST', body: raw },
      customBotClientId
    );
  } catch (e) {
    console.warn(`[WARN] apiTouchTicketStaffPanelMessage basarisiz:`, e);
  }
}

export async function apiRecordGuildMemberEvent(
  guildId: string,
  body: { userId: string; eventType: number; metadataJson?: string | null },
  customBotClientId?: string
): Promise<void> {
  const raw = JSON.stringify(body);
  try {
    await apiRequest(`/api/GuildAnalyticsIngest/guild/${guildId}/member-event`, { method: 'POST', body: raw }, customBotClientId);
  } catch (e) {
    console.warn(`[WARN] apiRecordGuildMemberEvent basarisiz:`, e);
  }
}

export async function apiMergeGuildUserActivityDay(
  guildId: string,
  body: { userId: string; activityDate: string; deltaMessages: number; deltaVoiceSeconds: number; deltaReactions: number },
  customBotClientId?: string
): Promise<void> {
  const raw = JSON.stringify(body);
  try {
    await apiRequest(`/api/GuildAnalyticsIngest/guild/${guildId}/activity-day`, { method: 'POST', body: raw }, customBotClientId);
  } catch (error) {
    // yüksek hacim — sessiz
    logError('apiClient:mergeGuildUserActivityDay', error, 'debug');
  }
}

export async function apiTryTicketLastMessage(
  guildId: string,
  body: { channelId: string; authorId: string; occurredAtUtc: string },
  customBotClientId?: string
): Promise<void> {
  const raw = JSON.stringify(body);
  try {
    await apiRequest(`/api/GuildAnalyticsIngest/guild/${guildId}/ticket-last-message`, { method: 'POST', body: raw }, customBotClientId);
  } catch (error) {
    // ticket olmayan kanallarda sık no-op
    logError('apiClient:tryTicketLastMessage', error, 'debug');
  }
}

// EmbedMessage API
export async function getEmbedMessageById(id: number, customBotClientId?: string, customApiToken?: string): Promise<EmbedMessageData | null> {
  try {
    const embedMessage = await apiRequest<{
      id: number;
      guildId: string;
      channelId: string;
      messageId: string | null;
      name: string;
      message?: string | null;
      isEmbed: boolean;
      embedTitle: string | null;
      embedDescription: string | null;
      embedColor: string | null;
      embedThumbnail: string | null;
      embedImage: string | null;
      embedFooter: string | null;
      embedTitleUrl?: string | null;
      embedAuthorName?: string | null;
      embedAuthorIcon?: string | null;
      embedAuthorUrl?: string | null;
      embedFooterIcon?: string | null;
      embedUseTimestamp?: boolean;
      embedFieldsJson?: string | null;
      enabled: boolean;
      createdAt: string;
      updatedAt: string;
    } | null>(`/api/EmbedMessage/${id}`, undefined, customBotClientId, customApiToken);

    if (!embedMessage) {
      return null;
    }

    return {
      id: embedMessage.id,
      guildId: embedMessage.guildId,
      channelId: embedMessage.channelId,
      messageId: embedMessage.messageId,
      name: embedMessage.name,
      message: embedMessage.message ?? null,
      isEmbed: embedMessage.isEmbed,
      embedTitle: embedMessage.embedTitle,
      embedDescription: embedMessage.embedDescription,
      embedColor: embedMessage.embedColor,
      embedThumbnail: embedMessage.embedThumbnail,
      embedImage: embedMessage.embedImage,
      embedFooter: embedMessage.embedFooter,
      ...mapEmbedExtendedFromApi(embedMessage as unknown as Record<string, unknown>),
      enabled: embedMessage.enabled,
      createdAt: new Date(embedMessage.createdAt),
      updatedAt: new Date(embedMessage.updatedAt),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Embed mesaj alinamadi - API'ye baglanilamiyor (Id: ${id})`);
    } else {
      console.error(`[ERROR] GetEmbedMessageById API hatasi (Id: ${id}):`, errorMessage);
    }
    // 404 disi hatalari "kayit yok" gibi yutma; ust katmana gercek nedeni ilet.
    throw new Error(`GetEmbedMessageById basarisiz (Id: ${id}): ${errorMessage}`);
  }
}

export async function updateEmbedMessageMessageId(id: number, messageId: string, guildId: string, customApiToken?: string): Promise<boolean> {
  try {
    await apiRequest(`/api/EmbedMessage/guild/${guildId}/${id}/messageId`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId }),
    }, undefined, customApiToken);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] UpdateEmbedMessageMessageId API hatasi (Id: ${id}):`, errorMessage);
    return false;
  }
}

// Poll API
type PollApiResponse = {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string | null;
  question: string;
  isActive: boolean;
  endedAt: string | null;
  endAfterMinutes: number | null;
  endAfterVotes: number | null;
  allowMultipleVotes: boolean;
  totalVotes: number;
  pollEmbedTitle: string | null;
  pollEmbedDescription: string | null;
  pollEmbedColor: string | null;
  pollEmbedThumbnail: string | null;
  pollEmbedImage: string | null;
  pollEmbedFooter: string | null;
  pollEmbedTitleUrl?: string | null;
  pollEmbedAuthorName?: string | null;
  pollEmbedAuthorIcon?: string | null;
  pollEmbedAuthorUrl?: string | null;
  pollEmbedFooterIcon?: string | null;
  pollEmbedUseTimestamp?: boolean;
  pollEmbedFieldsJson?: string | null;
  resultEmbedTitle: string | null;
  resultEmbedDescription: string | null;
  resultEmbedColor: string | null;
  resultEmbedThumbnail: string | null;
  resultEmbedImage: string | null;
  resultEmbedFooter: string | null;
  resultEmbedTitleUrl?: string | null;
  resultEmbedAuthorName?: string | null;
  resultEmbedAuthorIcon?: string | null;
  resultEmbedAuthorUrl?: string | null;
  resultEmbedFooterIcon?: string | null;
  resultEmbedUseTimestamp?: boolean;
  resultEmbedFieldsJson?: string | null;
  createdAt: string;
  updatedAt: string;
  options: Array<{
    id: number;
    pollId: number;
    optionText: string;
    emoji: string | null;
    orderIndex: number;
    voteCount: number;
    createdAt: string;
  }>;
  rolePermissions: Array<{
    id: number;
    pollId: number;
    roleId: string;
    isAllowed: boolean;
    createdAt: string;
  }>;
};

function mapPollApiResponse(poll: PollApiResponse): PollData {
  return {
    id: poll.id,
    guildId: poll.guildId,
    channelId: poll.channelId,
    messageId: poll.messageId,
    question: poll.question,
    isActive: poll.isActive,
    endedAt: poll.endedAt ? new Date(poll.endedAt) : null,
    endAfterMinutes: poll.endAfterMinutes,
    endAfterVotes: poll.endAfterVotes,
    allowMultipleVotes: poll.allowMultipleVotes,
    totalVotes: poll.totalVotes,
    pollEmbedTitle: poll.pollEmbedTitle,
    pollEmbedDescription: poll.pollEmbedDescription,
    pollEmbedColor: poll.pollEmbedColor,
    pollEmbedThumbnail: poll.pollEmbedThumbnail,
    pollEmbedImage: poll.pollEmbedImage,
    pollEmbedFooter: poll.pollEmbedFooter,
    pollEmbedTitleUrl: poll.pollEmbedTitleUrl ?? null,
    pollEmbedAuthorName: poll.pollEmbedAuthorName ?? null,
    pollEmbedAuthorIcon: poll.pollEmbedAuthorIcon ?? null,
    pollEmbedAuthorUrl: poll.pollEmbedAuthorUrl ?? null,
    pollEmbedFooterIcon: poll.pollEmbedFooterIcon ?? null,
    pollEmbedUseTimestamp: poll.pollEmbedUseTimestamp,
    pollEmbedFieldsJson: poll.pollEmbedFieldsJson ?? null,
    resultEmbedTitle: poll.resultEmbedTitle,
    resultEmbedDescription: poll.resultEmbedDescription,
    resultEmbedColor: poll.resultEmbedColor,
    resultEmbedThumbnail: poll.resultEmbedThumbnail,
    resultEmbedImage: poll.resultEmbedImage,
    resultEmbedFooter: poll.resultEmbedFooter,
    resultEmbedTitleUrl: poll.resultEmbedTitleUrl ?? null,
    resultEmbedAuthorName: poll.resultEmbedAuthorName ?? null,
    resultEmbedAuthorIcon: poll.resultEmbedAuthorIcon ?? null,
    resultEmbedAuthorUrl: poll.resultEmbedAuthorUrl ?? null,
    resultEmbedFooterIcon: poll.resultEmbedFooterIcon ?? null,
    resultEmbedUseTimestamp: poll.resultEmbedUseTimestamp,
    resultEmbedFieldsJson: poll.resultEmbedFieldsJson ?? null,
    createdAt: new Date(poll.createdAt),
    updatedAt: new Date(poll.updatedAt),
    options: poll.options.map(opt => ({
      id: opt.id,
      pollId: opt.pollId,
      optionText: opt.optionText,
      emoji: opt.emoji,
      orderIndex: opt.orderIndex,
      voteCount: opt.voteCount,
      createdAt: new Date(opt.createdAt),
    })),
    rolePermissions: poll.rolePermissions.map(rp => ({
      id: rp.id,
      pollId: rp.pollId,
      roleId: rp.roleId,
      isAllowed: rp.isAllowed,
      createdAt: new Date(rp.createdAt),
    })),
  };
}

export async function getPollsByGuildId(guildId: string, customBotClientId?: string, customApiToken?: string): Promise<PollData[]> {
  try {
    const polls = await apiRequest<PollApiResponse[]>(`/api/Poll/guild/${guildId}`, undefined, customBotClientId, customApiToken);
    return (polls || []).map(mapPollApiResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetPollsByGuildId API hatasi (GuildId: ${guildId}):`, errorMessage);
    return [];
  }
}

export async function getPollById(id: number, customBotClientId?: string, customApiToken?: string): Promise<PollData | null> {
  try {
    const poll = await apiRequest<PollApiResponse | null>(`/api/Poll/${id}`, undefined, customBotClientId, customApiToken);

    if (!poll) {
      return null;
    }

    return mapPollApiResponse(poll);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Anket alinamadi - API'ye baglanilamiyor (Id: ${id})`);
    } else {
      console.error(`[ERROR] GetPollById API hatasi (Id: ${id}):`, errorMessage);
    }
    throw new Error(`GetPollById basarisiz (Id: ${id}): ${errorMessage}`);
  }
}

export async function getActivePollByChannelId(channelId: string): Promise<PollData | null> {
  try {
    const poll = await apiRequest<{
      id: number;
      guildId: string;
      channelId: string;
      messageId: string | null;
      question: string;
      isActive: boolean;
      endedAt: string | null;
      endAfterMinutes: number | null;
      endAfterVotes: number | null;
      allowMultipleVotes: boolean;
      totalVotes: number;
      pollEmbedTitle: string | null;
      pollEmbedDescription: string | null;
      pollEmbedColor: string | null;
      pollEmbedThumbnail: string | null;
      pollEmbedImage: string | null;
      pollEmbedFooter: string | null;
      resultEmbedTitle: string | null;
      resultEmbedDescription: string | null;
      resultEmbedColor: string | null;
      resultEmbedThumbnail: string | null;
      resultEmbedImage: string | null;
      resultEmbedFooter: string | null;
      createdAt: string;
      updatedAt: string;
      options: Array<{
        id: number;
        pollId: number;
        optionText: string;
        emoji: string | null;
        orderIndex: number;
        voteCount: number;
        createdAt: string;
      }>;
      rolePermissions: Array<{
        id: number;
        pollId: number;
        roleId: string;
        isAllowed: boolean;
        createdAt: string;
      }>;
    } | null>(`/api/Poll/channel/${channelId}/active`);

    if (!poll) {
      return null;
    }

    return mapPollApiResponse(poll as PollApiResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Aktif anket alinamadi - API'ye baglanilamiyor (ChannelId: ${channelId})`);
    } else {
      console.error(`[ERROR] GetActivePollByChannelId API hatasi (ChannelId: ${channelId}):`, errorMessage);
    }
    return null;
  }
}

export async function updatePollMessageId(
  guildId: string,
  id: number,
  messageId: string,
  customBotClientId?: string,
  customApiToken?: string,
): Promise<boolean> {
  try {
    await apiRequest(`/api/Poll/guild/${guildId}/${id}/messageId`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId }),
    }, customBotClientId, customApiToken);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] UpdatePollMessageId API hatasi (GuildId: ${guildId}, Id: ${id}):`, errorMessage);
    return false;
  }
}

/**
 * "Rekor Çevrimiçi" sayacı için anlık online değerini API'ye gönderir; API kalıcı
 * tepe ile karşılaştırıp sonuçtaki tepe (max) değerini döndürür. Hata durumunda
 * anlık değer fallback olarak döner.
 */
export async function updateAndGetPeakOnline(
  guildId: string,
  counterType: string,
  currentOnline: number,
  customBotClientId?: string,
  customApiToken?: string
): Promise<number> {
  try {
    const result = await apiRequest<{ peakOnlineCount: number }>(
      `/api/StatisticsChannel/guild/${guildId}/peak`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterType, currentOnline }),
      },
      customBotClientId,
      customApiToken
    );
    return typeof result?.peakOnlineCount === 'number' ? result.peakOnlineCount : currentOnline;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] UpdateAndGetPeakOnline API hatasi (GuildId: ${guildId}, CounterType: ${counterType}):`, errorMessage);
    return currentOnline;
  }
}

export async function endPoll(guildId: string, id: number, customBotClientId?: string, customApiToken?: string): Promise<boolean> {
  try {
    await apiRequest(`/api/Poll/guild/${guildId}/${id}/end`, {
      method: 'POST',
    }, customBotClientId, customApiToken);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] EndPoll API hatasi (Id: ${id}):`, errorMessage);
    return false;
  }
}

export async function addPollVote(pollId: number, optionId: number, userId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/Poll/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pollId, optionId, userId }),
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] AddPollVote API hatasi (PollId: ${pollId}, OptionId: ${optionId}):`, errorMessage);
    return false;
  }
}

export async function removePollVote(pollId: number, optionId: number, userId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/Poll/${pollId}/vote`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pollId, optionId, userId }),
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] RemovePollVote API hatasi (PollId: ${pollId}, OptionId: ${optionId}):`, errorMessage);
    return false;
  }
}

export async function getPollResults(pollId: number, customBotClientId?: string, customApiToken?: string): Promise<{
  pollId: number;
  question: string;
  totalVotes: number;
  optionResults: Array<{
    optionId: number;
    optionText: string;
    emoji: string | null;
    voteCount: number;
    percentage: number;
  }>;
  endedAt: string | null;
  allowMultipleVotes: boolean;
} | null> {
  try {
    const result = await apiRequest<{
      pollId: number;
      question: string;
      totalVotes: number;
      optionResults: Array<{
        optionId: number;
        optionText: string;
        emoji: string | null;
        voteCount: number;
        percentage: number;
      }>;
      endedAt: string | null;
      allowMultipleVotes: boolean;
    } | null>(`/api/Poll/${pollId}/result`, undefined, customBotClientId, customApiToken);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetPollResults API hatasi (PollId: ${pollId}):`, errorMessage);
    return null;
  }
}

export async function getUserVotesForPoll(pollId: number, userId: string): Promise<number[]> {
  try {
    const votes = await apiRequest<number[]>(`/api/Poll/${pollId}/user/${userId}/votes`);
    return votes || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetUserVotesForPoll API hatasi (PollId: ${pollId}, UserId: ${userId}):`, errorMessage);
    return [];
  }
}

// Temporary Voice Channel API
export async function getTemporaryVoiceChannelLobbies(guildId: string): Promise<TemporaryVoiceChannelLobbyData[]> {
  try {
    const lobbies = await apiRequest<TemporaryVoiceChannelLobbyData[]>(`/api/TemporaryVoiceChannel/guild/${guildId}`);
    
    if (!lobbies || !Array.isArray(lobbies)) {
      return [];
    }

    return lobbies.map(lobby => ({
      id: lobby.id,
      guildId: lobby.guildId,
      channelId: lobby.channelId,
      channelName: lobby.channelName,
      userLimit: lobby.userLimit,
      bitrate: lobby.bitrate,
      deleteAfterMinutes: lobby.deleteAfterMinutes,
      ownershipTimeoutMinutes: lobby.ownershipTimeoutMinutes,
      syncCategoryPermissions: lobby.syncCategoryPermissions,
      syncChannelPermissions: lobby.syncChannelPermissions,
      createTextChannel: lobby.createTextChannel,
      restrictCommandsToTextChannel: lobby.restrictCommandsToTextChannel,
      pinCommandUsage: lobby.pinCommandUsage,
      restrictTextChannel: lobby.restrictTextChannel,
      ownerCanManageChannel: lobby.ownerCanManageChannel,
      ownerCanManagePermissions: lobby.ownerCanManagePermissions,
      ownerIsPrioritySpeaker: lobby.ownerIsPrioritySpeaker,
      ownerCanMoveMembers: lobby.ownerCanMoveMembers,
      enabled: lobby.enabled,
      roles: lobby.roles || [],
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Temporary voice channel lobbies alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetTemporaryVoiceChannelLobbies API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return [];
  }
}

// Create Temporary Voice Channel
export async function createTemporaryVoiceChannel(createDto: {
  lobbyId: number;
  guildId: string;
  channelId: string;
  textChannelId?: string | null;
  ownerId: string;
  channelName: string;
  userLimit?: number | null;
  bitrate?: number | null;
}): Promise<TemporaryVoiceChannelData> {
  try {
    const channel = await apiRequest<TemporaryVoiceChannelData>(`/api/TemporaryVoiceChannel/channel`, {
      method: 'POST',
      body: JSON.stringify(createDto),
    });
    return channel;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] CreateTemporaryVoiceChannel API hatasi:`, errorMessage);
    throw error;
  }
}

// Get Temporary Voice Channel by ChannelId
export async function getTemporaryVoiceChannelByChannelId(channelId: string): Promise<TemporaryVoiceChannelData | null> {
  try {
    const channel = await apiRequest<TemporaryVoiceChannelData | null>(`/api/TemporaryVoiceChannel/channel/${channelId}`);
    return channel;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetTemporaryVoiceChannelByChannelId API hatasi:`, errorMessage);
    throw error;
  }
}

// Update Temporary Voice Channel Owner
export async function updateTemporaryVoiceChannelOwner(
  channelId: string,
  ownerId: string,
): Promise<TemporaryVoiceChannelData | null> {
  try {
    const channel = await apiRequest<TemporaryVoiceChannelData | null>(`/api/TemporaryVoiceChannel/channel/${channelId}/owner`, {
      method: 'PATCH',
      body: JSON.stringify({ ownerId }),
    });
    return channel;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] UpdateTemporaryVoiceChannelOwner API hatasi:`, errorMessage);
    throw error;
  }
}

// Delete Temporary Voice Channel
export async function deleteTemporaryVoiceChannel(channelId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/TemporaryVoiceChannel/channel/${channelId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] DeleteTemporaryVoiceChannel API hatasi:`, errorMessage);
    return false;
  }
}

// Help Command API
export async function getHelpCommandByName(guildId: string, commandName: string): Promise<{
  id: number;
  guildId: string;
  commandName: string;
  description: string | null;
  enabled: boolean;
  cooldownType: number;
  cooldownSeconds: number | null;
  sendAsDM: boolean;
  deleteAfterUse: boolean;
  disableReply: boolean;
  rolePermissionType: number;
  channelPermissionType: number;
  isEmbed: boolean;
  embedTitle: string | null;
  embedDescription: string | null;
  embedColor: string | null;
  embedThumbnail: string | null;
  embedImage: string | null;
  embedFooter: string | null;
  embedTitleUrl?: string | null;
  embedAuthorName?: string | null;
  embedAuthorIcon?: string | null;
  embedAuthorUrl?: string | null;
  embedFooterIcon?: string | null;
  embedUseTimestamp?: boolean;
  embedFieldsJson?: string | null;
  roleIds: string[];
  channelIds: string[];
} | null> {
  try {
    const command = await apiRequest<{
      id: number;
      guildId: string;
      commandName: string;
      description: string | null;
      enabled: boolean;
      cooldownType: number;
      cooldownSeconds: number | null;
      sendAsDM: boolean;
      deleteAfterUse: boolean;
      disableReply: boolean;
      rolePermissionType: number;
      channelPermissionType: number;
      isEmbed: boolean;
      embedTitle: string | null;
      embedDescription: string | null;
      embedColor: string | null;
      embedThumbnail: string | null;
      embedImage: string | null;
      embedFooter: string | null;
      embedTitleUrl?: string | null;
      embedAuthorName?: string | null;
      embedAuthorIcon?: string | null;
      embedAuthorUrl?: string | null;
      embedFooterIcon?: string | null;
      embedUseTimestamp?: boolean;
      embedFieldsJson?: string | null;
      roleIds: string[];
      channelIds: string[];
    } | null>(`/api/HelpCommand/guild/${guildId}/command/${commandName}`);

    if (!command) {
      return null;
    }

    return command;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Help command alinamadi - API'ye baglanilamiyor (GuildId: ${guildId}, CommandName: ${commandName})`);
    } else {
      console.error(`[ERROR] GetHelpCommandByName API hatasi (GuildId: ${guildId}, CommandName: ${commandName}):`, errorMessage);
    }
    return null;
  }
}

// Birthday API
export async function getBirthdaySettings(guildId: string): Promise<BirthdayData | null> {
  try {
    const birthday = await apiRequest<BirthdayData | null>(`/api/Birthday/settings/guild/${guildId}`);
    
    if (!birthday) {
      return null;
    }

    return {
      channelId: birthday.channelId,
      roleId: birthday.roleId,
      isEmbed: birthday.isEmbed,
      message: birthday.message,
      embedTitle: birthday.embedTitle,
      embedDescription: birthday.embedDescription,
      embedColor: birthday.embedColor,
      embedThumbnail: birthday.embedThumbnail,
      embedImage: birthday.embedImage,
      embedFooter: birthday.embedFooter,
      ...mapEmbedExtendedFromApi(birthday as unknown as Record<string, unknown>),
      enabled: birthday.enabled,
      createMessageIsEmbed: birthday.createMessageIsEmbed,
      createMessage: birthday.createMessage,
      createEmbedTitle: birthday.createEmbedTitle,
      createEmbedDescription: birthday.createEmbedDescription,
      createEmbedColor: birthday.createEmbedColor,
      createEmbedThumbnail: birthday.createEmbedThumbnail,
      createEmbedImage: birthday.createEmbedImage,
      createEmbedFooter: birthday.createEmbedFooter,
      createEmbedTitleUrl: birthday.createEmbedTitleUrl ?? null,
      createEmbedAuthorName: birthday.createEmbedAuthorName ?? null,
      createEmbedAuthorIcon: birthday.createEmbedAuthorIcon ?? null,
      createEmbedAuthorUrl: birthday.createEmbedAuthorUrl ?? null,
      createEmbedFooterIcon: birthday.createEmbedFooterIcon ?? null,
      createEmbedUseTimestamp: birthday.createEmbedUseTimestamp,
      createEmbedFieldsJson: birthday.createEmbedFieldsJson ?? null,
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetBirthdaySettings API hatasi (GuildId: ${guildId}):`, errorMessage);
    return null;
  }
}

export async function getBirthdayUsersByDate(month: number, day: number): Promise<BirthdayUserData[]> {
  try {
    const users = await apiRequest<BirthdayUserData[]>(`/api/Birthday/users/date/${month}/${day}`);
    return users || [];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetBirthdayUsersByDate API hatasi (Month: ${month}, Day: ${day}):`, errorMessage);
    return [];
  }
}


export async function deleteBirthdayUser(guildId: string, userId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/Birthday/users/guild/${guildId}/user/${userId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] DeleteBirthdayUser API hatasi (GuildId: ${guildId}, UserId: ${userId}):`, errorMessage);
    return false;
  }
}

/** Doğum günü kutlandı olarak işaretler (bu yıl tekrar mesaj gitmez) */
export async function markBirthdayUserCelebrated(guildId: string, userId: string): Promise<boolean> {
  try {
    await apiRequest<void>(`/api/Birthday/users/guild/${guildId}/user/${userId}/mark-celebrated`, {
      method: 'POST',
    });
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] MarkBirthdayUserCelebrated API hatasi (GuildId: ${guildId}, UserId: ${userId}):`, errorMessage);
    return false;
  }
}

// Log Channel API
export async function getLogChannelByGuildId(guildId: string): Promise<LogChannelData | null> {
  try {
    const logChannel = await apiRequest<{
      id: number;
      guildId: string;
      channelId: string;
      enabled: boolean;
      isEmbed: boolean;
      embedTitle?: string | null;
      embedDescription?: string | null;
      embedColor?: string | null;
      embedThumbnail?: string | null;
      embedImage?: string | null;
      embedFooter?: string | null;
      embedTitleUrl?: string | null;
      embedAuthorName?: string | null;
      embedAuthorIcon?: string | null;
      embedAuthorUrl?: string | null;
      embedFooterIcon?: string | null;
      embedUseTimestamp?: boolean;
      embedFieldsJson?: string | null;
    } | null>(`/api/LogChannel/guild/${guildId}`);

    if (!logChannel) {
      return null;
    }

    // Log türlerini de getir
    const types = await getLogChannelTypesByGuildId(guildId);

    return {
      id: logChannel.id,
      guildId: logChannel.guildId,
      channelId: logChannel.channelId,
      enabled: logChannel.enabled,
      isEmbed: logChannel.isEmbed,
      embedTitle: logChannel.embedTitle,
      embedDescription: logChannel.embedDescription,
      embedColor: logChannel.embedColor,
      embedThumbnail: logChannel.embedThumbnail,
      embedImage: logChannel.embedImage,
      embedFooter: logChannel.embedFooter,
      ...mapEmbedExtendedFromApi(logChannel as unknown as Record<string, unknown>),
      types: types || []
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Log channel alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetLogChannelByGuildId API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return null;
  }
}

export async function getLogChannelTypesByGuildId(guildId: string): Promise<LogChannelTypeData[]> {
  try {
    const types = await apiRequest<LogChannelTypeData[]>(`/api/LogChannel/guild/${guildId}/types`);
    return types || [];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetLogChannelTypesByGuildId API hatasi (GuildId: ${guildId}):`, errorMessage);
    return [];
  }
}

// Giveaway API
export async function getGiveawayById(id: number, customBotClientId?: string, customApiToken?: string): Promise<GiveawayData | null> {
  try {
    const giveaway = await apiRequest<GiveawayData>(`/api/Giveaway/${id}`, undefined, customBotClientId, customApiToken);
    return giveaway;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Giveaway alinamadi - API'ye baglanilamiyor (Id: ${id})`);
    } else {
      console.error(`[ERROR] GetGiveawayById API hatasi (Id: ${id}):`, errorMessage);
    }
    throw new Error(`GetGiveawayById basarisiz (Id: ${id}): ${errorMessage}`);
  }
}

export async function getGiveawaysByGuildId(guildId: string): Promise<GiveawayData[]> {
  try {
    const giveaways = await apiRequest<GiveawayData[]>(`/api/Giveaway/guild/${guildId}`);
    return giveaways || [];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Giveaway'ler alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetGiveawaysByGuildId API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return [];
  }
}

export async function getActiveGiveaways(): Promise<GiveawayData[]> {
  try {
    const giveaways = await apiRequest<GiveawayData[]>(`/api/Giveaway/active`);
    return giveaways || [];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetActiveGiveaways API hatasi:`, errorMessage);
    return [];
  }
}

export async function getGiveawayByMessageId(messageId: string): Promise<GiveawayData | null> {
  try {
    const giveaway = await apiRequest<GiveawayData>(`/api/Giveaway/message/${messageId}`);
    return giveaway;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetGiveawayByMessageId API hatasi:`, errorMessage);
    return null;
  }
}

export async function createGiveaway(createDto: {
  guildId: string;
  channelId: string;
  name: string;
  prize: string;
  winnerCount: number;
  endDate: Date;
  timeZone?: string;
  rolePermissionType?: number;
  isEmbed?: boolean;
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: string;
  embedThumbnail?: string;
  embedImage?: string;
  embedFooter?: string;
  roles?: Array<{ roleId: string; winChanceMultiplier: number }>;
  allowedRoleIds?: string[];
}): Promise<GiveawayData | null> {
  try {
    const giveaway = await apiRequest<GiveawayData>('/api/Giveaway', {
      method: 'POST',
      body: JSON.stringify(createDto),
    });
    return giveaway;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] CreateGiveaway API hatasi:`, errorMessage);
    return null;
  }
}

export async function updateGiveawayMessageId(
  guildId: string,
  id: number,
  messageId: string,
  customBotClientId?: string,
  customApiToken?: string,
): Promise<boolean> {
  try {
    await apiRequest(`/api/Giveaway/guild/${guildId}/${id}/messageId`, {
      method: 'PUT',
      body: JSON.stringify({ messageId }),
    }, customBotClientId, customApiToken);
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] UpdateGiveawayMessageId API hatasi (Id: ${id}):`, errorMessage);
    return false;
  }
}

export async function addGiveawayParticipant(giveawayId: number, userId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/Giveaway/${giveawayId}/participant`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] AddGiveawayParticipant API hatasi (GiveawayId: ${giveawayId}, UserId: ${userId}):`, errorMessage);
    return false;
  }
}

export async function removeGiveawayParticipant(giveawayId: number, userId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/Giveaway/${giveawayId}/participant`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] RemoveGiveawayParticipant API hatasi (GiveawayId: ${giveawayId}, UserId: ${userId}):`, errorMessage);
    return false;
  }
}

// =============================================
// REMINDER SETTINGS API
// =============================================

export interface ReminderSettingsData {
  id: number;
  guildId: string;
  createMessageIsEmbed: boolean;
  createMessage?: string | null;
  createEmbedTitle?: string | null;
  createEmbedDescription?: string | null;
  createEmbedColor?: string | null;
  createEmbedThumbnail?: string | null;
  createEmbedImage?: string | null;
  createEmbedFooter?: string | null;
  createEmbedTitleUrl?: string | null;
  createEmbedAuthorName?: string | null;
  createEmbedAuthorIcon?: string | null;
  createEmbedAuthorUrl?: string | null;
  createEmbedFooterIcon?: string | null;
  createEmbedUseTimestamp?: boolean;
  createEmbedFieldsJson?: string | null;
  defaultIsEmbed: boolean;
  sendMessageIsEmbed: boolean;
  sendMessage?: string | null;
  sendEmbedTitle?: string | null;
  sendEmbedDescription?: string | null;
  sendEmbedColor?: string | null;
  sendEmbedThumbnail?: string | null;
  sendEmbedImage?: string | null;
  sendEmbedFooter?: string | null;
  sendEmbedTitleUrl?: string | null;
  sendEmbedAuthorName?: string | null;
  sendEmbedAuthorIcon?: string | null;
  sendEmbedAuthorUrl?: string | null;
  sendEmbedFooterIcon?: string | null;
  sendEmbedUseTimestamp?: boolean;
  sendEmbedFieldsJson?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export async function getReminderSettings(guildId: string): Promise<ReminderSettingsData | null> {
  try {
    const settings = await apiRequest<ReminderSettingsData>(`/api/ReminderSettings/guild/${guildId}`, {
      method: 'GET',
    });
    return settings;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 404 hatası normal (ayarlar henüz oluşturulmamış)
    if (errorMessage.includes('404') || errorMessage.includes('bulunamadı')) {
      return null;
    }
    console.error(`[ERROR] GetReminderSettings API hatasi (GuildId: ${guildId}):`, errorMessage);
    return null;
  }
}

export async function endGiveaway(guildId: string, id: number): Promise<boolean> {
  try {
    await apiRequest(`/api/Giveaway/guild/${guildId}/${id}/end`, {
      method: 'POST',
    });
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] EndGiveaway API hatasi (Id: ${id}):`, errorMessage);
    return false;
  }
}

export async function getGiveawayParticipants(giveawayId: number): Promise<Array<{ userId: string; joinedAt: Date }>> {
  try {
    const participants = await apiRequest<Array<{ userId: string; joinedAt: string }>>(`/api/Giveaway/${giveawayId}/participants`);
    return participants.map(p => ({
      userId: p.userId,
      joinedAt: new Date(p.joinedAt)
    }));
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] GetGiveawayParticipants API hatasi (GiveawayId: ${giveawayId}):`, errorMessage);
    return [];
  }
}

export async function addGiveawayWinner(giveawayId: number, userId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/Giveaway/${giveawayId}/winner`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return true;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] AddGiveawayWinner API hatasi (GiveawayId: ${giveawayId}, UserId: ${userId}):`, errorMessage);
    return false;
  }
}

// =============================================
// GUILD FEATURES API
// =============================================

export async function getEnabledFeaturesForGuild(guildId: string): Promise<string[]> {
  try {
    const features = await apiRequest<string[]>(`/api/GuildFeature/guild/${guildId}/enabled`);
    return features || [];
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Enabled features alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetEnabledFeaturesForGuild API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return [];
  }
}

export async function isFeatureEnabled(guildId: string, featureName: string): Promise<boolean> {
  try {
    const result = await apiRequest<{ isEnabled: boolean }>(`/api/GuildFeature/guild/${guildId}/feature/${featureName}/status`);
    return result?.isEnabled ?? false;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] IsFeatureEnabled API hatasi (GuildId: ${guildId}, FeatureName: ${featureName}):`, errorMessage);
    return false;
  }
}

// Discord Cache API
export async function invalidateDiscordGuildCache(guildId: string): Promise<boolean> {
  try {
    await apiRequest(`/api/discord/guilds/${guildId}/cache/invalidate`, {
      method: 'POST',
    })
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[ERROR] InvalidateDiscordGuildCache API hatasi (GuildId: ${guildId}):`, errorMessage)
    return false
  }
}

// =============================================
// LEVEL API
// =============================================

export interface LevelData {
  id: number;
  guildId: string;
  enabled: boolean;
  xpPerMessage: number;
  xpPerMessageMin: number;
  xpPerMessageMax: number;
  useRandomXp: boolean;
  cooldownSeconds: number;
  baseXpRequired: number;
  xpMultiplier: number;
  notifyOnLevelUp: boolean;
  notificationChannelId?: string | null;
  useEmbedForNotification: boolean;
  notificationMessage?: string | null;
  notificationEmbedTitle?: string | null;
  notificationEmbedDescription?: string | null;
  notificationEmbedColor?: string | null;
  notificationEmbedThumbnail?: string | null;
  notificationEmbedImage?: string | null;
  notificationEmbedFooter?: string | null;
  notificationEmbedTitleUrl?: string | null;
  notificationEmbedAuthorName?: string | null;
  notificationEmbedAuthorIcon?: string | null;
  notificationEmbedAuthorUrl?: string | null;
  notificationEmbedFooterIcon?: string | null;
  notificationEmbedUseTimestamp?: boolean;
  notificationEmbedFieldsJson?: string | null;
  useEmbedForXpGain: boolean;
  xpGainMessage?: string | null;
  xpGainEmbedColor?: string | null;
  xpGainEmbedUseTimestamp?: boolean;
  ignoredChannelIds?: string | null;
  ignoredRoleIds?: string | null;
  enableRoleRewards: boolean;
  roleRewardsJson?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserLevelData {
  id: number;
  guildId: string;
  userId: string;
  level: number;
  totalXp: number;
  currentXp: number;
  xpForNextLevel: number;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export async function getLevelSettings(guildId: string): Promise<LevelData | null> {
  try {
    const settings = await apiRequest<LevelData>(`/api/Level/guild/${guildId}`, {
      method: 'GET',
    });
    return settings;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 404 hatası normal (ayarlar henüz oluşturulmamış)
    if (errorMessage.includes('404') || errorMessage.includes('bulunamadı')) {
      return null;
    }
    console.error(`[ERROR] GetLevelSettings API hatasi (GuildId: ${guildId}):`, errorMessage);
    return null;
  }
}

export async function addXpToUser(guildId: string, userId: string, xp: number): Promise<UserLevelData | null> {
  try {
    const result = await apiRequest<UserLevelData>(`/api/Level/guild/${guildId}/user/${userId}/add-xp`, {
      method: 'POST',
      body: JSON.stringify({ xp }),
    });
    return result;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] AddXpToUser API hatasi (GuildId: ${guildId}, UserId: ${userId}, Xp: ${xp}):`, errorMessage);
    return null;
  }
}

export async function getUserLevel(guildId: string, userId: string): Promise<UserLevelData | null> {
  try {
    const result = await apiRequest<UserLevelData>(`/api/Level/guild/${guildId}/user/${userId}`, {
      method: 'GET',
    });
    return result;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // 404 hatası normal (kullanıcı henüz level kaydı yok)
    if (errorMessage.includes('404') || errorMessage.includes('bulunamadı')) {
      return null;
    }
    console.error(`[ERROR] GetUserLevel API hatasi (GuildId: ${guildId}, UserId: ${userId}):`, errorMessage);
    return null;
  }
}