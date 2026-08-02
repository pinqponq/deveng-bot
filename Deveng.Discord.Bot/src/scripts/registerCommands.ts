import '../loadEnv';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { loadConfig } from '../utils/config';
import { registerCommands } from '../utils/registerCommands';

// Bot token'ından client ID'yi almak için bot'u başlat
async function main() {
  try {
    const config = loadConfig();

    // Client ID almak için tek seferlik client.
    const tempClient = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    tempClient.once(Events.ClientReady, async (readyClient) => {
      try {
        console.log(`[INFO] Bot Application ID: ${readyClient.application.id}`);
        await registerCommands(readyClient.application.id);
        console.log('[INFO] Komutlar başarıyla kaydedildi!');
        await tempClient.destroy();
        process.exit(0);
      } catch (error) {
        console.error('[ERROR] Komut kayıt hatası:', error);
        await tempClient.destroy().catch(() => undefined);
        process.exit(1);
      }
    });

    await tempClient.login(config.token);
  } catch (error) {
    console.error('[ERROR] Komut kayıt hatası:', error);
    process.exit(1);
  }
}

main();
