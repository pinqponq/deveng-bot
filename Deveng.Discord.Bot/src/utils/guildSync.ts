import { Guild } from 'discord.js';
import { syncGuildToApi, deleteGuildFromApi } from './apiClient';

export async function syncGuild(guild: Guild): Promise<void> {
  await syncGuildToApi(
    guild.id,
    guild.name,
    guild.ownerId || null,
    guild.memberCount || 0
  );
}

/** Sunucu bot'tan kalktığında API kaydını siler (404 güvenli). */
export async function unsyncGuild(guildId: string): Promise<void> {
  await deleteGuildFromApi(guildId);
}

export interface SyncResult {
  successCount: number;
  failCount: number;
  totalCount: number;
}

export async function syncAllGuilds(guilds: Guild[]): Promise<SyncResult> {
  if (guilds.length === 0) {
    console.log('[INFO] Senkronize edilecek sunucu yok.');
    return { successCount: 0, failCount: 0, totalCount: 0 };
  }
  
  console.log(`[INFO] ${guilds.length} sunucu bilgisi API'ye gonderiliyor...`);
  
  // Her sunucuyu sırayla senkronize et (paralel yerine sıralı - API rate limit için)
  let successCount = 0;
  let failCount = 0;
  
  for (const guild of guilds) {
    try {
      await syncGuild(guild);
      successCount++;
    } catch (error) {
      failCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
        console.error(`[ERROR] Sunucu bilgileri senkronize edilemedi - API'ye baglanilamiyor (Guild: ${guild.name}, ID: ${guild.id})`);
      } else {
        console.error(`[ERROR] Guild sync hatasi (Guild: ${guild.name}, ID: ${guild.id}):`, errorMessage);
      }
    }
  }
  
  console.log(`[INFO] Sunucu senkronizasyonu tamamlandi: ${successCount} basarili, ${failCount} basarisiz`);
  
  return { successCount, failCount, totalCount: guilds.length };
}
