# Local setup notes — Deveng Bot

Primary instructions: root [`README.md`](../README.md) / [`README.tr.md`](../README.tr.md).  
Agent / feature work: [`ADDING-FEATURES.md`](ADDING-FEATURES.md), [`../AGENTS.md`](../AGENTS.md).

## Recommended: Docker Compose

```powershell
cp .env.example .env
# Fill required secrets (see .env.example)
docker compose up --build
```

| Service | URL |
|---------|-----|
| Panel | http://localhost:3000 |
| API health | http://localhost:9000/health |

Optional profiles:

```powershell
docker compose --profile music up --build
docker compose --profile ai up --build
```

## Without Docker (dev)

1. Run **Postgres 16** and **Redis 7** locally (or only those two via Compose).
2. Copy values from root [`.env.example`](../.env.example) into:
   - API: user-secrets or process env (`ConnectionStrings__DefaultConnection`, bot token, Discord OAuth, Redis, `Bot__SharedSecret` / `BOT_SHARED_SECRET`)
   - [`Deveng.Discord.Web/.env.example`](../Deveng.Discord.Web/.env.example) → `.env`
   - [`Deveng.Discord.Bot/.env.example`](../Deveng.Discord.Bot/.env.example) → `.env`
3. Apply migrations:

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=deveng;Username=deveng;Password=<your-password>"
dotnet ef database update --project Deveng.Discord/Deveng.Discord.Infrastructure --startup-project Deveng.Discord/Deveng.Discord.Api
```

4. Start components:

```powershell
dotnet run --project Deveng.Discord/Deveng.Discord.Api
cd Deveng.Discord.Web; npm ci; npm run dev
cd ..\Deveng.Discord.Bot; npm ci; npm run dev
```

## Fail-fast

- Compose uses `${VAR:?message}` for required secrets — `docker compose up` fails if they are empty.
- Bot `loadConfig()` throws if `BOT_TOKEN` or `API_BASE_URL` is missing.

## Builds

```powershell
dotnet build Deveng.Discord/Deveng.Discord.Api/Deveng.Discord.Api.csproj -c Release
cd Deveng.Discord.Web; npm run build
cd ..\Deveng.Discord.Bot; npm run build
docker compose config
```
