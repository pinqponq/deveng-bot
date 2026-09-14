import type { ButtonInteraction, ChatInputCommandInteraction, GuildMember, StringSelectMenuInteraction } from 'discord.js';
import { apiRequest } from '../utils/apiClient';
import { logError } from '../utils/logger';

type MusicSettingsResponse = {
  enabled: boolean;
  djRoleId?: string | null;
  requireDjRole?: boolean;
  setupCompleted?: boolean;
  blacklistedTextChannelIds?: string | null;
};

export class PermissionService {
  getRequester(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction): { id: string; username?: string } {
    return {
      id: interaction.user.id,
      username: interaction.user.username,
    };
  }

  getVoiceChannelId(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction): string | undefined {
    const member = interaction.member as GuildMember | null;
    return member?.voice?.channelId ?? undefined;
  }

  async canUseMusic(interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction): Promise<{ allowed: boolean; reason?: string }> {
    if (!interaction.guildId) {
      return { allowed: false, reason: 'Bu işlem sadece sunucularda kullanılabilir.' };
    }
    const settings = await apiRequest<MusicSettingsResponse>(`/api/Music/guild/${interaction.guildId}/settings`, undefined, interaction.client.application?.id);
    if (!settings?.enabled) return { allowed: false, reason: 'Müzik özelliği bu sunucuda etkin değil.' };

    const channelId = interaction.channelId;
    if (channelId && settings.blacklistedTextChannelIds) {
      try {
        const blocked = JSON.parse(settings.blacklistedTextChannelIds) as string[];
        if (Array.isArray(blocked) && blocked.includes(channelId)) {
          return { allowed: false, reason: 'Bu kanalda müzik komutları kullanılamaz.' };
        }
      } catch (error) {
        // geçersiz JSON — engelleme uygulanmaz
        logError('permissionService:parseBlacklist', error, 'warn');
      }
    }

    if (!settings.requireDjRole) return { allowed: true };
    if (!settings.setupCompleted || !settings.djRoleId) {
      return { allowed: false, reason: 'Müzik özelliğini kullanmadan önce panelden DJ rolü seçilmelidir.' };
    }
    const member = interaction.member as GuildMember | null;
    if (member?.roles?.cache?.has(settings.djRoleId)) return { allowed: true };
    return { allowed: false, reason: 'Bu müzik işlemi için DJ rolüne sahip olmalısınız.' };
  }
}

export const permissionService = new PermissionService();
