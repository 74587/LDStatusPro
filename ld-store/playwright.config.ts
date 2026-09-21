import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', fullyParallel: true, workers: 2, retries: 0,
  timeout: 30_000, expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4197', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    {
      name: 'tablet-768',
      testMatch: '**/density.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'tablet-1024',
      testMatch: '**/density.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'laptop-1280x720',
      testMatch: '**/density.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'desktop-wide',
      testMatch: '**/density.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config vite.e2e.config.js',
    url: 'http://127.0.0.1:4197', reuseExistingServer: false, timeout: 30_000,
  },
})
