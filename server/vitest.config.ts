import { defineConfig } from "vitest/config";

// Local config so the server tests don't inherit the app's root vitest setup.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      // `npm run test:coverage` — the CI `server` job runs this, so the ratchet
      // below gates merges (same wiring as the app's root vitest.config.ts).
      provider: "v8",
      reporter: ["text", "html"],
      // Measure the whole backend source, not just what the tests happen to import,
      // so an entirely-untested new module counts against coverage (same posture as
      // the app's root vitest.config.ts).
      all: true,
      include: ["src/**"],
      // Wiring and I/O edges, exercised end to end rather than by unit tests:
      // the route manifest, the pg pool, and the outbound mail transport.
      exclude: ["src/index.ts", "src/db.ts", "src/mail.ts", "src/routes/**"],
      // A ratchet, not a target: set just below the current numbers so coverage can't
      // silently regress, while today's run passes. Raise as cover grows.
      // (`npm run test:coverage` prints the live figures.)
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
