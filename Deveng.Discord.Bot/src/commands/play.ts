import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { musicManager } from '../music/musicManager';
import { permissionService } from '../music/permissionService';

export default {
  data: new SlashCommandBuilder()
    .setName('music-play')
    .setDescription('Şarkı adı veya link ile müzik çalar')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Şarkı adı, YouTube/SoundCloud/Spotify linki')
        .setRequired(true)
        .setMaxLength(300)
    )
    .addBooleanOption((option) =>
      option
        .setName('next')
        .setDescription('Şarkıyı sıranın başına ekle')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!interaction.guild) {
      await interaction.editReply('Bu komut sadece sunucularda kullanılabilir.');
      return;
    }

    const voiceChannelId = permissionService.getVoiceChannelId(interaction);
    if (!voiceChannelId) {
      await interaction.editReply('Müzik başlatmak için önce bir ses kanalına katılmalısınız.');
      return;
    }

    const query = interaction.options.getString('query', true);
    const state = await musicManager.play({
      guildId: interaction.guild.id,
      clientId: interaction.client.application?.id,
      query,
      requester: permissionService.getRequester(interaction),
      voiceChannelId,
      textChannelId: interaction.channelId,
      playNext: interaction.options.getBoolean('next') ?? false,
    });

    const title = state.nowPlaying?.title ?? 'Sıraya eklendi';
    await interaction.editReply(`🎵 **${title}** ${state.status === 'playing' ? 'çalıyor.' : 'sıraya eklendi.'}`);
  },
};
