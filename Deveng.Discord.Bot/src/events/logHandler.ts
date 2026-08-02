import { 
  Message, 
  PartialMessage, 
  GuildBan, 
  GuildMember, 
  PartialGuildMember,
  TextChannel, 
  VoiceChannel, 
  CategoryChannel,
  Role,
  AuditLogEvent,
  Guild,
  GuildAuditLogsEntry
} from 'discord.js';
import { getLogChannel } from '../utils/database';
import { sendLog, LogData } from '../utils/logSender';
import { logError } from '../utils/logger';

// Mesaj silme logu
export async function handleMessageDelete(message: Message | PartialMessage): Promise<void> {
  try {
    if (!message.guild) return;
    if (message.author?.bot) return; // Bot mesajlarını loglama

    const logChannelData = await getLogChannel(message.guild.id);
    if (!logChannelData) return;

    const logData: LogData = {
      type: 'MESSAGE_DELETE',
      guildId: message.guild.id,
      username: message.author?.username || 'Bilinmiyor',
      userid: message.author?.id || 'Bilinmiyor',
      usermention: message.author ? `<@${message.author.id}>` : 'Bilinmiyor',
      channel: message.channel instanceof TextChannel ? message.channel.name : 'Bilinmiyor',
      channelid: message.channel.id,
      channelmention: message.channel instanceof TextChannel ? `<#${message.channel.id}>` : 'Bilinmiyor',
      message: message.content || 'İçerik yok',
      messageid: message.id,
      timestamp: new Date(),
    };

    await sendLog(logChannelData, logData);
  } catch (error) {
    console.error('[ERROR] MessageDelete log hatası:', error);
  }
}

// Mesaj düzenleme logu
export async function handleMessageUpdate(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
  try {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return; // Bot mesajlarını loglama
    if (oldMessage.content === newMessage.content) return; // İçerik değişmediyse loglama

    const logChannelData = await getLogChannel(newMessage.guild.id);
    if (!logChannelData) return;

    const logData: LogData = {
      type: 'MESSAGE_EDIT',
      guildId: newMessage.guild.id,
      username: newMessage.author?.username || 'Bilinmiyor',
      userid: newMessage.author?.id || 'Bilinmiyor',
      usermention: newMessage.author ? `<@${newMessage.author.id}>` : 'Bilinmiyor',
      channel: newMessage.channel instanceof TextChannel ? newMessage.channel.name : 'Bilinmiyor',
      channelid: newMessage.channel.id,
      channelmention: newMessage.channel instanceof TextChannel ? `<#${newMessage.channel.id}>` : 'Bilinmiyor',
      oldmessage: oldMessage.content || 'İçerik yok',
      newmessage: newMessage.content || 'İçerik yok',
      messageid: newMessage.id,
      timestamp: new Date(),
    };

    await sendLog(logChannelData, logData);
  } catch (error) {
    console.error('[ERROR] MessageUpdate log hatası:', error);
  }
}

// Üye ban logu
export async function handleGuildBanAdd(ban: GuildBan): Promise<void> {
  try {
    console.log(`[DEBUG] GuildBanAdd: Üye yasaklandı - ${ban.user.username} (${ban.user.id}) - Guild: ${ban.guild.id}`);

    const logChannelData = await getLogChannel(ban.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] GuildBanAdd: Log channel ayarı bulunamadı - Guild: ${ban.guild.id}`);
      return;
    }

    console.log(`[DEBUG] GuildBanAdd: Log channel bulundu - ${logChannelData.channelId}`);

    // Audit log'dan kimin yasakladığını bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await ban.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.MemberBanAdd,
      });
      
      // En yakın zamanda yasaklanan üyeyi bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir User ise id kontrolü yap
        if ('id' in e.target && e.target.id === ban.user.id) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.target && 'id' in entry.target && entry.target.id === ban.user.id && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] GuildBanAdd: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] GuildBanAdd: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] GuildBanAdd: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'MEMBER_BAN',
      guildId: ban.guild.id,
      username: ban.user.username,
      userid: ban.user.id,
      usermention: `<@${ban.user.id}>`,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      reason: ban.reason || 'Sebep belirtilmemiş',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] GuildBanAdd: Log gönderiliyor - Type: ${logData.type}, User: ${logData.username}, Reason: ${logData.reason}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] GuildBanAdd: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] GuildBanAdd log hatası:', error);
  }
}

// Üye kick logu (Not: Bu fonksiyon guildMemberRemove event'inden çağrılacak, ama ban kontrolü yapıyor)
export async function handleGuildMemberRemoveForLog(member: GuildMember | PartialGuildMember): Promise<void> {
  try {
    console.log(`[DEBUG] GuildMemberRemoveForLog: Üye ayrıldı - User: ${member.user.id}, Guild: ${member.guild.id}`);
    
    // Ban kontrolü - eğer ban ise handleGuildBanAdd çağrılacak
    if (member.partial) {
      try {
        await member.fetch();
        console.log(`[DEBUG] GuildMemberRemoveForLog: Partial member fetch edildi`);
      } catch {
        console.log(`[DEBUG] GuildMemberRemoveForLog: Partial member fetch edilemedi`);
        // Fetch edilemediyse devam et
      }
    }

    const logChannelData = await getLogChannel(member.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] GuildMemberRemoveForLog: Log channel ayarı bulunamadı - Guild: ${member.guild.id}`);
      return;
    }

    console.log(`[DEBUG] GuildMemberRemoveForLog: Log channel bulundu - ${logChannelData.channelId}`);

    // Audit log'un hazır olması için kısa bir bekleme
    await new Promise(resolve => setTimeout(resolve, 500));

    // Ban olup olmadığını kontrol et (audit log'dan)
    let executor = null;
    let executorId = null;
    let isKick = false;
    
    try {
      // Önce kick kontrolü yap (daha spesifik)
      const kickLogs = await member.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.MemberKick,
      });
      
      const kickEntry = kickLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        if ('id' in e.target && e.target.id === member.user.id) {
          return true;
        }
        return false;
      }) || kickLogs.entries.first();
      
      if (kickEntry && kickEntry.target && 'id' in kickEntry.target && kickEntry.target.id === member.user.id && kickEntry.executor) {
        isKick = true;
        executor = `${kickEntry.executor.tag} (${kickEntry.executor.id})`;
        executorId = kickEntry.executor.id;
        console.log(`[DEBUG] GuildMemberRemoveForLog: Kick bulundu - Executor: ${executor}`);
      }

      // Eğer kick değilse ban kontrolü yap
      if (!isKick) {
        const banLogs = await member.guild.fetchAuditLogs({
          limit: 5,
          type: AuditLogEvent.MemberBanAdd,
        });

        const banEntry = banLogs.entries.find((e: GuildAuditLogsEntry) => {
          if (!e.target) return false;
          if ('id' in e.target && e.target.id === member.user.id) {
            return true;
          }
          return false;
        }) || banLogs.entries.first();
        
        if (banEntry && banEntry.target && 'id' in banEntry.target && banEntry.target.id === member.user.id) {
          // Bu bir ban, ban logu zaten handleGuildBanAdd'de işlenecek
          console.log(`[DEBUG] GuildMemberRemoveForLog: Bu bir ban - Log gönderilmeyecek`);
          return;
        }
      }
    } catch (error) {
      console.error('[ERROR] GuildMemberRemoveForLog: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    // Eğer kick değilse log gönderme (normal ayrılma olabilir)
    if (!isKick) {
      console.log(`[DEBUG] GuildMemberRemoveForLog: Kick değil - Normal ayrılma olabilir, log gönderilmeyecek`);
      return;
    }

    const logData: LogData = {
      type: 'MEMBER_KICK',
      guildId: member.guild.id,
      username: member.user.username,
      userid: member.user.id,
      usermention: `<@${member.user.id}>`,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      reason: 'Sebep belirtilmemiş',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] GuildMemberRemoveForLog: Log gönderiliyor - Type: ${logData.type}, User: ${logData.username}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] GuildMemberRemoveForLog: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] GuildMemberRemove log hatası:', error);
  }
}

// Rol ekleme logu
export async function handleGuildMemberUpdate(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember): Promise<void> {
  try {
    console.log(`[DEBUG] GuildMemberUpdate: Event tetiklendi - User: ${newMember.user.id}, Guild: ${newMember.guild.id}`);
    
    // Partial member'ları fetch et
    if (oldMember.partial) {
      try {
        await oldMember.fetch();
        console.log(`[DEBUG] GuildMemberUpdate: Old member fetch edildi`);
      } catch {
        console.log(`[DEBUG] GuildMemberUpdate: Old member fetch edilemedi`);
        return; // Fetch edilemediyse devam etme
      }
    }
    if (newMember.partial) {
      try {
        await newMember.fetch();
        console.log(`[DEBUG] GuildMemberUpdate: New member fetch edildi`);
      } catch {
        console.log(`[DEBUG] GuildMemberUpdate: New member fetch edilemedi`);
        return; // Fetch edilemediyse devam etme
      }
    }

    const logChannelData = await getLogChannel(newMember.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] GuildMemberUpdate: Log channel bulunamadı - Guild: ${newMember.guild.id}`);
      return;
    }
    
    console.log(`[DEBUG] GuildMemberUpdate: Log channel bulundu - Types: ${logChannelData.types.length}`);

    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    console.log(`[DEBUG] GuildMemberUpdate: Rol kontrolü - Old roles: ${oldRoles.size}, New roles: ${newRoles.size}`);

    // Rol değişikliklerini kontrol et
    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

    console.log(`[DEBUG] GuildMemberUpdate: Rol değişiklikleri - Added: ${addedRoles.size}, Removed: ${removedRoles.size}`);

    // Eklenen roller
    if (addedRoles.size > 0) {
      console.log(`[DEBUG] GuildMemberUpdate: Rol eklendi - MEMBER_ROLE_ADD logu gönderilecek`);
      for (const role of addedRoles.values()) {
        if (role.id === newMember.guild.id) continue; // @everyone rolünü atla

        // Audit log'dan kimin eklediğini bul
        let executor = null;
        let executorId = null;
        try {
          const auditLogs = await newMember.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberRoleUpdate,
          });
          const entry = auditLogs.entries.first();
          if (entry && entry.target?.id === newMember.user.id && entry.executor) {
            executor = `${entry.executor.tag} (${entry.executor.id})`;
            executorId = entry.executor.id;
          }
        } catch (error) {
          logError('logHandler:memberRoleAddAuditLog', error, 'debug');
          // Audit log alınamadıysa devam et
        }

        const logData: LogData = {
          type: 'MEMBER_ROLE_ADD',
          guildId: newMember.guild.id,
          username: newMember.user.username,
          userid: newMember.user.id,
          usermention: `<@${newMember.user.id}>`,
          role: role.name,
          roleid: role.id,
          rolemention: `<@&${role.id}>`,
          moderator: executor || 'Bilinmiyor',
          moderatorid: executorId || 'Bilinmiyor',
          timestamp: new Date(),
        };

        await sendLog(logChannelData, logData);
      }
    }

    // Kaldırılan roller
    if (removedRoles.size > 0) {
      console.log(`[DEBUG] GuildMemberUpdate: Rol kaldırıldı - MEMBER_ROLE_REMOVE logu gönderilecek`);
      for (const role of removedRoles.values()) {
        if (role.id === newMember.guild.id) continue; // @everyone rolünü atla

        // Audit log'dan kimin kaldırdığını bul
        let executor = null;
        let executorId = null;
        try {
          const auditLogs = await newMember.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberRoleUpdate,
          });
          const entry = auditLogs.entries.first();
          if (entry && entry.target?.id === newMember.user.id && entry.executor) {
            executor = `${entry.executor.tag} (${entry.executor.id})`;
            executorId = entry.executor.id;
          }
        } catch (error) {
          logError('logHandler:memberRoleRemoveAuditLog', error, 'debug');
          // Audit log alınamadıysa devam et
        }

        const logData: LogData = {
          type: 'MEMBER_ROLE_REMOVE',
          guildId: newMember.guild.id,
          username: newMember.user.username,
          userid: newMember.user.id,
          usermention: `<@${newMember.user.id}>`,
          role: role.name,
          roleid: role.id,
          rolemention: `<@&${role.id}>`,
          moderator: executor || 'Bilinmiyor',
          moderatorid: executorId || 'Bilinmiyor',
          timestamp: new Date(),
        };

        await sendLog(logChannelData, logData);
      }
    }

    // Diğer üye güncellemeleri (nickname, vb.)
    const nicknameChanged = oldMember.nickname !== newMember.nickname;
    const usernameChanged = oldMember.user.username !== newMember.user.username;
    
    console.log(`[DEBUG] GuildMemberUpdate: İsim kontrolü - Nickname: ${nicknameChanged} (${oldMember.nickname} -> ${newMember.nickname}), Username: ${usernameChanged} (${oldMember.user.username} -> ${newMember.user.username})`);
    
    if (nicknameChanged || usernameChanged) {
      console.log(`[DEBUG] GuildMemberUpdate: İsim değişti - MEMBER_UPDATE logu gönderilecek`);
      const logData: LogData = {
        type: 'MEMBER_UPDATE',
        guildId: newMember.guild.id,
        username: newMember.user.username,
        userid: newMember.user.id,
        usermention: `<@${newMember.user.id}>`,
        oldnickname: oldMember.nickname || 'Yok',
        newnickname: newMember.nickname || 'Yok',
        timestamp: new Date(),
      };

      await sendLog(logChannelData, logData);
    } else {
      console.log(`[DEBUG] GuildMemberUpdate: İsim değişmedi - Log gönderilmeyecek`);
    }
  } catch (error) {
    console.error('[ERROR] GuildMemberUpdate log hatası:', error);
  }
}

// Kanal oluşturma logu
export async function handleChannelCreate(channel: TextChannel | VoiceChannel | CategoryChannel | any): Promise<void> {
  try {
    if (!channel.guild) {
      console.log('[DEBUG] ChannelCreate: Kanal guild bilgisi yok');
      return;
    }
    // DM kanallarını loglama
    if (!('guild' in channel)) {
      console.log('[DEBUG] ChannelCreate: DM kanalı, loglanmayacak');
      return;
    }

    console.log(`[DEBUG] ChannelCreate: Kanal oluşturuldu - ${channel.name} (${channel.id}) - Guild: ${channel.guild.id}`);

    const logChannelData = await getLogChannel(channel.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] ChannelCreate: Log channel ayarı bulunamadı - Guild: ${channel.guild.id}`);
      return;
    }

    console.log(`[DEBUG] ChannelCreate: Log channel bulundu - ${logChannelData.channelId}`);

    // Audit log'dan kimin oluşturduğunu bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.ChannelCreate,
      });
      
      // En yakın zamanda oluşturulan kanalı bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir Channel ise id kontrolü yap
        if ('id' in e.target && e.target.id === channel.id) {
          return true;
        }
        // Son 5 saniye içinde oluşturulan Channel entry'si
        if (e.targetType === 'Channel' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] ChannelCreate: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] ChannelCreate: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] ChannelCreate: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'CHANNEL_CREATE',
      guildId: channel.guild.id,
      channel: channel.name,
      channelid: channel.id,
      channelmention: `<#${channel.id}>`,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] ChannelCreate: Log gönderiliyor - Type: ${logData.type}, Channel: ${logData.channel}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] ChannelCreate: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] ChannelCreate log hatası:', error);
  }
}

// Kanal silme logu
export async function handleChannelDelete(channel: TextChannel | VoiceChannel | CategoryChannel | any): Promise<void> {
  try {
    if (!channel.guild) {
      console.log('[DEBUG] ChannelDelete: Kanal guild bilgisi yok');
      return;
    }
    // DM kanallarını loglama
    if (!('guild' in channel)) {
      console.log('[DEBUG] ChannelDelete: DM kanalı, loglanmayacak');
      return;
    }

    console.log(`[DEBUG] ChannelDelete: Kanal silindi - ${channel.name} (${channel.id}) - Guild: ${channel.guild.id}`);

    const logChannelData = await getLogChannel(channel.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] ChannelDelete: Log channel ayarı bulunamadı - Guild: ${channel.guild.id}`);
      return;
    }

    console.log(`[DEBUG] ChannelDelete: Log channel bulundu - ${logChannelData.channelId}`);

    // Audit log'dan kimin sildiğini bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.ChannelDelete,
      });
      
      // En yakın zamanda silinen kanalı bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir Channel ise id kontrolü yap
        if ('id' in e.target && e.target.id === channel.id) {
          return true;
        }
        // Son 5 saniye içinde silinen Channel entry'si
        if (e.targetType === 'Channel' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] ChannelDelete: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] ChannelDelete: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] ChannelDelete: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'CHANNEL_DELETE',
      guildId: channel.guild.id,
      channel: channel.name,
      channelid: channel.id,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] ChannelDelete: Log gönderiliyor - Type: ${logData.type}, Channel: ${logData.channel}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] ChannelDelete: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] ChannelDelete log hatası:', error);
  }
}

// Kanal güncelleme logu
export async function handleChannelUpdate(oldChannel: TextChannel | VoiceChannel | CategoryChannel | any, newChannel: TextChannel | VoiceChannel | CategoryChannel | any): Promise<void> {
  try {
    if (!newChannel.guild) {
      console.log('[DEBUG] ChannelUpdate: Kanal guild bilgisi yok');
      return;
    }
    // DM kanallarını loglama
    if (!('guild' in newChannel)) {
      console.log('[DEBUG] ChannelUpdate: DM kanalı, loglanmayacak');
      return;
    }

    console.log(`[DEBUG] ChannelUpdate: Kanal güncellendi - ${newChannel.name} (${newChannel.id}) - Guild: ${newChannel.guild.id}`);

    const logChannelData = await getLogChannel(newChannel.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] ChannelUpdate: Log channel ayarı bulunamadı - Guild: ${newChannel.guild.id}`);
      return;
    }

    console.log(`[DEBUG] ChannelUpdate: Log channel bulundu - ${logChannelData.channelId}`);

    // İsim değişikliği kontrolü
    const nameChanged = oldChannel.name !== newChannel.name;
    console.log(`[DEBUG] ChannelUpdate: İsim kontrolü - Old: ${oldChannel.name}, New: ${newChannel.name}, Changed: ${nameChanged}`);
    
    if (!nameChanged) {
      console.log('[DEBUG] ChannelUpdate: İsim değişmedi - Log gönderilmeyecek');
      return; // İsim değişmediyse loglama
    }

    // Audit log'dan kimin güncellediğini bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await newChannel.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.ChannelUpdate,
      });
      
      // En yakın zamanda güncellenen kanalı bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir Channel ise id kontrolü yap
        if ('id' in e.target && e.target.id === newChannel.id) {
          return true;
        }
        // Son 5 saniye içinde güncellenen Channel entry'si
        if (e.targetType === 'Channel' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] ChannelUpdate: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] ChannelUpdate: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] ChannelUpdate: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'CHANNEL_UPDATE',
      guildId: newChannel.guild.id,
      channel: newChannel.name,
      channelid: newChannel.id,
      channelmention: `<#${newChannel.id}>`,
      oldname: oldChannel.name,
      newname: newChannel.name,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] ChannelUpdate: Log gönderiliyor - Type: ${logData.type}, Channel: ${logData.channel}, OldName: ${logData.oldname}, NewName: ${logData.newname}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] ChannelUpdate: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] ChannelUpdate log hatası:', error);
  }
}

// Rol oluşturma logu
export async function handleRoleCreate(role: Role): Promise<void> {
  try {
    console.log(`[DEBUG] RoleCreate: Rol oluşturuldu - ${role.name} (${role.id}) - Guild: ${role.guild.id}`);

    const logChannelData = await getLogChannel(role.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] RoleCreate: Log channel ayarı bulunamadı - Guild: ${role.guild.id}`);
      return;
    }

    console.log(`[DEBUG] RoleCreate: Log channel bulundu - ${logChannelData.channelId}`);

    // Audit log'dan kimin oluşturduğunu bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await role.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.RoleCreate,
      });
      
      // En yakın zamanda oluşturulan rolü bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir Role ise id kontrolü yap
        if ('id' in e.target && e.target.id === role.id) {
          return true;
        }
        // Son 5 saniye içinde oluşturulan Role entry'si
        if (e.targetType === 'Role' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] RoleCreate: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] RoleCreate: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] RoleCreate: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'ROLE_CREATE',
      guildId: role.guild.id,
      role: role.name,
      roleid: role.id,
      rolemention: `<@&${role.id}>`,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] RoleCreate: Log gönderiliyor - Type: ${logData.type}, Role: ${logData.role}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] RoleCreate: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] RoleCreate log hatası:', error);
  }
}

// Rol silme logu
export async function handleRoleDelete(role: Role): Promise<void> {
  try {
    console.log(`[DEBUG] RoleDelete: Rol silindi - ${role.name} (${role.id}) - Guild: ${role.guild.id}`);

    const logChannelData = await getLogChannel(role.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] RoleDelete: Log channel ayarı bulunamadı - Guild: ${role.guild.id}`);
      return;
    }

    console.log(`[DEBUG] RoleDelete: Log channel bulundu - ${logChannelData.channelId}`);

    // Audit log'dan kimin sildiğini bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await role.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.RoleDelete,
      });
      
      // En yakın zamanda silinen rolü bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir Role ise id kontrolü yap
        if ('id' in e.target && e.target.id === role.id) {
          return true;
        }
        // Son 5 saniye içinde silinen Role entry'si
        if (e.targetType === 'Role' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] RoleDelete: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] RoleDelete: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] RoleDelete: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'ROLE_DELETE',
      guildId: role.guild.id,
      role: role.name,
      roleid: role.id,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] RoleDelete: Log gönderiliyor - Type: ${logData.type}, Role: ${logData.role}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] RoleDelete: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] RoleDelete log hatası:', error);
  }
}

// Rol güncelleme logu
export async function handleRoleUpdate(oldRole: Role, newRole: Role): Promise<void> {
  try {
    console.log(`[DEBUG] RoleUpdate: Rol güncellendi - ${newRole.name} (${newRole.id}) - Guild: ${newRole.guild.id}`);

    const logChannelData = await getLogChannel(newRole.guild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] RoleUpdate: Log channel ayarı bulunamadı - Guild: ${newRole.guild.id}`);
      return;
    }

    console.log(`[DEBUG] RoleUpdate: Log channel bulundu - ${logChannelData.channelId}`);

    // İsim değişikliği kontrolü
    const nameChanged = oldRole.name !== newRole.name;
    console.log(`[DEBUG] RoleUpdate: İsim kontrolü - Old: ${oldRole.name}, New: ${newRole.name}, Changed: ${nameChanged}`);
    
    if (!nameChanged) {
      console.log('[DEBUG] RoleUpdate: İsim değişmedi - Log gönderilmeyecek');
      return; // İsim değişmediyse loglama
    }

    // Audit log'dan kimin güncellediğini bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await newRole.guild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.RoleUpdate,
      });
      
      // En yakın zamanda güncellenen rolü bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // target bir Role ise id kontrolü yap
        if ('id' in e.target && e.target.id === newRole.id) {
          return true;
        }
        // Son 5 saniye içinde güncellenen Role entry'si
        if (e.targetType === 'Role' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] RoleUpdate: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] RoleUpdate: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] RoleUpdate: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'ROLE_UPDATE',
      guildId: newRole.guild.id,
      role: newRole.name,
      roleid: newRole.id,
      rolemention: `<@&${newRole.id}>`,
      oldname: oldRole.name,
      newname: newRole.name,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] RoleUpdate: Log gönderiliyor - Type: ${logData.type}, Role: ${logData.role}, OldName: ${logData.oldname}, NewName: ${logData.newname}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] RoleUpdate: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] RoleUpdate log hatası:', error);
  }
}

// Sunucu güncelleme logu
export async function handleGuildUpdate(oldGuild: Guild, newGuild: Guild): Promise<void> {
  try {
    console.log(`[DEBUG] GuildUpdate: Sunucu güncellendi - ${newGuild.name} (${newGuild.id})`);

    const logChannelData = await getLogChannel(newGuild.id);
    if (!logChannelData) {
      console.log(`[DEBUG] GuildUpdate: Log channel ayarı bulunamadı - Guild: ${newGuild.id}`);
      return;
    }

    console.log(`[DEBUG] GuildUpdate: Log channel bulundu - ${logChannelData.channelId}`);

    // İsim değişikliği kontrolü
    const nameChanged = oldGuild.name !== newGuild.name;
    console.log(`[DEBUG] GuildUpdate: İsim kontrolü - Old: ${oldGuild.name}, New: ${newGuild.name}, Changed: ${nameChanged}`);
    
    if (!nameChanged) {
      console.log('[DEBUG] GuildUpdate: İsim değişmedi - Log gönderilmeyecek');
      return; // İsim değişmediyse loglama
    }

    // Audit log'dan kimin güncellediğini bul (küçük bir gecikme ile - audit log'lar bazen gecikmeli olabilir)
    let executor = null;
    let executorId = null;
    try {
      // Audit log'un hazır olması için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await newGuild.fetchAuditLogs({
        limit: 5, // Daha fazla entry kontrol et
        type: AuditLogEvent.GuildUpdate,
      });
      
      // En yakın zamanda güncellenen sunucu entry'sini bul
      const entry = auditLogs.entries.find((e: GuildAuditLogsEntry) => {
        if (!e.target) return false;
        // Son 5 saniye içinde güncellenen Guild entry'si
        if (e.targetType === 'Guild' && Date.now() - e.createdTimestamp < 5000) {
          return true;
        }
        return false;
      }) || auditLogs.entries.first();
      
      if (entry && entry.executor) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
        executorId = entry.executor.id;
        console.log(`[DEBUG] GuildUpdate: Audit log bulundu - Executor: ${executor}`);
      } else {
        console.log('[DEBUG] GuildUpdate: Audit log entry bulunamadı');
      }
    } catch (error) {
      console.error('[ERROR] GuildUpdate: Audit log alınamadı:', error);
      // Audit log alınamadıysa devam et
    }

    const logData: LogData = {
      type: 'GUILD_UPDATE',
      guildId: newGuild.id,
      guildname: newGuild.name,
      oldname: oldGuild.name,
      newname: newGuild.name,
      moderator: executor || 'Bilinmiyor',
      moderatorid: executorId || 'Bilinmiyor',
      timestamp: new Date(),
    };

    console.log(`[DEBUG] GuildUpdate: Log gönderiliyor - Type: ${logData.type}, Guild: ${logData.guildname}, OldName: ${logData.oldname}, NewName: ${logData.newname}`);
    await sendLog(logChannelData, logData);
    console.log(`[DEBUG] GuildUpdate: Log gönderildi`);
  } catch (error) {
    console.error('[ERROR] GuildUpdate log hatası:', error);
  }
}
