# Contributing to Deveng Bot

Thanks for helping improve **Deveng Bot** (self-host panel + API + bot).

## Prerequisites

- .NET 10 SDK
- Node.js 20+ (22 recommended)
- Docker + Docker Compose (for full stack)
- A Discord application (bot + OAuth2) from the [Discord Developer Portal](https://discord.com/developers/applications)

## Local development

1. Copy `.env.example` → `.env` and fill required values (see root [`README.md`](README.md)).
2. Start infra + apps: `docker compose up --build`
3. Or run components separately:
   - API: `dotnet run --project Deveng.Discord/Deveng.Discord.Api`
   - Web: `cd Deveng.Discord.Web && npm ci && npm run dev`
   - Bot: `cd Deveng.Discord.Bot && npm ci && npm run dev`

## Checks before PR

```powershell
dotnet build Deveng.Discord/Deveng.Discord.Api/Deveng.Discord.Api.csproj -c Release
dotnet test Deveng.Discord/Deveng.Discord.Api.Tests/Deveng.Discord.Api.Tests.csproj -c Release
cd Deveng.Discord.Web; npm ci; npm run build
cd ..\Deveng.Discord.Bot; npm ci; npm run build
docker compose config
```

## Adding a feature

End-to-end guide (panel + API + bot) with example Claude/Cursor prompts:

- [`docs/ADDING-FEATURES.md`](docs/ADDING-FEATURES.md) (English)
- [`docs/ADDING-FEATURES.tr.md`](docs/ADDING-FEATURES.tr.md) (Türkçe)
- [`AGENTS.md`](AGENTS.md) for AI agents

## Guidelines

- Do not commit secrets, real `.env` files, or private deploy stacks.
- Feature honesty: sidebar entries must have working panel + API + bot/worker paths, or they stay out.
- Prefer env-based configuration over hardcoding hosts/passwords.
- Keep PRs focused; match existing code style.
- Use the PR template checklist for authz / security-sensitive changes.

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Türkçe (kısa)

Katkı için teşekkürler. Secret commit etmeyin; PR’ları odaklı tutun. Panelde görünen her özellik uçtan uca (panel + API + bot) çalışır olmalı. Özellik ekleme: [`docs/ADDING-FEATURES.tr.md`](docs/ADDING-FEATURES.tr.md). Kurulum: [`README.tr.md`](README.tr.md).
