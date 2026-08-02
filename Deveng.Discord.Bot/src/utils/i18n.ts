export const supportedLocales = [
  'en', 'hu', 'cs', 'ko', 'it', 'nl', 'uk', 'vi', 'pl', 'de', 'pt-BR', 'th', 'tr', 'ro',
  'zh-TW', 'ru', 'es-419', 'es-ES', 'fr', 'sv', 'zh-CN', 'ja', 'ar', 'hr', 'cnr',
] as const;
export type SupportedLocale = typeof supportedLocales[number];

const fallbackLocale: SupportedLocale = 'tr';

const DISCORD_LOCALE_MAP: Record<string, SupportedLocale> = {
  en: 'en', 'en-us': 'en',
  hu: 'hu', cs: 'cs', ko: 'ko', it: 'it', nl: 'nl', uk: 'uk', vi: 'vi', pl: 'pl', de: 'de',
  'pt-br': 'pt-BR', pt: 'pt-BR', th: 'th', tr: 'tr', ro: 'ro',
  'zh-tw': 'zh-TW', zh: 'zh-TW', 'zh-cn': 'zh-CN',
  ru: 'ru', 'es-419': 'es-419', 'es-la': 'es-419', 'es-es': 'es-ES', es: 'es-ES',
  fr: 'fr', sv: 'sv', ja: 'ja', ar: 'ar', hr: 'hr', cnr: 'cnr',
};

const translations: Record<SupportedLocale, Record<string, string>> = Object.fromEntries(
  supportedLocales.map((locale) => [locale, {}])
) as Record<SupportedLocale, Record<string, string>>;

const COMMON_KEYS = {
  guild_only: 'common.guild_only',
  api_not_configured: 'common.api_not_configured',
  generic_error: 'common.generic_error',
} as const;

const COMMON_TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  tr: {
    [COMMON_KEYS.guild_only]: 'Bu komut sadece sunucularda kullanılabilir!',
    [COMMON_KEYS.api_not_configured]: 'API bağlantısı yapılandırılmamış!',
    [COMMON_KEYS.generic_error]: 'Bir hata oluştu!',
  },
  en: {
    [COMMON_KEYS.guild_only]: 'This command can only be used in servers!',
    [COMMON_KEYS.api_not_configured]: 'API connection is not configured!',
    [COMMON_KEYS.generic_error]: 'An error occurred!',
  },
  fr: {
    [COMMON_KEYS.guild_only]: 'Cette commande ne peut être utilisée que sur des serveurs !',
    [COMMON_KEYS.api_not_configured]: 'La connexion API n’est pas configurée !',
    [COMMON_KEYS.generic_error]: 'Une erreur est survenue !',
  },
  'es-ES': {
    [COMMON_KEYS.guild_only]: '¡Este comando solo se puede usar en servidores!',
    [COMMON_KEYS.api_not_configured]: '¡La conexión de API no está configurada!',
    [COMMON_KEYS.generic_error]: '¡Se produjo un error!',
  },
  'es-419': {
    [COMMON_KEYS.guild_only]: '¡Este comando solo se puede usar en servidores!',
    [COMMON_KEYS.api_not_configured]: '¡La conexión de API no está configurada!',
    [COMMON_KEYS.generic_error]: '¡Ocurrió un error!',
  },
  de: {
    [COMMON_KEYS.guild_only]: 'Dieser Befehl kann nur auf Servern verwendet werden!',
    [COMMON_KEYS.api_not_configured]: 'Die API-Verbindung ist nicht konfiguriert!',
    [COMMON_KEYS.generic_error]: 'Ein Fehler ist aufgetreten!',
  },
  ar: {
    [COMMON_KEYS.guild_only]: 'لا يمكن استخدام هذا الأمر إلا داخل الخوادم!',
    [COMMON_KEYS.api_not_configured]: 'اتصال واجهة API غير مكوّن!',
    [COMMON_KEYS.generic_error]: 'حدث خطأ!',
  },
  'pt-BR': {
    [COMMON_KEYS.guild_only]: 'Este comando só pode ser usado em servidores!',
    [COMMON_KEYS.api_not_configured]: 'A conexão da API não está configurada!',
    [COMMON_KEYS.generic_error]: 'Ocorreu um erro!',
  },
  'zh-TW': {
    [COMMON_KEYS.guild_only]: '此指令只能在伺服器中使用！',
    [COMMON_KEYS.api_not_configured]: '尚未設定 API 連線！',
    [COMMON_KEYS.generic_error]: '發生錯誤！',
  },
  'zh-CN': {
    [COMMON_KEYS.guild_only]: '此命令只能在服务器中使用！',
    [COMMON_KEYS.api_not_configured]: '尚未配置 API 连接！',
    [COMMON_KEYS.generic_error]: '发生错误！',
  },
  ru: {
    [COMMON_KEYS.guild_only]: 'Эту команду можно использовать только на серверах!',
    [COMMON_KEYS.api_not_configured]: 'Подключение к API не настроено!',
    [COMMON_KEYS.generic_error]: 'Произошла ошибка!',
  },
  ko: {
    [COMMON_KEYS.guild_only]: '이 명령어는 서버에서만 사용할 수 있습니다!',
    [COMMON_KEYS.api_not_configured]: 'API 연결이 구성되지 않았습니다!',
    [COMMON_KEYS.generic_error]: '오류가 발생했습니다!',
  },
  hr: {
    [COMMON_KEYS.guild_only]: 'Ova se naredba može koristiti samo na poslužiteljima!',
    [COMMON_KEYS.api_not_configured]: 'API veza nije konfigurirana!',
    [COMMON_KEYS.generic_error]: 'Došlo je do pogreške!',
  },
  cnr: {
    [COMMON_KEYS.guild_only]: 'Ova komanda se može koristiti samo na serverima!',
    [COMMON_KEYS.api_not_configured]: 'API veza nije podešena!',
    [COMMON_KEYS.generic_error]: 'Došlo je do greške!',
  },
  hu: {
    [COMMON_KEYS.guild_only]: 'Ez a parancs csak szervereken használható!',
    [COMMON_KEYS.api_not_configured]: 'Az API-kapcsolat nincs konfigurálva!',
    [COMMON_KEYS.generic_error]: 'Hiba történt!',
  },
  cs: {
    [COMMON_KEYS.guild_only]: 'Tento příkaz lze použít pouze na serverech!',
    [COMMON_KEYS.api_not_configured]: 'Připojení API není nakonfigurováno!',
    [COMMON_KEYS.generic_error]: 'Došlo k chybě!',
  },
  it: {
    [COMMON_KEYS.guild_only]: 'Questo comando può essere usato solo nei server!',
    [COMMON_KEYS.api_not_configured]: 'La connessione API non è configurata!',
    [COMMON_KEYS.generic_error]: 'Si è verificato un errore!',
  },
  nl: {
    [COMMON_KEYS.guild_only]: 'Dit commando kan alleen op servers worden gebruikt!',
    [COMMON_KEYS.api_not_configured]: 'API-verbinding is niet geconfigureerd!',
    [COMMON_KEYS.generic_error]: 'Er is een fout opgetreden!',
  },
  uk: {
    [COMMON_KEYS.guild_only]: 'Цю команду можна використовувати лише на серверах!',
    [COMMON_KEYS.api_not_configured]: 'Підключення API не налаштовано!',
    [COMMON_KEYS.generic_error]: 'Сталася помилка!',
  },
  vi: {
    [COMMON_KEYS.guild_only]: 'Lệnh này chỉ có thể dùng trong máy chủ!',
    [COMMON_KEYS.api_not_configured]: 'Kết nối API chưa được cấu hình!',
    [COMMON_KEYS.generic_error]: 'Đã xảy ra lỗi!',
  },
  pl: {
    [COMMON_KEYS.guild_only]: 'Tej komendy można używać tylko na serwerach!',
    [COMMON_KEYS.api_not_configured]: 'Połączenie API nie jest skonfigurowane!',
    [COMMON_KEYS.generic_error]: 'Wystąpił błąd!',
  },
  th: {
    [COMMON_KEYS.guild_only]: 'คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น!',
    [COMMON_KEYS.api_not_configured]: 'ยังไม่ได้กำหนดค่าการเชื่อมต่อ API!',
    [COMMON_KEYS.generic_error]: 'เกิดข้อผิดพลาด!',
  },
  ro: {
    [COMMON_KEYS.guild_only]: 'Această comandă poate fi folosită doar pe servere!',
    [COMMON_KEYS.api_not_configured]: 'Conexiunea API nu este configurată!',
    [COMMON_KEYS.generic_error]: 'A apărut o eroare!',
  },
  sv: {
    [COMMON_KEYS.guild_only]: 'Detta kommando kan endast användas på servrar!',
    [COMMON_KEYS.api_not_configured]: 'API-anslutningen är inte konfigurerad!',
    [COMMON_KEYS.generic_error]: 'Ett fel uppstod!',
  },
  ja: {
    [COMMON_KEYS.guild_only]: 'このコマンドはサーバーでのみ使用できます！',
    [COMMON_KEYS.api_not_configured]: 'API 接続が構成されていません！',
    [COMMON_KEYS.generic_error]: 'エラーが発生しました！',
  },
};

for (const locale of supportedLocales) {
  translations[locale] = {
    ...(COMMON_TRANSLATIONS.en ?? {}),
    ...(COMMON_TRANSLATIONS[locale] ?? {}),
  };
}

export function normalizeLocale(locale?: string | null): SupportedLocale {
  const normalized = locale?.trim().toLowerCase() ?? '';
  const mapped = DISCORD_LOCALE_MAP[normalized];
  if (mapped) return mapped;
  if (supportedLocales.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }
  return fallbackLocale;
}

export function t(locale: string | null | undefined, key: string, params?: Record<string, string | number>): string {
  const normalized = normalizeLocale(locale);
  const template = translations[normalized][key] ?? translations[fallbackLocale][key] ?? translations.en[key];
  if (!template) {
    console.warn(`[i18n] Eksik çeviri anahtarı: ${key} (${normalized})`);
    return '';
  }

  return Object.entries(params ?? {}).reduce(
    (value, [paramKey, paramValue]) => value.replaceAll(`{{${paramKey}}}`, String(paramValue)),
    template,
  );
}

export function getMissingTranslationKeys(): Record<SupportedLocale, string[]> {
  const fallbackKeys = Object.keys(translations[fallbackLocale]);

  return Object.fromEntries(
    supportedLocales.map((locale) => [
      locale,
      fallbackKeys.filter((key) => !translations[locale][key]),
    ])
  ) as Record<SupportedLocale, string[]>;
}
