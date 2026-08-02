import { defineConfig } from 'vitest/config'

// Standalone config (vite.config.ts eklentilerini yüklemez): saf yardımcı fonksiyon
// birim testleri için hafif Node ortamı yeterlidir.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
