import { AttachmentBuilder, MessageFlags, type ButtonInteraction, type StringSelectMenuInteraction } from 'discord.js';
import { musicManager } from '../music/musicManager';
import { createEphemeralMusicControlPanel, createNowPlayingMessage } from '../music/musicEmbeds';
import { permissionService } from '../music/permissionService';
import { resolvePick } from '../music/searchPickStore';
import { logError } from '../utils/logger';

const PERMISSION_CHECK_TIMEOUT_MS = 2500;
const DISCORD_MESSAGE_CAP = 1900;

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return 'canlı';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function isEphemeralPlayerMessage(interaction: ButtonInteraction): boolean {
  return interaction.message.flags.has(MessageFlags.Ephemeral);
}

export async function handleMusicButton(interaction: ButtonInteraction): Promise<void> {
  try {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'Bu işlem sadece sunucularda kullanılabilir.', flags: MessageFlags.Ephemeral }).catch((e) => logError('musicButtonHandler:guildOnlyReply', e, 'debug'));
    return;
  }

  const permCheck = permissionService
    .canUseMusic(interaction)
    .catch((error): { allowed: boolean; reason?: string } => {
      logError('musicButtonHandler:permissionCheck', error, 'warn');
      return { allowed: true };
    });
  const permission = await Promise.race<{ allowed: boolean; reason?: string }>([
    permCheck,
    new Promise<{ allowed: boolean }>((resolve) => setTimeout(() => resolve({ allowed: true }), PERMISSION_CHECK_TIMEOUT_MS)),
  ]);
  if (!permission.allowed) {
    await interaction.reply({ content: permission.reason ?? 'Bu işlem için yetkiniz yok.', flags: MessageFlags.Ephemeral }).catch((e) => logError('musicButtonHandler:permissionReply', e, 'debug'));
    return;
  }

  const customId = interaction.customId;
  const action = customId.startsWith('music:') ? customId.slice('music:'.length) : customId;
  const clientId = interaction.client.application?.id;

  if (action === 'open-controls') {
    const state = await musicManager.getState(interaction.guildId, clientId);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      ...createEphemeralMusicControlPanel(state),
    });
    return;
  }

  if (action === 'panel:add' || action === 'panel:search') {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        action === 'panel:add'
          ? 'Şarkı eklemek için slash komutu **`/music-play`** kullanın.'
          : 'Aramak için **`/music-play`** ile şarkı adı veya YouTube / SoundCloud / Spotify linki girin.',
    });
    return;
  }

  if (action === 'panel:favorites') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const tracks = await musicManager.getFavorites(interaction.guildId, interaction.user.id);
    const body = tracks.length
      ? tracks
          .slice(0, 15)
          .map((t, i) => `${i + 1}. **${t.title}**${t.author ? ` — ${t.author}` : ''} (${formatDuration(t.durationMs)})`)
          .join('\n')
      : 'Beğenilen şarkı yok.';
    await interaction.editReply({ content: `**Beğeniler**\n\n${body}`.slice(0, 2000) });
    return;
  }

  if (action === 'panel:history') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const tracks = await musicManager.getHistory(interaction.guildId, interaction.user.id, clientId);
    const body = tracks.length
      ? tracks
          .slice(0, 15)
          .map((t, i) => `${i + 1}. **${t.title}**${t.author ? ` — ${t.author}` : ''} (${formatDuration(t.durationMs)})`)
          .join('\n')
      : 'Geçmiş boş.';
    await interaction.editReply({ content: `**Geçmiş**\n\n${body}`.slice(0, 2000) });
    return;
  }

  if (action === 'lyrics') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await musicManager.getLyrics(interaction.guildId, undefined, clientId);
    const lyrics = result.lyrics || 'Bu şarkı için söz bulunamadı.';
    if (lyrics.length <= DISCORD_MESSAGE_CAP) {
      await interaction.editReply(`**${result.track?.title ?? 'Şarkı Sözleri'}**\n\n${lyrics}`);
      return;
    }
    const attachment = new AttachmentBuilder(Buffer.from(lyrics, 'utf8'), {
      name: `${(result.track?.title ?? 'lyrics').replace(/[^\w-]+/g, '_').slice(0, 48)}.txt`,
    });
    await interaction.editReply({
      content: `**${result.track?.title ?? 'Şarkı Sözleri'}**\nSözler Discord mesaj limitini aştığı için dosya olarak eklendi.`,
      files: [attachment],
    });
    return;
  }

  if (action === 'queue') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const state = await musicManager.getState(interaction.guildId, clientId);
    const lines = state.queue.length
      ? state.queue.slice(0, 15).map((item) => `${item.position}. ${item.title} (${formatDuration(item.durationMs)})`)
      : ['Kuyruk boş.'];
    await interaction.editReply(lines.join('\n'));
    return;
  }

  const messageUpdateActions = new Set(['pause-resume', 'skip', 'stop', 'loop', 'favorite', 'refresh']);
  if (!messageUpdateActions.has(action)) {
    await interaction.reply({ content: 'Bu müzik butonu artık desteklenmiyor. Mesajı yenileyip tekrar deneyin.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferUpdate();
  const state = await musicManager.getState(interaction.guildId, clientId);
  let favoriteState: boolean | undefined;
  if (action === 'pause-resume') {
    await musicManager.control({ guildId: interaction.guildId, clientId, action: state.paused ? 'resume' : 'pause' });
  } else if (action === 'skip') {
    await musicManager.control({ guildId: interaction.guildId, clientId, action: 'skip' });
  } else if (action === 'stop') {
    await musicManager.control({ guildId: interaction.guildId, clientId, action: 'disconnect' });
  } else if (action === 'loop') {
    const next = state.loopMode === 'off' ? 'loop-track' : state.loopMode === 'track' ? 'loop-queue' : 'loop-off';
    await musicManager.control({ guildId: interaction.guildId, clientId, action: next });
  } else if (action === 'favorite') {
    const result = await musicManager.toggleFavorite(interaction.guildId, interaction.user.id, state.nowPlaying, clientId);
    favoriteState = result.liked;
    await interaction.followUp({
      content: result.liked ? 'Şarkı beğenilere eklendi.' : 'Şarkı beğenilerden çıkarıldı.',
      flags: MessageFlags.Ephemeral,
    });
  } else if (action === 'refresh') {
    // Sadece mevcut state yeniden okunup mesaj güncellenir.
  }

  const nextState = await musicManager.getState(interaction.guildId, clientId);
  const panelPayload = createEphemeralMusicControlPanel(nextState, { favoriteState });
  const channelPayload = createNowPlayingMessage(nextState, { favoriteState });

  if (isEphemeralPlayerMessage(interaction)) {
    await interaction.message.edit(panelPayload);
    await musicManager.syncNowPlayingGuildMessage(interaction.guildId, clientId);
  } else {
    await interaction.message.edit(channelPayload);
  }
  } catch (error) {
    // musicManager kullanıcı-dostu Türkçe hata fırlatabilir (ör. "aktif oynatıcı yok").
    // Buton etkileşiminin durumuna göre hatayı yüzeye çıkar ki kullanıcı sessiz kalmasın.
    const content = error instanceof Error && error.message ? error.message.slice(0, DISCORD_MESSAGE_CAP) : 'Müzik işlemi tamamlanamadı.';
    console.error('[ERROR] Müzik butonu hatası:', error);
    // deferUpdate ile ack'lenen mesaj-güncelleme aksiyonlarında editReply panel mesajını EZER;
    // bunlarda followUp (yeni ephemeral) kullanırız. deferReply'lı aksiyonlarda editReply doğru.
    const actionForError = interaction.customId.startsWith('music:') ? interaction.customId.slice('music:'.length) : interaction.customId;
    const wasDeferUpdate = new Set(['pause-resume', 'skip', 'stop', 'loop', 'favorite', 'refresh']).has(actionForError);
    if (interaction.replied || (interaction.deferred && wasDeferUpdate)) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch((e) => logError('musicButtonHandler:errorFollowUp', e, 'debug'));
    } else if (interaction.deferred) {
      await interaction.editReply({ content }).catch((e) => logError('musicButtonHandler:errorEditReply', e, 'debug'));
    } else if (interaction.isRepliable()) {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch((e) => logError('musicButtonHandler:errorReply', e, 'debug'));
    }
  }
}

/**
 * Handles picking a track from a search result select menu (`music:pick:<source>:<token>`).
 * Plays the exact track the user selected.
 */
export async function handleMusicSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'Bu işlem sadece sunucularda kullanılabilir.', flags: MessageFlags.Ephemeral }).catch((e) => logError('musicSelect:guildOnlyReply', e, 'debug'));
      return;
    }

    const permCheck = permissionService
      .canUseMusic(interaction)
      .catch((error): { allowed: boolean; reason?: string } => {
        logError('musicSelect:permissionCheck', error, 'warn');
        return { allowed: true };
      });
    const permission = await Promise.race<{ allowed: boolean; reason?: string }>([
      permCheck,
      new Promise<{ allowed: boolean }>((resolve) => setTimeout(() => resolve({ allowed: true }), PERMISSION_CHECK_TIMEOUT_MS)),
    ]);
    if (!permission.allowed) {
      await interaction.reply({ content: permission.reason ?? 'Bu işlem için yetkiniz yok.', flags: MessageFlags.Ephemeral }).catch((e) => logError('musicSelect:permissionReply', e, 'debug'));
      return;
    }

    // customId format: music:pick:<source>:<token>
    const token = interaction.customId.split(':')[3] ?? '';
    const index = Number(interaction.values[0]);
    const track = Number.isInteger(index) ? resolvePick(token, index) : undefined;
    if (!track) {
      await interaction.reply({ content: 'Bu arama sonucu artık geçerli değil. Komutu yeniden çalıştırın.', flags: MessageFlags.Ephemeral }).catch((e) => logError('musicSelect:expiredReply', e, 'debug'));
      return;
    }

    const voiceChannelId = permissionService.getVoiceChannelId(interaction);
    if (!voiceChannelId) {
      await interaction.reply({ content: 'Müzik başlatmak için önce bir ses kanalına katılmalısınız.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const state = await musicManager.play({
      guildId: interaction.guildId,
      clientId: interaction.client.application?.id,
      query: track.uri ?? track.title,
      requester: permissionService.getRequester(interaction),
      voiceChannelId,
      textChannelId: interaction.channelId,
      playNext: false,
    });
    await interaction.editReply(`🎵 **${state.nowPlaying?.title ?? track.title}** ${state.status === 'playing' ? 'çalıyor.' : 'sıraya eklendi.'}`);
  } catch (error) {
    const content = error instanceof Error && error.message ? error.message.slice(0, DISCORD_MESSAGE_CAP) : 'Şarkı başlatılamadı.';
    console.error('[ERROR] Müzik seçim hatası:', error);
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content }).catch((e) => logError('musicSelect:errorEditReply', e, 'debug'));
    } else if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch((e) => logError('musicSelect:errorReply', e, 'debug'));
    }
  }
}
