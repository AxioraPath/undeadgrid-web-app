import { defineConfig } from 'vitest/config'

// Pruebas unitarias del cliente (las E2E de Playwright están en e2e/).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
