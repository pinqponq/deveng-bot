/** Panel ile uyumlu otomasyon kuralı (API yanıtı) */
export interface GuildAutomationApiRow {
  id: number;
  guildId: string;
  name: string;
  enabled: boolean;
  definitionJson: string;
  retryOnFailure: boolean;
}

export interface AutomationDefinition {
  version?: number;
  trigger: { type: string; params?: Record<string, unknown> };
  conditions: Array<{ id: string; type: string; params?: Record<string, unknown> }>;
  conditionLogic?: string;
  actions: Array<{ id: string; type: string; params?: Record<string, unknown> }>;
}
