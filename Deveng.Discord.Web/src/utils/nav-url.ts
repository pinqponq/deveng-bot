/**
 * Guild kapsamındaki sayfa URL'lerini /dashboard/:guildId/... formatına çevirir.
 * Guild bağımsız sayfalar (örn. /apps) olduğu gibi döner.
 */
const GUILD_INDEPENDENT_PREFIXES = ['/apps'] as const

export function resolveNavUrl(itemUrl: string, guildId: string | undefined): string {
  if (!guildId) {
    return itemUrl
  }
  if (itemUrl === '/dashboard') return `/dashboard/${guildId}`
  // Guild-bağımsız yollar: /apps, ...
  for (const prefix of GUILD_INDEPENDENT_PREFIXES) {
    if (itemUrl === prefix || itemUrl.startsWith(`${prefix}/`)) return itemUrl
  }
  // /bot-welcome vb. -> /dashboard/:guildId/bot-welcome
  const path = itemUrl.startsWith('/') ? itemUrl.slice(1) : itemUrl
  return `/dashboard/${guildId}/${path}`
}

/** TanStack Router `Link` / `navigate` için: pathname ve ayrı search (sorgu ?... router state'e böyle girer) */
export function splitHrefPathAndSearch(href: string): { to: string; search?: Record<string, string> } {
  const q = href.indexOf('?')
  if (q === -1) return { to: href }
  const to = href.slice(0, q)
  const search: Record<string, string> = {}
  new URLSearchParams(href.slice(q + 1)).forEach((value, key) => {
    search[key] = value
  })
  return Object.keys(search).length ? { to, search } : { to }
}
