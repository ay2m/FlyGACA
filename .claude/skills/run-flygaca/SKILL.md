---
name: run-flygaca
description: Build, run, drive and screenshot Fly GACA — the React/Vite PWA in the repo root and the Express API in server/. Use when asked to start the app or the API, run its tests or build, take a screenshot of a page, click through a flow, or reproduce something in the running UI.
---

Fly GACA is two deployables in one repo: a **React 19 + Vite SPA** at the repo
root and an **Express 5 API** in `server/` (Cloud Run + Cloud SQL Postgres in
production). The SPA is local-first — with no API configured it runs entirely
out of `localStorage`, so you can drive the whole product without a backend.

There is no headless entry point, so the agent path is a browser:
`.claude/skills/run-flygaca/driver.mjs`, a Playwright REPL that takes commands
on stdin. The API has its own harness, `.claude/skills/run-flygaca/api-smoke.sh`
(curl). All paths below are relative to the repo root.

> **Servers need the sandbox off.** Under Claude Code's default sandbox
> `listen()` fails with `EPERM: operation not permitted ::1:5173`. Run every
> `vite`, `vite preview`, `node lib/index.js` and `docker` command with
> `dangerouslyDisableSandbox: true`. The driver, curl and the test suites are
> fine sandboxed.

## Prerequisites

Node 26 and npm 11 (verified on `v26.7.0` / `11.19.0`). Then:

```bash
npm install                      # root
npm install --prefix server      # API
npx playwright install chromium  # the driver's browser
```

Postgres only matters for the API. This machine has Docker Desktop but it is
not running at login — start it and wait for the daemon:

```bash
open -a Docker
until docker info >/dev/null 2>&1; do sleep 2; done
```

## Setup

`.env` at the repo root is the API's env file. **It is also read by Vite**, so
keep it free of anything that changes a client build (see Gotchas):

```bash
cat > .env <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flygaca
SESSION_SECRET=local-dev-secret-at-least-32-characters-long-xxxxx
APP_ORIGIN=http://localhost:5173
API_ORIGIN=http://localhost:8080
MAIL_API_KEY=
CORPUS_URL=/absolute/path/to/repo/public/data/rag-chunks.json
EOF
```

`.env` is gitignored. `MAIL_API_KEY=` empty is deliberate — verification and
reset mails are then printed to the server log instead of sent, so sign-up works
end to end offline.

## Build

```bash
npm run build                 # SPA → dist/ (sitemap, tsc -b, vite build, prerender, JSON-LD checks)
npm run server:build          # API  → server/lib/
```

The SPA build ends with `check-prerender: OK — 334 bilingual routes …` and
`validate-jsonld: OK — 1112 JSON-LD block(s) across 654 page(s) valid.`

## Run (agent path)

### 1. SPA only — local-first, no backend

```bash
npx vite --port 5173 --strictPort &     # sandbox OFF
node .claude/skills/run-flygaca/driver.mjs --smoke
```

Twelve checks, ~30 s, exits non-zero on the first failure. It signs in through
the real form, adds a flight through the real `FlightForm`, and asserts it
reaches `flygaca:logbook`:

```
PASS home renders — http://localhost:5173/ — Saudi Aviation Library — Fly GACA
PASS a calculator computes — crosswind 12.9 kt / headwind 15.3 kt
PASS local sign-in mints a session — signed in as smoke@flygaca.test
PASS a flight added through the UI lands in the logbook — HZ-SMK in the table and persisted to flygaca:logbook
PASS Arabic RTL mounts under /ar — dir=rtl lang=ar
PASS no uncaught page errors — clean
```

Screenshots land in `$TMPDIR/flygaca-shots/` (override with `--shots DIR`).

### 2. Ad-hoc driving — pipe commands into the REPL

There is no `tmux` on this machine, so drive it with a heredoc. Each command
answers with exactly one `OK …` / `ERR …` line.

```bash
node .claude/skills/run-flygaca/driver.mjs <<'EOF'
goto /tools/crosswind
fill css=:nth-match(input[inputmode="decimal"],1) 180
fill css=:nth-match(input[inputmode="decimal"],2) 220
fill css=:nth-match(input[inputmode="decimal"],3) 20
ss crosswind
text
console
quit
EOF
```

`text` then reports `… CROSSWIND 12.9 kt from the right HEADWIND 15.3 kt …`.

| command | what it does |
|---|---|
| `goto /path` | navigate and wait past the `RouteFallback` skeleton |
| `ss name` | screenshot → `$TMPDIR/flygaca-shots/name.png` (settles animations first) |
| `click Sign in` | click by accessible name (button/link), falling back to text |
| `fill <sel> <value>` | fill an input |
| `text [sel]` | innerText, collapsed to one line; no arg = whole `<main>` |
| `wait <sel>` / `count <sel>` | wait for visible / count matches |
| `eval <js>` | run JS in the page, returns JSON |
| `storage [key]` | read `localStorage` (no key → list the key names) |
| `api GET /api/auth/session` | fetch the API **from inside the page**, so the session cookie and CORS are exercised for real |
| `signin [email] [name]` | drive the local sign-in form on `/account` |
| `console` | drain buffered console + `pageerror` output |
| `quit` | close the browser |

Selectors: bare text by default, `css=` for tag-led CSS, `@` for a test id,
leading `.`/`#`/`[` also read as CSS. **A selector may not contain spaces** —
the protocol splits each line on whitespace, so ` >> nth=0` would be swallowed
into the *value* and `fill` would silently write the selector fragment into the
field. Use Playwright's `:nth-match(sel,n)` (1-based) instead, as above.

Useful flags: `--base http://localhost:4173` (target the preview build),
`--api http://localhost:8080`, `--headed`, `--shots DIR`.

### 3. Full stack — API + Postgres + SPA

```bash
docker run -d --name flygaca-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=flygaca \
  -p 5432:5432 postgres:17-alpine
until docker exec flygaca-pg pg_isready -U postgres -d flygaca; do sleep 1; done

node --env-file=.env server/scripts/migrate.mjs      # → Applied 1 migration(s). (27 tables)
npm run server:dev &                                 # sandbox OFF — compiles, then watches
```

Boot line: `Fly GACA API listening on :8080 (development)`. Then:

```bash
bash .claude/skills/run-flygaca/api-smoke.sh          # → api-smoke: all checks passed
```

Eleven HTTP checks: health, register, session, weak-password rejection, a
logbook write, the account read-back, waitlist, logout, and that an anonymous
`/api/account/` is 401.

To exercise the browser against that API, start Vite with the API origin
(`apiUrl()` appends `/api` itself, so give it the bare origin). `api-smoke.sh`
registers a throwaway PID-keyed address, so create a known account first:

```bash
VITE_API_BASE_URL=http://localhost:8080 npx vite --port 5174 --strictPort &   # sandbox OFF

curl -s -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@flygaca.test","password":"hunter2hunter2","displayName":"Smoke Pilot"}'

JAR=$(mktemp -t fg)
curl -s -c "$JAR" -b "$JAR" -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@flygaca.test","password":"hunter2hunter2"}' -o /dev/null
curl -s -c "$JAR" -b "$JAR" -X POST http://localhost:8080/api/account/logbook \
  -H 'Content-Type: application/json' \
  -d '{"id":"api-1","date":"2026-03-04","type":"C172","reg":"HZ-API","from":"OERK","to":"OEDF","total":"2.1","pic":"2.1","night":"0","ifr":"0","ldg":"1","remarks":"written over the API"}'
rm -f "$JAR"

node .claude/skills/run-flygaca/driver.mjs --base http://localhost:5174 <<'EOF'
goto /account
fill css=input[type="email"] smoke@flygaca.test
fill css=input[type="password"] hunter2hunter2
click Sign in
wait Signed in as
api GET /api/auth/session
goto /logbook
wait HZ-API
text
quit
EOF
```

`api` returns the real session (`{"user":{"uid":"…","displayName":"Smoke Pilot"}}`)
and `/logbook` renders the flight that was written over the API — the round trip
through Postgres, the session cookie and the SPA in one pass.

Teardown:

```bash
pkill -f 'scripts/dev.mjs'; pkill -f 'lib/index.js'; pkill -f 'vite'
docker rm -f flygaca-pg
```

## Run (human path)

```bash
npm run dev        # http://localhost:5173, HMR. Ctrl-C to stop.
npm run serve      # build + preview of the production bundle
```

`npm run serve` asks for port 5000, which **macOS AirPlay Receiver already
holds** (`ControlCenter` returns a bare 403 there). Vite falls back silently, so
read the port off its banner — it landed on `http://localhost:5001/` here.

## Test

```bash
npm test               # 213 files, 1488 tests, ~40 s
npm run server:test    #  24 files,  245 tests, ~1 s
npm run verify         # typecheck + lint + format:check + test + build + bundle/perf budgets
```

`verify` exits 0 and ends with `185.3 kB gz total (budget 189 kB)` /
`✓ All chunks within the 140 kB per-chunk budget`.

`npm run test:e2e` builds `dist/`, serves it on :4173 and runs `e2e/` (7 smoke +
6 axe checks, ~22 s). The axe specs scan the settled page — see the note in
`e2e/a11y.spec.ts` about `reducedMotion` not being applied by the runner.

## Gotchas

- **`npm run server:dev` does not run `src/` directly** — it compiles first and
  runs `lib/` (via `server/scripts/dev.mjs`, `tsc --watch` + `node --watch`). Node
  cannot execute the sources: type stripping leaves import specifiers alone and
  the package is NodeNext, so `./config.js` stays literal and resolution fails
  with `ERR_MODULE_NOT_FOUND … server/src/config.js`. Don't "simplify" it back to
  `node --experimental-strip-types src/index.ts`.
- **Root `.env` feeds Vite too, not just the API.** Putting `NODE_ENV=development`
  in it (an obvious thing to do for a server env file) makes `vite build` emit a
  **development** bundle: React dev mode, `jsxDEV` calls with source paths in
  `dist/`, and — because the sign-in chooser branches on `import.meta.env.DEV` —
  the dev-only email+name `LocalSignIn` form shipping in production, which the
  code explicitly says must never happen. Symptom:
  `grep -c jsxDEV dist/assets/Account-*.js` is non-zero. Keep `NODE_ENV` out of
  `.env`; set it inline when starting the server if you need it.
- **`/account` renders three different things.** Backend configured → email +
  password + Google. Dev build, no backend → `LocalSignIn` (email + name only).
  Preview/production build, no backend → "Sign-in is temporarily unavailable."
  A `--base http://localhost:4173` run therefore *cannot* reach the logbook.
- **The account surfaces are session-gated even offline.** `/logbook`,
  `/records`, `/dashboard`, `/currency`, `/settings` render "Sign in to use your
  account" until `localStorage['flygaca:session']` holds an email. Seeding
  `flygaca:logbook` alone shows nothing — use the `signin` command.
- **`flygaca:logbook` entries are all strings**, numeric columns included
  (`total: '1.5'`, not `1.5`). Numbers render as blank totals.
- **Calculator inputs are `inputmode="decimal"`, never `type="number"`.** The
  obvious `input[type=number]` selector matches nothing in the entire tool suite.
- **Stat cards animate up from zero** (`<CountUp>`), so a screenshot taken right
  after a mutation shows `TOTAL HOURS 0.0` beside a populated table. `ss` waits
  900 ms for this; raw Playwright calls need their own settle.
- **`getByText('Sign in')` resolves to the `<h1>`, not the button.** Clicking the
  heading silently does nothing and the flow just… doesn't happen. `click` in the
  driver prefers the accessible name for exactly this reason.
- **Sign-in is not synchronous.** `click Sign in` returns as soon as the click
  dispatches; asserting the session immediately after gets `{"user":null}`.
  `wait Signed in as` first.
- **Route chunks are lazy**, and `<main>` exists while `RouteFallback` is still
  showing a `role="status"` skeleton — a naive wait reads the page as "Loading…".
- **Any `http://localhost:*` origin is CORS-allowed** by `gateway-core.ts`, so
  `EXTRA_ALLOWED_ORIGINS` is unnecessary locally whatever port Vite picks.
- **Anonymous chat is 3 questions per day per IP.** The fourth returns
  `429 {"error":"quota_exceeded"}`. Reset with
  `docker exec flygaca-pg psql -U postgres -d flygaca -c 'TRUNCATE chat_usage;'`.
- **`playwright.config.ts` asks for `reducedMotion: 'reduce'` and does not get
  it.** As of @playwright/test 1.62.1 the option is ignored by the runner —
  inside the page `matchMedia('(prefers-reduced-motion: reduce)')` is still
  false, set at config level or via `test.use`; a runtime `page.emulateMedia()`
  call does work. It matters because axe reads mid-fade colours as contrast
  failures (a card whose resting contrast is 5.8:1 measures 1.86:1 two frames
  in), so `e2e/a11y.spec.ts` emulates and waits for `document.getAnimations()`
  itself.
- **`main [role="status"]` is the wrong "page is ready" wait.** `/tools` and
  `/learn` keep a permanent status live region (the result count), so waiting for
  one to detach silently costs the full timeout on those routes. RouteFallback's
  `.skeleton` class is the specific marker.
- **Don't pipe a server through `tail`/`head` to watch it start.** The pipeline
  buffers, so the log file stays 0 bytes while the server runs happily; you end
  up debugging a phantom. Redirect to a file, or poll the port with `lsof -nP
  -iTCP -sTCP:LISTEN | grep node`.
- **macOS ships bash 3.2**, which breaks two things `api-smoke.sh` deliberately
  avoids: chained `local a=1 b=$a` (the second sees an empty `a`) and inline JSON
  in a command substitution (`{"a":1,"b":2}` gets brace-expanded into separate
  curl arguments, producing a stream of confusing 400s).

## Troubleshooting

- **`Error: listen EPERM: operation not permitted ::1:5173`** — the Claude Code
  sandbox, not the app. Re-run with `dangerouslyDisableSandbox: true`.
- **`Cannot connect to the Docker daemon at unix:///…/docker.sock`** — Docker
  Desktop is installed but not running: `open -a Docker`, then poll
  `docker info`. A *permission denied* on that same socket is the sandbox again.
- **`Missing required environment variable: DATABASE_URL`** — the API asserts
  its config before binding, so this is a boot failure, not a request failure.
  `.env` is missing or `--env-file=.env` was omitted.
- **`{"error":"chat failed"}` / 500 on `/api/chat`** — read the server log, the
  route never returns the cause. Two things it will be locally:
  - `ENOENT … open '/data/rag-chunks.json'` → `CORPUS_URL` unset. The default is
    the path the container bakes in, so set it to the repo copy for local runs.
  - `corpus: entry 0 is missing a string d/b/u field` → `CORPUS_URL` points at
    `public/data/library-search.json`. That is the browser's search index and its
    entries carry no `u`; the retriever wants **`rag-chunks.json`**.
  - With `GOOGLE_GENAI_API_KEY` unset you reach Google and get
    `API key not valid`. That is the expected end state without a real key — the
    corpus and the whole RAG chain ran to get there.
- **Verification / password-reset link** — with `MAIL_API_KEY` empty the mail is
  printed to the server log:
  `[mail] would send "Confirm your Fly GACA email" to … /api/auth/verify-email/confirm?token=…`.
  Curl that URL to verify an account.
- **`locator … strict mode violation: resolved to 3 elements`** in your own
  Playwright code — the design system reuses `.container`. The driver's `locate`
  always takes `.first()`.
