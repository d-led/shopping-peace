import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

/**
 * What the two small screens run: the layout they have to fit, and the gestures
 * a thumb makes. Everything else is the same page load on every viewport, so it
 * is proved once, on the desktop — same behaviour checked, a third of the
 * browser time.
 */
const DEVICE_SPECS = /(main-screen|touch)\.spec\.ts/u;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // Nothing to start by hand: Playwright builds the app and serves the built
  // files from the little Node server in tests/e2e/server.mjs.
  webServer: {
    command: 'npm run build && node tests/e2e/server.mjs dist',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // A phone in a kitchen. WebKit, because that is the browser in a hand there.
    { name: 'iphone-mini', use: { ...devices['iPhone 13 Mini'] }, testMatch: DEVICE_SPECS },
    { name: 'ipad-mini', use: { ...devices['iPad Mini'] }, testMatch: DEVICE_SPECS },
    // Everything, including the specs that are the same page load wherever
    // they run: the picker's plumbing, the files in and out, and the
    // accessibility audit.
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
