/**
 * İzin verilen kullanıcı ID'leri (uygulama-içi yönetim sayfaları için).
 * Bu ID'lere sahip kullanıcılar özel sayfalara erişebilir.
 */
const ALLOWED_USER_IDS = ['1043133336845037608', '426773853981769758']

/**
 * Kullanıcının uygulama-içi yönetim sayfalarına erişim yetkisi var mı kontrol eder.
 * @param userId - Discord kullanıcı ID'si
 * @returns true eğer kullanıcının yetkisi varsa
 */
export function hasAdminAccess(userId: string | undefined | null): boolean {
  if (!userId) return false
  return ALLOWED_USER_IDS.includes(userId)
}
