#!/usr/bin/env node
/**
 * AI / search crawler visibility audit (SEO-PLAN item 0.1).
 *
 * Proves that the crawlers which decide citations — GPTBot, ClaudeBot,
 * PerplexityBot, OAI-SearchBot — actually receive indexable, body-rendered HTML.
 * Most of them do NOT execute JavaScript, so if the prerendered response is the
 * bare SPA shell (empty #root, no <footer>/<main>), or if it carries a `noindex`
 * signal, the page effectively does not exist to search and AI answers.
 *
 * What it does: fetch <base>/sitemap.xml, sample a spread of route types × both
 * ?lang variants, request each with the AI-bot UAs plus a browser control, then
 * assert two things per response:
 *   1. indexable  — no `X-Robots-Tag: noindex` header and no <meta robots noindex>
 *   2. body-visible — real page chrome (<footer>/<main>) + a meaningful amount of
 *                     visible text, not the ~200-char SPA shell.
 * Prints a coverage table + findings and exits non-zero on any failure, so it can
 * later run in a CI cron. It is intentionally NOT wired into `verify`/`deploy`
 * (those must stay offline); run it on demand: `npm run audit:ai`.
 *
 *   node scripts/audit-ai-visibility.mjs [--base https://flygaca.com] [--max 24]
 *                                        [--verbose] [--json]
 */

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = (opt('base', process.env.AUDIT_BASE ?? 'https://flygaca.com')).replace(/\/$/, '');
const MAX = Number(opt('max', '24'));
const VERBOSE = flag('verbose');
const AS_JSON = flag('json');
const TIMEOUT_MS = 12000;
const CONCURRENCY = 6;
// Below this many chars of stripped, visible text a 200 response is the SPA shell,
// not a prerendered page. The shell measures ~150–410 chars (head + hero comment);
// a real content page runs into the thousands.
const MIN_BODY_TEXT = 600;

// The crawlers that gate citations, + a browser control to expose UA cloaking.
const USER_AGENTS = {
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  'OAI-SearchBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com',
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
  Chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};

// Classify a sitemap path into a route *type* so we sample breadth, not depth.
function routeType(path) {
  if (path === '/') return 'home';
  if (/^\/library\/reference\//.test(path)) return 'library-reference';
  if (/^\/library\/handbook\//.test(path)) return 'library-handbook';
  if (/^\/library\/[^/]+$/.test(path)) return 'library-part';
  if (/^\/guides\/[^/]+$/.test(path)) return 'guide';
  if (/^\/tools\/aerodromes\//.test(path)) return 'aerodrome';
  if (/^\/tools\/[^/]+$/.test(path)) return 'tool';
  if (/^\/study\/packs\//.test(path)) return 'study-pack';
  if (['/library', '/tools', '/learn'].includes(path)) return 'hub';
  if (['/disclaimer', '/terms', '/privacy', '/safety'].includes(path)) return 'legal';
  return path.replace(/^\//, '').split('/')[0] || 'root'; // about, pricing, chat, …
}

async function fetchSitemapPaths() {
  const res = await fetch(`${BASE}/sitemap.xml`, { headers: { 'user-agent': USER_AGENTS.Chrome } });
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status} at ${BASE}/sitemap.xml`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => {
      try {
        return new URL(m[1]).pathname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// One URL per route type (first, sorted → deterministic), capped, then expanded
// across ?lang=en / ?lang=ar. The apex may 301/308 to www — fetch follows it.
function buildSample(paths) {
  const byType = new Map();
  for (const p of [...new Set(paths)].sort()) {
    const t = routeType(p);
    if (!byType.has(t)) byType.set(t, p);
  }
  const picked = [...byType.values()];
  const variants = [];
  for (const p of picked) {
    for (const lang of ['en', 'ar']) {
      variants.push(`${BASE}${p}${p.includes('?') ? '&' : '?'}lang=${lang}`);
      if (variants.length >= MAX) return variants;
    }
  }
  return variants;
}

function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function probe(url, uaName) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENTS[uaName] },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const html = await res.text();
    const text = visibleText(html);
    const xRobots = (res.headers.get('x-robots-tag') || '').toLowerCase();
    const metaNoindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    const hasChrome = /<footer[\s>]|role=["']contentinfo["']|<\/main>/i.test(html);
    const indexable = !xRobots.includes('noindex') && !metaNoindex;
    const isHome = new URL(url).pathname === '/';
    const heroLeak = !isHome && /becomes the LCP element/.test(html);
    const bodyVisible = res.status === 200 && hasChrome && text.length >= MIN_BODY_TEXT;
    const arabicChars = (text.match(/[؀-ۿ]/g) || []).length;
    return {
      status: res.status,
      finalUrl: res.url,
      indexable,
      noindexSource: xRobots.includes('noindex') ? 'header' : metaNoindex ? 'meta' : null,
      bodyVisible,
      textLen: text.length,
      hasChrome,
      heroLeak,
      arabicChars,
      pass: bodyVisible && indexable,
    };
  } catch (err) {
    return { status: 0, error: err.name === 'AbortError' ? 'timeout' : err.message, pass: false };
  } finally {
    clearTimeout(timer);
  }
}

// Bounded-concurrency map so we stay gentle on the origin.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const uaNames = Object.keys(USER_AGENTS);
const mark = (b) => (b ? '✓' : '✗');

async function main() {
  console.log(`AI-visibility audit → ${BASE}  (UAs: ${uaNames.join(', ')})\n`);
  const paths = await fetchSitemapPaths();
  const sample = buildSample(paths);
  console.log(`Sitemap: ${paths.length} URLs; sampling ${sample.length} across route types.\n`);

  // Flatten to (url, ua) jobs, probe with limited concurrency.
  const jobs = sample.flatMap((url) => uaNames.map((ua) => ({ url, ua })));
  const results = await mapLimit(jobs, CONCURRENCY, ({ url, ua }) =>
    probe(url, ua).then((r) => ({ url, ua, ...r })),
  );
  const byUrl = new Map(sample.map((u) => [u, {}]));
  for (const r of results) byUrl.get(r.url)[r.ua] = r;

  if (AS_JSON) {
    console.log(JSON.stringify(Object.fromEntries(byUrl), null, 2));
  } else {
    for (const url of sample) {
      const row = byUrl.get(url);
      const path = new URL(url).pathname + new URL(url).search;
      const cells = uaNames
        .map((ua) => {
          const r = row[ua];
          if (r.error) return `${ua}:${r.error}`;
          return `${ua} ${mark(r.pass)}`;
        })
        .join('  ');
      // Representative (Chrome) response drives the annotations; UAs match at infra level.
      const rep = row.Chrome;
      const notes = [];
      if (rep) {
        if (!rep.indexable) notes.push(`noindex(${rep.noindexSource})`);
        if (!rep.bodyVisible) notes.push(`shell/${rep.textLen}c`);
        if (rep.heroLeak) notes.push('hero-leak');
        if (rep.finalUrl && new URL(rep.finalUrl).host !== new URL(BASE).host)
          notes.push(`→${new URL(rep.finalUrl).host}`);
      }
      const allPass = uaNames.every((ua) => row[ua].pass);
      console.log(`${mark(allPass)} ${path}`);
      console.log(`    ${cells}${notes.length ? '   [' + notes.join(', ') + ']' : ''}`);
      if (VERBOSE && !allPass && rep) {
        console.log(`    text=${rep.textLen}c chrome=${rep.hasChrome} indexable=${rep.indexable}`);
      }
    }
  }

  // Findings summary.
  const flat = results;
  const failed = flat.filter((r) => !r.pass);
  const noindex = new Set(flat.filter((r) => r.indexable === false).map((r) => r.url));
  const shell = new Set(flat.filter((r) => r.bodyVisible === false && r.status === 200).map((r) => r.url));
  const errored = flat.filter((r) => r.error);
  const arUrls = sample.filter((u) => u.includes('lang=ar'));
  const arNoArabic = arUrls.filter((u) => (byUrl.get(u).Chrome?.arabicChars ?? 0) < 5);

  console.log(`\n${'─'.repeat(64)}`);
  console.log(`Checks: ${flat.length} (url×UA)  ·  passing: ${flat.length - failed.length}  ·  failing: ${failed.length}`);
  if (noindex.size) console.log(`  ✗ noindex signal on ${noindex.size}/${sample.length} sampled URLs (citation-fatal)`);
  if (shell.size) console.log(`  ✗ shell-only body (no prerendered content) on ${shell.size}/${sample.length} URLs`);
  if (errored.length) console.log(`  ✗ ${errored.length} request error(s)`);
  if (arUrls.length)
    console.log(`  · Arabic body present on ${arUrls.length - arNoArabic.length}/${arUrls.length} ?lang=ar URLs (0.3 gap if low)`);
  if (!failed.length) console.log('  ✓ all sampled URLs indexable and body-visible to every crawler');

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`audit-ai-visibility: ${err.message}`);
  process.exit(1);
});
