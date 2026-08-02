import { Guild, ChannelType, PermissionFlagsBits, VoiceChannel } from 'discord.js';
import { apiRequest, updateAndGetPeakOnline } from './apiClient';
import { getBotClient } from './botClientHelper';

export interface StatisticsChannelData {
  id: number;
  guildId: string;
  counterType: string;
  channelId: string;
  channelName: string | null;
  enabled: boolean;
  roles?: Array<{
    id: number;
    roleId: string;
    roleName: string | null;
  }>;
}

/**
 * API'den aktif istatistik kanallarını getirir
 */
export async function getEnabledStatisticsChannels(guildId: string): Promise<StatisticsChannelData[]> {
  try {
    const channels = await apiRequest<StatisticsChannelData[]>(`/api/StatisticsChannel/guild/${guildId}`);
    return channels || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
      console.error(`[ERROR] İstatistik kanalları alınamadı - API'ye bağlanılamıyor (GuildId: ${guildId})`);
    } else {
      console.error(`[ERROR] GetEnabledStatisticsChannels API hatası (GuildId: ${guildId}):`, errorMessage);
    }
    return [];
  }
}

/**
 * Sayaç değerini hesaplar
 */
async function calculateCounterValue(guild: Guild, counterType: string, roles?: Array<{ roleId: string }>): Promise<number> {
  const getMembersSafe = async () => {
    try {
      return await guild.members.fetch();
    } catch {
      // Gateway rate limit/gecici hatalarda istegi dusurmemek icin cache ile devam et.
      return guild.members.cache;
    }
  };

  const getChannelsSafe = async () => {
    try {
      return await guild.channels.fetch();
    } catch {
      // API/Gateway limiti durumunda cache ile fallback.
      return guild.channels.cache;
    }
  };

  switch (counterType) {
    case 'Botlar': {
      // Tum uyeleri cek; hata olursa cache kullan.
      const members = await getMembersSafe();
      return members.filter(m => m.user.bot).size;
    }
    
    case 'Üye Sayısı':
    case 'Toplam Üye': {
      // Tum uyeleri cek; hata olursa cache kullan.
      const members = await getMembersSafe();
      return members.filter(m => !m.user.bot).size;
    }
    
    case 'Rekor Çevrimiçi': {
      // Anlık çevrimiçi sayısını hesapla, ardından kalıcı tepe (peak) ile karşılaştır.
      // API max(current, peak) döndürür; rekor düşmez.
      const recordMembers = await getMembersSafe();
      const currentOnline = recordMembers.filter(m => {
        // Botları hariç tut
        if (m.user.bot) return false;
        const status = m.presence?.status;
        return status === 'online' || status === 'idle' || status === 'dnd';
      }).size;
      return await updateAndGetPeakOnline(guild.id, counterType, currentOnline);
    }

    case 'Çevrimiçi Üye': {
      const onlineMembers = await getMembersSafe();
      return onlineMembers.filter(m => {
        // Botları hariç tut
        if (m.user.bot) return false;
        const status = m.presence?.status;
        return status === 'online' || status === 'idle' || status === 'dnd';
      }).size;
    }
    
    case 'Metin Kanalları': {
      // Tum kanallari cek; hata olursa cache kullan.
      const channels = await getChannelsSafe();
      return Array.from(channels.values()).filter(c => c?.type === ChannelType.GuildText).length;
    }
    
    case 'Toplam Kanal Sayısı': {
      // Tum kanallari cek; hata olursa cache kullan.
      const channels = await getChannelsSafe();
      return Array.from(channels.values()).filter(c => c?.type !== ChannelType.GuildCategory).length;
    }
    
    case 'Toplam Rol Sayısı': {
      // @everyone rolünü hariç tut (her sunucuda otomatik var, sayılmamalı)
      return guild.roles.cache.filter(role => role.id !== guild.id).size;
    }
    
    case 'Ses Kanalları': {
      // Tum kanallari cek; hata olursa cache kullan.
      const channels = await getChannelsSafe();
      return Array.from(channels.values()).filter(
        c => c?.type === ChannelType.GuildVoice || c?.type === ChannelType.GuildStageVoice
      ).length;
    }
    
    case 'Rol Sayacı': {
      if (!roles || roles.length === 0) return 0;
      // Tum uyeleri cek; hata olursa cache kullan.
      const members = await getMembersSafe();
      const roleIds = roles.map(r => r.roleId);
      return members.filter(member => {
        return member.roles.cache.some(role => roleIds.includes(role.id));
      }).size;
    }
    
    default:
      return 0;
  }
}

/**
 * İstatistik kanalını günceller
 */
async function updateStatisticsChannel(guild: Guild, channelData: StatisticsChannelData): Promise<void> {
  try {
    const channel = guild.channels.cache.get(channelData.channelId);
    const supportedTypes = [ChannelType.GuildVoice, ChannelType.GuildStageVoice, ChannelType.GuildText];
    if (!channel || !supportedTypes.includes(channel.type)) {
      console.warn(`[WARN] İstatistik kanalı bulunamadı veya desteklenmeyen kanal tipi (ChannelId: ${channelData.channelId})`);
      return;
    }

    const counterValue = await calculateCounterValue(guild, channelData.counterType, channelData.roles);
    
    // Kanal adını güncelle (örnek: "👥 Üyeler: 150")
    const emojiMap: Record<string, string> = {
      'Botlar': '🤖',
      'Üye Sayısı': '👥',
      'Rekor Çevrimiçi': '📊',
      'Çevrimiçi Üye': '🟢',
      'Metin Kanalları': '💬',
      'Toplam Kanal Sayısı': '📁',
      'Toplam Üye': '👥',
      'Toplam Rol Sayısı': '🎭',
      'Ses Kanalları': '🔊',
      'Rol Sayacı': '👤',
    };

    const emoji = emojiMap[channelData.counterType] || '📊';
    const newName = `${emoji} ${channelData.counterType}: ${counterValue}`;

    // Kanal adını güncelle
    if (channel.name !== newName) {
      await channel.setName(newName);
      console.log(`[INFO] İstatistik kanalı güncellendi: ${channelData.counterType} = ${counterValue} (ChannelId: ${channelData.channelId})`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] İstatistik kanalı güncellenemedi (ChannelId: ${channelData.channelId}, CounterType: ${channelData.counterType}):`, errorMessage);
  }
}

/**
 * Sunucudaki tüm aktif istatistik kanallarını günceller
 * @param guildId Discord sunucu ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 */
export async function updateAllStatisticsChannels(guildId: string, botClientId?: string): Promise<void> {
  try {
    const client = getBotClient(botClientId);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[WARN] Sunucu bulunamadı (GuildId: ${guildId})`);
      return;
    }

    const channels = await getEnabledStatisticsChannels(guildId);
    
    if (channels.length === 0) {
      return; // İstatistik kanalı yok
    }

    // Tüm kanalları güncelle
    await Promise.all(channels.map(channel => updateStatisticsChannel(guild, channel)));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] İstatistik kanalları güncellenemedi (GuildId: ${guildId}):`, errorMessage);
  }
}

/**
 * Belirli bir sayaç tipi için istatistik kanalını günceller
 * @param guildId Discord sunucu ID'si
 * @param counterType Sayaç tipi
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 */
export async function updateStatisticsChannelByType(guildId: string, counterType: string, botClientId?: string): Promise<void> {
  try {
    const client = getBotClient(botClientId);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[WARN] Sunucu bulunamadı (GuildId: ${guildId})`);
      return;
    }

    const channel = await apiRequest<StatisticsChannelData | null>(
      `/api/StatisticsChannel/guild/${guildId}/type/${encodeURIComponent(counterType)}`
    );

    if (!channel || !channel.enabled) {
      return; // Kanal yok veya pasif
    }

    await updateStatisticsChannel(guild, channel);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] İstatistik kanalı güncellenemedi (GuildId: ${guildId}, CounterType: ${counterType}):`, errorMessage);
  }
}

/**
 * İstatistik kanalı oluşturur ve kanal adını formatlar
 * @param guildId Discord sunucu ID'si
 * @param counterType Sayaç tipi
 * @param channelNameFormat Kanal adı formatı (opsiyonel)
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 */
export async function createStatisticsChannel(
  guildId: string,
  counterType: string,
  channelNameFormat?: string,
  botClientId?: string
): Promise<{ channelId: string; channelName: string } | null> {
  try {
    const client = getBotClient(botClientId);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[WARN] Sunucu bulunamadı (GuildId: ${guildId})`);
      return null;
    }

    // Bot izin ön-kontrolü: istatistik kanalı oluşturmak ManageChannels gerektirir. Eksikse
    // 50013 fırlatıp catch'te sessizce ölmek yerine net bir log bırakırız.
    const me = guild.members.me;
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      console.warn(`[WARN] İstatistik kanalı oluşturulamıyor: Botta "Kanalları Yönet" izni yok (GuildId: ${guildId})`);
      return null;
    }

    // Sayaç değerini hesapla
    const counterValue = await calculateCounterValue(guild, counterType);
    
    // Kanal adını formatla
    let channelName: string;
    if (channelNameFormat) {
      // {kind} ve {count} değişkenlerini değiştir
      channelName = channelNameFormat
        .replace(/{kind}/g, counterType)
        .replace(/{count}/g, counterValue.toString());
    } else {
      // Varsayılan format
      const emojiMap: Record<string, string> = {
        'Botlar': '🤖',
        'Üye Sayısı': '👥',
        'Rekor Çevrimiçi': '📊',
        'Çevrimiçi Üye': '🟢',
        'Metin Kanalları': '💬',
        'Toplam Kanal Sayısı': '📁',
        'Toplam Üye': '👥',
        'Toplam Rol Sayısı': '🎭',
        'Ses Kanalları': '🔊',
        'Rol Sayacı': '👤',
      };
      const emoji = emojiMap[counterType] || '📊';
      channelName = `${emoji} ${counterType}: ${counterValue}`;
    }

    // Discord kanal adı limiti: 100 karakter, geçersiz karakterleri temizle
    // Discord geçersiz karakterler: #, @, space başta/sonda, boş string
    channelName = channelName
      .replace(/[#@]/g, '') // # ve @ karakterlerini kaldır
      .trim(); // Başta/sondaki boşlukları kaldır
    
    // 100 karakter limiti
    if (channelName.length > 100) {
      channelName = channelName.substring(0, 97) + '...';
    }

    // Boş string kontrolü
    if (!channelName || channelName.length === 0) {
      channelName = `istatistik-${counterType}`.substring(0, 100);
    }

    console.log(`[INFO] Kanal oluşturuluyor: ${channelName} (GuildId: ${guildId}, CounterType: ${counterType})`);

    // Overwrite kuralı: deny için de bot ilgili izne sahip olmalı (yoksa 50013). Minimal izinli
    // botta (yalnız ManageChannels+ManageRoles) Connect/Speak/Stream/UseVAD deny'i create'i
    // reddederdi. Bu yüzden deny bitlerini botun sahip olduklarına süzeriz.
    const denyBits = [
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      PermissionFlagsBits.Stream,
      PermissionFlagsBits.UseVAD,
    ].filter((bit) => me.permissions.has(bit));

    // Kanal oluştur
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      permissionOverwrites:
        denyBits.length > 0
          ? [{ id: guild.roles.everyone.id, deny: denyBits }]
          : [],
      reason: `İstatistik kanalı oluşturuldu: ${counterType}`,
    }) as VoiceChannel;

    console.log(`[INFO] İstatistik kanalı oluşturuldu: ${counterType} (ChannelId: ${channel.id}, ChannelName: ${channelName})`);

    return {
      channelId: channel.id,
      channelName: channelName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] İstatistik kanalı oluşturulamadı (GuildId: ${guildId}, CounterType: ${counterType}):`, errorMessage);
    return null;
  }
}

/**
 * İstatistik kanalını siler (Discord'dan)
 * @param guildId Discord sunucu ID'si
 * @param channelId Kanal ID'si
 * @param botClientId Custom bot clientId (opsiyonel - varsa custom bot kullanılır)
 */
export async function deleteStatisticsChannel(
  guildId: string,
  channelId: string,
  botClientId?: string
): Promise<boolean> {
  try {
    const client = getBotClient(botClientId);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.warn(`[WARN] Sunucu bulunamadı (GuildId: ${guildId})`);
      return false;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      console.warn(`[WARN] Kanal bulunamadı (ChannelId: ${channelId})`);
      return false;
    }

    // Kanalı sil
    await channel.delete(`İstatistik kanalı silindi`);
    console.log(`[INFO] İstatistik kanalı silindi (ChannelId: ${channelId}, GuildId: ${guildId})`);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] İstatistik kanalı silinemedi (ChannelId: ${channelId}, GuildId: ${guildId}):`, errorMessage);
    return false;
  }
}

