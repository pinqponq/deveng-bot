import { MessageFlags, type ButtonInteraction, type ChatInputCommandInteraction, type StringSelectMenuInteraction } from 'discord.js';
import { logError } from './logger';

export type RepliableBotInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ChatInputCommandInteraction;

/** 10062 Unknown interaction / 40060 Interaction already acknowledged */
export function isInteractionExpiredOrAcked(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: number; rawError?: { code?: number } };
  const code = e.code ?? e.rawError?.code;
  return code === 10062 || code === 40060;
}

/**
 * Interaction'ı güvenli defer eder.
 * @returns true = defer başarılı; false = zaten yanıtlı / süresi dolmuş (işlem sessizce bırakılmalı)
 */
export async function safeDeferReply(
  interaction: RepliableBotInteraction,
  ephemeral = true,
  context = 'interactionSafe:deferReply',
): Promise<boolean> {
  if (interaction.deferred || interaction.replied) {
    return false;
  }
  try {
    await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);
    return true;
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError(context, error, 'debug');
      return false;
    }
    throw error;
  }
}

/** Ephemeral reply; 10062/40060 yutulur. */
export async function safeEphemeralReply(
  interaction: RepliableBotInteraction,
  content: string,
  context = 'interactionSafe:reply',
): Promise<boolean> {
  if (interaction.deferred || interaction.replied) return false;
  if (!interaction.isRepliable()) return false;
  try {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    return true;
  } catch (error) {
    if (isInteractionExpiredOrAcked(error)) {
      logError(context, error, 'debug');
      return false;
    }
    throw error;
  }
}
