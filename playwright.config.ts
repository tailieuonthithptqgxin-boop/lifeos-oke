import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },

  projects: [
    {
      name: 'Desktop Chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'Mobile Chromium (Pixel 5)',
      testMatch: /4_responsive_viewports\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true
      },
    },
  ],
});
