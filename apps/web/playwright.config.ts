import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run the real Next.js app in LOCAL MODE (no Firebase) with
 * a local mock of the AI provider, so the whole bill workflow is exercised
 * without any real credentials.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: /firebase\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 900 } }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    { command: 'node e2e/mock-openai.mjs', url: 'http://127.0.0.1:4010', reuseExistingServer: true },
    {
      command: 'npx next dev -p 3100 -H 127.0.0.1',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        OPENAI_API_KEY: 'test-key',
        OPENAI_MODEL: 'mock-model',
        OPENAI_BASE_URL: 'http://127.0.0.1:4010/v1',
        ALLOW_ANONYMOUS_EXTRACTION: 'true',
        NEXT_PUBLIC_FIREBASE_API_KEY: '',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
      },
    },
  ],
});
