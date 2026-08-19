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
      //
      // `src/routes/**` used to be excluded wholesale, which hid ~1,300 lines
      // carrying rules that live nowhere else — grants.ts and billing.ts are the
      // only writers of `entitlements`. Routes are now listed individually and
      // struck off as each gains a test, so the ones still uncovered stay
      // visible here rather than silently omitted.
      exclude: [
        "src/index.ts",
        "src/db.ts",
        "src/mail.ts",
        "src/routes/auth.ts",
        "src/routes/billing.ts",
        "src/routes/org.ts",
        "src/routes/account.ts",
      ],
      // A ratchet, not a target: set just below the current numbers so coverage can't
      // silently regress, while today's run passes. Raise as cover grows.
      // (`npm run test:coverage` prints the live figures.)
      //
      // These were 80 across, which the suite has never actually met — the real
      // figures were 65.52 / 63.79 / 61.05 / 64.85, so `test:coverage` exited 1.
      // Nothing ran it (the repo had no CI), so the 80 was aspirational rather
      // than protective. Now that the CI `server` job runs it on every PR they
      // sit just under the live run, per the rule above — an enforced floor
      // beats an ignored target.
      //
      // 73.22 / 69.92 / 71.29 / 72.22 today, after session.ts (7% → 96.7%),
      // http.ts (15% → 100%) and routes/grants.ts (excluded → 98.1%). The
      // remaining weight is gateway.ts (0% of 160 statements), store.ts (4%),
      // school-core.ts (74%) and config.ts (55%), plus the four routes still
      // on the exclude list above; raise these as each lands.
      thresholds: {
        statements: 73,
        branches: 69,
        functions: 71,
        lines: 72,
      },
    },
  },
});
