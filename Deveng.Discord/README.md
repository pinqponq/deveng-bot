# Deveng Bot — API

ASP.NET Core Web API (PostgreSQL + EF Core / Npgsql) for **Deveng Bot**.

Primary docs: root [`README.md`](../README.md) / [`README.tr.md`](../README.tr.md).  
Features: [`docs/ADDING-FEATURES.md`](../docs/ADDING-FEATURES.md). Agents: [`AGENTS.md`](../AGENTS.md).

## Quick start

1. Set `ConnectionStrings__DefaultConnection` (env or user-secrets).
2. Apply EF migrations (`Deveng.Discord.Infrastructure`).
3. Run:

```bash
dotnet run --project Deveng.Discord.Api
```

Swagger is available in Development. Full stack: `docker compose up --build` from the repo root.
