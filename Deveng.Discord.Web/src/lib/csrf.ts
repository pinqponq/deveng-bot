const CSRF_COOKIE = 'deveng-csrf'
const CSRF_HEADER = 'x-csrf-token'
const CSRF_UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** BFF csrf-token cookie'sini okur (HttpOnly olmayan double-submit cookie). */
export function readCsrfCookie(): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null
  const prefix = `${CSRF_COOKIE}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length))
  }
  return null
}

/** Doğrudan `fetch` kullanan modüller için BFF ile aynı CSRF başlığı. */
export function csrfHeadersForMethod(method: string): Record<string, string> {
  const m = method.toUpperCase()
  if (!CSRF_UNSAFE_METHODS.has(m)) return {}
  const token = readCsrfCookie()
  if (!token) return {}
  return { [CSRF_HEADER]: token }
}
