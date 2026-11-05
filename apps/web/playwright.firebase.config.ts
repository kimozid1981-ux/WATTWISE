import { defineConfig, devices } from '@playwright/test';

/**
 * Same app, but in FIREBASE MODE against the local Firebase Emulator Suite
 * (Auth + Firestore + Storage, with the real security rules). Run with:
 *   npm run test:e2e:firebase   (starts the emulators automatically)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /firebase\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3200' },
  webServer: {
    command: 'npx next dev -p 3200 -H 127.0.0.1',
    url: 'http://127.0.0.1:3200',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-wattwise.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-wattwise',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-wattwise.appspot.com',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:demo',
      NEXT_PUBLIC_FIREBASE_USE_EMULATORS: 'true',
    },
  },
});
