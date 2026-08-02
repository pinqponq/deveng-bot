import '../loadEnv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { loadConfig } from '../utils/config';

// Bot token'ından client ID'yi al
async function getClientId() {
  try {
    const config = loadConfig();

    const tempClient = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    tempClient.once(Events.ClientReady, async (readyClient) => {
      try {
        console.log(`[INFO] Bot Application ID: ${readyClient.application.id}`);
        console.log(`[INFO] Bu ID'yi .env içinde BOT_CLIENT_ID olarak ayarlayabilirsiniz.`);
        await tempClient.destroy();
        process.exit(0);
      } catch (error) {
        console.error('[ERROR] Client ID alınamadı:', error);
        await tempClient.destroy().catch(() => undefined);
        process.exit(1);
      }
    });

    await tempClient.login(config.token);
  } catch (error) {
    console.error('[ERROR] Client ID alınamadı:', error);
    process.exit(1);
  }
}

getClientId();
