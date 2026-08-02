import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/musicManager';
import type { MusicControlAction } from '../music/types';

const actionLabels: Record<MusicControlAction, string> = {
  pause: 'duraklatıldı',
  resume: 'devam ediyor',
  skip: 'geçildi',
  skipto: 'belirtilen sıraya atlandı',
  stop: 'durduruldu',
  disconnect: 'bağlantısı kesildi',
  shuffle: 'karıştırıldı',
  clear: 'temizlendi',
  removedupes: 'tekrar eden şarkılardan temizlendi',
  seek: 'istenen zamana alındı',
  rewind: 'geri sarıldı',
  forward: 'ileri sarıldı',
  replay: 'başa alındı',
  volume: 'ses seviyesi güncellendi',
  'loop-off': 'loop kapatıldı',
  'loop-track': 'tek şarkı loop açıldı',
  'loop-queue': 'kuyruk loop açıldı',
  'autoplay-toggle': 'autoplay değiştirildi',
};

export function createMusicControlCommand(name: string, description: string, action: MusicControlAction) {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(description),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      if (!interaction.guild) {
        await interaction.editReply('Bu komut sadece sunucularda kullanılabilir.');
        return;
      }
      const state = await musicManager.control({
        guildId: interaction.guild.id,
        clientId: interaction.client.application?.id,
        action,
      });
      const suffix = state.nowPlaying ? ` Şu an: **${state.nowPlaying.title}**` : '';
      await interaction.editReply(`Müzik ${actionLabels[action]}.${suffix}`);
    },
  };
}
