import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Kept separate from vite.config.ts so the app build does not depend on the
// Vitest toolchain.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the `@` → src alias from vite.config.ts / tsconfig.app.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Unit tests live in tests/; the Playwright E2E specs in e2e/ run under a
    // separate runner, so keep Vitest from trying to execute them.
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // The Firestore security-rules tests need the emulator + a node environment,
    // so they run under their own config (`npm run test:rules`), never here.
    exclude: ['tests/rules/**', 'node_modules/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    coverage: {
      // `npm run test:coverage` — the CI unit-tests job runs this, so the ratchet
      // below gates merges.
      provider: 'v8',
      reporter: ['text', 'html'],
      // Focus on the unit-testable layers. Pages, app chrome (src/app) and the
      // i18n bundles are exercised by the Playwright E2E suite / the parity
      // test, not measured here.
      include: ['src/calc/**', 'src/hooks/**', 'src/lib/**', 'src/components/**'],
      // PwaPrompts imports the build-only `virtual:pwa-register/react` module,
      // which the Vitest config (no vite-plugin-pwa) can't resolve, so v8 fails
      // to instrument it as an uncovered file. It's app chrome covered by E2E.
      exclude: ['src/components/pwa/PwaPrompts.tsx'],
      // A ratchet, not a target: set just below the current numbers so coverage
      // can't silently regress, while today's run still passes. Raise as cover
      // grows. (`npm run test:coverage` prints the live figures.)
      thresholds: {
        statements: 76,
        branches: 73,
        functions: 79,
        lines: 77,
      },
    },
  },
});
