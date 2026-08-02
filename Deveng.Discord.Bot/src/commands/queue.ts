import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { musicManager } from '../music/musicManager';

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return 'canlı';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('music-queue')
    .setDescription('Müzik kuyruğunu gösterir'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.guild) {
      await interaction.editReply('Bu komut sadece sunucularda kullanılabilir.');
      return;
    }

    const state = await musicManager.getState(interaction.guild.id, interaction.client.application?.id);
    const embed = new EmbedBuilder()
      .setTitle('Müzik Kuyruğu')
      .setColor(0x5865f2)
      .setDescription(
        state.nowPlaying
          ? `Şu an çalıyor: **${state.nowPlaying.title}** (${formatDuration(state.nowPlaying.durationMs)})`
          : 'Şu an çalan şarkı yok.'
      );

    if (state.queue.length > 0) {
      embed.addFields({
        name: 'Sıradaki Şarkılar',
        value: state.queue
          .slice(0, 10)
          .map((item) => `${item.position}. ${item.title} (${formatDuration(item.durationMs)})`)
          .join('\n'),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
