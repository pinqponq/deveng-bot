/** Discord CDN: özel avatar veya snowflake'e göre varsayılan embed avatarı */
export function discordCdnAvatarUrl(
  userId: string | null | undefined,
  avatarHash: string | null | undefined,
  size = 64,
): string {
  const uid = (userId ?? '').trim()
  if (!uid) return ''
  const hash = avatarHash?.trim()
  if (hash) {
    const ext = hash.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${uid}/${hash}.${ext}?size=${size}`
  }
  try {
    const idx = Number((BigInt(uid) >> 22n) % 6n)
    const i = Number.isFinite(idx) && idx >= 0 && idx <= 5 ? idx : 0
    return `https://cdn.discordapp.com/embed/avatars/${i}.png`
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
}
