import './loadEnv';
import { initLogger, logError } from './utils/logger';
initLogger(); // tüm console.log/warn/error çağrılarını ES'e iletir

import { Client, GatewayIntentBits, Events, ChannelType } from 'discord.js';
import { BotConfig } from './types/config';
import { loadConfig } from './utils/config';
import { initializeDatabase, closeDatabase } from './utils/database';
import { handleGuildMemberAdd } from './events/guildMemberAdd';
import { handleGuildMemberRemove } from './events/guildMemberRemove';
import { startHttpServer, stopHttpServer } from './utils/httpServer';
import { customBotManager } from './utils/customBotManager';
import { musicManager } from './music/musicManager';
import { JOB_INTERVALS, isJobOwnedByWorker } from './utils/jobIntervals';

let discordClient: Client | null = null;

/** Redis lider kilidi uyarısı için throttle (istatistik döngüsü). */
let lastStatisticsLeaderWarnMs = 0;

/** process.on handlers yalnızca bir kez bağlanır (startBot yeniden çağrılırsa çoğalmaz). */
let processHandlersBound = false;

/** Bilinen transient Discord API kodları — unhandledRejection'ı ERROR spam yapmadan warn'a düşür. */
const TRANSIENT_DISCORD_API_CODES = new Set([
  10003, // Unknown Channel
  10008, // Unknown Message
  10062, // Unknown interaction
  40060, // Interaction already acknowledged
  50001, // Missing Access
  50013, // Missing Permissions
  50035, // Invalid Form Body (kısmi; genelde kullanıcı girişi)
]);

function discordApiErrorCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'number' ? code : null;
  }
  return null;
}

export function getClient(): Client | null {
  return discordClient;
}

// Bot başlatma fonksiyonu
export async function startBot(): Promise<void> {
  // Config yükle
  let botConfig: BotConfig;
  try {
    botConfig = loadConfig();
    
    // Veritabanı bağlantısını başlat
    await initializeDatabase(botConfig);
    musicManager.configure(botConfig);
    console.log('[INFO] Config yüklendi.');
  } catch (error) {
    console.error('[ERROR] Başlatma hatası:', error);
    process.exit(1);
  }

  // Discord Client — etkileşimler Gateway (websocket) ile gelir; HTTP Interactions + Ed25519 bu projede kullanılmıyor.
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ];
  // GuildPresences privileged intent'tir ve "Çevrimiçi Üye"/"Rekor Çevrimiçi" istatistik
  // sayaçları için gereklidir (yoksa m.presence daima undefined → sayaçlar 0). GÜVENLİK:
  // Bu intent Developer Portal'da açık DEĞİLSE eklemek bot login'ini tamamen çökertir. Bu
  // yüzden yalnızca operatör ENABLE_PRESENCE_INTENT=true ile ve portalda açtıktan sonra
  // etkinleşir; varsayılan kapalıdır ki mevcut deployment'lar güvenle çalışmaya devam etsin.
  if (process.env.ENABLE_PRESENCE_INTENT === 'true') {
    intents.push(GatewayIntentBits.GuildPresences);
    console.log('[STARTUP] GuildPresences intent etkin (çevrimiçi sayaçları aktif).');
  }
  const client = new Client({ intents });

  discordClient = client;

  const invalidateDiscordCacheForGuild = async (guildId: string) => {
    try {
      const { invalidateDiscordGuildCache } = await import('./utils/apiClient');
      await invalidateDiscordGuildCache(guildId);
    } catch (error) {
      console.error(`[ERROR] Discord cache invalidation hatası (Guild: ${guildId}):`, error);
    }
  };

  // Bot hazır olduğunda
  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[INFO] Bot hazır! ${readyClient.user.tag} olarak giriş yapıldı.`);
    console.log(`[INFO] ${readyClient.guilds.cache.size} sunucuda aktif.`);
    musicManager.registerClient(readyClient, readyClient.application.id);

    const shardId = readyClient.shard?.ids[0];
    const isPrimaryShard = readyClient.shard == null || shardId === 0;

    // Global (REST) slash kayıt — yalnızca bir kez (shard 0 / tek süreç)
    if (isPrimaryShard) {
      try {
        const { registerCommands } = await import('./utils/registerCommands');
        await registerCommands(readyClient.application.id);
      } catch (error) {
        console.error('[ERROR] Global komutlar kaydedilemedi:', error);
      }
    }

    void (async () => {
      try {
        await new Promise((r) => setTimeout(r, 4000));
        const { registerAllGuildCommands } = await import('./utils/registerCommands');
        await registerAllGuildCommands(readyClient);
      } catch (error) {
        console.error('[ERROR] Guild komutları kaydedilemedi:', error);
      }
    })();

    const httpPort = botConfig.httpServer?.port ?? 3005;
    if (isPrimaryShard) {
      try {
        await startHttpServer(httpPort);
      } catch (error) {
        console.error('[FATAL] HTTP server başlatılamadı, bot kapatılıyor:', error);
        readyClient.destroy();
        await closeDatabase();
        process.exit(1);
      }
    } else {
      console.log(`[INFO] Shard ${shardId}: Bot HTTP sunucusu yalnızca shard 0'da (port ${httpPort}).`);
    }

    if (isPrimaryShard) {
      customBotManager.initialize(botConfig.api.baseUrl);
      try {
        const { hydrateCustomBotTokens } = await import('./utils/customBotTokenStore');
        const n = await hydrateCustomBotTokens();
        if (n > 0) console.log(`[STARTUP] Custom bot token cache'i Redis'ten ${n} kayıt ile dolduruldu`);
      } catch (e) {
        console.error('[STARTUP] Custom bot token hydration hatası:', e);
      }
      await customBotManager.loadBots();

      void (async () => {
        try {
          const { refreshShowcaseGuildsCache } = await import('./utils/showcaseGuildsCache');
          await refreshShowcaseGuildsCache(readyClient);
        } catch (e) {
          console.error('[Showcase] Vitrin önbelleği başlatılamadı:', e);
        }
      })();

      // Vitrin (ana sayfa) sunucu listesini periyodik olarak (~1 saat) tazele — drift önleme.
      // Redis leader-lock: çok süreçli kurulumda yalnızca tek süreç yeniler.
      void (async () => {
        const { SHOWCASE_REFRESH_INTERVAL_MS } = await import('./utils/showcaseGuildsCache');
        setInterval(async () => {
          try {
            const { tryBecomeLeader } = await import('./utils/redisCache');
            if (!(await tryBecomeLeader('bot:leader:showcase-guilds', 300))) return;
            const { refreshShowcaseGuildsCache } = await import('./utils/showcaseGuildsCache');
            await refreshShowcaseGuildsCache(readyClient);
          } catch (e) {
            console.error('[Showcase] Vitrin önbelleği periyodik yenileme hatası:', e);
          }
        }, SHOWCASE_REFRESH_INTERVAL_MS);
      })();
    }

    void (async () => {
      try {
        await new Promise((r) => setTimeout(r, 8000));
        const { syncAllInviteSnapshots } = await import('./utils/inviteLeaderboard');
        await syncAllInviteSnapshots(Array.from(readyClient.guilds.cache.values()));
      } catch (e) {
        console.error('[InviteLeaderboard] Davet snapshot önbelleği başlatılamadı:', e);
      }
    })();
    
    // İstatistik kanallarını periyodik olarak güncelle (5 dakikada bir) – custom bot’lu sunucularda ana bot çalışmaz
    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:statistics', 240))) {
          const now = Date.now();
          if (now - lastStatisticsLeaderWarnMs > 300_000) {
            lastStatisticsLeaderWarnMs = now;
            console.warn(
              '[WARN] bot:leader:statistics lider kilidi başka bir süreçte — bu süreç istatistik güncellemesini atlıyor (normal, çok-süreçli kurulum).'
            );
          }
          return;
        }
        const { runDistributedStatisticsSweep } = await import('./utils/shardDistributedJobs');
        await runDistributedStatisticsSweep(readyClient);
      } catch (error) {
        console.error('[ERROR] İstatistik kanalları periyodik güncelleme hatası:', error);
      }
    }, JOB_INTERVALS.statistics);

    // Çekilişleri periyodik olarak kontrol et ve bitenleri sonlandır (1 dakikada bir) – custom bot’lu sunucularda ana bot çalışmaz
    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:giveaways', 50))) return;
        const { checkAndEndExpiredGiveaways } = await import('./utils/giveawaySender');
        await checkAndEndExpiredGiveaways((guildId) => customBotManager.isGuildHandledByCustomBot(guildId));
      } catch (error) {
        console.error('[ERROR] Çekiliş kontrolü hatası:', error);
      }
    }, JOB_INTERVALS.giveaways);

    // Anketleri periyodik olarak kontrol et ve süresi/oy limiti dolanları sonlandır.
    // .NET Scheduling Worker anketleri devraldıysa (SCHEDULING_WORKER_OWNS_POLLS) bot içi
    // sweep atlanır — böylece iki sistem aynı anketi taramaz.
    if (!isJobOwnedByWorker('polls')) {
      setInterval(async () => {
        try {
          const { tryBecomeLeader } = await import('./utils/redisCache');
          if (!(await tryBecomeLeader('bot:leader:polls', 50))) return;
          const { runDistributedExpiredPollSweep } = await import('./utils/shardDistributedJobs');
          await runDistributedExpiredPollSweep(readyClient);
        } catch (error) {
          console.error('[ERROR] Anket kontrolü hatası:', error);
        }
      }, JOB_INTERVALS.polls);
    }

    // Doğum günü kontrolü (her dakika) – custom bot’lu sunucularda ana bot çalışmaz
    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:birthdays', 50))) return;
        const { checkAndSendBirthdayMessages } = await import('./events/birthdayHandler');
        await checkAndSendBirthdayMessages(readyClient, (guildId) => customBotManager.isGuildHandledByCustomBot(guildId));
      } catch (error) {
        console.error('[ERROR] Doğum günü kontrolü hatası:', error);
      }
    }, JOB_INTERVALS.birthdays);

    // Hatırlatıcı kontrolü – custom bot’lu sunucularda ana bot çalışmaz.
    // .NET Scheduling Worker hatırlatıcıları devraldıysa (SCHEDULING_WORKER_OWNS_REMINDERS)
    // bot içi sweep atlanır — çift teslim/tarama önlenir.
    if (!isJobOwnedByWorker('reminders')) {
      setInterval(async () => {
        try {
          const { tryBecomeLeader } = await import('./utils/redisCache');
          if (!(await tryBecomeLeader('bot:leader:reminders', 50))) return;
          const { checkAndSendReminders } = await import('./events/reminderHandler');
          await checkAndSendReminders(readyClient, (guildId) => customBotManager.isGuildHandledByCustomBot(guildId));
        } catch (error) {
          console.error('[ERROR] Hatırlatıcı kontrolü hatası:', error);
        }
      }, JOB_INTERVALS.reminders);
    }

    // Feed duyurularını periyodik olarak kontrol et (1 dakikada bir)
    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:feed-announcements', 50))) return;
        const { checkAndSendFeedAnnouncements } = await import('./utils/feedAnnouncementWorker');
        await checkAndSendFeedAnnouncements(readyClient, (guildId) => customBotManager.isGuildHandledByCustomBot(guildId));
      } catch (error) {
        console.error('[ERROR] Feed duyuru kontrolü hatası:', error);
      }
    }, JOB_INTERVALS.feedAnnouncements);

    // Zamanlanmış duyuruları periyodik olarak kontrol et
    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:scheduled-announcements', 50))) return;
        const { checkAndSendScheduledAnnouncements } = await import('./utils/scheduledAnnouncementWorker');
        await checkAndSendScheduledAnnouncements(readyClient, (guildId) => customBotManager.isGuildHandledByCustomBot(guildId));
      } catch (error) {
        console.error('[ERROR] Zamanlanmış duyuru kontrolü hatası:', error);
      }
    }, JOB_INTERVALS.scheduledAnnouncements);

    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:guild-reports', 240))) return;
        const { processGuildReportJobs } = await import('./utils/guildReportWorker');
        await processGuildReportJobs(readyClient);
      } catch (error) {
        console.error('[ERROR] Guild report job kontrolü hatası:', error);
      }
    }, JOB_INTERVALS.guildReports);

    setInterval(async () => {
      try {
        const { tryBecomeLeader } = await import('./utils/redisCache');
        if (!(await tryBecomeLeader('bot:leader:ai-moderation', 90))) return;
        const { processAIModerationJobs } = await import('./utils/aiModerationWorker');
        await processAIModerationJobs(readyClient, 'main');
      } catch (error) {
        console.error('[ERROR] AI moderasyon kuyruk işleyici hatası:', error);
      }
    }, JOB_INTERVALS.aiModeration);
    
    void (async () => {
      try {
        await new Promise((r) => setTimeout(r, 5000));
        const { syncAllGuilds } = await import('./utils/guildSync');
        const guilds = Array.from(readyClient.guilds.cache.values());

        if (guilds.length > 0) {
          const result = await syncAllGuilds(guilds);
          if (result.failCount === 0) {
            console.log('[INFO] Tum sunucu bilgileri API\'ye basariyla gonderildi.');
          } else if (result.successCount === 0) {
            console.error('[ERROR] Hicbir sunucu bilgisi API\'ye gonderilemedi.');
          } else {
            console.warn(`[WARN] ${result.successCount} sunucu basarili, ${result.failCount} sunucu basarisiz.`);
          }
        } else {
          console.log('[INFO] Bot henuz hicbir sunucuda degil.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('API\'ye baglanilamiyor') || errorMessage.includes('baglanilamiyor')) {
          console.error('[ERROR] Sunucu bilgileri API\'ye gonderilemedi - API\'ye baglanilamiyor');
          console.error('[ERROR] Lutfen API\'nin calistigindan emin olun.');
        } else {
          console.error('[ERROR] Guild sync hatası:', errorMessage);
        }
      }
    })();
  });

  // Yeni sunucuya katıldığında
  client.on(Events.GuildCreate, async (guild) => {
    try {
      const { syncGuild } = await import('./utils/guildSync');
      await syncGuild(guild);
      
      // Yeni sunucu için komutları kaydet
      const { registerGuildCommands } = await import('./utils/registerCommands');
      await registerGuildCommands(client, guild.id);
    } catch (error) {
      console.error('[ERROR] Guild create sync hatası:', error);
    }
  });

  // Sunucudan ayrıldığında
  client.on(Events.GuildDelete, async (guild) => {
    try {
      const { unsyncGuild } = await import('./utils/guildSync');
      await unsyncGuild(guild.id);
    } catch (error) {
      console.error('[ERROR] Guild delete sync hatası:', error);
    }
  });

  // Yeni üye katıldığında
  client.on(Events.GuildMemberAdd, async (member) => {
    if (customBotManager.isGuildHandledByCustomBot(member.guild.id)) return;
    await handleGuildMemberAdd(member);
    const { handleAutomationMemberAdd } = await import('./automation/automationEngine');
    await handleAutomationMemberAdd();
  });

  // Mesaj oluşturulduğunda (prefix komutlar için)
  client.on(Events.MessageCreate, async (message) => {
    if (message.guild && customBotManager.isGuildHandledByCustomBot(message.guild.id)) return;
    const { handleMessageCreate } = await import('./events/messageCreate');
    await handleMessageCreate(message);
  });

  // Mesaj silindiğinde (log için)
  client.on(Events.MessageDelete, async (message) => {
    const guildId = message.guildId ?? ('guild' in message && message.guild ? message.guild.id : null);
    if (guildId && customBotManager.isGuildHandledByCustomBot(guildId)) return;
    const { handleMessageDelete } = await import('./events/logHandler');
    await handleMessageDelete(message);
    const { handleAutomationMessageDelete } = await import('./automation/automationEngine');
    await handleAutomationMessageDelete(message);
  });

  // Mesaj düzenlendiğinde (log için)
  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    const guildId = newMessage.guildId ?? (newMessage as { guild?: { id: string } }).guild?.id;
    if (guildId && customBotManager.isGuildHandledByCustomBot(guildId)) return;
    const { handleMessageUpdate } = await import('./events/logHandler');
    await handleMessageUpdate(oldMessage, newMessage);
    const { handleAutomationMessageUpdate } = await import('./automation/automationEngine');
    await handleAutomationMessageUpdate(oldMessage, newMessage);
  });

  // Üye yasaklandığında (log için)
  client.on(Events.GuildBanAdd, async (ban) => {
    if (customBotManager.isGuildHandledByCustomBot(ban.guild.id)) return;
    try {
      console.log(`[DEBUG] GuildBanAdd event tetiklendi - User: ${ban.user.id}, Guild: ${ban.guild.id}`);
      console.log(`[DEBUG] GuildBanAdd: Ban bilgileri - Username: ${ban.user.username}, Reason: ${ban.reason || 'Sebep belirtilmemiş'}`);
      const { handleGuildBanAdd } = await import('./events/logHandler');
      await handleGuildBanAdd(ban);
    } catch (error) {
      console.error(`[ERROR] GuildBanAdd event hatası:`, error);
    }
  });

  // Üye ayrıldığında (log için - kick kontrolü)
  client.on(Events.GuildMemberRemove, async (member) => {
    if (customBotManager.isGuildHandledByCustomBot(member.guild.id)) return;
    await handleGuildMemberRemove(member);
    // Log için kontrol
    const { handleGuildMemberRemoveForLog } = await import('./events/logHandler');
    await handleGuildMemberRemoveForLog(member);
  });

  // Üye güncellendiğinde (log için - rol değişiklikleri)
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (customBotManager.isGuildHandledByCustomBot(newMember.guild.id)) return;
    // Partial member kontrolü
    if (oldMember.partial) {
      try {
        await oldMember.fetch();
      } catch {
        return;
      }
    }
    if (newMember.partial) {
      try {
        await newMember.fetch();
      } catch {
        return;
      }
    }
    const { handleGuildMemberUpdate } = await import('./events/logHandler');
    await handleGuildMemberUpdate(oldMember, newMember);
    const { handleAutomationGuildMemberUpdate } = await import('./automation/automationEngine');
    await handleAutomationGuildMemberUpdate();
  });

  // Interaction oluşturulduğunda (buton ve menü için)
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.guildId && customBotManager.isGuildHandledByCustomBot(interaction.guildId)) return;
    const { handleInteractionCreate } = await import('./events/interactionCreate');
    await handleInteractionCreate(interaction);
  });

  // Mesaj tepkisi eklendiğinde
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    const { handleMessageReactionAdd } = await import('./events/messageReactionAdd');
    // Partial reaction'ları fetch et
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('[ERROR] Reaction fetch hatası:', error);
        return;
      }
    }
    const guildId = reaction.message.guildId ?? (reaction.message as { guild?: { id: string } }).guild?.id;
    if (guildId && customBotManager.isGuildHandledByCustomBot(guildId)) return;
    // Partial user'ları fetch et
    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error('[ERROR] User fetch hatası:', error);
        return;
      }
    }
    await handleMessageReactionAdd(reaction, user);
    const { handleAutomationReactionAdd } = await import('./automation/automationEngine');
    await handleAutomationReactionAdd(reaction, user as { bot: boolean; id: string });
  });

  // Mesaj tepkisi kaldırıldığında
  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    const { handleMessageReactionRemove } = await import('./events/messageReactionRemove');
    // Partial reaction'ları fetch et
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('[ERROR] Reaction fetch hatası:', error);
        return;
      }
    }
    const guildId = reaction.message.guildId ?? (reaction.message as { guild?: { id: string } }).guild?.id;
    if (guildId && customBotManager.isGuildHandledByCustomBot(guildId)) return;
    // Partial user'ları fetch et
    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error('[ERROR] User fetch hatası:', error);
        return;
      }
    }
    await handleMessageReactionRemove(reaction, user);
  });

  // Ses kanalı durumu değiştiğinde
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const guildId = newState.guild.id;
    if (customBotManager.isGuildHandledByCustomBot(guildId)) return;
    const { handleVoiceStateUpdate } = await import('./events/voiceStateUpdate');
    await handleVoiceStateUpdate(oldState, newState);
    const { handleAutomationVoiceState } = await import('./automation/automationEngine');
    await handleAutomationVoiceState();
  });

  client.on(Events.ThreadCreate, async (thread) => {
    try {
      const guildId = thread.guild?.id;
      if (guildId && customBotManager.isGuildHandledByCustomBot(guildId)) return;
      const { handleAutomationThreadCreate } = await import('./automation/automationEngine');
      await handleAutomationThreadCreate();
    } catch (error) {
      logError('botEntry:threadCreateAutomation', error, 'debug');
    }
  });

  // Kanal oluşturulduğunda
  client.on(Events.ChannelCreate, async (channel) => {
    try {
      if ('guild' in channel && channel.guild && customBotManager.isGuildHandledByCustomBot(channel.guild.id)) return;
      console.log(`[DEBUG] ChannelCreate event tetiklendi - Channel: ${channel.id}, Type: ${channel.type}`);
      if ('guild' in channel && channel.guild) {
        console.log(`[DEBUG] ChannelCreate: Guild kanalı - Guild: ${channel.guild.id}`);
        
        // Log için - sadece guild kanalları (önce kontrol et, sonra istatistik güncelle)
        const isTextChannel = channel.type === ChannelType.GuildText;
        const isVoiceChannel = channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
        const isCategoryChannel = channel.type === ChannelType.GuildCategory;
        
        console.log(`[DEBUG] ChannelCreate: Kanal tipi kontrolü - Type: ${channel.type}, GuildText: ${ChannelType.GuildText}, GuildVoice: ${ChannelType.GuildVoice}, GuildCategory: ${ChannelType.GuildCategory}`);
        console.log(`[DEBUG] ChannelCreate: Kontroller - isTextChannel: ${isTextChannel}, isVoiceChannel: ${isVoiceChannel}, isCategoryChannel: ${isCategoryChannel}`);
        
        if (isTextChannel || isVoiceChannel || isCategoryChannel) {
          await invalidateDiscordCacheForGuild(channel.guild.id);
          console.log(`[DEBUG] ChannelCreate: Log handler çağrılıyor - Type: ${channel.type}`);
          const { handleChannelCreate } = await import('./events/logHandler');
          await handleChannelCreate(channel);
        } else {
          console.log(`[DEBUG] ChannelCreate: Log handler çağrılmayacak - Type: ${channel.type} (sadece Text/Voice/Category loglanır)`);
        }
        
        // İstatistik güncellemeleri (log'dan sonra)
        try {
          const { updateStatisticsChannelByType } = await import('./utils/statisticsChannel');
          await updateStatisticsChannelByType(channel.guild.id, 'Toplam Kanal Sayısı');
          if (channel.type === ChannelType.GuildText) {
            await updateStatisticsChannelByType(channel.guild.id, 'Metin Kanalları');
          } else if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
            await updateStatisticsChannelByType(channel.guild.id, 'Ses Kanalları');
          }
        } catch (statError) {
          console.error(`[ERROR] ChannelCreate: İstatistik güncelleme hatası:`, statError);
        }
      } else {
        console.log(`[DEBUG] ChannelCreate: DM kanalı veya guild yok - Loglanmayacak`);
      }
    } catch (error) {
      console.error(`[ERROR] ChannelCreate event hatası:`, error);
    }
  });

  // Kanal silindiğinde
  client.on(Events.ChannelDelete, async (channel) => {
    try {
      if ('guild' in channel && channel.guild && customBotManager.isGuildHandledByCustomBot(channel.guild.id)) return;
      console.log(`[DEBUG] ChannelDelete event tetiklendi - Channel: ${channel.id}, Type: ${channel.type}`);
      if ('guild' in channel && channel.guild) {
        console.log(`[DEBUG] ChannelDelete: Guild kanalı - Guild: ${channel.guild.id}`);
        
        // Log için - sadece guild kanalları (önce kontrol et, sonra istatistik güncelle)
        const isTextChannel = channel.type === ChannelType.GuildText;
        const isVoiceChannel = channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
        const isCategoryChannel = channel.type === ChannelType.GuildCategory;
        
        console.log(`[DEBUG] ChannelDelete: Kanal tipi kontrolü - Type: ${channel.type}, GuildText: ${ChannelType.GuildText}, GuildVoice: ${ChannelType.GuildVoice}, GuildCategory: ${ChannelType.GuildCategory}`);
        console.log(`[DEBUG] ChannelDelete: Kontroller - isTextChannel: ${isTextChannel}, isVoiceChannel: ${isVoiceChannel}, isCategoryChannel: ${isCategoryChannel}`);
        
        if (isTextChannel || isVoiceChannel || isCategoryChannel) {
          await invalidateDiscordCacheForGuild(channel.guild.id);
          console.log(`[DEBUG] ChannelDelete: Log handler çağrılıyor - Type: ${channel.type}`);
          const { handleChannelDelete } = await import('./events/logHandler');
          await handleChannelDelete(channel);
        } else {
          console.log(`[DEBUG] ChannelDelete: Log handler çağrılmayacak - Type: ${channel.type} (sadece Text/Voice/Category loglanır)`);
        }
        
        // İstatistik güncellemeleri (log'dan sonra)
        try {
          const { updateStatisticsChannelByType } = await import('./utils/statisticsChannel');
          await updateStatisticsChannelByType(channel.guild.id, 'Toplam Kanal Sayısı');
          if (channel.type === ChannelType.GuildText) {
            await updateStatisticsChannelByType(channel.guild.id, 'Metin Kanalları');
          } else if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
            await updateStatisticsChannelByType(channel.guild.id, 'Ses Kanalları');
          }
        } catch (statError) {
          console.error(`[ERROR] ChannelDelete: İstatistik güncelleme hatası:`, statError);
        }
      } else {
        console.log(`[DEBUG] ChannelDelete: DM kanalı veya guild yok - Loglanmayacak`);
      }
    } catch (error) {
      console.error(`[ERROR] ChannelDelete event hatası:`, error);
    }
  });

  // Kanal güncellendiğinde (log için)
  client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    try {
      if ('guild' in newChannel && newChannel.guild && customBotManager.isGuildHandledByCustomBot(newChannel.guild.id)) return;
      console.log(`[DEBUG] ChannelUpdate event tetiklendi - Channel: ${newChannel.id}, Type: ${newChannel.type}`);
      if ('guild' in newChannel && newChannel.guild) {
        console.log(`[DEBUG] ChannelUpdate: Guild kanalı - Guild: ${newChannel.guild.id}`);
        
        // Log için - sadece guild kanalları
        const isTextChannel = newChannel.type === ChannelType.GuildText;
        const isVoiceChannel = newChannel.type === ChannelType.GuildVoice || newChannel.type === ChannelType.GuildStageVoice;
        const isCategoryChannel = newChannel.type === ChannelType.GuildCategory;
        
        console.log(`[DEBUG] ChannelUpdate: Kanal tipi kontrolü - Type: ${newChannel.type}, GuildText: ${ChannelType.GuildText}, GuildVoice: ${ChannelType.GuildVoice}, GuildCategory: ${ChannelType.GuildCategory}`);
        console.log(`[DEBUG] ChannelUpdate: Kontroller - isTextChannel: ${isTextChannel}, isVoiceChannel: ${isVoiceChannel}, isCategoryChannel: ${isCategoryChannel}`);
        
        if (isTextChannel || isVoiceChannel || isCategoryChannel) {
          await invalidateDiscordCacheForGuild(newChannel.guild.id);
          console.log(`[DEBUG] ChannelUpdate: Log handler çağrılıyor - Type: ${newChannel.type}`);
          const { handleChannelUpdate } = await import('./events/logHandler');
          await handleChannelUpdate(oldChannel, newChannel);
        } else {
          console.log(`[DEBUG] ChannelUpdate: Log handler çağrılmayacak - Type: ${newChannel.type} (sadece Text/Voice/Category loglanır)`);
        }
      } else {
        console.log(`[DEBUG] ChannelUpdate: DM kanalı veya guild yok - Loglanmayacak`);
      }
    } catch (error) {
      console.error(`[ERROR] ChannelUpdate event hatası:`, error);
    }
  });

  // Rol oluşturulduğunda
  client.on(Events.GuildRoleCreate, async (role) => {
    if (customBotManager.isGuildHandledByCustomBot(role.guild.id)) return;
    try {
      console.log(`[DEBUG] GuildRoleCreate event tetiklendi - Role: ${role.id}, Guild: ${role.guild.id}`);
      console.log(`[DEBUG] GuildRoleCreate: Rol bilgileri - Name: ${role.name}`);
      
      // Log için (önce log, sonra istatistik)
      await invalidateDiscordCacheForGuild(role.guild.id);
      const { handleRoleCreate } = await import('./events/logHandler');
      await handleRoleCreate(role);
      
      // İstatistik güncellemesi (log'dan sonra)
      try {
        const { updateStatisticsChannelByType } = await import('./utils/statisticsChannel');
        await updateStatisticsChannelByType(role.guild.id, 'Toplam Rol Sayısı');
      } catch (statError) {
        console.error(`[ERROR] GuildRoleCreate: İstatistik güncelleme hatası:`, statError);
      }
    } catch (error) {
      console.error(`[ERROR] GuildRoleCreate event hatası:`, error);
    }
  });

  // Rol silindiğinde
  client.on(Events.GuildRoleDelete, async (role) => {
    if (customBotManager.isGuildHandledByCustomBot(role.guild.id)) return;
    try {
      console.log(`[DEBUG] GuildRoleDelete event tetiklendi - Role: ${role.id}, Guild: ${role.guild.id}`);
      console.log(`[DEBUG] GuildRoleDelete: Rol bilgileri - Name: ${role.name}`);
      
      // Log için (önce log, sonra istatistik)
      await invalidateDiscordCacheForGuild(role.guild.id);
      const { handleRoleDelete } = await import('./events/logHandler');
      await handleRoleDelete(role);
      
      // İstatistik güncellemesi (log'dan sonra)
      try {
        const { updateStatisticsChannelByType } = await import('./utils/statisticsChannel');
        await updateStatisticsChannelByType(role.guild.id, 'Toplam Rol Sayısı');
      } catch (statError) {
        console.error(`[ERROR] GuildRoleDelete: İstatistik güncelleme hatası:`, statError);
      }
    } catch (error) {
      console.error(`[ERROR] GuildRoleDelete event hatası:`, error);
    }
  });

  // Rol güncellendiğinde (log için)
  client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    if (customBotManager.isGuildHandledByCustomBot(newRole.guild.id)) return;
    try {
      console.log(`[DEBUG] GuildRoleUpdate event tetiklendi - Role: ${newRole.id}, Guild: ${newRole.guild.id}`);
      console.log(`[DEBUG] GuildRoleUpdate: Rol bilgileri - OldName: ${oldRole.name}, NewName: ${newRole.name}`);
      await invalidateDiscordCacheForGuild(newRole.guild.id);
      const { handleRoleUpdate } = await import('./events/logHandler');
      await handleRoleUpdate(oldRole, newRole);
    } catch (error) {
      console.error(`[ERROR] GuildRoleUpdate event hatası:`, error);
    }
  });

  // Sunucu güncellendiğinde (log için)
  client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
    if (customBotManager.isGuildHandledByCustomBot(newGuild.id)) return;
    try {
      console.log(`[DEBUG] GuildUpdate event tetiklendi - Guild: ${newGuild.id}`);
      console.log(`[DEBUG] GuildUpdate: Sunucu bilgileri - OldName: ${oldGuild.name}, NewName: ${newGuild.name}`);
      const { handleGuildUpdate } = await import('./events/logHandler');
      await handleGuildUpdate(oldGuild, newGuild);
    } catch (error) {
      console.error(`[ERROR] GuildUpdate event hatası:`, error);
    }
  });

  // Üye durumu değiştiğinde (çevrimiçi/çevrimdışı)
  client.on(Events.PresenceUpdate, async (_oldPresence, newPresence) => {
    if (newPresence.guild && customBotManager.isGuildHandledByCustomBot(newPresence.guild.id)) return;
    if (newPresence.guild) {
      const { scheduleOnlineMemberStatRefresh } = await import('./utils/presenceStatsDebounce');
      scheduleOnlineMemberStatRefresh(newPresence.guild.id);
    }
  });

  // Hata yakalama
  client.on(Events.Error, (error) => {
    console.error('[ERROR] Discord client hatası:', error);
  });

  // Graceful shutdown — HTTP + custom botlar + müzik (Lavalink) + Discord client + Redis kapatılır.
  // Discord client ve Lavalink düğümlerini kapatmazsak redeploy'da zombi ses bağlantısı kalabilir.
  const gracefulShutdown = async (signal: string) => {
    console.log(`[INFO] Bot kapatılıyor... (${signal})`);
    stopHttpServer();
    await customBotManager.shutdown().catch((error) => {
      console.error('[ERROR] Custom bot shutdown hatası:', error);
    });
    await musicManager.shutdown().catch((error) => {
      console.error('[ERROR] Müzik shutdown hatası:', error);
    });
    try {
      await client.destroy();
    } catch (error) {
      console.error('[ERROR] Discord client kapatma hatası:', error);
    }
    await closeDatabase();
    process.exit(0);
  };

  if (!processHandlersBound) {
    processHandlersBound = true;

    process.on('unhandledRejection', (error) => {
      const code = discordApiErrorCode(error);
      if (code != null && TRANSIENT_DISCORD_API_CODES.has(code)) {
        console.warn(`[WARN] Unhandled Discord API rejection (code ${code}):`, error);
        return;
      }
      console.error('[ERROR] Unhandled promise rejection:', error);
    });

    process.on('uncaughtException', async (error) => {
      console.error('[ERROR] Uncaught exception:', error);
      await closeDatabase();
      process.exit(1);
    });

    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  }

  // Bot'u başlat
  client.login(botConfig.token).catch((error) => {
    console.error('[ERROR] Bot giriş yapamadı:', error);
    process.exit(1);
  });
}

