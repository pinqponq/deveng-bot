import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { musicManager } from '../music/musicManager';
import { createNowPlayingMessage } from '../music/musicEmbeds';
import { permissionService } from '../music/permissionService';

export default {
  data: new SlashCommandBuilder()
    .setName('music-nowplaying')
    .setDescription('Şu an çalan şarkıyı gösterir'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.guild) {
      await interaction.editReply('Bu komut sadece sunucularda kullanılabilir.');
      return;
    }
    const permission = await permissionService.canUseMusic(interaction);
    if (!permission.allowed) {
      await interaction.editReply(permission.reason ?? 'Bu işlem için yetkiniz yok.');
      return;
    }

    const state = await musicManager.getState(interaction.guild.id, interaction.client.application?.id);
    await interaction.editReply(createNowPlayingMessage(state));
  },
};
