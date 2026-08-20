/**
 * The client↔server HTTP contract, pinned.
 *
 * `tests/client-server-mirrors.test.ts` pins the mirrored *constants* by
 * importing both sides. Two things it cannot reach:
 *
 *  1. The chat wire types. `server/src/contract.ts` says "Keep these shapes in
 *     sync with `src/lib/api.ts`. They are duplicated (not imported) because the
 *     functions package compiles independently" — and nothing asserted it. A
 *     renamed or dropped field on one side type-checks fine on the other, so the
 *     drift only shows up as a field silently arriving `undefined` in the UI.
 *
 *  2. The route paths. Every service spec mocks `@/lib/services/backend`, so no
 *     test anywhere compares the paths the client calls against the routes the
 *     server mounts. Rename a route and both suites stay green.
 *
 * Types are erased at runtime and `tests/` is not covered by `npm run typecheck`
 * (tsconfig.app.json includes only `src`), so a compile-time assertion here
 * would never actually run. Both halves therefore read the source files — the
 * same approach `pricing-server-parity.test.ts` already takes for the price env.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const clientApi = readFileSync(join(root, 'src/lib/api.ts'), 'utf8');
const serverContract = readFileSync(join(root, 'server/src/contract.ts'), 'utf8');

/** Strip comments so documentation drift never fails a shape comparison. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** The body of `export interface <name> { … }`, brace-matched. */
function interfaceBody(src: string, name: string): string {
  const start = src.search(new RegExp(`export\\s+interface\\s+${name}\\s*\\{`));
  if (start === -1) throw new Error(`interface ${name} not found`);
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

/** `{ field: 'type', optional: true }` for each member, order-insensitive. */
function members(src: string, name: string): Record<string, { type: string; optional: boolean }> {
  const body = stripComments(interfaceBody(src, name));
  const out: Record<string, { type: string; optional: boolean }> = {};
  for (const raw of body.split(';')) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(\w+)(\??)\s*:\s*([\s\S]+)$/.exec(line);
    if (!m) continue;
    out[m[1]] = {
      // Normalize quote style and whitespace — the two packages use different
      // Prettier settings, which is not contract drift.
      type: m[3].replace(/"/g, "'").replace(/\s+/g, ' ').trim(),
      optional: m[2] === '?',
    };
  }
  return out;
}

/** The right-hand side of `export type <name> = …;`, normalized. */
function typeAlias(src: string, name: string): string {
  const re = new RegExp(`export\\s+type\\s+${name}\\s*=([\\s\\S]*?);`);
  const m = re.exec(stripComments(src));
  if (!m) throw new Error(`type ${name} not found`);
  return m[1].replace(/"/g, "'").replace(/\s+/g, ' ').replace(/\|\s*/g, '| ').trim();
}

describe('the chat wire types are duplicated but identical', () => {
  it.each(['ChatTurn', 'ChatSource', 'ChatRequest', 'ChatResponse'])(
    '%s has the same members on both sides',
    (name) => {
      expect(members(clientApi, name)).toEqual(members(serverContract, name));
    },
  );

  it('GroundingKind offers the same verdicts', () => {
    expect(typeAlias(clientApi, 'GroundingKind')).toBe(typeAlias(serverContract, 'GroundingKind'));
  });

  it('StreamEvent describes the same SSE frames', () => {
    // The frames `drainSse()` parses are exactly the ones sse.ts serializes; a
    // new variant on one side is a stream the other cannot read.
    expect(typeAlias(clientApi, 'StreamEvent')).toBe(typeAlias(serverContract, 'StreamEvent'));
  });

  it('really is comparing populated shapes, not two empty objects', () => {
    // Guard against the extractor silently matching nothing and passing.
    expect(Object.keys(members(clientApi, 'ChatResponse')).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(members(clientApi, 'ChatSource')).length).toBeGreaterThanOrEqual(8);
  });
});

// --------------------------------------------------------------- route paths --

/** Every path the API actually serves, as `/api/...` with `:params` intact. */
function serverRoutes(): string[] {
  const index = readFileSync(join(root, 'server/src/index.ts'), 'utf8');
  const paths: string[] = [];

  // Routers mounted under a prefix: app.use("/api/auth", …, authRouter)
  const mounts = [...index.matchAll(/app\.use\(\s*"([^"]+)"[^)]*?(\w+Router)\s*\)/g)].map((m) => ({
    prefix: m[1],
    router: m[2],
  }));

  for (const { prefix, router } of mounts) {
    const file = router.replace(/Router$/, '');
    const src = readFileSync(join(root, `server/src/routes/${file}.ts`), 'utf8');
    const re = new RegExp(`${router}\\.(get|post|patch|put|delete)\\(\\s*"([^"]+)"`, 'g');
    for (const m of src.matchAll(re)) {
      paths.push(`${prefix}${m[2] === '/' ? '' : m[2]}`);
    }
  }

  // Handlers registered directly on the app (e.g. /api/waitlist).
  for (const m of index.matchAll(/app\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g)) {
    paths.push(m[2]);
  }

  // The gateway router mounts absolute paths of its own.
  const gateway = readFileSync(join(root, 'server/src/gateway.ts'), 'utf8');
  for (const m of gateway.matchAll(/app\.(get|post)\(\s*\[([^\]]+)\]/g)) {
    for (const lit of m[2].matchAll(/"([^"]+)"/g)) paths.push(lit[1]);
  }

  return [...new Set(paths)];
}

/** The gateway's own dual-mounted paths, both spellings. */
function gatewayRoutes(): string[] {
  const gateway = readFileSync(join(root, 'server/src/gateway.ts'), 'utf8');
  const paths: string[] = [];
  for (const m of gateway.matchAll(/app\.(get|post)\(\s*\[([^\]]+)\]/g)) {
    for (const lit of m[2].matchAll(/"([^"]+)"/g)) paths.push(lit[1]);
  }
  return paths;
}

/** Every path the frontend services call, as `/api/...`. */
function clientRoutes(): { path: string; file: string }[] {
  const dir = join(root, 'src/lib/services');
  const out: { path: string; file: string }[] = [];

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(join(dir, file), 'utf8');
    for (const m of src.matchAll(/api(?:Fetch|Try)(?:<[^>]*>)?\(\s*'([^']+)'/g)) {
      out.push({ path: `/api${m[1]}`, file });
    }
  }

  // The chat client builds its URLs from API_BASE rather than going through
  // apiFetch, so pick those up too.
  const api = readFileSync(join(root, 'src/lib/api.ts'), 'utf8');
  for (const m of api.matchAll(/\$\{API_BASE\}(\/[A-Za-z0-9/_-]+)/g)) {
    out.push({ path: `/api${m[1]}`, file: 'api.ts' });
  }

  return out;
}

describe('every path the client calls is a route the server serves', () => {
  const served = serverRoutes();
  const called = clientRoutes();

  it('found both sides of the surface', () => {
    // If either extractor breaks, the comparison below would pass vacuously.
    expect(served.length).toBeGreaterThan(15);
    expect(called.length).toBeGreaterThan(10);
  });

  it.each(clientRoutes().map((c) => [c.path, c.file]))('%s (called from %s) is mounted', (path) => {
    const hit = served.some((route) => {
      if (route === path) return true;
      // Match an express :param segment against a concrete value.
      const parts = route.split('/');
      const want = path.split('/');
      if (parts.length !== want.length) return false;
      return parts.every((p, i) => p.startsWith(':') || p === want[i]);
    });
    expect(hit, `${path} is not mounted. Server serves:\n  ${served.join('\n  ')}`).toBe(true);
  });

  it('mounts the chat surface the SSE client streams from', () => {
    expect(served).toContain('/api/chat');
    expect(served).toContain('/api/feedback');
  });

  it('calls everything under /api/* so the mirrors can rewrite to Cloud Run', () => {
    // The Cloudflare / Netlify / Vercel fronts proxy /api/* back to the Cloud Run
    // origin as a same-origin rewrite; a client call outside that prefix would
    // break both the proxy and the strict CSP (`connect-src 'self'`).
    for (const { path, file } of called) {
      expect(path.startsWith('/api/'), `${file} calls ${path}, outside /api/*`).toBe(true);
    }
  });

  it('gives every bare gateway path its /api twin', () => {
    // gateway.ts mounts each handler at both "/chat" and "/api/chat" — the raw
    // Cloud Run URL keeps working while the mirrors only ever proxy /api/*. A
    // path added to one spelling and not the other is reachable from only one
    // front. (`/healthz` is deliberately outside /api: Cloud Run probes it
    // directly, so it is not part of this rule.)
    const gw = gatewayRoutes();
    expect(gw.length).toBeGreaterThan(0);
    for (const route of gw) {
      if (route.startsWith('/api/')) continue;
      expect(gw, `${route} has no /api twin`).toContain(`/api${route}`);
    }
  });
});
