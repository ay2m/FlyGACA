---
description: Run the Fly GACA gates in the right order and report exactly what passed
argument-hint: [web|server|all]
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

Run the repository's own gates for `$1` (default `all`) and report the result
honestly — which gate ran, which failed, which you skipped and why.

## Web (repo root)

```bash
npm run verify
```

That chains `typecheck → lint → format:check → test → build → check:bundle →
check:perf`. Do not substitute a subset unless the user asked for one.

## Server (`server/` is its own package — the root gate does not cover it)

```bash
cd server && npm run lint && npm test && npm run build
```

## When the change touches a shared boundary

- A `*-core.ts` module with a client mirror (`chatQuota`, `entitlements`,
  `features`) → run the **root** `npm test` as well;
  `tests/client-server-mirrors.test.ts` imports straight out of `server/src/`.
- New or changed copy → root `npm test` covers `tests/i18n-parity.test.ts`;
  a key in one bundle only is a failing build, not a follow-up.
- New content route (guide, library page, tool, study pack) → also
  `npm run check:prerender:coverage`, because `check:prerender` cannot see a
  route that has no snapshot.
- Security headers → they live in `config/headers.json` and nowhere else;
  `tests/headers-parity.test.ts` holds the mirrors and `firebase.json` to it,
  but cannot see the live load balancer.

## Reporting

Finish with a short table: gate · ran? · result. If a gate could not run in this
environment, say so plainly rather than implying it passed.
