import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Ağ/discord/lavalink gerektiren modüller test edilmez; yalnızca saf mantık kapsanır.
  },
});
