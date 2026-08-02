import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { getTemporaryVoiceChannelLobbies } from '../utils/database';
import { getClient } from '../botEntry';
import { logError } from '../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('voice-clean')
    .setDescription('Etkin olmayan tüm geçici kanalları siler'),
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!interaction.guild || !interaction.member) {
        await interaction.editReply({ content: 'Bu komut sadece sunucularda kullanılabilir!' });
        return;
      }

      // Sadece adminler kullanabilir
      const member = interaction.member as any;
      if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
          !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: 'Bu komutu sadece yöneticiler kullanabilir!' });
        return;
      }

      const lobbies = await getTemporaryVoiceChannelLobbies(interaction.guild.id);
      const client = getClient();
      if (!client) {
        await interaction.editReply({ content: 'Bot bağlantısı bulunamadı!' });
        return;
      }

      let deletedCount = 0;
      const guild = await client.guilds.fetch(interaction.guild.id);

      // Tüm lobiler için geçici kanalları kontrol et
      for (const lobby of lobbies) {
        const lobbyChannel = guild.channels.cache.get(lobby.channelId);
        if (!lobbyChannel?.parent) continue;

        const category = lobbyChannel.parent;
        if (category.type !== ChannelType.GuildCategory) continue;

        const tempChannels = category.children.cache.filter((ch: any) => 
          ch.isVoiceBased() && 
          ch.id !== lobby.channelId &&
          ch.members.size === 0
        );

        for (const channel of tempChannels.values()) {
          if (channel.type === ChannelType.GuildVoice) {
            try {
              await channel.delete('Etkin olmayan geçici kanal temizlendi');
              deletedCount++;
            } catch (error) {
              console.error(`[ERROR] Kanal silinemedi: ${channel.id}`, error);
            }
          }
        }
      }

      await interaction.editReply({ 
        content: `✅ **${deletedCount}** adet etkin olmayan geçici kanal silindi!` 
      });
    } catch (error) {
      console.error('[ERROR] Voice-clean komutu hatası:', error);
      await interaction.editReply({ content: 'Bir hata oluştu!' }).catch((error) => logError('commands/voiceClean:editReply', error, 'debug'));
    }
  },
};

