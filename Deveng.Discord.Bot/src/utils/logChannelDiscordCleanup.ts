import { getBotClient } from './botClientHelper';

/**
 * Verilen Discord metin kanallarını siler (log özelliği kapatılırken / DB temizliğinde).
 * Kanal yoksa veya yetki yoksa uyarı loglanır; diğer ID'lerle devam edilir.
 */
export async function deleteDiscordLogChannels(
  guildId: string,
  channelIds: string[],
  botClientId?: string
): Promise<{ deleted: string[]; skipped: string[] }> {
  const deleted: string[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  try {
    const client = getBotClient(botClientId);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[WARN] deleteDiscordLogChannels: sunucu bulunamadı (GuildId: ${guildId})`);
      for (const id of channelIds) {
        if (id && !seen.has(id)) {
          seen.add(id);
          skipped.push(id);
        }
      }
      return { deleted, skipped };
    }

    for (const rawId of channelIds) {
      const id = (rawId || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);

      try {
        const channel = guild.channels.cache.get(id);
        if (!channel || !('deletable' in channel) || !channel.deletable) {
          console.warn(`[WARN] deleteDiscordLogChannels: kanal yok veya silinemiyor (ChannelId: ${id})`);
          skipped.push(id);
          continue;
        }
        await channel.delete('Log kanalı özelliği kapatıldı / ayarlar silindi');
        deleted.push(id);
        console.log(`[INFO] Log Discord kanalı silindi (ChannelId: ${id}, GuildId: ${guildId})`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[ERROR] Log kanalı silinemedi (ChannelId: ${id}, GuildId: ${guildId}):`, msg);
        skipped.push(id);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] deleteDiscordLogChannels (GuildId: ${guildId}):`, errorMessage);
  }

  return { deleted, skipped };
}
