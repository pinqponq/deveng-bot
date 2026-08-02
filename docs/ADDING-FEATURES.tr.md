# Özellik ekleme (uçtan uca)

Claude / Cursor ve katkıcılar için rehber. English: [`ADDING-FEATURES.md`](ADDING-FEATURES.md).

Bir özellik ancak **panel + API + bot/worker + kalıcı veri** birlikte çalışıyorsa biter. Yalnızca sidebar veya placeholder ekran özellik sayılmaz.

## Mimari

```text
Tarayıcı → Web (Vite SPA + Express BFF)
              ↓ session cookie / API proxy
         API (.NET) → Postgres / Redis
              ↕ HMAC
         Bot (discord.js) ↔ Discord Gateway
```

| Katman | Yol | Sorumluluk |
|--------|-----|------------|
| Panel UI | `Deveng.Discord.Web/src/features/bot-*` | Form, tablo, yükleniyor/boş/hata |
| Route | `Deveng.Discord.Web/src/routes/_authenticated/` | TanStack Router |
| Sidebar | `.../layout/data/sidebar-data.ts` | Nav + `featureName` |
| Feature gate | `.../hooks/use-guild-features.ts` | Sidebar ↔ API `FeatureName` |
| API client | `Deveng.Discord.Web/src/lib/api/` | Typed fetch |
| API | `Deveng.Discord.Api/Controllers/` | REST + yetki |
| Bot | `Deveng.Discord.Bot/src/` | Event / slash / API çağrısı |

## Uçtan uca checklist

1. **İsim** — API/DB PascalCase (`Welcome`) + sidebar slug (`welcome`)
2. **Veri** — entity + EF; gerekirse migration
3. **API** — `[DiscordAuth]`, `guildId` scope, hata sızıntısı yok
4. **GuildFeatures** — `use-guild-features.ts` mapping
5. **Panel** — `features/bot-*`, route, sidebar, durum ekranları
6. **i18n** — en + tr
7. **Bot** — event/komut + HMAC + özellik açık mı kontrolü
8. **Build** — API / Web / Bot
9. **Dürüstlük** — ComingSoon / boş roadmap yok

## Referans implementasyonlar

| Özellik | Panel | API | Bot |
|---------|-------|-----|-----|
| Welcome | `features/bot-welcome/` | `WelcomeController.cs` | `events/guildMemberAdd.ts` |
| Ticket | `features/bot-ticket-panel/` | `TicketPanelController.cs` | ticket event/utils |
| Giveaway | `features/bot-giveaway/` | `GiveawayController.cs` | ilgili bot yolları |

Basit config+event için **Welcome** ile başlayın.

## Anti-pattern’ler

- API/bot olmayan sidebar linki
- `ComingSoon` / `RoadmapFeaturePage` ile “bitti” hissi
- Token / prod host hardcode
- Ownership kontrolsüz `{guildId}/{id}` rotası

## Örnek prompt’lar (Claude / Cursor’a yapıştırın)

Prompt’lar İngilizce bırakılmıştır; ajanlar için daha güvenilir sonuç verir.

### 1) Yeni özellik uçtan uca

```text
Add a new guild feature named <FeatureName> (sidebar slug: <slug>) to Deveng Bot.

Follow the Welcome pattern end-to-end:
- API: controller + service + DTO + DiscordAuth + guild scope
- Web: features/bot-<slug>, authenticated route, sidebar-data.ts entry, use-guild-features.ts mapping
- Bot: event or slash command that loads config from the API
- i18n: en + tr keys
- Do not add ComingSoon placeholders
- Keep secrets in env only
- Run builds for API, Web, and Bot when done

Read docs/ADDING-FEATURES.md and AGENTS.md first.
```

### 2) Sidebar ↔ GuildFeatures

```text
Wire feature "<slug>" so the sidebar green/enabled state uses GuildFeatures.

Update Deveng.Discord.Web/src/hooks/use-guild-features.ts (API_FEATURE_NAME_TO_SIDEBAR)
and sidebar-data.ts featureName. Confirm GuildFeatureController enable/disable
uses the PascalCase API name. Do not change unrelated features.
```

### 3) Slash komut → mevcut API

```text
Add a Discord slash command in Deveng.Discord.Bot that calls the existing
API endpoint <METHOD> <path> for the current guild.

Reuse apiClient HMAC headers, respect feature enablement, handle Discord
interaction defer/ack correctly, and keep user-facing strings consistent
with panel locale when possible. No new env secrets unless required.
```

### 4) AuthZ kontrolü

```text
Review the new API endpoint under Controllers for guild-scoped authz.
Ensure DiscordAuth (or explicit AllowAnonymous), guild ownership checks on
entity ids, no secret leakage in errors/logs, and DTO validation.
Add or update a test if Api.Tests already covers similar controllers.
```

## Build (Windows PowerShell)

```powershell
dotnet build Deveng.Discord/Deveng.Discord.Api/Deveng.Discord.Api.csproj -c Release
cd Deveng.Discord.Web; npm run build
cd ..\Deveng.Discord.Bot; npm run build
```

Ayrıca: [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`LOCAL-SETUP.md`](LOCAL-SETUP.md).
