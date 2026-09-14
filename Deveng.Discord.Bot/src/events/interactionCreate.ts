import { Interaction, MessageFlags } from 'discord.js';
import { handleReactionRoleButton, handleReactionRoleMenu } from './messageReactionAdd';
import { handleCustomCommandSlash } from '../utils/customCommandSlashHandler';
import { allowInteractionForUser } from '../utils/interactionRateLimit';
import { logError } from '../utils/logger';

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
  try {
    const uid = interaction.user?.id;
    if (uid && !(await allowInteractionForUser(uid, interaction.guildId))) {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: 'Çok hızlı istek gönderiyorsunuz. Lütfen kısa bir süre bekleyin.', flags: MessageFlags.Ephemeral }).catch((error) => logError('interactionCreate:rateLimitNotice', error, 'debug'));
      }
      return;
    }
    // Modal submit interaction
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('reminder_create_modal')) {
        const { handleReminderModalSubmit } = await import('./reminderHandler');
        await handleReminderModalSubmit(interaction);
        return;
      }
      if (interaction.customId === 'birthday_create_modal') {
        const { handleBirthdayModalSubmit } = await import('./birthdayModalHandler');
        await handleBirthdayModalSubmit(interaction);
        return;
      }
    }

    if (!interaction.isChatInputCommand()) {
      // Buton veya menü etkileşimlerini kontrol et
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (interaction.isButton() && interaction.customId.startsWith('music:')) {
          const { handleMusicButton } = await import('./musicButtonHandler');
          await handleMusicButton(interaction);
          return;
        }
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('music:')) {
          const { handleMusicSelect } = await import('./musicButtonHandler');
          await handleMusicSelect(interaction);
          return;
        }
        if (interaction.isButton() && interaction.customId.startsWith('deveng:auto:')) {
          const { handleAutomationButton } = await import('../automation/automationEngine');
          await handleAutomationButton(interaction);
          return;
        }
        await handleReactionRoleInteraction(interaction);
      }
      return;
    }

    const commandName = interaction.commandName;
    const isMusicCommand = commandName.startsWith('music-');
    if (isMusicCommand) {
      const { permissionService } = await import('../music/permissionService');
      const permCheck = permissionService
        .canUseMusic(interaction)
        .catch((error): { allowed: boolean; reason?: string } => {
          logError('interactionCreate:musicPermissionCheck', error, 'warn');
          return { allowed: true };
        });
      const permission = await Promise.race<{ allowed: boolean; reason?: string }>([
        permCheck,
        new Promise<{ allowed: boolean }>((resolve) => setTimeout(() => resolve({ allowed: true }), 2500)),
      ]);
      if (!permission.allowed) {
        await interaction.reply({ content: permission.reason ?? 'Bu işlem için yetkiniz yok.', flags: MessageFlags.Ephemeral }).catch((error) => logError('interactionCreate:musicPermissionNotice', error, 'debug'));
        return;
      }
    }

    // Komutları yükle ve çalıştır
    try {
    if (commandName === 'tepki-rol-ayarla') {
      const { default: command } = await import('../commands/tepkiRol');
      await command.execute(interaction);
    } else if (commandName === 'tepki-sistem-gönder') {
      const { default: command } = await import('../commands/tepkiSistemGonder');
      await command.execute(interaction);
    } else if (commandName === 'talep-panel-gönder') {
      const { default: command } = await import('../commands/talepPanelGonder');
      await command.execute(interaction);
    } else if (commandName === 'gömülü-mesaj') {
      const { default: command } = await import('../commands/gomuluMesaj');
      await command.execute(interaction);
    } else if (commandName === 'help') {
      const { default: command } = await import('../commands/help');
      await command.execute(interaction);
    } else if (commandName === 'hatirlatici') {
      const { default: command } = await import('../commands/hatirlatici');
      await command.execute(interaction);
    } else if (commandName === 'doğum-günü') {
      const { default: command } = await import('../commands/dogumgunu');
      await command.execute(interaction);
    } else if (commandName === 'poll') {
      const { default: command } = await import('../commands/poll');
      await command.execute(interaction);
    } else if (commandName === 'poll-end') {
      const { default: command } = await import('../commands/pollEnd');
      await command.execute(interaction);
    } else if (commandName === 'music-play') {
      const { default: command } = await import('../commands/play');
      await command.execute(interaction);
    } else if (commandName === 'music-queue') {
      const { default: command } = await import('../commands/queue');
      await command.execute(interaction);
    } else if (commandName === 'music-pause') {
      const { default: command } = await import('../commands/pause');
      await command.execute(interaction);
    } else if (commandName === 'music-resume') {
      const { default: command } = await import('../commands/resume');
      await command.execute(interaction);
    } else if (commandName === 'music-skip') {
      const { default: command } = await import('../commands/skip');
      await command.execute(interaction);
    } else if (commandName === 'music-stop') {
      const { default: command } = await import('../commands/stop');
      await command.execute(interaction);
    } else if (commandName === 'music-nowplaying') {
      const { default: command } = await import('../commands/nowplaying');
      await command.execute(interaction);
    } else if ((await import('../commands/advancedMusicCommands')).advancedMusicCommands[commandName]) {
      const { advancedMusicCommands } = await import('../commands/advancedMusicCommands');
      await advancedMusicCommands[commandName].execute(interaction);
    } else if (commandName.startsWith('voice-')) {
      // Voice komutları
      if (commandName === 'voice-owner') {
        const { default: command } = await import('../commands/voiceOwner');
        await command.execute(interaction);
      } else if (commandName === 'voice-rename') {
        const { default: command } = await import('../commands/voiceRename');
        await command.execute(interaction);
      } else if (commandName === 'voice-limit') {
        const { default: command } = await import('../commands/voiceLimit');
        await command.execute(interaction);
      } else if (commandName === 'voice-lock') {
        const { default: command } = await import('../commands/voiceLock');
        await command.execute(interaction);
      } else if (commandName === 'voice-unlock') {
        const { default: command } = await import('../commands/voiceUnlock');
        await command.execute(interaction);
      } else if (commandName === 'voice-hide') {
        const { default: command } = await import('../commands/voiceHide');
        await command.execute(interaction);
      } else if (commandName === 'voice-reveal') {
        const { default: command } = await import('../commands/voiceReveal');
        await command.execute(interaction);
      } else if (commandName === 'voice-transfer') {
        const { default: command } = await import('../commands/voiceTransfer');
        await command.execute(interaction);
      } else if (commandName === 'voice-claim') {
        const { default: command } = await import('../commands/voiceClaim');
        await command.execute(interaction);
      } else if (commandName === 'voice-kick') {
        const { default: command } = await import('../commands/voiceKick');
        await command.execute(interaction);
      } else if (commandName === 'voice-ban') {
        const { default: command } = await import('../commands/voiceBan');
        await command.execute(interaction);
      } else if (commandName === 'voice-unban') {
        const { default: command } = await import('../commands/voiceUnban');
        await command.execute(interaction);
      } else if (commandName === 'voice-clean') {
        const { default: command } = await import('../commands/voiceClean');
        await command.execute(interaction);
      }
    } else {
      const handled = await handleCustomCommandSlash(interaction);
      if (!handled && interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Bilinmeyen komut.', flags: MessageFlags.Ephemeral }).catch((error) => logError('interactionCreate:unknownCommandNotice', error, 'debug'));
      }
    }
    } catch (dispatchError) {
      if (isMusicCommand && interaction.isRepliable() && interaction.deferred && !interaction.replied) {
        const content = dispatchError instanceof Error && dispatchError.message
          ? dispatchError.message.slice(0, 1900)
          : 'Müzik işlemi tamamlanamadı.';
        console.error('[ERROR] Müzik komutu hatası:', dispatchError);
        await interaction.editReply({ content }).catch((error) => logError('interactionCreate:musicErrorEditReply', error, 'debug'));
        return;
      }
      throw dispatchError;
    }
  } catch (error) {
    console.error('[ERROR] InteractionCreate event handler hatası:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Bir hata oluştu!', flags: MessageFlags.Ephemeral }).catch((error) => logError('interactionCreate:handlerErrorReply', error, 'debug'));
    }
  }
}

async function handleReactionRoleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isButton()) {
      const customId = interaction.customId;
      // Ticket panel butonları
      if (customId.startsWith('ticket_create_')) {
        const { handleTicketCreate } = await import('./ticketHandler');
        await handleTicketCreate(interaction);
        return;
      }
      // Ticket yönetim butonları
      if (customId.startsWith('ticket_')) {
        const { handleTicketButton } = await import('./ticketHandler');
        await handleTicketButton(interaction);
        return;
      }
      // Reaction role butonları
      await handleReactionRoleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      // Ticket panel menüleri
      if (customId.startsWith('ticket_create_menu_')) {
        const { handleTicketCreateMenu } = await import('./ticketHandler');
        await handleTicketCreateMenu(interaction);
        return;
      }
      // Reaction role menüleri
      await handleReactionRoleMenu(interaction);
    }
  } catch (error) {
    console.error('[ERROR] Interaction hatası:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Bir hata oluştu!', flags: MessageFlags.Ephemeral }).catch((error) => logError('interactionCreate:reactionRoleErrorReply', error, 'debug'));
    }
  }
}

