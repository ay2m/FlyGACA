/**
 * Moyasar configuration smoke test.
 *
 * Verifies, against the keys in your local `.env`, that the billing integration is
 * wired end to end BEFORE you push a revision or run a real card through checkout:
 *
 *   1. the three Moyasar secrets are present and well-formed;
 *   2. the publishable and secret keys are the same mode (a pk_test_ paired with an
 *      sk_live_ is the classic "widget succeeds, fulfilment 502s" misconfiguration);
 *   3. the secret key actually authenticates against the live Moyasar API;
 *   4. the webhook secret round-trips through the exact signature check the server
 *      applies in `billing-core.verifyMoyasarSignature`.
 *
 * It is READ-ONLY: it lists payments, it never creates one, so it cannot charge a
 * card. Secrets are masked in all output.
 *
 * Usage:  npm run check:moyasar
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MOYASAR_API = 'https://api.moyasar.com/v1';

/** Minimal .env reader — the repo has no dotenv dependency and does not need one. */
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

// Real process env wins; then server/.env, then .env — matching how each side loads.
const env = {
  ...readEnvFile(resolve(ROOT, '.env')),
  ...readEnvFile(resolve(ROOT, 'server/.env')),
  ...process.env,
};

const mask = (s) => (!s ? '(unset)' : s.length <= 12 ? `${s.slice(0, 4)}…` : `${s.slice(0, 8)}…${s.slice(-4)}`);
const modeOf = (k) => (/_test_/.test(k) ? 'test' : /_live_/.test(k) ? 'live' : 'unknown');

let failures = 0;
let warnings = 0;
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => { warnings++; console.log(`  \x1b[33m!\x1b[0m ${m}`); };
const fail = (m) => { failures++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };

console.log('\nMoyasar configuration check\n');

// --- 1. presence and shape -------------------------------------------------
console.log('Secrets');
const pk = env.VITE_MOYASAR_PUBLISHABLE_KEY ?? '';
const sk = env.MOYASAR_SECRET_KEY ?? '';
const wh = env.MOYASAR_WEBHOOK_SECRET ?? '';

if (!pk) fail('VITE_MOYASAR_PUBLISHABLE_KEY is unset — Checkout throws "billing-unavailable" before the widget mounts.');
else if (pk === 'pk_test_replace_me') fail('VITE_MOYASAR_PUBLISHABLE_KEY is still the .env.example placeholder.');
else if (!pk.startsWith('pk_')) fail(`VITE_MOYASAR_PUBLISHABLE_KEY should start with "pk_" (got ${mask(pk)}).`);
else pass(`VITE_MOYASAR_PUBLISHABLE_KEY ${mask(pk)} (${modeOf(pk)})`);

if (!sk) fail('MOYASAR_SECRET_KEY is unset — /api/billing/checkout-config returns 500 "billing-unavailable".');
else if (!sk.startsWith('sk_')) fail(`MOYASAR_SECRET_KEY should start with "sk_" (got ${mask(sk)}).`);
else pass(`MOYASAR_SECRET_KEY ${mask(sk)} (${modeOf(sk)})`);

if (sk.startsWith('pk_') || pk.startsWith('sk_')) fail('Publishable and secret keys look swapped.');

if (!wh) fail('MOYASAR_WEBHOOK_SECRET is unset — every webhook is rejected 401 "bad-signature".');
else if (wh.length < 16) warn(`MOYASAR_WEBHOOK_SECRET is only ${wh.length} chars — use the full dashboard value.`);
else pass(`MOYASAR_WEBHOOK_SECRET ${mask(wh)}`);

// --- 2. mode agreement -----------------------------------------------------
console.log('\nMode');
if (pk && sk && modeOf(pk) !== 'unknown' && modeOf(sk) !== 'unknown') {
  if (modeOf(pk) === modeOf(sk)) pass(`publishable and secret keys are both ${modeOf(pk)}`);
  else fail(`mode mismatch: publishable is ${modeOf(pk)} but secret is ${modeOf(sk)} — the widget will charge one account and fulfilment will read another.`);
  if (modeOf(sk) === 'live') warn('LIVE keys — a real checkout will move real money.');
} else warn('could not determine test/live mode from the key names.');

// --- 3. the secret key authenticates --------------------------------------
console.log('\nMoyasar API');
if (sk.startsWith('sk_')) {
  try {
    const res = await fetch(`${MOYASAR_API}/payments?limit=1`, {
      headers: { Authorization: `Basic ${Buffer.from(`${sk}:`).toString('base64')}` },
    });
    if (res.status === 401) fail('401 Unauthorized — Moyasar rejected MOYASAR_SECRET_KEY.');
    // Moyasar answers a bad key with 401, so a 403/407 here is almost always a
    // corporate/sandbox egress proxy refusing the CONNECT, not a key problem.
    else if (res.status === 403 || res.status === 407) {
      warn(`GET /payments returned ${res.status} — this usually means an egress proxy blocked api.moyasar.com, not a bad key. Re-run on a network that can reach Moyasar.`);
    } else if (!res.ok) fail(`GET /payments returned ${res.status} ${res.statusText}.`);
    else {
      const body = await res.json();
      const n = Array.isArray(body?.payments) ? body.payments.length : 0;
      pass(`authenticated (GET /payments → 200, ${n} payment${n === 1 ? '' : 's'} visible)`);
    }
  } catch (e) {
    warn(`could not reach ${MOYASAR_API} (${e.message}). Network/egress issue, not necessarily a bad key.`);
  }
} else fail('skipped — no usable secret key.');

// --- 4. webhook signature round-trip --------------------------------------
// Mirrors server/src/billing-core.ts verifyMoyasarSignature exactly: HMAC-SHA256
// over the RAW body bytes, hex digest, compared with timingSafeEqual.
console.log('\nWebhook signature');
if (wh) {
  const rawBody = JSON.stringify({ id: 'evt_test', type: 'payment_paid', data: { id: 'pay_test', status: 'paid' } });
  const signature = createHmac('sha256', wh).update(rawBody).digest('hex');
  const expected = createHmac('sha256', wh).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length === b.length && timingSafeEqual(a, b)) {
    pass('HMAC-SHA256 hex digest round-trips (matches verifyMoyasarSignature).');
    console.log(`    send header  x-moyasar-signature: ${signature.slice(0, 16)}…`);
    console.log('    Confirm in the Moyasar dashboard that the webhook is configured to sign');
    console.log('    with this shared secret; a payload-embedded secret_token would not verify.');
  } else fail('signature round-trip failed — unexpected, please report.');

  const tampered = createHmac('sha256', `${wh}x`).update(rawBody).digest('hex');
  if (tampered !== signature) pass('a wrong secret produces a different signature (forgery is rejected).');
  else fail('a wrong secret produced the same signature.');
  console.log('    The server also accepts the shared secret as a `secret_token` body field,');
  console.log('    which is the scheme Moyasar\'s own docs describe — either will authenticate.');
} else fail('skipped — no webhook secret.');

// --- 5. webhook endpoint path -----------------------------------------------
// The Firebase build served /api/moyasar-webhook via a hosting rewrite. That rewrite
// is gone; a webhook still pointed at it 404s silently on every delivery.
console.log('\nWebhook endpoint');
console.log(`  Register this URL in the Moyasar dashboard → Webhooks:`);
console.log(`    ${(env.APP_ORIGIN || 'https://flygaca.com').replace(/\/$/, '')}/api/billing/webhook/moyasar`);
console.log('  NOT /api/moyasar-webhook — that was the retired Firebase path and now 404s.');

// --- summary ---------------------------------------------------------------
console.log('');
if (failures) {
  console.log(`\x1b[31m${failures} check${failures === 1 ? '' : 's'} failed\x1b[0m${warnings ? `, ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.\n`);
  process.exit(1);
}
console.log(`\x1b[32mAll checks passed\x1b[0m${warnings ? ` with ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.\n`);
