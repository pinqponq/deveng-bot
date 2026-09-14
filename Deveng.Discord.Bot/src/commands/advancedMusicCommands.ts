import { AttachmentBuilder, ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import { musicManager } from '../music/musicManager';
import { permissionService } from '../music/permissionService';
import { rememberSearch } from '../music/searchPickStore';
import type { MusicControlAction, MusicTrack } from '../music/types';

const MAX_SEARCH_RESULTS = 5;
const MAX_SELECT_LABEL_LENGTH = 95;

type MusicCommand = {
  data: any;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return 'canlı';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function voiceChannelId(interaction: ChatInputCommandInteraction): string | undefined {
  return permissionService.getVoiceChannelId(interaction);
}

async function requireGuild(interaction: ChatInputCommandInteraction): Promise<boolean> {
  if (interaction.guild) return true;
  await interaction.editReply('Bu komut sadece sunucularda kullanılabilir.');
  return false;
}

async function playRequested(interaction: ChatInputCommandInteraction, playNext: boolean, skipCurrent: boolean): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  if (!(await requireGuild(interaction))) return;
  const channelId = voiceChannelId(interaction);
  if (!channelId) {
    await interaction.editReply('Müzik başlatmak için önce bir ses kanalına katılmalısınız.');
    return;
  }
  const query = interaction.options.getString('query', true);
  const previousState = skipCurrent
    ? await musicManager.getState(interaction.guild!.id, interaction.client.application?.id)
    : undefined;
  const state = await musicManager.play({
    guildId: interaction.guild!.id,
    clientId: interaction.client.application?.id,
    query,
    requester: permissionService.getRequester(interaction),
    voiceChannelId: channelId,
    textChannelId: interaction.channelId,
    playNext,
  });
  if (skipCurrent && previousState?.nowPlaying && state.queue.length > 0) {
    await musicManager.control({
      guildId: interaction.guild!.id,
      clientId: interaction.client.application?.id,
      action: 'skip',
    });
  }
  await interaction.editReply(`🎵 **${state.nowPlaying?.title ?? query}** ${skipCurrent ? 'hemen çalınıyor.' : playNext ? 'sıranın üstüne eklendi.' : 'sıraya eklendi.'}`);
}

async function runControl(interaction: ChatInputCommandInteraction, action: MusicControlAction, payload: Partial<{ seekMs: number; deltaMs: number; position: number; volume: number }> = {}): Promise<void> {
  await interaction.deferReply();
  if (!(await requireGuild(interaction))) return;
  const state = await musicManager.control({
    guildId: interaction.guild!.id,
    clientId: interaction.client.application?.id,
    action,
    ...payload,
  });
  await interaction.editReply(`Müzik kontrolü uygulandı: **${action}**.${state.nowPlaying ? ` Şu an: **${state.nowPlaying.title}**` : ''}`);
}

function controlCommand(name: string, description: string, action: MusicControlAction): MusicCommand {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(description),
    execute: (interaction) => runControl(interaction, action),
  };
}

function trackEmbed(title: string, tracks: MusicTrack[]): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .setDescription(
      tracks.length
        ? tracks.slice(0, 10).map((track, index) => `${index + 1}. **${track.title}** - ${track.author || track.source} (${formatDuration(track.durationMs)})`).join('\n')
        : 'Kayıt bulunamadı.',
    );
}

/** Select menu so users can pick a search result; picking plays that exact track. */
function pickMenuRow(sourceKey: 'youtube' | 'soundcloud', tracks: MusicTrack[]): ActionRowBuilder<StringSelectMenuBuilder> | undefined {
  const options = tracks.slice(0, MAX_SEARCH_RESULTS).map((track, index) => {
    const description = [track.author, formatDuration(track.durationMs)].filter(Boolean).join(' | ');
    return {
      label: `${track.title}`.replace(/\s+/g, ' ').trim().slice(0, MAX_SELECT_LABEL_LENGTH) || 'Bilinmeyen şarkı',
      description: description ? description.replace(/\s+/g, ' ').trim().slice(0, MAX_SELECT_LABEL_LENGTH) : undefined,
      value: String(index),
    };
  });
  if (!options.length) return undefined;
  const token = rememberSearch(tracks);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`music:pick:${sourceKey}:${token}`)
      .setPlaceholder('Çalmak için bir sonuç seçin')
      .addOptions(options),
  );
}

export const advancedMusicCommands: Record<string, MusicCommand> = {
  'music-playskip': {
    data: new SlashCommandBuilder()
      .setName('music-playskip')
      .setDescription('Şarkıyı sıranın üstüne ekler ve hemen çalar')
      .addStringOption((option) => option.setName('query').setDescription('Şarkı adı veya link').setRequired(true).setMaxLength(300)),
    execute: (interaction) => playRequested(interaction, true, true),
  },
  'music-playtop': {
    data: new SlashCommandBuilder()
      .setName('music-playtop')
      .setDescription('Şarkıyı sıranın başına ekler')
      .addStringOption((option) => option.setName('query').setDescription('Şarkı adı veya link').setRequired(true).setMaxLength(300)),
    execute: (interaction) => playRequested(interaction, true, false),
  },
  'music-join': {
    data: new SlashCommandBuilder().setName('music-join').setDescription('Botu bulunduğun ses kanalına çağırır'),
    async execute(interaction) {
      await interaction.deferReply();
      if (!(await requireGuild(interaction))) return;
      const channelId = voiceChannelId(interaction);
      if (!channelId) {
        await interaction.editReply('Önce bir ses kanalına katılmalısınız.');
        return;
      }
      await musicManager.join(interaction.guild!.id, channelId, interaction.channelId, interaction.client.application?.id);
      await interaction.editReply('Ses kanalına katıldım.');
    },
  },
  'music-disconnect': controlCommand('music-disconnect', 'Botun ses bağlantısını keser ve kuyruğu temizler', 'disconnect'),
  'music-shuffle': controlCommand('music-shuffle', 'Kuyruğu karıştırır', 'shuffle'),
  'music-clear': controlCommand('music-clear', 'Kuyruğu temizler', 'clear'),
  'music-removedupes': controlCommand('music-removedupes', 'Kuyruktaki tekrar eden şarkıları kaldırır', 'removedupes'),
  'music-replay': controlCommand('music-replay', 'Çalan şarkıyı başa sarar', 'replay'),
  'music-loop': controlCommand('music-loop', 'Çalan şarkı için loop açar', 'loop-track'),
  'music-loopqueue': controlCommand('music-loopqueue', 'Kuyruk loop modunu açar', 'loop-queue'),
  'music-forceskip': controlCommand('music-forceskip', 'Çalan şarkıyı hemen geçer', 'skip'),
  'music-voteskip': controlCommand('music-voteskip', 'Çalan şarkıyı geçer', 'skip'),
  'music-seek': {
    data: new SlashCommandBuilder()
      .setName('music-seek')
      .setDescription('Çalan şarkıda belirli saniyeye gider')
      .addIntegerOption((option) => option.setName('seconds').setDescription('Gidilecek saniye').setRequired(true).setMinValue(0)),
    execute: (interaction) => runControl(interaction, 'seek', { seekMs: interaction.options.getInteger('seconds', true) * 1000 }),
  },
  'music-rewind': {
    data: new SlashCommandBuilder()
      .setName('music-rewind')
      .setDescription('Çalan şarkıyı geri sarar')
      .addIntegerOption((option) => option.setName('seconds').setDescription('Geri sarılacak saniye').setRequired(false).setMinValue(1)),
    execute: (interaction) => runControl(interaction, 'rewind', { deltaMs: (interaction.options.getInteger('seconds') ?? 10) * 1000 }),
  },
  'music-forward': {
    data: new SlashCommandBuilder()
      .setName('music-forward')
      .setDescription('Çalan şarkıyı ileri sarar')
      .addIntegerOption((option) => option.setName('seconds').setDescription('İleri sarılacak saniye').setRequired(false).setMinValue(1)),
    execute: (interaction) => runControl(interaction, 'forward', { deltaMs: (interaction.options.getInteger('seconds') ?? 10) * 1000 }),
  },
  'music-skipto': {
    data: new SlashCommandBuilder()
      .setName('music-skipto')
      .setDescription('Kuyrukta belirli sıraya atlar')
      .addIntegerOption((option) => option.setName('position').setDescription('Kuyruk sırası').setRequired(true).setMinValue(1)),
    execute: (interaction) => runControl(interaction, 'skipto', { position: interaction.options.getInteger('position', true) }),
  },
  'music-volume': {
    data: new SlashCommandBuilder()
      .setName('music-volume')
      .setDescription('Ses seviyesini gösterir veya değiştirir')
      .addIntegerOption((option) => option.setName('value').setDescription('0-150 arası ses seviyesi').setRequired(false).setMinValue(0).setMaxValue(150)),
    async execute(interaction) {
      const volume = interaction.options.getInteger('value');
      if (volume == null) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!(await requireGuild(interaction))) return;
        const state = await musicManager.getState(interaction.guild!.id, interaction.client.application?.id);
        await interaction.editReply(`Ses seviyesi: **${state.volume}**`);
        return;
      }
      await runControl(interaction, 'volume', { volume });
    },
  },
  'music-remove': {
    data: new SlashCommandBuilder()
      .setName('music-remove')
      .setDescription('Kuyruktan belirtilen sıradaki şarkıyı kaldırır')
      .addIntegerOption((option) => option.setName('position').setDescription('Kuyruk sırası').setRequired(true).setMinValue(1)),
    async execute(interaction) {
      await interaction.deferReply();
      if (!(await requireGuild(interaction))) return;
      const state = await musicManager.getState(interaction.guild!.id, interaction.client.application?.id);
      const item = state.queue.find((queueItem) => queueItem.position === interaction.options.getInteger('position', true));
      if (!item) {
        await interaction.editReply('Bu sırada bir şarkı yok.');
        return;
      }
      await musicManager.remove(interaction.guild!.id, item.queueItemId, interaction.client.application?.id);
      await interaction.editReply(`Kuyruktan kaldırıldı: **${item.title}**`);
    },
  },
  'music-move': {
    data: new SlashCommandBuilder()
      .setName('music-move')
      .setDescription('Kuyrukta bir şarkıyı başka sıraya taşır')
      .addIntegerOption((option) => option.setName('from').setDescription('Mevcut sıra').setRequired(true).setMinValue(1))
      .addIntegerOption((option) => option.setName('to').setDescription('Yeni sıra').setRequired(true).setMinValue(1)),
    async execute(interaction) {
      await interaction.deferReply();
      if (!(await requireGuild(interaction))) return;
      const state = await musicManager.getState(interaction.guild!.id, interaction.client.application?.id);
      const item = state.queue.find((queueItem) => queueItem.position === interaction.options.getInteger('from', true));
      if (!item) {
        await interaction.editReply('Taşınacak şarkı bulunamadı.');
        return;
      }
      await musicManager.move(interaction.guild!.id, item.queueItemId, interaction.options.getInteger('to', true), interaction.client.application?.id);
      await interaction.editReply(`**${item.title}** yeni sıraya taşındı.`);
    },
  },
  'music-search': {
    data: new SlashCommandBuilder()
      .setName('music-search')
      .setDescription('Şarkı arar ve sonuçları listeler')
      .addStringOption((option) => option.setName('query').setDescription('Arama metni').setRequired(true).setMaxLength(300)),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const tracks = await musicManager.search({ query: interaction.options.getString('query', true), limit: MAX_SEARCH_RESULTS });
      const pickRow = pickMenuRow('youtube', tracks);
      await interaction.editReply({ embeds: [trackEmbed('Arama Sonuçları', tracks)], components: pickRow ? [pickRow] : [] });
    },
  },
  'music-soundcloud': {
    data: new SlashCommandBuilder()
      .setName('music-soundcloud')
      .setDescription('SoundCloud üzerinde arama yapar')
      .addStringOption((option) => option.setName('query').setDescription('Arama metni').setRequired(true).setMaxLength(300)),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const tracks = await musicManager.search({ query: interaction.options.getString('query', true), source: 'soundcloud', limit: MAX_SEARCH_RESULTS });
      const pickRow = pickMenuRow('soundcloud', tracks);
      await interaction.editReply({ embeds: [trackEmbed('SoundCloud Sonuçları', tracks)], components: pickRow ? [pickRow] : [] });
    },
  },
  'music-lyrics': {
    data: new SlashCommandBuilder()
      .setName('music-lyrics')
      .setDescription('Çalan şarkının sözlerini gösterir')
      .addStringOption((option) => option.setName('query').setDescription('İsteğe bağlı söz araması').setRequired(false).setMaxLength(200)),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const result = await musicManager.getLyrics(interaction.guild!.id, interaction.options.getString('query') ?? undefined, interaction.client.application?.id);
      const lyrics = result.lyrics || 'Bu şarkı için söz bulunamadı.';
      if (lyrics.length <= 1900) {
        await interaction.editReply(`**${result.track?.title ?? 'Sözler'}**\n\n${lyrics}`);
        return;
      }
      const attachment = new AttachmentBuilder(Buffer.from(lyrics, 'utf8'), {
        name: `${(result.track?.title ?? 'lyrics').replace(/[^\w-]+/g, '_').slice(0, 48)}.txt`,
      });
      await interaction.editReply({
        content: `**${result.track?.title ?? 'Sözler'}**\nSözler Discord mesaj limitini aştığı için dosya olarak eklendi.`,
        files: [attachment],
      });
    },
  },
  'music-like': {
    data: new SlashCommandBuilder().setName('music-like').setDescription('Çalan şarkıyı beğenilere ekler/çıkarır'),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const result = await musicManager.toggleFavorite(interaction.guild!.id, interaction.user.id, undefined, interaction.client.application?.id);
      await interaction.editReply(result.liked ? 'Şarkı beğenilere eklendi.' : 'Şarkı beğenilerden çıkarıldı.');
    },
  },
  'music-liked': {
    data: new SlashCommandBuilder().setName('music-liked').setDescription('Beğenilen şarkıları gösterir'),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const tracks = await musicManager.getFavorites(interaction.guild!.id, interaction.user.id);
      await interaction.editReply({ embeds: [trackEmbed('Beğenilen Şarkılar', tracks)] });
    },
  },
  'music-history': {
    data: new SlashCommandBuilder()
      .setName('music-history')
      .setDescription('Dinleme geçmişini gösterir')
      .addBooleanOption((option) => option.setName('guild').setDescription('Sunucu geçmişini göster').setRequired(false)),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const tracks = await musicManager.getHistory(interaction.guild!.id, interaction.options.getBoolean('guild') ? undefined : interaction.user.id);
      await interaction.editReply({ embeds: [trackEmbed('Dinleme Geçmişi', tracks)] });
    },
  },
  'music-settings': {
    data: new SlashCommandBuilder().setName('music-settings').setDescription('Müzik ayarlarının özetini gösterir'),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (!(await requireGuild(interaction))) return;
      const state = await musicManager.getState(interaction.guild!.id, interaction.client.application?.id);
      await interaction.editReply(`Müzik ayarları: volume=${state.volume}, loop=${state.loopMode}. Detaylı ayarlar panelden yönetilir.`);
    },
  },
};
