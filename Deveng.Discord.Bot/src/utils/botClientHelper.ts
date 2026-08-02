import { Client } from 'discord.js';
import { getClient } from '../botEntry';
import { customBotManager } from './customBotManager';

/**
 * Bot client'ı belirler: custom bot varsa onu kullan, yoksa ana bot'u kullan
 * @param botClientId Custom bot clientId (opsiyonel)
 * @returns Discord client instance
 * @throws Error if no client is available
 */
export function getBotClient(botClientId?: string): Client {
  let client: Client | null = null;
  
  // Custom bot varsa onu kullan
  if (botClientId) {
    const customBot = customBotManager.getBotByClientId(botClientId);
    if (customBot && customBot.client.isReady()) {
      client = customBot.client;
      console.log(`[BotClientHelper] Custom bot kullanılıyor (ClientId: ${botClientId})`);
    } else {
      console.warn(`[BotClientHelper] Custom bot bulunamadı veya hazır değil (ClientId: ${botClientId}), ana bot kullanılıyor`);
    }
  }
  
  // Custom bot yoksa veya hazır değilse ana bot'u kullan
  if (!client) {
    client = getClient();
  }
  
  if (!client) {
    throw new Error('Discord client bulunamadı');
  }
  
  return client;
}

/**
 * HTTP request'ten bot clientId'sini okur
 * @param headers HTTP request headers
 * @returns Bot clientId veya undefined
 */
export function getBotClientIdFromHeaders(headers: NodeJS.Dict<string | string[]>): string | undefined {
  const botClientId = headers['x-bot-clientid'] || headers['X-Bot-ClientId'];
  if (Array.isArray(botClientId)) {
    return botClientId[0];
  }
  return botClientId;
}
