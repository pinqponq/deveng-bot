# Deveng Bot — Bot runtime

discord.js bot + HTTP control plane for **Deveng Bot**.

Primary docs: root [`README.md`](../README.md) / [`README.tr.md`](../README.tr.md).  
Features: [`docs/ADDING-FEATURES.md`](../docs/ADDING-FEATURES.md). Agents: [`AGENTS.md`](../AGENTS.md).

## Quick start

```bash
cp .env.example .env
npm ci
npm run build
npm run dev
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | TypeScript compile |
| `npm run dev` | Run with ts-node |
| `npm test` | Vitest |
| `npm run register-commands` | Register slash commands |

Package name: `deveng-bot` (MIT).
