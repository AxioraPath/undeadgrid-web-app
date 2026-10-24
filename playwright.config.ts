import { defineConfig, devices } from '@playwright/test'

const WEB_PORT = 5199
const API_PORT = 3100
const baseURL = `http://127.0.0.1:${WEB_PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    // Local fallback when the bundled Chromium is not installed, e.g. PW_CHANNEL=msedge.
    channel: process.env.PW_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /touch\.spec\.ts/ },
    // Touch-enabled mobile emulation (Chromium) for the D-pad flow.
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /touch\.spec\.ts/ },
  ],
  webServer: [
    {
      // Deterministic in-memory backend (REST auth + Socket.IO) so CI needs no DB or real server.
      command: 'node e2e/mock-server.mjs',
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { MOCK_PORT: String(API_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: baseURL,
      env: { E2E_API_TARGET: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
