#!/usr/bin/env node
/**
 * Print the security headers from `config/headers.json` in the form
 * `gcloud compute backend-buckets|backend-services update --custom-response-headers`
 * expects, so the go-live runbook's
 *
 *   HEADERS="$(npm run -s headers:gcloud)"
 *
 * has something to call. `scripts/lib/headers.mjs` has built the value all along;
 * nothing exposed it to a shell.
 *
 * Output is the bare value and nothing else — no banner, no trailing prose — so it
 * survives command substitution. Run it with `npm run -s` (or node directly) to keep
 * npm's own lifecycle chatter off stdout.
 *
 * Why it matters: Google applies these per backend, and `helmet()` in the API covers
 * API responses only. Miss this step and the static SPA ships with no CSP and no
 * HSTS — see docs/RUNBOOK-golive.md §2.
 */
import { gcloudCustomResponseHeaders } from './lib/headers.mjs';

process.stdout.write(gcloudCustomResponseHeaders());
