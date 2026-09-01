/**
 * JSON-LD validation gate — asserts every structured-data block we ship is
 * syntactically valid and carries the fields the schema.org rich results it
 * targets actually require. A typo'd builder or an empty i18n field would ship
 * broken structured data that silently drops us from rich results and AI
 * answer engines; this turns that into a hard build error.
 *
 * It walks the prerendered `dist/**​/index.html` (the crawler-facing floor
 * written by prerender-head.mjs), extracts every
 * `<script type="application/ld+json">` — both the static Organization/WebSite
 * `@graph` from index.html and the per-route managed node — and validates each.
 *
 * Runs inside `npm run build` after check:prerender, so every build + deploy is
 * gated. Node-only, no browser, no deps. The pure helpers are exported for
 * tests/validate-jsonld.test.ts.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Extract the raw JSON text of every ld+json script in an HTML string. */
export function extractLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1].trim(),
  );
}

/** Flatten a parsed ld payload to the list of nodes to validate (unwraps @graph/arrays). */
export function nodesFromLd(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed['@graph'])) return parsed['@graph'];
  return parsed ? [parsed] : [];
}

// Required top-level fields per @type we emit (see src/lib/seo/jsonld.ts +
// scripts/prerender-head.mjs). Unlisted types are allowed but only checked for
// a non-empty @type.
const REQUIRED = {
  Organization: ['name', 'url'],
  Person: ['name'],
  WebSite: ['name', 'url', 'potentialAction'],
  AboutPage: ['name', 'url', 'mainEntity'],
  BreadcrumbList: ['itemListElement'],
  ItemList: ['itemListElement'],
  Article: ['headline', 'url'],
  TechArticle: ['headline', 'url'],
  Course: ['name'],
  FAQPage: ['mainEntity'],
  SoftwareApplication: ['name', 'url'],
  Airport: ['name', 'icaoCode'],
  DefinedTermSet: ['name', 'hasDefinedTerm'],
};

const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isAbsUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
const present = (v) =>
  v != null && (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : true);

/** Validate a single JSON-LD node; returns an array of problem strings. */
export function validateNode(node, where = '') {
  const problems = [];
  const at = (msg) => `${where ? where + ': ' : ''}${msg}`;
  if (!node || typeof node !== 'object') {
    problems.push(at('node is not an object'));
    return problems;
  }
  const type = node['@type'];
  if (!isNonEmptyStr(type)) {
    problems.push(at('missing @type'));
    return problems;
  }

  const req = REQUIRED[type];
  if (req) {
    for (const key of req) {
      if (!present(node[key])) problems.push(at(`${type} missing required "${key}"`));
    }
  }

  // Structural checks for the collection-shaped types.
  if (type === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
    node.itemListElement.forEach((li, i) => {
      if (typeof li?.position !== 'number') problems.push(at(`breadcrumb[${i}] missing numeric position`));
      if (!isNonEmptyStr(li?.name)) problems.push(at(`breadcrumb[${i}] missing name`));
      if (!isAbsUrl(li?.item)) problems.push(at(`breadcrumb[${i}] "item" is not an absolute URL`));
    });
  }
  if (type === 'FAQPage' && Array.isArray(node.mainEntity)) {
    if (node.mainEntity.length === 0) problems.push(at('FAQPage has an empty mainEntity'));
    node.mainEntity.forEach((qa, i) => {
      if (!isNonEmptyStr(qa?.name)) problems.push(at(`faq[${i}] missing question name`));
      if (!isNonEmptyStr(qa?.acceptedAnswer?.text)) problems.push(at(`faq[${i}] missing acceptedAnswer.text`));
    });
  }
  // The site-search contract: engines (and AI crawlers reading the graph) need a
  // SearchAction whose EntryPoint template carries the {search_term_string}
  // placeholder named by query-input. A half-built action is worse than none —
  // it looks declared but resolves to nothing.
  if (type === 'WebSite' && node.potentialAction != null) {
    const action = Array.isArray(node.potentialAction) ? node.potentialAction[0] : node.potentialAction;
    if (action?.['@type'] !== 'SearchAction') problems.push(at('WebSite.potentialAction is not a SearchAction'));
    else {
      const tmpl = action.target?.urlTemplate ?? action.target;
      if (!isAbsUrl(tmpl)) problems.push(at('SearchAction target.urlTemplate is not an absolute URL'));
      else if (!tmpl.includes('{search_term_string}'))
        problems.push(at('SearchAction target.urlTemplate has no {search_term_string} placeholder'));
      if (!isNonEmptyStr(action['query-input']))
        problems.push(at('SearchAction missing "query-input"'));
    }
  }
  if (type === 'DefinedTermSet' && Array.isArray(node.hasDefinedTerm)) {
    if (node.hasDefinedTerm.length === 0) problems.push(at('DefinedTermSet has no terms'));
    node.hasDefinedTerm.forEach((term, i) => {
      if (!isNonEmptyStr(term?.name)) problems.push(at(`definedTerm[${i}] missing name`));
      if (!isNonEmptyStr(term?.description)) problems.push(at(`definedTerm[${i}] missing description`));
    });
  }
  if ((type === 'ItemList' || type === 'BreadcrumbList') && !Array.isArray(node.itemListElement)) {
    // present() already flagged absence; only add the shape error when it exists but is wrong.
    if (node.itemListElement != null) problems.push(at(`${type}.itemListElement is not an array`));
  }

  // A top-level `url` that exists must be absolute.
  if (node.url != null && !isAbsUrl(node.url)) problems.push(at(`"url" is not an absolute URL (${node.url})`));

  return problems;
}

/**
 * True when a dist-relative path is a *content* route — one whose whole job is to
 * be found and cited, so it must carry its own per-route structured data. The
 * static Organization/WebSite `@graph` is copied into every page from the shell,
 * so "has some ld+json" is not evidence of anything: only the managed node
 * (`data-managed-ld`, written by prerender-head.mjs and by usePageMeta at
 * runtime) describes the actual document. Classified by path alone — no route
 * table import — so it keeps working as routes are added.
 */
export function isContentRoute(relPath) {
  const p = relPath.replace(/\\/g, '/').replace(/^dist\//, '').replace(/(^|\/)index\.html$/, '');
  const segs = p.replace(/^ar\//, '').split('/').filter(Boolean);
  if (segs.length < 2) return false; // hubs and the home page are not leaf content
  const [head, ...rest] = segs;
  if (head === 'guides') return rest.length === 1;
  if (head === 'library') return rest.length >= 1 && !['charts', 'map', 'glossary'].includes(rest[0]);
  if (head === 'tools') return rest.length >= 1;
  if (head === 'study') return rest[0] === 'packs' && rest.length === 2;
  return false;
}

/** True if the HTML carries a per-route managed JSON-LD node. */
export function hasManagedLd(html) {
  return /<script[^>]*data-managed-ld[^>]*>/.test(html);
}

/** Validate every ld+json block in one HTML document; returns problem strings. */
export function validateHtml(html, label = '') {
  const problems = [];
  const blocks = extractLdBlocks(html);
  blocks.forEach((raw, bi) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      problems.push(`${label} [block ${bi}]: invalid JSON — ${e.message}`);
      return;
    }
    const top = Array.isArray(parsed) ? parsed[0] : parsed;
    if (top && !Array.isArray(parsed) && !isNonEmptyStr(top['@context']))
      problems.push(`${label} [block ${bi}]: missing @context`);
    for (const node of nodesFromLd(parsed)) {
      problems.push(...validateNode(node, `${label} [block ${bi}]`));
    }
  });
  return { blockCount: blocks.length, problems };
}

// --- CLI: walk dist and gate the build --------------------------------------
function isMain() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMain()) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const distDir = join(root, 'dist');
  if (!existsSync(distDir)) {
    console.error('validate-jsonld: dist/ missing — run after `npm run build`.');
    process.exit(1);
  }

  /** Recursively collect every index.html under a directory. */
  const htmlFiles = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.html')) htmlFiles.push(full);
    }
  };
  walk(distDir);

  let totalBlocks = 0;
  let uncovered = 0;
  const allProblems = [];
  for (const file of htmlFiles) {
    const rel = file.slice(root.length + 1);
    const html = readFileSync(file, 'utf8');
    const { blockCount, problems } = validateHtml(html, rel);
    totalBlocks += blockCount;
    allProblems.push(...problems);
    // A content page with no managed node ships only the site-wide graph — it
    // describes the publisher, never the document. Catch that here; the old gate
    // happily passed a page carrying no per-route schema at all.
    if (isContentRoute(rel) && !hasManagedLd(html)) {
      allProblems.push(`${rel}: content route has no per-route JSON-LD (data-managed-ld)`);
      uncovered++;
    }
  }

  if (allProblems.length) {
    console.error(`validate-jsonld: FAILED — ${allProblems.length} problem(s):`);
    for (const p of allProblems.slice(0, 100)) console.error(`  ✗ ${p}`);
    if (allProblems.length > 100) console.error(`  … and ${allProblems.length - 100} more`);
    process.exit(1);
  }

  console.log(
    `validate-jsonld: OK — ${totalBlocks} JSON-LD block(s) across ${htmlFiles.length} page(s) valid; ` +
      'every content route carries its own schema.',
  );
}
