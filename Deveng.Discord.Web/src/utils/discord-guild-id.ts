/**
 * Discord guild (snowflake) id: trim, strip wrapping quotes from bozuk localStorage/URL,
 * yalnızca rakam ve makul uzunlukta doğrula.
 */
export function normalizeDiscordGuildId(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let s = String(raw).trim()
  if (s.length === 0) return null
  try {
    s = decodeURIComponent(s).trim()
  } catch {
    /* bozuk % dizilimi — ham s ile devam */
  }
  while (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
    if (s.length === 0) return null
  }
  if (!/^\d{17,22}$/.test(s)) return null
  return s
}
