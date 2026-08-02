# Agent guide — Deveng Bot

Short entry point for Claude Code, Cursor, and similar agents.

## Before you change code

1. Read [`docs/ADDING-FEATURES.md`](docs/ADDING-FEATURES.md) (Türkçe: [`docs/ADDING-FEATURES.tr.md`](docs/ADDING-FEATURES.tr.md)).
2. Prefer end-to-end features: **panel + API + bot/worker + data**. No sidebar-only placeholders.
3. Never commit secrets (`.env`, tokens, filled `appsettings.Development.json`).
4. Do not rename `Deveng.Discord.*` folders/namespaces unless explicitly asked.

## Repo map

| Area | Path |
|------|------|
| API | `Deveng.Discord/Deveng.Discord.Api` |
| Infrastructure / EF | `Deveng.Discord/Deveng.Discord.Infrastructure` |
| Web panel + BFF | `Deveng.Discord.Web` |
| Bot | `Deveng.Discord.Bot` |
| Compose | `compose.yaml` + root `.env.example` |

## Builds (Windows PowerShell)

```powershell
dotnet build Deveng.Discord/Deveng.Discord.Api/Deveng.Discord.Api.csproj -c Release
cd Deveng.Discord.Web; npm run build
cd ..\Deveng.Discord.Bot; npm run build
```

After code changes that affect these projects, run the relevant builds before finishing.

## Auth / security defaults

- New API endpoints: `[DiscordAuth]` or explicit `[AllowAnonymous]` (deny-by-default).
- Guild-scoped resources: verify `guildId` ownership.
- Bot↔API: keep HMAC headers (`BOT_SHARED_SECRET`).
- See [`SECURITY.md`](SECURITY.md) and the PR template security checklist.

## More docs

- Setup: [`README.md`](README.md), [`docs/LOCAL-SETUP.md`](docs/LOCAL-SETUP.md)
- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Docs index: [`docs/README.md`](docs/README.md)
