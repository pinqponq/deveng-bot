import { TextChannel, EmbedBuilder } from 'discord.js';

/**
 * Mesaj gönderme yardımcı fonksiyonları
 */

export async function sendMessage(
  channel: TextChannel,
  content: string | EmbedBuilder,
  isEmbed: boolean,
  errorContext: string
): Promise<void> {
  try {
    if (isEmbed) {
      if (content instanceof EmbedBuilder) {
        await channel.send({ embeds: [content] });
      } else {
        throw new Error('Embed beklenirken string gönderildi');
      }
    } else {
      if (typeof content === 'string') {
        await channel.send(content);
      } else {
        throw new Error('String beklenirken Embed gönderildi');
      }
    }
  } catch (error) {
    console.error(`[ERROR] ${errorContext}:`, error);
  }
}

