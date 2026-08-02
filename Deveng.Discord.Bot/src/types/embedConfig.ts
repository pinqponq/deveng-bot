export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** Discord embed yapılandırması — panel/API JSON ile uyumlu camelCase model. */
export interface EmbedConfig {
  isEmbed: boolean;
  message?: string | null;
  embedTitle?: string | null;
  embedTitleUrl?: string | null;
  embedDescription?: string | null;
  embedColor?: string | null;
  embedAuthorName?: string | null;
  embedAuthorIcon?: string | null;
  embedAuthorUrl?: string | null;
  embedThumbnail?: string | null;
  embedImage?: string | null;
  embedFooter?: string | null;
  embedFooterIcon?: string | null;
  embedUseTimestamp?: boolean;
  embedFieldsJson?: string | null;
}

/** API yanıtlarındaki opsiyonel genişletilmiş embed alanları. */
export type EmbedExtendedOptionalFields = Pick<
  EmbedConfig,
  | 'embedTitleUrl'
  | 'embedAuthorName'
  | 'embedAuthorIcon'
  | 'embedAuthorUrl'
  | 'embedFooterIcon'
  | 'embedUseTimestamp'
  | 'embedFieldsJson'
>;
