import { ActivityType, Client } from 'discord.js';

export interface PersonalizationConfig {
    botName?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    presenceStatus?: string;
    activityType?: string;
    activityText?: string | null;
    personalizationEnabled?: boolean;
}

export interface ApplyPersonalizationResult {
    success: boolean;
    warnings: string[];
    error?: string;
}

async function imageUrlToBuffer(url: string): Promise<Buffer> {
    if (url.startsWith('data:')) {
        const commaIndex = url.indexOf(',');
        if (commaIndex === -1) throw new Error('Geçersiz data URL');
        const base64 = url.slice(commaIndex + 1);
        return Buffer.from(base64, 'base64');
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Görsel indirilemedi: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

function mapPresenceStatus(status: string | undefined): 'online' | 'idle' | 'dnd' | 'invisible' {
    switch ((status ?? 'online').toLowerCase()) {
        case 'idle':
            return 'idle';
        case 'dnd':
            return 'dnd';
        case 'invisible':
            return 'invisible';
        default:
            return 'online';
    }
}

function mapActivityType(type: string | undefined): ActivityType {
    switch ((type ?? 'Playing').toLowerCase()) {
        case 'streaming':
            return ActivityType.Streaming;
        case 'listening':
            return ActivityType.Listening;
        case 'watching':
            return ActivityType.Watching;
        case 'competing':
            return ActivityType.Competing;
        case 'custom':
            return ActivityType.Custom;
        default:
            return ActivityType.Playing;
    }
}

function activityTypeLabel(type: string | undefined): string {
    switch ((type ?? 'Playing').toLowerCase()) {
        case 'streaming':
            return 'Streaming';
        case 'listening':
            return 'Listening to';
        case 'watching':
            return 'Watching';
        case 'competing':
            return 'Competing in';
        default:
            return 'Playing';
    }
}

export async function applyPersonalization(
    client: Client,
    config: PersonalizationConfig
): Promise<ApplyPersonalizationResult> {
    const warnings: string[] = [];

    if (!config.personalizationEnabled) {
        return { success: true, warnings };
    }

    if (!client.user) {
        return { success: false, warnings, error: 'Bot kullanıcısı hazır değil' };
    }

    try {
        if (config.botName?.trim()) {
            try {
                await client.user.setUsername(config.botName.trim());
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                warnings.push(`Bot adı güncellenemedi: ${message}`);
            }
        }

        if (config.avatarUrl?.trim()) {
            try {
                const buffer = await imageUrlToBuffer(config.avatarUrl.trim());
                await client.user.setAvatar(buffer);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                warnings.push(`Avatar güncellenemedi: ${message}`);
            }
        }

        if (config.bannerUrl?.trim()) {
            try {
                const buffer = await imageUrlToBuffer(config.bannerUrl.trim());
                await client.user.setBanner(buffer);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                warnings.push(`Banner güncellenemedi: ${message}`);
            }
        }

        const status = mapPresenceStatus(config.presenceStatus);
        const activityType = mapActivityType(config.activityType);
        const activityText = config.activityText?.trim() || activityTypeLabel(config.activityType);

        await client.user.setPresence({
            status,
            activities: activityText
                ? [{ name: activityText, type: activityType }]
                : [],
        });

        return { success: true, warnings };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, warnings, error: message };
    }
}

export async function fetchPersonalizationFromApi(
    apiBaseUrl: string,
    botId: number,
    headers: Record<string, string>
): Promise<PersonalizationConfig | null> {
    try {
        const response = await fetch(
            `${apiBaseUrl}/api/CustomBot/internal/${botId}/personalization`,
            { headers }
        );
        if (!response.ok) return null;
        return (await response.json()) as PersonalizationConfig;
    } catch {
        return null;
    }
}
