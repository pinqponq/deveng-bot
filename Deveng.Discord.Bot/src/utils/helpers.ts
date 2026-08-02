/**
 * Yardımcı fonksiyonlar
 */

/**
 * Hex string'i number'a çevirir
 * @param hexColor Hex renk kodu (#FF0000 veya FF0000 formatında)
 * @param defaultValue Varsayılan değer (hex parse edilemezse)
 * @returns Renk numarası
 */
export function parseHexColor(hexColor: string | null | undefined, defaultValue: number): number {
  if (!hexColor) {
    return defaultValue;
  }

  const cleanHex = hexColor.startsWith('#') ? hexColor.replace('#', '') : hexColor;
  const color = parseInt(cleanHex, 16);
  return isNaN(color) ? defaultValue : color;
}

/**
 * SQL boolean değerini JavaScript boolean'a çevirir
 * @param value SQL'den gelen değer (true, false, 1, 0, null, undefined)
 * @returns JavaScript boolean değeri
 */
export function sqlToBoolean(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (value === false || value === 0 || value === null || value === undefined) {
    return false;
  }
  // Diğer durumlar için false döndür
  return false;
}

/**
 * Placeholder'ları değiştirir
 * @param text Orijinal metin
 * @param replacements Placeholder değerleri
 */
export function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

