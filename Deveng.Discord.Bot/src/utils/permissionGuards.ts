import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { logError } from './logger';

/**
 * Yönetim komutları için çalışma-zamanı yetki kapısı.
 *
 * `setDefaultMemberPermissions` ana savunmadır. Entegrasyon override ve bayat kayıtlara karşı ikinci katman.
 *
 * Yetkiliyse true döner. Değilse kullanıcıya ephemeral bir ret mesajı gönderip false döner
 * (çağıran taraf false'ta işlemi durdurmalıdır). Administrator/sunucu sahibi memberPermissions'ta
 * tüm bitlere sahip sayıldığından otomatik geçer.
 */
export async function ensureMemberPermission(
  interaction: ChatInputCommandInteraction,
  permission: bigint,
  label: string,
): Promise<boolean> {
  const perms = interaction.memberPermissions;
  if (perms && perms.has(permission)) return true;

  const notice = `Bu komutu kullanmak için **${label}** yetkisine sahip olmalısınız.`;
  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply({ content: notice }).catch((error) => logError('permissionGuards:editReply', error, 'debug'));
  } else if (interaction.isRepliable() && !interaction.replied) {
    await interaction.reply({ content: notice, flags: MessageFlags.Ephemeral }).catch((error) => logError('permissionGuards:reply', error, 'debug'));
  }
  return false;
}
