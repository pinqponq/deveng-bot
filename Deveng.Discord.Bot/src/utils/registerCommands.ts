import { REST, Routes, Client } from 'discord.js';
import { loadConfig } from './config';
import { getEnabledFeaturesForGuild, getCustomCommands, runWithBotClientId } from './apiClient';
import tepkiRol from '../commands/tepkiRol';
import tepkiSistemGonder from '../commands/tepkiSistemGonder';
import gomuluMesaj from '../commands/gomuluMesaj';
import voiceRename from '../commands/voiceRename';
import voiceLimit from '../commands/voiceLimit';
import voiceLock from '../commands/voiceLock';
import voiceUnlock from '../commands/voiceUnlock';
import voiceHide from '../commands/voiceHide';
import voiceReveal from '../commands/voiceReveal';
import voiceOwner from '../commands/voiceOwner';
import voiceTransfer from '../commands/voiceTransfer';
import voiceClaim from '../commands/voiceClaim';
import voiceKick from '../commands/voiceKick';
import voiceBan from '../commands/voiceBan';
import voiceUnban from '../commands/voiceUnban';
import voiceClean from '../commands/voiceClean';
import help from '../commands/help';
import hatirlatici from '../commands/hatirlatici';
import dogumgunu from '../commands/dogumgunu';
import play from '../commands/play';
import queue from '../commands/queue';
import pause from '../commands/pause';
import resume from '../commands/resume';
import skip from '../commands/skip';
import stop from '../commands/stop';
import nowplaying from '../commands/nowplaying';
import poll from '../commands/poll';
import pollEnd from '../commands/pollEnd';
import talepPanelGonder from '../commands/talepPanelGonder';
import { advancedMusicCommands } from '../commands/advancedMusicCommands';

// Komut-özellik eşleştirmesi (anahtarlar SlashCommandBuilder.setName ile birebir)
const commandFeatureMap: Record<string, string> = {
  'tepki-rol-ayarla': 'reaction-role',
  'tepki-sistem-gönder': 'reaction-role',
  'gömülü-mesaj': 'embed-message',
  'voice-rename': 'voice',
  'voice-limit': 'voice',
  'voice-lock': 'voice',
  'voice-unlock': 'voice',
  'voice-hide': 'voice',
  'voice-reveal': 'voice',
  'voice-owner': 'voice',
  'voice-transfer': 'voice',
  'voice-claim': 'voice',
  'voice-kick': 'voice',
  'voice-ban': 'voice',
  'voice-unban': 'voice',
  'voice-clean': 'voice',
  'help': 'help',
  'hatirlatici': 'reminder',
  'doğum-günü': 'birthday',
  'poll': 'poll',
  'poll-end': 'poll',
  'talep-panel-gönder': 'ticket',
  'music-play': 'music',
  'music-queue': 'music',
  'music-pause': 'music',
  'music-resume': 'music',
  'music-skip': 'music',
  'music-stop': 'music',
  'music-nowplaying': 'music',
  ...Object.fromEntries(Object.keys(advancedMusicCommands).map((name) => [name, 'music'])),
};

/** GuildFeatures.FeatureName (API) -> commandFeatureMap'teki değer (örn. HelpCommand -> help) */
const API_FEATURE_NAME_TO_MAP_KEY: Record<string, string> = {
  ReactionRole: 'reaction-role',
  EmbedMessage: 'embed-message',
  TemporaryVoiceChannel: 'voice',
  HelpCommand: 'help',
  Reminder: 'reminder',
  Birthday: 'birthday',
  Poll: 'poll',
  Music: 'music',
  TicketPanel: 'ticket',
};

type RegisteredCommand = { data: { name: string; toJSON(): unknown } };

function commandEntry(command: RegisteredCommand) {
  return { name: command.data.name, command };
}

// Tüm komutlar — Discord adı command.data.name ile senkron
const allCommands = [
  commandEntry(tepkiRol),
  commandEntry(tepkiSistemGonder),
  commandEntry(gomuluMesaj),
  commandEntry(voiceRename),
  commandEntry(voiceLimit),
  commandEntry(voiceLock),
  commandEntry(voiceUnlock),
  commandEntry(voiceHide),
  commandEntry(voiceReveal),
  commandEntry(voiceOwner),
  commandEntry(voiceTransfer),
  commandEntry(voiceClaim),
  commandEntry(voiceKick),
  commandEntry(voiceBan),
  commandEntry(voiceUnban),
  commandEntry(voiceClean),
  commandEntry(help),
  commandEntry(hatirlatici),
  commandEntry(dogumgunu),
  commandEntry(poll),
  commandEntry(pollEnd),
  commandEntry(talepPanelGonder),
  commandEntry(play),
  commandEntry(queue),
  commandEntry(pause),
  commandEntry(resume),
  commandEntry(skip),
  commandEntry(stop),
  commandEntry(nowplaying),
  ...Object.values(advancedMusicCommands).map((command) => commandEntry(command)),
];

/** Discord slash komut adı: küçük harf, boşluk -> tire, sadece a-z 0-9 - _ (max 32) */
export function toSlashCommandName(name: string): string {
  const turkishMap: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
  };

  const normalized = name
    .trim()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => turkishMap[char] || char)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
  return normalized.slice(0, 32) || 'custom';
}

// Özellik durumuna göre komutları filtrele
function filterCommandsByFeatures(enabledFeatures: string[]): any[] {
  const enabledKeys = new Set<string>();
  for (const f of enabledFeatures) {
    const mapped = API_FEATURE_NAME_TO_MAP_KEY[f];
    if (mapped) enabledKeys.add(mapped);
    enabledKeys.add(f);
  }

  return allCommands
    .filter(({ name }) => {
      const feature = commandFeatureMap[name];
      if (!feature) {
        return true;
      }
      return enabledKeys.has(feature);
    })
    .map(({ command }) => command.data.toJSON());
}

// Global komutları kaydet (sadece özellik gerektirmeyen komutlar)
export async function registerCommands(clientId?: string): Promise<void> {
  try {
    const config = loadConfig();
    const rest = new REST().setToken(config.token);

    const applicationId = clientId || config.clientId || '';
    
    if (!applicationId) {
      console.error('[ERROR] clientId bulunamadı! .env içinde BOT_CLIENT_ID ayarlayın veya bot başlangıcında registerCommands(client.application.id) ile çağırın.');
      return;
    }

    // Sadece özellik gerektirmeyen komutları global olarak kaydet
    const globalCommands = allCommands
      .filter(({ name }) => !commandFeatureMap[name])
      .map(({ command }) => command.data.toJSON());

    console.log(`[INFO] ${globalCommands.length} global slash command Discord'a kaydediliyor...`);

    const data = await rest.put(
      Routes.applicationCommands(applicationId),
      { body: globalCommands }
    ) as any[];

    console.log(`[INFO] ${data.length} global slash command başarıyla kaydedildi!`);
    if (globalCommands.length > 0) {
      console.log(`[INFO] Kaydedilen global komutlar: ${allCommands.filter(({ name }) => !commandFeatureMap[name]).map(({ name }) => name).join(', ')}`);
    }
  } catch (error) {
    console.error('[ERROR] Global slash command kayıt hatası:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Hata detayı:', error.message);
    }
  }
}

// Sunucu bazlı komutları kaydet
export async function registerGuildCommands(client: Client, guildId: string): Promise<void> {
  try {
    // Client'ın token'ını kullan (custom bot veya ana bot)
    const botToken = client.token;
    if (!botToken) {
      console.error('[ERROR] Bot token bulunamadı!');
      return;
    }
    
    const rest = new REST().setToken(botToken);
    const applicationId = client.application?.id;

    if (!applicationId) {
      console.error('[ERROR] Application ID bulunamadı!');
      return;
    }

    await runWithBotClientId(applicationId, async () => {
      // Sunucu için aktif özellikleri al (custom bot için doğru X-Bot-Token / ClientId)
      const enabledFeatures = await getEnabledFeaturesForGuild(guildId);

      // Özellik durumuna göre yerleşik komutları filtrele
      const builtInCommands = filterCommandsByFeatures(enabledFeatures);

      const customCommandsList = await getCustomCommands(guildId);
      const customCommandPayloads = customCommandsList
        .filter((c) => c.enabled)
        .map((c) => {
          const slashName = toSlashCommandName(c.commandName);
          return {
            name: slashName,
            description: 'Kullanıcı tanımlı özel komut',
            type: 1,
          };
        });

      const commands = [...builtInCommands, ...customCommandPayloads];

      console.log(`[INFO] ${guildId} sunucusu için ${commands.length} slash command kaydediliyor (${builtInCommands.length} yerleşik + ${customCommandPayloads.length} özel)...`);
      console.log(`[INFO] Aktif özellikler: ${enabledFeatures.length > 0 ? enabledFeatures.join(', ') : 'Yok (en az /help)'}`);

      // Sunucu bazlı komutları kaydet
      const putStartedAt = Date.now();
      console.log(`[RELOAD] PUT applicationGuildCommands start guild=${guildId}, totalCommands=${commands.length}`);
      const data = await rest.put(
        Routes.applicationGuildCommands(applicationId, guildId),
        { body: commands }
      ) as any[];
      const putElapsedMs = Date.now() - putStartedAt;
      console.log(`[RELOAD] PUT applicationGuildCommands done guild=${guildId} in ${putElapsedMs}ms, received=${data.length}`);

      console.log(`[INFO] ${guildId} sunucusu için ${data.length} slash command başarıyla kaydedildi!`);
      if (commands.length > 0) {
        console.log(`[INFO] Kaydedilen komutlar: ${commands.map(c => c.name).join(', ')}`);
      }
    });
  } catch (error) {
    console.error(`[ERROR] ${guildId} sunucusu için slash command kayıt hatası:`, error);
    if (error instanceof Error) {
      console.error('[ERROR] Hata detayı:', error.message);
    }
  }
}

async function registerGuildsWithConcurrency(client: Client, guildIds: readonly string[], concurrency: number): Promise<void> {
  const queue = [...guildIds];
  const workers = Array.from({ length: Math.min(concurrency, Math.max(queue.length, 1)) }, async () => {
    while (queue.length > 0) {
      const gid = queue.shift();
      if (gid === undefined) break;
      await registerGuildCommands(client, gid);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  });
  await Promise.all(workers);
}

// Tüm sunucular için komutları kaydet
export async function registerAllGuildCommands(client: Client): Promise<void> {
  try {
    const guilds = Array.from(client.guilds.cache.values());
    console.log(`[INFO] ${guilds.length} sunucu için komutlar kaydediliyor...`);

    const limit = Math.min(8, Math.max(2, Number(process.env.GUILD_REGISTER_CONCURRENCY || '6')));
    await registerGuildsWithConcurrency(
      client,
      guilds.map((g) => g.id),
      limit
    );

    console.log(`[INFO] Tüm sunucular için komut kayıt işlemi tamamlandı!`);
  } catch (error) {
    console.error('[ERROR] Tüm sunucular için komut kayıt hatası:', error);
    if (error instanceof Error) {
      console.error('[ERROR] Hata detayı:', error.message);
    }
  }
}

