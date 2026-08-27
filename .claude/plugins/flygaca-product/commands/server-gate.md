---
description: Run the server/ package gate and report it separately from the web gate
allowed-tools:
  - Bash
  - Read
  - Grep
---

`server/` is its own npm package with its own CI job. The root `npm run verify`
**does not cover it** — this is the single most common way a Fly GACA change
goes red after looking green locally.

```bash
cd server && npm run lint && npm test && npm run build
```

Then check the boundaries the server shares with the app:

- Did you change a `*-core.ts` with a client mirror (`chat-quota-core`,
  `billing-core`/entitlements, features)? Run the **root** `npm test` too —
  `tests/client-server-mirrors.test.ts` imports out of `server/src/`.
- Did you add a route? It must live under `/api/*`, or the same-origin proxy
  rewrites on every front break and the strict CSP has to be widened.
- Did you change the response shape of chat? That is `server/src/contract.ts`,
  which the family manifest pins — see `/flygaca-product:family-contract`.
- Did you add a migration? Apply it against a scratch database rather than
  reasoning about it, and remember no live database carries this schema yet.

Report gate · ran? · result, and name anything you could not run here.
