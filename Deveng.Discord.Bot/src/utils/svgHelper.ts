/**
 * SVG yardımcı fonksiyonları
 */

/**
 * Metni SVG için güvenli hale getirir (HTML entity escape)
 * @param text Orijinal metin
 * @returns Escape edilmiş metin
 */
export function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

