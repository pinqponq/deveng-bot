/** Discord'un önerdiği guild → shard dağılımı (snowflake >> 22) % shardCount. */
export function shardIdForGuild(guildId: string, shardCount: number): number {
  return Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
}
