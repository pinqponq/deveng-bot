import path from 'path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import dotenv from 'dotenv'
import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

const rootDir = path.resolve(__dirname)
dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true })

function buildPublicConfig(): Record<string, string> {
  return {
    apiUrl: (process.env.PUBLIC_API_URL || '').trim(),
    panelBaseUrl: (process.env.PUBLIC_PANEL_BASE_URL || '').trim(),
    discordClientId: (process.env.PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '').trim(),
    clerkPublishableKey: (process.env.CLERK_PUBLISHABLE_KEY || '').trim(),
    turnstileSiteKey: (process.env.PUBLIC_TURNSTILE_SITE_KEY || '').trim(),
  }
}

function configInjectPlugin() {
  return {
    name: 'config-inject',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/config.js',
        (_req: IncomingMessage, res: ServerResponse) => {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(`window.__CONFIG__=${JSON.stringify(buildPublicConfig())};`)
        },
      )
    },
  }
}

/**
 * Geliştirme proxy hedefi: yalnızca Node BFF (server.js).
 * BFF, session çerezinden `Authorization: Bearer` ekleyip ardından BOT_API_URL (Kestrel)'a iletir.
 * /api'yi doğrudan Kestrel'e vermek → çerez BFF'de, Authorization yok → tüm uçlarda 401.
 */
function getBffProxyTarget(): string {
  return (process.env.BFF_DEV_URL || 'http://127.0.0.1:3001').trim().replace(/\/$/, '')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    configInjectPlugin(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    // Vite 8: varsayılan Oxc/Rolldown minify; üst düzey esbuild.drop kaldırıldı.
    // İstenirse ileride build.rolldownOptions.output.minify.compress (drop_*) ile eklenebilir.
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: getBffProxyTarget(),
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
