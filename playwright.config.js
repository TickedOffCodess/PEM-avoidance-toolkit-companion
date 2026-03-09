import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite build --base / && npx vite preview --base / --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
