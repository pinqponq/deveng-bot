import { BotConfig } from '../types/config';
import { 
  WelcomeData, 
  GoodbyeData, 
  ReactionRoleData,
  ModeratorData,
  TicketPanelData,
  TemporaryVoiceChannelLobbyData,
  TemporaryVoiceChannelData,
  LogChannelData,
} from '../types/database';
import { initializeRedisCache, closeRedisCache, reactionRoleCache, welcomeCache, goodbyeCache, moderatorCache, ticketPanelCache, temporaryVoiceChannelCache, logChannelCache } from './redisCache';
import { 
  getWelcomeMessage as apiGetWelcomeMessage,
  getGoodbyeMessage as apiGetGoodbyeMessage,
  getReactionRoleConfigs as apiGetReactionRoleConfigs,
  getModeratorConfig as apiGetModeratorConfig,
  getTicketPanelConfig as apiGetTicketPanelConfig,
  getTemporaryVoiceChannelLobbies as apiGetTemporaryVoiceChannelLobbies,
  createTemporaryVoiceChannel as apiCreateTemporaryVoiceChannel,
  getTemporaryVoiceChannelByChannelId as apiGetTemporaryVoiceChannelByChannelId,
  updateTemporaryVoiceChannelOwner as apiUpdateTemporaryVoiceChannelOwner,
  deleteTemporaryVoiceChannel as apiDeleteTemporaryVoiceChannel,
  getLogChannelByGuildId as apiGetLogChannelByGuildId,
  initializeApiClient,
  getBotApiHeaders
} from './apiClient';

// API Client ve Redis Cache başlat
export async function initializeDatabase(config: BotConfig): Promise<void> {
  try {
    initializeApiClient(config);
    console.log('[INFO] API Client başlatıldı.');

    const redisUrl = config.redis?.url || process.env.REDIS_URL;
    if (redisUrl?.trim()) {
      initializeRedisCache({
        url: redisUrl.trim(),
        user: config.redis?.user,
        password: config.redis?.password,
      });
    } else {
      console.warn('[WARN] Redis URL yapılandırılmamış (config.redis.url veya REDIS_URL). Cache devre dışı.');
    }

    // API bağlantısını doğrula (basit health check)
    const { getApiBaseUrl } = await import('./apiClient');
    const apiUrl = getApiBaseUrl();
    try {
      const healthRes = await fetch(`${apiUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
      const ok = healthRes.status === 200;
      if (ok) {
        console.log(`[STARTUP] API bağlantısı doğrulandı ✓ (${apiUrl}/health)`);
      } else {
        console.warn(`[STARTUP] API /health yanıtı beklenmeyen: ${healthRes.status} (${apiUrl})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[STARTUP] API bağlantısı BAŞARISIZ ✗ (${apiUrl}):`, msg);
    }
  } catch (error) {
    console.error('[ERROR] Database başlatma hatası:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  closeRedisCache();
  console.log('[INFO] Redis cache kapatıldı.');
}

// Welcome Message - API kullanıyor
export async function getWelcomeMessage(guildId: string, language: string = 'tr', fallbackLanguage: string = 'tr'): Promise<WelcomeData | null> {
  try {
    const cacheKey = `config:welcome:${guildId}:${language}`;
    const cached = await welcomeCache.get<WelcomeData>(cacheKey);
    if (cached) return cached;

    const welcomeData = await apiGetWelcomeMessage(guildId, language, fallbackLanguage);

    if (welcomeData) {
      await welcomeCache.set(cacheKey, welcomeData);
      return welcomeData;
    }

    return null;
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

// Goodbye Message - API kullanıyor
export async function getGoodbyeMessage(guildId: string, language: string = 'tr', fallbackLanguage: string = 'tr'): Promise<GoodbyeData | null> {
  try {
    const cacheKey = `config:goodbye:${guildId}:${language}`;
    const cached = await goodbyeCache.get<GoodbyeData>(cacheKey);
    if (cached) return cached;

    const goodbyeData = await apiGetGoodbyeMessage(guildId, language, fallbackLanguage);

    if (goodbyeData) {
      await goodbyeCache.set(cacheKey, goodbyeData);
      return goodbyeData;
    }

    return null;
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

const reactionRolesListCacheKey = (guildId: string) => `config:reaction_roles:${guildId}`;

/** Guild’deki tüm tepki rol panelleri (sıralı Id) */
export async function getReactionRoleConfigs(guildId: string): Promise<ReactionRoleData[]> {
  try {
    const cacheKey = reactionRolesListCacheKey(guildId);
    const cached = await reactionRoleCache.get<ReactionRoleData[]>(cacheKey);
    if (cached) return cached;

    const list = await apiGetReactionRoleConfigs(guildId);
    const sorted = [...list].sort((a, b) => a.id - b.id);
    if (sorted.length) await reactionRoleCache.set(cacheKey, sorted);
    return sorted;
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

/** Geriye dönük: ilk panel */
export async function getReactionRoleConfig(guildId: string): Promise<ReactionRoleData | null> {
  const list = await getReactionRoleConfigs(guildId);
  return list[0] ?? null;
}

// saveReactionRoleConfig - API kullanıyor (komutlardan çağrılıyor)
export async function saveReactionRoleConfig(
  guildId: string,
  channelId: string | null,
  normalMessage: string | null,
  isEmbed: boolean,
  embedTitle: string | null,
  embedDescription: string | null,
  embedColor: string | null,
  embedThumbnail: string | null,
  embedImage: string | null,
  embedFooter: string | null,
  messageId: string | null,
  emojis: Array<{ emoji: string; roleId: string; orderIndex: number; enabled: boolean }>,
  buttons: Array<{ label: string; emoji: string | null; roleId: string; style: number; orderIndex: number; enabled: boolean }>,
  menus: Array<{ placeholder: string | null; minValues: number; maxValues: number; enabled: boolean; options: Array<{ label: string; description: string | null; roleId: string; emoji: string | null; orderIndex: number; enabled: boolean }> }>,
  enableEmoji?: boolean,
  enableButton?: boolean,
  enableMenu?: boolean,
  /** Güncellenecek panel; verilmezse guild’de tek panel varsa o, birden fazlaysa en düşük Id */
  reactionRolePanelId?: number | null
): Promise<number> {
  try {
    const { getApiBaseUrl } = await import('./apiClient');
    const apiBaseUrl = getApiBaseUrl();
    
    // API'ye gönderilecek format
    const createDto = {
      guildId,
      channelId,
      normalMessage,
      isEmbed,
      embedTitle,
      embedDescription,
      embedColor,
      embedThumbnail,
      embedImage,
      embedFooter,
      messageId,
      enabled: true,
      enableEmoji: enableEmoji ?? true,
      enableButton: enableButton ?? true,
      enableMenu: enableMenu ?? true,
      emojis: emojis.map(e => ({
        emoji: e.emoji,
        roleId: e.roleId,
        orderIndex: e.orderIndex,
        enabled: e.enabled,
      })),
      buttons: buttons.map(b => ({
        label: b.label,
        emoji: b.emoji,
        roleId: b.roleId,
        style: b.style,
        orderIndex: b.orderIndex,
        enabled: b.enabled,
      })),
      menus: menus.map(m => ({
        placeholder: m.placeholder,
        minValues: m.minValues,
        maxValues: m.maxValues,
        enabled: m.enabled,
        options: m.options.map(o => ({
          label: o.label,
          description: o.description,
          roleId: o.roleId,
          emoji: o.emoji,
          orderIndex: o.orderIndex,
          enabled: o.enabled,
        })),
      })),
    };

    const headers = getBotApiHeaders();
    const existingList = await apiGetReactionRoleConfigs(guildId);
    let targetPutId: number | null =
      reactionRolePanelId != null && reactionRolePanelId > 0 ? reactionRolePanelId : null;
    if (targetPutId == null && existingList.length === 1) targetPutId = existingList[0].id;
    if (targetPutId == null && existingList.length > 1) targetPutId = [...existingList].sort((a, b) => a.id - b.id)[0].id;

    let response: Response;
    if (targetPutId != null) {
      response = await fetch(`${apiBaseUrl}/api/ReactionRole/guild/${guildId}/${targetPutId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(createDto),
      });
    } else {
      response = await fetch(`${apiBaseUrl}/api/ReactionRole`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createDto),
      });
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { id: number };
    
    await reactionRoleCache.delete(reactionRolesListCacheKey(guildId));
    
    return result.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Reaction role yapilandirmasi kaydedilemedi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] SaveReactionRoleConfig API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

// Moderator Config - API kullanıyor
export async function getModeratorConfig(guildId: string): Promise<ModeratorData | null> {
  try {
    const cacheKey = `config:moderator:${guildId}`;
    const cached = await moderatorCache.get<ModeratorData>(cacheKey);
    if (cached) return cached;

    const moderatorData = await apiGetModeratorConfig(guildId);

    if (moderatorData) {
      await moderatorCache.set(cacheKey, moderatorData);
      return moderatorData;
    }

    return null;
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

// TicketPanel Config - API kullanıyor
export async function getTicketPanelConfig(guildId: string): Promise<TicketPanelData | null> {
  try {
    const cacheKey = `config:ticket_panel:${guildId}`;
    const cached = await ticketPanelCache.get<TicketPanelData>(cacheKey);
    if (cached) return cached;

    const ticketPanelData = await apiGetTicketPanelConfig(guildId);

    if (ticketPanelData) {
      await ticketPanelCache.set(cacheKey, ticketPanelData);
      return ticketPanelData;
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Ticket panel yapilandirmasi alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetTicketPanelConfig API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
  }
}

// Temporary Voice Channel Lobbies - API kullanıyor (birden fazla lobi olabilir)
export async function getTemporaryVoiceChannelLobbies(guildId: string): Promise<TemporaryVoiceChannelLobbyData[]> {
  try {
    const cacheKey = `config:temporary_voice_channel:${guildId}`;
    const cached = await temporaryVoiceChannelCache.get<TemporaryVoiceChannelLobbyData[]>(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    const lobbiesData = await apiGetTemporaryVoiceChannelLobbies(guildId);

    if (lobbiesData && lobbiesData.length > 0) {
      await temporaryVoiceChannelCache.set(cacheKey, lobbiesData);
      return lobbiesData;
    }

    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Temporary voice channel lobbies alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetTemporaryVoiceChannelLobbies API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    throw error;
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
    const channel = await apiCreateTemporaryVoiceChannel(createDto);
    await temporaryVoiceChannelCache.delete(`config:temporary_voice_channel:channel:${channel.channelId}`);
    return channel;
  } catch (error) {
    console.error(`[ERROR] CreateTemporaryVoiceChannel hatasi:`, error);
    throw error;
  }
}

// Get Temporary Voice Channel by ChannelId
export async function getTemporaryVoiceChannelByChannelId(channelId: string): Promise<TemporaryVoiceChannelData | null> {
  try {
    const cacheKey = `config:temporary_voice_channel:channel:${channelId}`;
    const cached = await temporaryVoiceChannelCache.get<TemporaryVoiceChannelData>(cacheKey);
    if (cached) return cached;

    const channel = await apiGetTemporaryVoiceChannelByChannelId(channelId);
    if (channel) {
      await temporaryVoiceChannelCache.set(cacheKey, channel);
    }
    return channel;
  } catch (error) {
    console.error(`[ERROR] GetTemporaryVoiceChannelByChannelId hatasi:`, error);
    return null;
  }
}

// Update Temporary Voice Channel Owner
export async function updateTemporaryVoiceChannelOwner(
  channelId: string,
  ownerId: string,
): Promise<TemporaryVoiceChannelData | null> {
  try {
    const channel = await apiUpdateTemporaryVoiceChannelOwner(channelId, ownerId);
    await temporaryVoiceChannelCache.delete(`config:temporary_voice_channel:channel:${channelId}`);
    return channel;
  } catch (error) {
    console.error(`[ERROR] UpdateTemporaryVoiceChannelOwner hatasi:`, error);
    throw error;
  }
}

// Delete Temporary Voice Channel
export async function deleteTemporaryVoiceChannel(channelId: string): Promise<boolean> {
  try {
    const result = await apiDeleteTemporaryVoiceChannel(channelId);
    if (result) {
      await temporaryVoiceChannelCache.delete(`config:temporary_voice_channel:channel:${channelId}`);
    }
    return result;
  } catch (error) {
    console.error(`[ERROR] DeleteTemporaryVoiceChannel hatasi:`, error);
    return false;
  }
}

// Log Channel - API kullanıyor
export async function getLogChannel(guildId: string): Promise<LogChannelData | null> {
  try {
    const cacheKey = `config:log_channel:${guildId}`;
    const cached = await logChannelCache.get<LogChannelData>(cacheKey);
    if (cached) return cached;

    const logChannelData = await apiGetLogChannelByGuildId(guildId);

    if (logChannelData) {
      await logChannelCache.set(cacheKey, logChannelData);
      return logChannelData;
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] Log channel alinamadi - API'ye baglanilamiyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetLogChannel API hatasi (GuildId: ${guildId}):`, errorMessage);
    }
    return null;
  }
}
