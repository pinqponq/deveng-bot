import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { loadConfig } from '../utils/config';
import { sanitizeOptionalUrl } from '../utils/mentionSanitize';
import type { MusicState } from './types';

const EMBED_COLOR = 0x5865f2;

/**
 * Discord embed'inde setURL/setThumbnail yalnızca GEÇERLİ http(s) URL kabul eder; bozuk bir URL
 * (ör. Lavalink kaynağından gelen boş/şema-siz/relatif değer) tüm embed'i "Invalid Form Body" ile
 * reddeder ve now-playing kartı hiç gönderilemez/güncellenemez. Ortak sanitizeOptionalUrl ile
 * doğrularız; geçersizse sessizce atlanır (kart yine çalışır).
 */
function safeHttpUrl(value?: string | null): string | undefined {
  return sanitizeOptionalUrl(value) ?? undefined;
}

type NowPlayingMessageContext = {
  favoriteState?: boolean;
};

export function guildMusicPanelUrl(guildId: string, panelBaseUrl?: string): string | undefined {
  const base = (panelBaseUrl ?? loadConfig().panelBaseUrl)?.replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}/dashboard/${guildId}/bot-music`;
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return 'canlı';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function progressBar(positionMs: number, durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
  const slots = 12;
  const ratio = Math.max(0, Math.min(1, positionMs / durationMs));
  const active = Math.min(slots - 1, Math.round(ratio * (slots - 1)));
  return Array.from({ length: slots }, (_, index) => (index === active ? '🔵' : '▬')).join('');
}

function isLiveTrack(state: MusicState): boolean {
  const track = state.nowPlaying;
  return Boolean(track?.isStream) || !track?.durationMs || track.durationMs <= 0 || track.source === 'direct';
}

function trackExternalUrl(track: NonNullable<MusicState['nowPlaying']>): string | undefined {
  return track.uri || track.spotifyUrl || undefined;
}

function loopLabel(mode: MusicState['loopMode']): string {
  if (mode === 'track') return 'Parça';
  if (mode === 'queue') return 'Kuyruk';
  return 'Kapalı';
}

export function createNowPlayingEmbed(state: MusicState): EmbedBuilder {
  const track = state.nowPlaying;
  if (!track) {
    return new EmbedBuilder()
      .setAuthor({ name: 'Şu an çalıyor' })
      .setTitle('Müzik beklemede')
      .setColor(EMBED_COLOR)
      .setDescription('Şu an çalan şarkı yok. `/music-play` ile başlatın veya aşağıdan kontrol panelini açın.')
      .setTimestamp(new Date());
  }

  const live = isLiveTrack(state);
  const requesterLine = track.requester?.id
    ? `👑 <@${track.requester.id}>`
    : `👑 ${track.requester?.username ?? 'Bilinmiyor'}`;
  const voiceLine = state.voiceChannelId ? `🔊 <#${state.voiceChannelId}>` : '🔊 —';

  const progressLine = live
    ? '**Canlı yayın**'
    : `**\`${formatDuration(state.positionMs)} / ${formatDuration(track.durationMs)}\`**\n${progressBar(state.positionMs, track.durationMs)}`;

  const artistLead =
    track.author && !track.title.includes(track.author) ? `**${track.author}**\n\n` : '';
  const description = [
    artistLead,
    requesterLine,
    voiceLine,
    '',
    progressLine,
    state.errorMessage ? `\n**Hata:** ${state.errorMessage}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Şu an çalıyor' })
    .setTitle(track.title.length > 250 ? `${track.title.slice(0, 247)}…` : track.title)
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setFooter({
      text: `Ses ${state.volume} • Loop: ${loopLabel(state.loopMode)} • Kuyruk: ${state.queue.length}`,
    })
    .setTimestamp(new Date());

  const url = safeHttpUrl(trackExternalUrl(track));
  if (url) embed.setURL(url);
  const thumb = safeHttpUrl(track.thumbnailUrl);
  if (thumb) embed.setThumbnail(thumb);
  return embed;
}

function favoriteButton(hasTrack: boolean, favoriteKnown: boolean, favoriteActive: boolean): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId('music:favorite')
    .setStyle(favoriteKnown && favoriteActive ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setEmoji('❤️')
    .setDisabled(!hasTrack);
}

function buildPrimaryControlRow(
  state: MusicState,
  panelMusicUrl: string | undefined,
  context?: NowPlayingMessageContext,
): ActionRowBuilder<ButtonBuilder> {
  const hasTrack = Boolean(state.nowPlaying);
  const favoriteKnown = typeof context?.favoriteState === 'boolean';
  const favoriteActive = context?.favoriteState === true;
  const loopStyle = state.loopMode === 'off' ? ButtonStyle.Secondary : ButtonStyle.Success;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    favoriteButton(hasTrack, favoriteKnown, favoriteActive),
    new ButtonBuilder().setCustomId('music:skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️').setDisabled(!hasTrack),
    new ButtonBuilder().setCustomId('music:loop').setStyle(loopStyle).setEmoji('🔁').setDisabled(!hasTrack),
  );
  if (panelMusicUrl) {
    row.addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(panelMusicUrl).setLabel('Panel').setEmoji('🎛️'),
    );
  } else {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('music:open-controls')
        .setStyle(ButtonStyle.Secondary)
        .setLabel('Kontroller')
        .setEmoji('🎛️'),
    );
  }
  row.addComponents(new ButtonBuilder().setCustomId('music:stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️').setDisabled(!hasTrack));
  return row;
}

function buildSecondaryControlRow(state: MusicState): ActionRowBuilder<ButtonBuilder> {
  const hasTrack = Boolean(state.nowPlaying);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music:pause-resume')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(state.paused ? '▶️' : '⏸️')
      .setDisabled(!hasTrack),
    new ButtonBuilder().setCustomId('music:queue').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
    new ButtonBuilder().setCustomId('music:lyrics').setStyle(ButtonStyle.Secondary).setEmoji('🎵').setDisabled(!hasTrack),
    new ButtonBuilder().setCustomId('music:refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
  );
}

function createMusicControlRowsWithContext(
  state: MusicState,
  context?: NowPlayingMessageContext,
  panelMusicUrl?: string,
): ActionRowBuilder<ButtonBuilder>[] {
  return [buildPrimaryControlRow(state, panelMusicUrl, context), buildSecondaryControlRow(state)];
}

export function createMusicControlRows(state: MusicState): ActionRowBuilder<ButtonBuilder>[] {
  return createMusicControlRowsWithContext(state, undefined, guildMusicPanelUrl(state.guildId));
}

export function createNowPlayingMessage(state: MusicState, context?: NowPlayingMessageContext) {
  const panelMusicUrl = guildMusicPanelUrl(state.guildId);
  return {
    embeds: [createNowPlayingEmbed(state)],
    components: createMusicControlRowsWithContext(state, context, panelMusicUrl),
  };
}

function panelEmbed(state: MusicState): EmbedBuilder {
  const track = state.nowPlaying;
  const status = track
    ? `**Çalan:** ${track.title}${track.author ? `\n**Sanatçı:** ${track.author}` : ''}\n\n**Music**\nKuyruk, sözler ve oynatma.\n\n**Library**\nBeğeniler ve geçmiş.`
    : '**Şu an çalan yok.**\n\n**Music**\nKuyruk, sözler ve oynatma.\n\n**Library**\nBeğeniler ve geçmiş.';
  return new EmbedBuilder().setColor(EMBED_COLOR).setTitle('Müzik kontrolleri').setDescription(status);
}

export function createEphemeralMusicControlPanel(
  state: MusicState,
  context?: NowPlayingMessageContext,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const hasTrack = Boolean(state.nowPlaying);
  const favoriteKnown = typeof context?.favoriteState === 'boolean';
  const favoriteActive = context?.favoriteState === true;
  const loopStyle = state.loopMode === 'off' ? ButtonStyle.Secondary : ButtonStyle.Success;

  const musicRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('music:queue').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
    new ButtonBuilder().setCustomId('music:panel:add').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
    new ButtonBuilder().setCustomId('music:panel:search').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('music:lyrics').setStyle(ButtonStyle.Secondary).setEmoji('🎵').setDisabled(!hasTrack),
    new ButtonBuilder().setCustomId('music:refresh').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
  );

  const libraryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('music:panel:favorites').setStyle(ButtonStyle.Secondary).setEmoji('❤️'),
    new ButtonBuilder().setCustomId('music:panel:history').setStyle(ButtonStyle.Secondary).setEmoji('🕐'),
  );

  const playbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music:pause-resume')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(state.paused ? '▶️' : '⏸️')
      .setDisabled(!hasTrack),
    new ButtonBuilder().setCustomId('music:skip').setStyle(ButtonStyle.Secondary).setEmoji('⏭️').setDisabled(!hasTrack),
    new ButtonBuilder().setCustomId('music:loop').setStyle(loopStyle).setEmoji('🔁').setDisabled(!hasTrack),
    favoriteButton(hasTrack, favoriteKnown, favoriteActive),
    new ButtonBuilder().setCustomId('music:stop').setStyle(ButtonStyle.Danger).setEmoji('⏹️').setDisabled(!hasTrack),
  );

  return {
    embeds: [panelEmbed(state)],
    components: [musicRow, libraryRow, playbackRow],
  };
}
