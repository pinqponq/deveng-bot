import type { Client } from 'discord.js';
import { shardIdForGuild } from '../utils/shardRouting';
import type { PendingReminderPayload } from './reminderDelivery';
import { deliverReminderOnShard } from './reminderDelivery';

export async function dispatchReminderForShard(
  host: Client,
  reminder: PendingReminderPayload,
  skipGuild?: (guildId: string) => boolean
): Promise<void> {
  if (skipGuild?.(reminder.guildId)) return;

  if (!host.shard) {
    await deliverReminderOnShard(host, reminder);
    return;
  }

  const sid = shardIdForGuild(reminder.guildId, host.shard.count);
  await host.shard.broadcastEval(
    async (inner: Client, ctx: { rem: PendingReminderPayload }) => {
      const { deliverReminderOnShard: deliver } = await import('./reminderDelivery.js');
      await deliver(inner, ctx.rem);
    },
    { shard: sid, context: { rem: reminder } }
  );
}
