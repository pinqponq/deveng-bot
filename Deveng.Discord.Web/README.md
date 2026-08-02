# Deveng Bot — Web panel

Vite + React management panel and Express BFF for **Deveng Bot**.

Primary docs: root [`README.md`](../README.md) / [`README.tr.md`](../README.tr.md).

## Development

```bash
cd Deveng.Discord.Web
cp .env.example .env
npm ci
npm run dev
```

`npm run dev` starts the **BFF** (`server.js`) and **Vite** together. UI-only: `npm run dev:vite`.

## Build

```bash
npm run build
```

Package name: `deveng-bot-web` (MIT).

Feature work: see [`docs/ADDING-FEATURES.md`](../docs/ADDING-FEATURES.md).
