# Adding a guild feature (end-to-end)

English guide for humans and AI agents (Claude / Cursor). Türkçe: [`ADDING-FEATURES.tr.md`](ADDING-FEATURES.tr.md).

A feature is **done** only when panel + API + bot/worker + persisted data work together. Sidebar-only or placeholder screens are not features.

## Architecture

```text
Browser → Web (Vite SPA + Express BFF)
              ↓ session cookie / API proxy
         API (.NET) → Postgres / Redis
              ↕ HMAC
         Bot (discord.js) ↔ Discord Gateway
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Panel UI | `Deveng.Discord.Web/src/features/bot-*` | Forms, tables, loading/empty/error |
| Routes | `Deveng.Discord.Web/src/routes/_authenticated/` | TanStack Router file routes |
| Sidebar | `Deveng.Discord.Web/src/components/layout/data/sidebar-data.ts` | Nav + `featureName` |
| Feature gate | `Deveng.Discord.Web/src/hooks/use-guild-features.ts` | Sidebar ↔ API `FeatureName` map |
| API client | `Deveng.Discord.Web/src/lib/api/` | Typed fetch helpers |
| API | `Deveng.Discord/Deveng.Discord.Api/Controllers/` | REST + authz |
| Services / models | `Deveng.Discord.Api/Services`, `Models`, `DTOs` | Business logic |
| DB | `Deveng.Discord.Infrastructure` + migrations | Persistence |
| Bot | `Deveng.Discord.Bot/src/` | Events, slash commands, API calls |

## End-to-end checklist

Copy this into a PR or agent task list:

1. **Name the feature** — API/DB PascalCase (e.g. `Welcome`) and sidebar kebab/slug (e.g. `welcome`).
2. **Data** — entity + EF mapping; migration if schema changes.
3. **API** — controller with `[DiscordAuth]` (or explicit `[AllowAnonymous]` only if intentional); always scope by `guildId`; never leak secrets in errors.
4. **GuildFeatures** — enable/disable via `GuildFeatureController`; register mapping in `use-guild-features.ts` (`API_FEATURE_NAME_TO_SIDEBAR`).
5. **Web panel** — `features/bot-<name>/`, authenticated route, sidebar entry with `featureName`, loading/empty/error/success states.
6. **i18n** — at least `en` + `tr` keys for nav and page strings.
7. **Bot** — event and/or slash command; call API with HMAC headers; respect feature enabled flag.
8. **Build** — API `dotnet build`, Web `npm run build`, Bot `npm run build`.
9. **Honesty** — no `ComingSoon` / empty roadmap page in the sidebar for this feature.

## Reference implementations

| Feature | Panel | API | Bot |
|---------|-------|-----|-----|
| Welcome | `Deveng.Discord.Web/src/features/bot-welcome/` | `WelcomeController.cs`, `WelcomeService.cs` | `events/guildMemberAdd.ts` |
| Tickets | `features/bot-ticket-panel/` | `TicketPanelController.cs`, `TicketController.cs` | ticket handlers under `events/` / utils |
| Giveaway | `features/bot-giveaway/` | `GiveawayController.cs` | giveaway-related bot paths |

Start from **Welcome** for a simple config+event feature. Use **Ticket** when you need panels + interactions.

## Feature name mapping

Sidebar `featureName` must match `use-guild-features.ts`. API stores PascalCase names (`Welcome`, `TicketPanel`, `Giveaway`, …). When adding a new feature, update **both** `API_FEATURE_NAME_TO_SIDEBAR` and `sidebar-data.ts`.

## Anti-patterns

- Adding a sidebar link with no API/bot path
- Shipping `RoadmapFeaturePage` / `ComingSoon` as if the feature works
- Hardcoding tokens or production hosts
- New `{guildId}/{id}` routes without ownership checks
- Returning `ex.Message` / SQL details to clients

## Example prompts (paste into Claude / Cursor)

### 1) New feature end-to-end

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

### 2) Wire sidebar ↔ GuildFeatures

```text
Wire feature "<slug>" so the sidebar green/enabled state uses GuildFeatures.

Update Deveng.Discord.Web/src/hooks/use-guild-features.ts (API_FEATURE_NAME_TO_SIDEBAR)
and sidebar-data.ts featureName. Confirm GuildFeatureController enable/disable
uses the PascalCase API name. Do not change unrelated features.
```

### 3) Slash command → existing API

```text
Add a Discord slash command in Deveng.Discord.Bot that calls the existing
API endpoint <METHOD> <path> for the current guild.

Reuse apiClient HMAC headers, respect feature enablement, handle Discord
interaction defer/ack correctly, and keep user-facing strings consistent
with panel locale when possible. No new env secrets unless required.
```

### 4) AuthZ fix on new endpoint

```text
Review the new API endpoint under Controllers for guild-scoped authz.
Ensure DiscordAuth (or explicit AllowAnonymous), guild ownership checks on
entity ids, no secret leakage in errors/logs, and DTO validation.
Add or update a test if Api.Tests already covers similar controllers.
```

## Builds (Windows PowerShell)

```powershell
dotnet build Deveng.Discord/Deveng.Discord.Api/Deveng.Discord.Api.csproj -c Release
cd Deveng.Discord.Web; npm run build
cd ..\Deveng.Discord.Bot; npm run build
```

See also [`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`LOCAL-SETUP.md`](LOCAL-SETUP.md).
