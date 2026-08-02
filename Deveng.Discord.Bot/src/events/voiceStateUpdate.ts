import { VoiceState, VoiceChannel, CategoryChannel, PermissionFlagsBits, ChannelType } from 'discord.js';
import { 
  getTemporaryVoiceChannelLobbies, 
  createTemporaryVoiceChannel,
  getTemporaryVoiceChannelByChannelId,
  deleteTemporaryVoiceChannel
} from '../utils/database';
import { transferTemporaryChannelOwnership } from '../utils/voiceChannelHelpers';
import { getBotClient } from '../utils/botClientHelper';
import { logError } from '../utils/logger';
import type { TemporaryVoiceChannelData, TemporaryVoiceChannelLobbyData } from '../types/database';

// Kanal silme timer'ları (channelId -> timer)
const channelDeleteTimers = new Map<string, NodeJS.Timeout>();
// Sahiplik zaman aşımı timer'ları (channelId -> timer) — ownershipTimeoutMinutes
const ownershipTimeoutTimers = new Map<string, NodeJS.Timeout>();

function missingPermissionNames(channel: VoiceChannel, required: bigint[]): string[] {
  const botMember = channel.guild.members.me;
  if (!botMember) return required.map((perm) => perm.toString());
  const perms = channel.permissionsFor(botMember);
  if (!perms) return required.map((perm) => perm.toString());
  return required
    .filter((perm) => !perms.has(perm))
    .map((perm) => {
      const key = Object.entries(PermissionFlagsBits).find(([, value]) => value === perm)?.[0];
      return key ?? perm.toString();
    });
}

function canManageOverwriteTarget(guild: any, overwriteId: string): boolean {
  const me = guild.members.me;
  if (!me) return false;

  if (overwriteId === guild.id || overwriteId === me.id) return true;

  const targetRole = guild.roles.cache.get(overwriteId);
  if (targetRole) {
    // Bot yalnızca kendi en yüksek rolünden düşük rolleri güvenle yönetebilir.
    return me.roles.highest.position > targetRole.position;
  }

  // Member overwrite ise genelde sorun olmaz; mevcut üyeyi bulamazsak atlamayalım.
  return true;
}

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
  try {
    const guild = newState.guild;
    if (!guild) return;

    const client = getBotClient(); // Context'ten otomatik alır
    if (!client) return;

    // Kullanıcı bir kanala girdi
    if (newState.channelId && !oldState.channelId) {
      await handleUserJoinedVoiceChannel(newState);
    }

    // Kullanıcı bir kanaldan çıktı
    if (!newState.channelId && oldState.channelId) {
      await handleUserLeftVoiceChannel(oldState);
    }

    // Kullanıcı bir kanaldan başka bir kanala geçti
    if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
      await handleUserMovedVoiceChannel(oldState, newState);
    }

    const { trackVoiceStateForAnalytics } = await import('../utils/voiceActivityTracker');
    await trackVoiceStateForAnalytics(oldState, newState);
  } catch (error) {
    console.error('[ERROR] VoiceStateUpdate event handler hatası:', error);
  }
}

async function handleUserJoinedVoiceChannel(state: VoiceState): Promise<void> {
  try {
    const guild = state.guild;
    const channel = state.channel;
    if (!channel || !channel.isVoiceBased()) {
      console.log(`[DEBUG] Kanal ses kanalı değil veya yok`);
      return;
    }

    console.log(`[DEBUG] Kullanıcı ses kanalına katıldı: ${channel.id} (Guild: ${guild.id})`);

    // Tüm lobileri kontrol et (birden fazla lobi olabilir)
    const lobbies = await getTemporaryVoiceChannelLobbies(guild.id);
    console.log(`[DEBUG] Bulunan lobi sayısı: ${lobbies?.length || 0}`);
    
    if (!lobbies || lobbies.length === 0) {
      console.log(`[DEBUG] Lobi bulunamadı (GuildId: ${guild.id})`);
      return;
    }

    // Debug: Tüm lobileri logla
    lobbies.forEach(lobby => {
      console.log(`[DEBUG] Lobi: ID=${lobby.id}, ChannelId=${lobby.channelId}, Enabled=${lobby.enabled}, ChannelName=${lobby.channelName}`);
    });

    // Kullanıcının girdiği kanal hangi lobiye ait?
    const matchingLobby = lobbies.find(lobby => 
      lobby.enabled && channel.id === lobby.channelId
    );

    if (matchingLobby) {
      console.log(`[DEBUG] Eşleşen lobi bulundu: ${matchingLobby.id} - ${matchingLobby.channelName}`);
      // Kullanıcı lobi kanalına girdi, geçici kanal oluştur
      await createTemporaryChannel(state, matchingLobby);
    } else {
      console.log(`[DEBUG] Eşleşen lobi bulunamadı. Kanal ID: ${channel.id}, Lobi ChannelId'leri: ${lobbies.map(l => l.channelId).join(', ')}`);
      // Geçici kanala dönüş / sahip geri geldiyse ownership timeout iptal
      const tempChannel = await getTemporaryVoiceChannelByChannelId(channel.id);
      if (tempChannel) {
        cancelChannelDeleteTimer(channel.id);
        if (state.id === tempChannel.ownerId) {
          cancelOwnershipTimeoutTimer(channel.id);
        }
      }
    }
  } catch (error) {
    console.error('[ERROR] handleUserJoinedVoiceChannel hatası:', error);
  }
}

async function handleUserLeftVoiceChannel(state: VoiceState): Promise<void> {
  try {
    const channel = state.channel;
    if (!channel || !channel.isVoiceBased()) return;

    const guild = state.guild;
    
    // Geçici kanal mı kontrol et
    const tempChannel = await getTemporaryVoiceChannelByChannelId(channel.id);
    if (!tempChannel) {
      // Bu bir geçici kanal değil
      return;
    }

    console.log(`[DEBUG] Kullanıcı geçici kanaldan çıktı: ${channel.id}, Kalan üye sayısı: ${channel.members.size}`);

    const lobbies = await getTemporaryVoiceChannelLobbies(guild.id);
    const lobby = lobbies.find(l => l.id === tempChannel.lobbyId);
    if (!lobby) {
      console.error(`[ERROR] Lobi bulunamadı (LobbyId: ${tempChannel.lobbyId})`);
      return;
    }

    // Kanal boş mu kontrol et
    if (channel.members.size === 0) {
      cancelOwnershipTimeoutTimer(channel.id);
      const deleteAfterMinutes = lobby.deleteAfterMinutes;
      
      // Eğer deleteAfterMinutes null ise (asla silme), hiçbir şey yapma
      if (deleteAfterMinutes === null || deleteAfterMinutes === undefined) {
        console.log(`[DEBUG] Kanal silinmeyecek (deleteAfterMinutes: null)`);
        return;
      }

      // Eğer deleteAfterMinutes 0 ise (hemen sil)
      if (deleteAfterMinutes === 0) {
        console.log(`[INFO] Kanal hemen siliniyor: ${channel.id}`);
        if (channel.type === ChannelType.GuildVoice) {
          await deleteTemporaryChannel(channel as VoiceChannel, tempChannel);
        }
        return;
      }

      // Timer başlat
      startChannelDeleteTimer(channel.id, tempChannel, deleteAfterMinutes);
    } else {
      // Kanal boş değilse, silme timer'ı iptal; sahip ayrıldıysa ownership timeout
      cancelChannelDeleteTimer(channel.id);
      if (state.id === tempChannel.ownerId && channel.type === ChannelType.GuildVoice) {
        await scheduleOwnershipTimeout(channel as VoiceChannel, tempChannel, lobby);
      }
    }
  } catch (error) {
    console.error('[ERROR] handleUserLeftVoiceChannel hatası:', error);
  }
}

function startChannelDeleteTimer(channelId: string, tempChannel: any, deleteAfterMinutes: number): void {
  // Önceki timer'ı iptal et
  cancelChannelDeleteTimer(channelId);

  const delay = deleteAfterMinutes * 60 * 1000; // dakika -> milisaniye
  console.log(`[INFO] Kanal silme timer'ı başlatıldı: ${channelId} (${deleteAfterMinutes} dakika sonra)`);

  const timer = setTimeout(() => {
    void (async () => {
      try {
        const client = getBotClient();
        if (!client) return;

        const guild = client.guilds.cache.get(tempChannel.guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isVoiceBased()) {
          return;
        }

        if (channel.members.size === 0 && channel.type === ChannelType.GuildVoice) {
          console.log(`[INFO] Timer süresi doldu, kanal siliniyor: ${channelId}`);
          await deleteTemporaryChannel(channel as VoiceChannel, tempChannel);
        }
      } catch (error) {
        logError('voiceStateUpdate:deleteTimer', error, 'error');
      } finally {
        channelDeleteTimers.delete(channelId);
      }
    })();
  }, delay);

  channelDeleteTimers.set(channelId, timer);
}

function cancelChannelDeleteTimer(channelId: string): void {
  const timer = channelDeleteTimers.get(channelId);
  if (timer) {
    clearTimeout(timer);
    channelDeleteTimers.delete(channelId);
    console.log(`[INFO] Kanal silme timer'ı iptal edildi: ${channelId}`);
  }
}

function cancelOwnershipTimeoutTimer(channelId: string): void {
  const timer = ownershipTimeoutTimers.get(channelId);
  if (timer) {
    clearTimeout(timer);
    ownershipTimeoutTimers.delete(channelId);
    console.log(`[INFO] Sahiplik timeout timer iptal: ${channelId}`);
  }
}

/**
 * ownershipTimeoutMinutes: null = asla auto-transfer; 0 = hemen; N = N dk sonra.
 * Kalan ilk insan üyeye sahiplik aktarılır (API + Discord overwrite).
 */
async function scheduleOwnershipTimeout(
  channel: VoiceChannel,
  tempChannel: TemporaryVoiceChannelData,
  lobby: TemporaryVoiceChannelLobbyData,
): Promise<void> {
  cancelOwnershipTimeoutTimer(channel.id);

  const minutes = lobby.ownershipTimeoutMinutes;
  if (minutes === null || minutes === undefined) {
    console.log(`[DEBUG] Sahiplik auto-transfer kapalı (ownershipTimeoutMinutes: null) channel=${channel.id}`);
    return;
  }

  const runTransfer = async () => {
    try {
      const fresh = await getTemporaryVoiceChannelByChannelId(channel.id);
      if (!fresh || fresh.ownerId !== tempChannel.ownerId) return;

      const liveChannel = channel.guild.channels.cache.get(channel.id);
      if (!liveChannel || !liveChannel.isVoiceBased() || liveChannel.type !== ChannelType.GuildVoice) return;

      const ownerStillHere = liveChannel.members.has(fresh.ownerId);
      if (ownerStillHere) return;

      const nextOwner = liveChannel.members.find((m) => !m.user.bot && m.id !== fresh.ownerId);
      if (!nextOwner) {
        console.log(`[DEBUG] Sahiplik transferi için aday yok: ${channel.id}`);
        return;
      }

      const updated = await transferTemporaryChannelOwnership(
        liveChannel as VoiceChannel,
        lobby,
        nextOwner.id,
        fresh.ownerId,
      );
      if (updated) {
        console.log(`[INFO] Sahiplik auto-transfer: ${channel.id} → ${nextOwner.id}`);
      }
    } catch (error) {
      logError('voiceStateUpdate:ownershipTimeoutTransfer', error, 'error');
    } finally {
      ownershipTimeoutTimers.delete(channel.id);
    }
  };

  if (minutes === 0) {
    console.log(`[INFO] Sahiplik hemen aktarılıyor: ${channel.id}`);
    await runTransfer();
    return;
  }

  const delay = minutes * 60 * 1000;
  console.log(`[INFO] Sahiplik timeout timer: ${channel.id} (${minutes} dk)`);
  const timer = setTimeout(() => {
    void runTransfer();
  }, delay);
  ownershipTimeoutTimers.set(channel.id, timer);
}

async function deleteTemporaryChannel(channel: VoiceChannel, tempChannel: any): Promise<void> {
  try {
    const guild = channel.guild;

    // Metin kanalını sil (varsa)
    if (tempChannel.textChannelId) {
      const textChannel = guild.channels.cache.get(tempChannel.textChannelId);
      if (textChannel) {
        try {
          await textChannel.delete();
          console.log(`[INFO] Metin kanalı silindi: ${tempChannel.textChannelId}`);
        } catch (error) {
          console.error(`[ERROR] Metin kanalı silinemedi:`, error);
        }
      }
    }

    // Ses kanalını sil
    try {
      await channel.delete();
      console.log(`[INFO] Geçici ses kanalı silindi: ${channel.id}`);
    } catch (error) {
      console.error(`[ERROR] Ses kanalı silinemedi:`, error);
    }

    // Veritabanından sil
    await deleteTemporaryVoiceChannel(channel.id);
    console.log(`[INFO] Geçici kanal veritabanından silindi: ${channel.id}`);
  } catch (error) {
    console.error(`[ERROR] deleteTemporaryChannel hatası:`, error);
  }
}

async function handleUserMovedVoiceChannel(oldState: VoiceState, newState: VoiceState): Promise<void> {
  try {
    // Kullanıcı bir kanaldan başka bir kanala taşındı
    await handleUserLeftVoiceChannel(oldState);
    await handleUserJoinedVoiceChannel(newState);
  } catch (error) {
    console.error('[ERROR] handleUserMovedVoiceChannel hatası:', error);
  }
}

async function createTemporaryChannel(state: VoiceState, lobby: any): Promise<void> {
  try {
    const guild = state.guild;
    const member = state.member;
    if (!member) return;

    const lobbyChannel = guild.channels.cache.get(lobby.channelId) as VoiceChannel;
    if (!lobbyChannel) return;

    const category = lobbyChannel.parent;
    if (!category) return;

    // Bot kategori içinde kanal açabilmek ve üyeyi taşıyabilmek için gerekli izinlere sahip mi?
    const missingForVoiceCreate = missingPermissionNames(lobbyChannel, [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.MoveMembers,
    ]);
    if (missingForVoiceCreate.length > 0) {
      console.error(
        `[ERROR] Geçici kanal oluşturulamıyor: Bot izinleri eksik (Guild: ${guild.id}, Lobby: ${lobby.id}, Missing: ${missingForVoiceCreate.join(', ')})`,
      );
      return;
    }

    // Aynı kategorideki aktif geçici kanal sayısını hesapla (index için)
    // Lobi kanalını saymamak için filter ekle
    const activeTempChannels = category.children.cache.filter(ch => 
      ch.isVoiceBased() && 
      ch.id !== lobby.channelId && 
      ch.members.size > 0
    );
    const nextIndex = activeTempChannels.size + 1;

    // Geçici kanal adını oluştur ({user} veya {username} yerine kullanıcı adını koy)
    let channelName = lobby.channelName;
    channelName = channelName.replace(/{user}/g, member.user.username);
    channelName = channelName.replace(/{username}/g, member.user.username);
    channelName = channelName.replace(/{index}/g, nextIndex.toString());

    // Geçici ses kanalı oluştur
    // 1) normal: parent + overwrite
    // 2) fallback: parent + overwrite yok
    // 3) fallback: root + overwrite yok
    let tempVoiceChannel: VoiceChannel;
    const basePayload = {
      name: channelName,
      type: ChannelType.GuildVoice as const,
      userLimit: lobby.userLimit || undefined,
      bitrate: lobby.bitrate || undefined,
    };
    // core = @everyone deny ViewChannel + owner + bot (gizlilik ve sahiplik için ZORUNLU);
    // synced = kategori/kanal senkron overwrite'ları (opsiyonel, en kırılgan kısım).
    // Tümü botun guild düzeyinde sahip olduğu izin bitlerine süzülür (50013 kök nedeni).
    const { core: coreOverwrites, synced: syncedOverwrites } = await getChannelPermissions(guild, lobby, member.id);

    try {
      // 1) İdeal: parent + core + synced overwrite'lar.
      tempVoiceChannel = await guild.channels.create({
        ...basePayload,
        parent: category.id,
        permissionOverwrites: [...coreOverwrites, ...syncedOverwrites],
      }) as VoiceChannel;
    } catch (error: any) {
      if (error?.code !== 50013) throw error;
      console.warn(`[WARN] Geçici kanal create (parent+core+synced) yetki hatası, core-only fallback. Guild=${guild.id}, Lobby=${lobby.id}`);
      try {
        // 2) Fallback: synced'i düş ama GİZLİLİĞİ koru (core = @everyone deny + owner + bot).
        tempVoiceChannel = await guild.channels.create({
          ...basePayload,
          parent: category.id,
          permissionOverwrites: coreOverwrites,
        }) as VoiceChannel;
      } catch (coreError: any) {
        if (coreError?.code !== 50013) throw coreError;
        console.warn(`[WARN] Geçici kanal create (parent+core) yetki hatası (muhtemelen ManageRoles yok), overwrite'sız fallback. Guild=${guild.id}, Lobby=${lobby.id}`);
        try {
          // 3) Son çare: overwrite yok (kanal public olur — bot ManageRoles'a sahip değil).
          tempVoiceChannel = await guild.channels.create({
            ...basePayload,
            parent: category.id,
          }) as VoiceChannel;
        } catch (fallbackError: any) {
          if (fallbackError?.code !== 50013) throw fallbackError;
          console.warn(`[WARN] Geçici kanal create (parent, overwrite yok) yetki hatası, root fallback. Guild=${guild.id}, Lobby=${lobby.id}`);
          tempVoiceChannel = await guild.channels.create({
            ...basePayload,
          }) as VoiceChannel;
        }
      }
    }

    // Taşıma başarısızsa orphan kanalı sil.
    try {
      await member.voice.setChannel(tempVoiceChannel);
    } catch (moveError) {
      console.warn(`[WARN] Kullanıcı geçici kanala taşınamadı, orphan kanal siliniyor: ${tempVoiceChannel.id}`, moveError);
      await tempVoiceChannel.delete('Kullanıcı taşınamadı, orphan geçici kanal temizliği').catch((error) => logError('voiceStateUpdate:orphanCleanup', error, 'debug'));
      return;
    }

    // Komut kullanım mesajını ayrı metin kanalı yerine ses kanalının sohbetine gönder.
    if (lobby.pinCommandUsage && tempVoiceChannel.isTextBased() && 'send' in tempVoiceChannel) {
      const commandInfo = `**Geçici Kanal Komutları**\n\n` +
        `/voice-rename - Kanal adını değiştir\n` +
        `/voice-limit - Kullanıcı sınırını ayarla\n` +
        `/voice-lock - Kanalı kilitle\n` +
        `/voice-unlock - Kanalın kilidini aç\n` +
        `/voice-hide - Kanalı gizle\n` +
        `/voice-reveal - Kanalı göster\n` +
        `/voice-owner - Kanal sahibini göster\n` +
        `/voice-transfer - Sahipliği aktar\n` +
        `/voice-claim - Sahipliği talep et\n` +
        `/voice-kick - Kullanıcıyı at\n` +
        `/voice-ban - Kullanıcıyı yasakla\n` +
        `/voice-unban - Kullanıcının yasağını kaldır\n` +
        `/voice-clean - Etkin olmayan kanalları temizle`;

      const infoMessage = await tempVoiceChannel.send(commandInfo);
      await infoMessage.pin().catch((error) => logError('voiceStateUpdate:pinInfoMessage', error, 'debug'));
    }

    console.log(`[INFO] Geçici ses kanalı oluşturuldu: ${tempVoiceChannel.id} (Owner: ${member.id})`);
    
    // DB kaydı başarısızsa orphan kanalı temizle.
    try {
      await createTemporaryVoiceChannel({
        lobbyId: lobby.id,
        guildId: guild.id,
        channelId: tempVoiceChannel.id,
        textChannelId: null,
        ownerId: member.id,
        channelName: channelName,
        userLimit: lobby.userLimit || null,
        bitrate: lobby.bitrate || null,
      });
      console.log(`[INFO] Geçici kanal veritabanına kaydedildi: ${tempVoiceChannel.id}`);
    } catch (error) {
      console.error(`[ERROR] Geçici kanal veritabanına kaydedilemedi, orphan temizleniyor:`, error);
      await tempVoiceChannel.delete('DB kaydı başarısız, orphan geçici kanal').catch((e) => logError('voiceStateUpdate:dbFailOrphanCleanup', e, 'debug'));
    }
  } catch (error) {
    console.error(`[ERROR] createTemporaryChannel hatası (Guild: ${state.guild.id}, Lobby: ${lobby?.id ?? 'unknown'}):`, error);
  }
}

async function getChannelPermissions(
  guild: any,
  lobby: any,
  ownerId: string,
): Promise<{ core: any[]; synced: any[] }> {
  const me = guild.members.me;
  // Overwrite kuralı: Bir bot, guild düzeyinde sahip OLMADIĞI bir izni kanal overwrite'ında
  // allow/deny olarak yazamaz; yazarsa Discord tüm channels.create çağrısını 50013 ile reddeder.
  // Bu yüzden overwrite'a yalnızca botun gerçekten sahip olduğu bitleri koyarız.
  const filterToBotPerms = (bits: bigint[]): bigint[] =>
    me ? bits.filter((bit) => me.permissions.has(bit)) : [];

  const core: any[] = [];

  // Herkesin görme izni yok (gizlilik). ViewChannel deny'i botun ViewChannel iznine bağlı;
  // bot bir lobide çalışıyorsa ViewChannel'a sahiptir, süzgeçten geçer.
  const everyoneDeny = filterToBotPerms([PermissionFlagsBits.ViewChannel]);
  if (everyoneDeny.length > 0) {
    core.push({ id: guild.id, deny: everyoneDeny });
  }

  // Sahip izinleri (yalnız botun verebileceği bitler).
  core.push({
    id: ownerId,
    allow: filterToBotPerms([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
      ...(lobby.ownerCanManageChannel ? [PermissionFlagsBits.ManageChannels] : []),
      ...(lobby.ownerCanManagePermissions ? [PermissionFlagsBits.ManageRoles] : []),
      ...(lobby.ownerIsPrioritySpeaker ? [PermissionFlagsBits.PrioritySpeaker] : []),
      ...(lobby.ownerCanMoveMembers ? [PermissionFlagsBits.MoveMembers] : []),
    ]),
  });

  // Bot izinleri
  core.push({
    id: me?.id,
    allow: filterToBotPerms([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
    ]),
  });

  // Botun guild düzeyinde sahip olduğu izin bitleri (bigint maskesi). Senkron overwrite'ların
  // allow/deny bitfield'larını bununla AND'leyerek botun veremeyeceği bitleri düşürürüz.
  const botBits: bigint = me ? me.permissions.bitfield : 0n;

  const synced: any[] = [];
  const pushSynced = (permsCache: any) => {
    for (const [id, overwrite] of permsCache) {
      if (id === ownerId || id === me?.id) continue;
      if (!canManageOverwriteTarget(guild, id)) {
        console.warn(`[WARN] Senkron overwrite atlandı (yetki yok): ${id}`);
        continue;
      }
      // allow/deny bit alanlarını da botun sahip olduğu izinlere süz (50013 önleme).
      synced.push({
        id,
        allow: overwrite.allow.bitfield & botBits,
        deny: overwrite.deny.bitfield & botBits,
      });
    }
  };

  // Kategori izinlerini senkronize et
  if (lobby.syncCategoryPermissions) {
    const category = guild.channels.cache.get(lobby.channelId)?.parent;
    if (category) {
      pushSynced((category as CategoryChannel).permissionOverwrites.cache);
    }
  }

  // Kanal izinlerini senkronize et
  if (lobby.syncChannelPermissions) {
    const lobbyChannel = guild.channels.cache.get(lobby.channelId);
    if (lobbyChannel) {
      pushSynced(lobbyChannel.permissionOverwrites.cache);
    }
  }

  return { core, synced };
}

