const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir:   './tests/e2e',
  timeout:   30_000,
  retries:   process.env.CI ? 2 : 0,
  reporter:  [['html', { open: 'never' }], ['list']],

  use: {
    baseURL:    process.env.BASE_URL || 'http://localhost:8080',
    headless:   true,
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
  },

  /* Levanta el servidor estático automáticamente */
  webServer: {
    command:            'npx serve . -p 8080 -s',
    url:                'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout:            10_000,
  },

  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome',  use: { ...devices['Pixel 5'] } },
  ],
});
