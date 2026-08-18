import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E smoke + critical-flow + a11y checks against a production preview build.
 * The web server builds the app and serves dist/ via `vite preview`, so the
 * tests exercise exactly what ships (including the PWA shell and SPA routing).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Audit the settled UI: entry animations (stagger-grid fade-up) transiently
    // dim text below contrast mid-flight, which is exactly what reduced-motion
    // users skip. axe should evaluate the resting state, not an animation frame.
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port=${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
