/**
 * Uygulama sabitleri
 */

// Veritabanı timeout değerleri (milisaniye)
export const DB_CONNECT_TIMEOUT = 30000;
export const DB_REQUEST_TIMEOUT = 30000;
export const DB_IDLE_TIMEOUT = 30000;
// 10k kullanıcı için optimize edilmiş pool ayarları
export const DB_POOL_MAX = 50; // Maksimum bağlantı sayısı
export const DB_POOL_MIN = 5; // Minimum bağlantı sayısı (her zaman açık)

// Cache ayarları
export const CACHE_TTL = 300000; // 5 dakika (milisaniye)
export const CACHE_MAX_SIZE = 10000; // Maksimum cache boyutu (guild sayısı)

// Welcome card boyutları
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 400;
export const CARD_AVATAR_SIZE = 200;

// Embed varsayılan renkleri
export const EMBED_COLOR_WELCOME = 0x00ff00; // Yeşil
export const EMBED_COLOR_GOODBYE = 0xff0000; // Kırmızı

