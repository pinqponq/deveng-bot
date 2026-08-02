import {
    Client,
    GatewayIntentBits,
    Events,
    type MessageReaction,
    type PartialMessageReaction,
    type User,
    type PartialUser,
    type GuildMember,
    type PartialGuildMember,
} from 'discord.js';
import { DEFAULT_BOT_INVITE_PERMISSIONS } from '../constants/botInvitePermissions';
import { setBotClientId, getBotApiHeaders } from './apiClient';
import { setCustomBotToken, deleteCustomBotToken } from './customBotTokenStore';
import { musicManager } from '../music/musicManager';
import { logError } from './logger';
import { JOB_INTERVALS } from './jobIntervals';

// discord.js event imzaları handler Map'te heterojen; cleanup için gevşek tutulur.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BotEventHandler = (...args: any[]) => unknown;

export interface CustomBotInstance {
    id: number;
    clientId: string;
    ownerId: string;
    botName?: string;
    client: Client;
    status: 'Active' | 'Inactive' | 'Error';
    errorMessage?: string;
    intervals: NodeJS.Timeout[]; // Interval'ları saklamak için
    eventHandlers: Map<string, BotEventHandler>; // Event handler'ları saklamak için
}

/** Partial reaction/user/message resolve; Discord API hatasında false. */
async function resolvePartialReaction(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    context: string,
): Promise<{ reaction: MessageReaction; user: User } | null> {
    try {
        const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
        if (fullReaction.message.partial) {
            await fullReaction.message.fetch();
        }
        const fullUser = user.partial ? await user.fetch() : user;
        return { reaction: fullReaction, user: fullUser };
    } catch (error) {
        logError(context, error, 'debug');
        return null;
    }
}

async function resolvePartialMember(
    member: GuildMember | PartialGuildMember,
    context: string,
): Promise<GuildMember | null> {
    try {
        if (member.partial) {
            return await member.fetch();
        }
        return member;
    } catch (error) {
        logError(context, error, 'debug');
        return null;
    }
}

class CustomBotManager {
    private bots: Map<number, CustomBotInstance> = new Map();
    private apiBaseUrl: string = '';
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY_MS = 1000;

    public initialize(apiBaseUrl: string): void {
        this.apiBaseUrl = apiBaseUrl;
    }

    public async loadBots(): Promise<void> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout
            
            const response = await fetch(`${this.apiBaseUrl}/api/CustomBot/internal/active`, {
                headers: getBotApiHeaders(),
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error(`[ERROR] Aktif custom botlar yüklenemedi: HTTP ${response.status}`);
                return;
            }

            const bots = await response.json() as Array<{
                id: number;
                botToken: string;
                clientId: string;
                ownerId: string;
                botName?: string;
            }>;

            // Botları sırayla başlat (paralel başlatma rate limit'e takılabilir)
            let successCount = 0;
            let failCount = 0;
            
            for (const botData of bots) {
                try {
                    const success = await this.startBot(
                        botData.id,
                        botData.botToken,
                        botData.clientId,
                        botData.ownerId,
                        botData.botName
                    );
                    if (success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                    // Rate limiting için kısa bekleme
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`[ERROR] Bot başlatılamadı (ID: ${botData.id}):`, error);
                    failCount++;
                }
            }

            console.log(`[INFO] ${successCount}/${bots.length} aktif custom bot başarıyla yüklendi.${failCount > 0 ? ` ${failCount} bot başlatılamadı.` : ''}`);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error('[ERROR] Custom botlar yüklenirken timeout oluştu');
            } else {
                console.error('[ERROR] Custom botlar yüklenirken hata:', error);
            }
        }
    }

    public async startBot(
        id: number,
        token: string,
        clientId: string,
        ownerId: string,
        botName?: string
    ): Promise<boolean> {
        try {
            // Eğer bot zaten çalışıyorsa, durdur
            if (this.bots.has(id)) {
                await this.stopBot(id);
            }

            // GuildPresences yalnızca operatör env ile açıksa eklenir.
            const customIntents = [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
            ];
            if (process.env.ENABLE_PRESENCE_INTENT === 'true') {
                customIntents.push(GatewayIntentBits.GuildPresences);
            }
            const client = new Client({ intents: customIntents });

            // Bot hazır olduğunda
            const clientReadyHandler = async (readyClient: any) => {
                console.log(`[INFO] Custom bot hazır! ${readyClient.user.tag} (ID: ${id})`);
                
                // Bot'un sunucuda olup olmadığını kontrol et
                const guildCount = readyClient.guilds.cache.size;
                console.log(`[INFO] Custom bot ${guildCount} sunucuda aktif (ID: ${id})`);
                musicManager.registerClient(readyClient, clientId);
                
                if (guildCount === 0) {
                    // Bot hiçbir sunucuda yok - davet linki oluştur
                    const inviteUrl = this.generateInviteUrl(clientId);
                    const errorMsg = `Bot hiçbir sunucuda bulunmuyor. Lütfen botu bir sunucuya davet edin: ${inviteUrl}`;
                    
                    console.warn(`[WARN] Custom bot sunucuda yok (ID: ${id}): ${errorMsg}`);
                    await this.updateBotStatus(id, 'Error', errorMsg);
                    
                    const instance = this.bots.get(id);
                    if (instance) {
                        instance.status = 'Error';
                        instance.errorMessage = errorMsg;
                    }
                    return;
                }
                
                // Custom bot için komutları kaydet
                try {
                    const { registerAllGuildCommands } = await import('./registerCommands');
                    await registerAllGuildCommands(readyClient);
                    console.log(`[INFO] Custom bot komutları kaydedildi (ID: ${id})`);
                } catch (error) {
                    console.error(`[ERROR] Custom bot komut kayıt hatası (ID: ${id}):`, error);
                }

                try {
                    setBotClientId(clientId);
                    const { syncAllInviteSnapshots } = await import('./inviteLeaderboard');
                    await syncAllInviteSnapshots(Array.from(readyClient.guilds.cache.values()));
                } catch (error) {
                    console.error(`[ERROR] Custom bot davet snapshot senkronu hatası (ID: ${id}):`, error);
                }

                try {
                    const { applyPersonalization, fetchPersonalizationFromApi } = await import('./customBotPersonalization');
                    const config = await fetchPersonalizationFromApi(this.apiBaseUrl, id, getBotApiHeaders());
                    if (config?.personalizationEnabled) {
                        const result = await applyPersonalization(readyClient, config);
                        if (result.warnings.length > 0) {
                            console.warn(`[WARN] Custom bot kişiselleştirme uyarıları (ID: ${id}):`, result.warnings);
                        }
                        if (!result.success && result.error) {
                            console.error(`[ERROR] Custom bot kişiselleştirme hatası (ID: ${id}):`, result.error);
                        }
                    }
                } catch (error) {
                    console.error(`[ERROR] Custom bot kişiselleştirme uygulanamadı (ID: ${id}):`, error);
                }
                
                // Status'u güncelle
                await this.updateBotStatus(id, 'Active', null);
                
                // Bot instance'ı güncelle
                const instance = this.bots.get(id);
                if (instance) {
                    instance.status = 'Active';
                    instance.errorMessage = undefined;
                }
            };
            client.once(Events.ClientReady, clientReadyHandler);

            // Hata yakalama
            const errorHandler = async (error: Error) => {
                console.error(`[ERROR] Custom bot hatası (ID: ${id}):`, error);
                await this.updateBotStatus(id, 'Error', error.message);
                
                const instance = this.bots.get(id);
                if (instance) {
                    instance.status = 'Error';
                    instance.errorMessage = error.message;
                }
            };
            client.on(Events.Error, errorHandler);

            // Bot instance'ı kaydet; API auth için custom bot token'ını store'a yaz
            const instance: CustomBotInstance = {
                id,
                clientId,
                ownerId,
                botName,
                client,
                status: 'Inactive',
                intervals: [],
                eventHandlers: new Map(),
            };
            this.bots.set(id, instance);
            await setCustomBotToken(clientId, token);
            
            // Event handler'ları instance'a kaydet (cleanup için)
            instance.eventHandlers.set(Events.ClientReady, clientReadyHandler);
            instance.eventHandlers.set(Events.Error, errorHandler);

            // Bot'u başlat
            await client.login(token);
            
            // Event handler'ları ekle (ana bot ile aynı özellikler)
            this.setupBotEventHandlers(client, id, clientId);

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ERROR] Custom bot başlatılamadı (ID: ${id}):`, errorMessage);
            // Login/setup fail sonrası yarım instance sızıntısı + zombi websocket önleme
            const orphan = this.bots.get(id);
            if (orphan) {
                for (const interval of orphan.intervals) clearInterval(interval);
                orphan.intervals = [];
                for (const [eventName, handler] of orphan.eventHandlers.entries()) {
                    orphan.client.off(eventName, handler);
                }
                orphan.eventHandlers.clear();
                await orphan.client.destroy().catch((e) => logError(`customBotManager:startFailDestroy:${id}`, e, 'warn'));
                await deleteCustomBotToken(orphan.clientId).catch((e) => logError(`customBotManager:startFailToken:${id}`, e, 'debug'));
                musicManager.unregisterClient(orphan.clientId);
                this.bots.delete(id);
            }
            await this.updateBotStatus(id, 'Error', errorMessage);
            return false;
        }
    }

    public async stopBot(id: number): Promise<boolean> {
        try {
            const instance = this.bots.get(id);
            if (!instance) {
                return false;
            }

            this.bots.delete(id);

            // Tüm interval'ları temizle (memory leak önleme)
            for (const interval of instance.intervals) {
                clearInterval(interval);
            }
            instance.intervals = [];

            // Tüm event listener'ları temizle (memory leak önleme)
            for (const [eventName, handler] of instance.eventHandlers.entries()) {
                try {
                    instance.client.off(eventName, handler);
                } catch (error) {
                    logError(`customBotManager:off:${id}:${eventName}`, error, 'debug');
                }
            }
            instance.eventHandlers.clear();

            await instance.client.destroy().catch((error) => {
                logError(`customBotManager:destroy:${id}`, error, 'warn');
            });

            // API auth store'dan token'ı kaldır
            await deleteCustomBotToken(instance.clientId);
            musicManager.unregisterClient(instance.clientId);
            
            // Status'u güncelle (best effort, hata olsa bile devam et)
            try {
                await Promise.race([
                    this.updateBotStatus(id, 'Inactive', null),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
            } catch (error) {
                console.warn(`[WARN] Bot durumu güncellenemedi (Bot ID: ${id}), devam ediliyor:`, error);
            }
            
            console.log(`[INFO] Custom bot durduruldu (ID: ${id})`);
            return true;
        } catch (error) {
            console.error(`[ERROR] Custom bot durdurulamadı (ID: ${id}):`, error);
            // Hata olsa bile Map'ten kaldırmayı dene
            try {
                this.bots.delete(id);
            } catch (error) {
                // Ignore
                logError('customBotManager:deleteBotFromMap', error, 'warn');
            }
            return false;
        }
    }

    public getBot(id: number): CustomBotInstance | undefined {
        return this.bots.get(id);
    }

    public getBotByClientId(clientId: string): CustomBotInstance | undefined {
        for (const instance of this.bots.values()) {
            if (instance.clientId === clientId) {
                return instance;
            }
        }
        return undefined;
    }

    /**
     * Bu sunucuda (guild) aktif bir custom bot var mı?
     * Varsa ana bot bu sunucuda hiçbir işlem yapmamalı – her şey custom bot'ta çalışır.
     */
    public isGuildHandledByCustomBot(guildId: string): boolean {
        for (const instance of this.bots.values()) {
            if (instance.status === 'Active' && instance.client.isReady() && instance.client.guilds.cache.has(guildId)) {
                return true;
            }
        }
        return false;
    }

    public getAllBots(): CustomBotInstance[] {
        return Array.from(this.bots.values());
    }

    public getBotsByOwner(ownerId: string): CustomBotInstance[] {
        return Array.from(this.bots.values()).filter(bot => bot.ownerId === ownerId);
    }

    public async applyProfile(id: number): Promise<{ success: boolean; warnings: string[]; error?: string }> {
        const instance = this.bots.get(id);
        if (!instance || !instance.client.isReady()) {
            return { success: false, warnings: [], error: 'Bot çalışmıyor veya hazır değil' };
        }

        const { applyPersonalization, fetchPersonalizationFromApi } = await import('./customBotPersonalization');
        const config = await fetchPersonalizationFromApi(this.apiBaseUrl, id, getBotApiHeaders());
        if (!config) {
            return { success: false, warnings: [], error: 'Kişiselleştirme ayarları alınamadı' };
        }

        return applyPersonalization(instance.client, config);
    }

    private async updateBotStatus(
        id: number,
        status: 'Active' | 'Inactive' | 'Error',
        errorMessage: string | null
    ): Promise<void> {
        let lastError: Error | null = null;
        
        // Retry logic ile API çağrısı
        for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
                
                const response = await fetch(`${this.apiBaseUrl}/api/CustomBot/internal/${id}/status`, {
                    method: 'PUT',
                    headers: getBotApiHeaders(),
                    body: JSON.stringify({
                        status,
                        errorMessage,
                        lastSeen: status === 'Active' ? new Date().toISOString() : null,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                return; // Başarılı
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    const delay = this.RETRY_DELAY_MS * attempt;
                    console.warn(`[WARN] Bot durumu güncelleme denemesi başarısız (ID: ${id}, Deneme: ${attempt}/${this.MAX_RETRY_ATTEMPTS}), ${delay}ms sonra tekrar deneniyor...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // Tüm denemeler başarısız
        console.error(`[ERROR] Bot durumu güncellenemedi (ID: ${id}) - Tüm denemeler başarısız:`, lastError);
    }

    private setupBotEventHandlers(client: Client, botId: number, clientId: string): void {
        const instance = this.bots.get(botId);
        if (!instance) {
            console.error(`[ERROR] Bot instance bulunamadı (ID: ${botId})`);
            return;
        }

        // Ana bot ile aynı event handler'ları ekle
        // Bu kısım ana bot kodundan import edilebilir veya buraya kopyalanabilir
        
        // Yeni sunucuya katıldığında
        const guildCreateHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                const guild = args[0] as { id: string };
                setBotClientId(clientId);
                const { syncGuild } = await import('./guildSync');
                await syncGuild(args[0] as Parameters<typeof syncGuild>[0]);
                const { registerGuildCommands } = await import('./registerCommands');
                await registerGuildCommands(client, guild.id);
            } catch (error) {
                console.error(`[ERROR] Custom bot guild create sync hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.GuildCreate, guildCreateHandler);
        instance.eventHandlers.set(Events.GuildCreate, guildCreateHandler);

        // Sunucudan ayrıldığında
        const guildDeleteHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                const guild = args[0] as { id: string };
                setBotClientId(clientId);
                const { unsyncGuild } = await import('./guildSync');
                await unsyncGuild(guild.id);
            } catch (error) {
                console.error(`[ERROR] Custom bot guild delete sync hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.GuildDelete, guildDeleteHandler);
        instance.eventHandlers.set(Events.GuildDelete, guildDeleteHandler);

        // Yeni üye katıldığında
        const guildMemberAddHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                const member = args[0] as GuildMember | PartialGuildMember;
                const full = await resolvePartialMember(member, `customBotManager:memberAddPartial:${botId}`);
                if (!full) return;
                setBotClientId(clientId);
                const { handleGuildMemberAdd } = await import('../events/guildMemberAdd');
                await handleGuildMemberAdd(full);
            } catch (error) {
                console.error(`[ERROR] Custom bot guild member add hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.GuildMemberAdd, guildMemberAddHandler);
        instance.eventHandlers.set(Events.GuildMemberAdd, guildMemberAddHandler);

        // Üye ayrıldığında
        const guildMemberRemoveHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                const member = args[0] as GuildMember | PartialGuildMember;
                const full = await resolvePartialMember(member, `customBotManager:memberRemovePartial:${botId}`);
                if (!full) return;
                setBotClientId(clientId);
                const { handleGuildMemberRemove } = await import('../events/guildMemberRemove');
                await handleGuildMemberRemove(full);
            } catch (error) {
                console.error(`[ERROR] Custom bot guild member remove hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.GuildMemberRemove, guildMemberRemoveHandler);
        instance.eventHandlers.set(Events.GuildMemberRemove, guildMemberRemoveHandler);

        // Mesaj oluşturulduğunda
        const messageCreateHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                setBotClientId(clientId);
                const { handleMessageCreate } = await import('../events/messageCreate');
                await handleMessageCreate(args[0] as Parameters<typeof handleMessageCreate>[0]);
            } catch (error) {
                console.error(`[ERROR] Custom bot message create hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.MessageCreate, messageCreateHandler);
        instance.eventHandlers.set(Events.MessageCreate, messageCreateHandler);

        // Interaction oluşturulduğunda
        const interactionCreateHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                setBotClientId(clientId);
                const { handleInteractionCreate } = await import('../events/interactionCreate');
                await handleInteractionCreate(args[0] as Parameters<typeof handleInteractionCreate>[0]);
            } catch (error) {
                console.error(`[ERROR] Custom bot interaction create hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.InteractionCreate, interactionCreateHandler);
        instance.eventHandlers.set(Events.InteractionCreate, interactionCreateHandler);

        // Mesaj tepkisi eklendiğinde
        const messageReactionAddHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            const resolved = await resolvePartialReaction(
                args[0] as MessageReaction | PartialMessageReaction,
                args[1] as User | PartialUser,
                `customBotManager:reactionAddPartial:${botId}`,
            );
            if (!resolved) return;
            try {
                setBotClientId(clientId);
                const { handleMessageReactionAdd } = await import('../events/messageReactionAdd');
                await handleMessageReactionAdd(resolved.reaction, resolved.user);
            } catch (error) {
                console.error(`[ERROR] Custom bot message reaction add hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.MessageReactionAdd, messageReactionAddHandler);
        instance.eventHandlers.set(Events.MessageReactionAdd, messageReactionAddHandler);

        // Mesaj tepkisi kaldırıldığında
        const messageReactionRemoveHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            const resolved = await resolvePartialReaction(
                args[0] as MessageReaction | PartialMessageReaction,
                args[1] as User | PartialUser,
                `customBotManager:reactionRemovePartial:${botId}`,
            );
            if (!resolved) return;
            try {
                setBotClientId(clientId);
                const { handleMessageReactionRemove } = await import('../events/messageReactionRemove');
                await handleMessageReactionRemove(resolved.reaction, resolved.user);
            } catch (error) {
                console.error(`[ERROR] Custom bot message reaction remove hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.MessageReactionRemove, messageReactionRemoveHandler);
        instance.eventHandlers.set(Events.MessageReactionRemove, messageReactionRemoveHandler);

        // Ses kanalı durumu değiştiğinde
        const voiceStateUpdateHandler = async (...args: unknown[]) => {
            if (!this.bots.has(botId)) return;
            try {
                setBotClientId(clientId);
                const { handleVoiceStateUpdate } = await import('../events/voiceStateUpdate');
                await handleVoiceStateUpdate(
                    args[0] as Parameters<typeof handleVoiceStateUpdate>[0],
                    args[1] as Parameters<typeof handleVoiceStateUpdate>[1],
                );
            } catch (error) {
                console.error(`[ERROR] Custom bot voice state update hatası (Bot ID: ${botId}):`, error);
            }
        };
        client.on(Events.VoiceStateUpdate, voiceStateUpdateHandler);
        instance.eventHandlers.set(Events.VoiceStateUpdate, voiceStateUpdateHandler);

        // Periyodik görevler - Interval'ları sakla ve temizlenebilir yap
        const statisticsInterval = setInterval(async () => {
            try {
                // Bot clientId'sini context'e ekle
                setBotClientId(clientId);
                const { updateAllStatisticsChannels } = await import('./statisticsChannel');
                const guilds = Array.from(client.guilds.cache.values());
                for (const guild of guilds) {
                    await updateAllStatisticsChannels(guild.id);
                }
            } catch (error) {
                console.error(`[ERROR] Custom bot istatistik güncelleme hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.statistics);
        instance.intervals.push(statisticsInterval);

        const giveawayInterval = setInterval(async () => {
            try {
                // Bot clientId'sini context'e ekle
                setBotClientId(clientId);
                const { checkAndEndExpiredGiveaways } = await import('./giveawaySender');
                await checkAndEndExpiredGiveaways((guildId) => !client.guilds.cache.has(guildId));
            } catch (error) {
                console.error(`[ERROR] Custom bot çekiliş kontrolü hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.giveaways);
        instance.intervals.push(giveawayInterval);

        const pollInterval = setInterval(async () => {
            try {
                setBotClientId(clientId);
                const { checkAndEndExpiredPolls } = await import('./pollSender');
                await checkAndEndExpiredPolls(client, (guildId) => !client.guilds.cache.has(guildId));
            } catch (error) {
                console.error(`[ERROR] Custom bot anket kontrolü hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.polls);
        instance.intervals.push(pollInterval);

        const birthdayInterval = setInterval(async () => {
            try {
                // Bot clientId'sini context'e ekle
                setBotClientId(clientId);
                const { checkAndSendBirthdayMessages } = await import('../events/birthdayHandler');
                await checkAndSendBirthdayMessages(client);
            } catch (error) {
                console.error(`[ERROR] Custom bot doğum günü kontrolü hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.birthdays);
        instance.intervals.push(birthdayInterval);

        const reminderInterval = setInterval(async () => {
            try {
                // Bot clientId'sini context'e ekle
                setBotClientId(clientId);
                const { checkAndSendReminders } = await import('../events/reminderHandler');
                await checkAndSendReminders(client);
            } catch (error) {
                console.error(`[ERROR] Custom bot hatırlatıcı kontrolü hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.reminders);
        instance.intervals.push(reminderInterval);

        const feedAnnouncementInterval = setInterval(async () => {
            try {
                setBotClientId(clientId);
                const { checkAndSendFeedAnnouncements } = await import('./feedAnnouncementWorker');
                await checkAndSendFeedAnnouncements(client, (guildId) => !client.guilds.cache.has(guildId));
            } catch (error) {
                console.error(`[ERROR] Custom bot feed duyuru kontrolü hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.feedAnnouncements);
        instance.intervals.push(feedAnnouncementInterval);

        const scheduledAnnouncementInterval = setInterval(async () => {
            try {
                setBotClientId(clientId);
                const { checkAndSendScheduledAnnouncements } = await import('./scheduledAnnouncementWorker');
                await checkAndSendScheduledAnnouncements(client, (guildId) => !client.guilds.cache.has(guildId));
            } catch (error) {
                console.error(`[ERROR] Custom bot zamanlanmış duyuru kontrolü hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.scheduledAnnouncements);
        instance.intervals.push(scheduledAnnouncementInterval);

        const guildReportInterval = setInterval(async () => {
            try {
                setBotClientId(clientId);
                const { processGuildReportJobs } = await import('./guildReportWorker');
                await processGuildReportJobs(client);
            } catch (error) {
                console.error(`[ERROR] Custom bot guild report job hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.guildReports);
        instance.intervals.push(guildReportInterval);

        const aiModerationInterval = setInterval(async () => {
            try {
                setBotClientId(clientId);
                const { tryBecomeLeader } = await import('./redisCache');
                const lockKey = `bot:leader:ai-moderation:custom:${clientId}`;
                if (!(await tryBecomeLeader(lockKey, 90))) return;
                const { processAIModerationJobs } = await import('./aiModerationWorker');
                await processAIModerationJobs(client, 'custom');
            } catch (error) {
                console.error(`[ERROR] Custom bot AI moderasyon kuyruk hatası (Bot ID: ${botId}):`, error);
            }
        }, JOB_INTERVALS.aiModeration);
        instance.intervals.push(aiModerationInterval);
    }

    public async shutdown(): Promise<void> {
        const botIds = Array.from(this.bots.keys());
        console.log(`[INFO] ${botIds.length} custom bot durduruluyor...`);
        
        // Tüm botları paralel olarak durdur, ancak hata olsa bile devam et
        const stopPromises = botIds.map(async (id) => {
            try {
                await this.stopBot(id);
            } catch (error) {
                console.error(`[ERROR] Bot durdurulurken hata (ID: ${id}):`, error);
            }
        });
        
        // Tüm botların durdurulmasını bekle (timeout ile)
        await Promise.race([
            Promise.all(stopPromises),
            new Promise((resolve) => setTimeout(resolve, 30000)) // 30 saniye timeout
        ]);
        
        console.log('[INFO] Tüm custom botlar durduruldu.');
    }

    private generateInviteUrl(clientId: string): string {
        return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${DEFAULT_BOT_INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
    }
}

export const customBotManager = new CustomBotManager();
