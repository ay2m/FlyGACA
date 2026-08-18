/**
 * new-guide — scaffold a new guide page so a content contributor can author it
 * without hand-editing TypeScript or balancing two big i18n bundles.
 *
 * It makes the four wiring changes a new guide needs, in one go:
 *   1. src/pages/guides/guides.ts — appends the slug to GUIDE_SLUGS and inserts
 *      a GUIDE_META entry (topic + level) and a GUIDE_STATUS entry ('draft').
 *   2. src/i18n/en.json + ar.json — inserts a placeholder content skeleton under
 *      `guides.items.<slug>` with EVERY required key, identical in both bundles,
 *      so i18n parity holds and the content-completeness test passes immediately.
 *
 * The new guide is seeded as a DRAFT: it renders by URL (with a "Draft" badge)
 * but is unlisted (no index / catalog / sitemap entry) until you flip its
 * GUIDE_STATUS entry to 'live'. The author then replaces the `TODO (...)`
 * placeholders in both bundles with real bilingual prose. See GUIDE_AUTHORING.md.
 *
 * Edits are insertion-only and targeted (the i18n bundles are NOT re-serialised,
 * so the diff is just the added block). Re-running with an existing slug is a
 * hard error — it never overwrites.
 *
 * Usage:
 *   npm run new:guide -- --slug <kebab-slug> --title "<English title>" \
 *     --topic <topic> --level <level> [--dry]
 *
 *     --topic   one of: regulation, licensing, medical, language, airspace,
 *               weather, planning, operations, performance
 *     --level   one of: beginner, intermediate, advanced
 *     --dry     print what would change without writing
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const write = (p, s) => writeFileSync(join(root, p), s);

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};

const slug = opt('--slug');
const title = opt('--title');
const topic = opt('--topic');
const level = opt('--level');
const DRY = flag('--dry');

const TOPICS = [
  'regulation',
  'licensing',
  'medical',
  'language',
  'airspace',
  'weather',
  'planning',
  'operations',
  'performance',
];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

const USAGE =
  'Usage: npm run new:guide -- --slug <kebab-slug> --title "<English title>" ' +
  '--topic <topic> --level <level> [--dry]\n' +
  `  --topic  ${TOPICS.join(', ')}\n` +
  `  --level  ${LEVELS.join(', ')}`;

function fail(msg) {
  console.error(`new-guide: ${msg}\n\n${USAGE}`);
  process.exit(1);
}

// --- validate --------------------------------------------------------------
if (!slug || !title || !topic || !level) fail('missing a required flag.');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
  fail(`invalid --slug "${slug}" (use lower-case kebab-case, e.g. night-currency).`);
if (!TOPICS.includes(topic)) fail(`invalid --topic "${topic}".`);
if (!LEVELS.includes(level)) fail(`invalid --level "${level}".`);

// --- load + idempotency guard ----------------------------------------------
const GUIDES_TS = 'src/pages/guides/guides.ts';
const EN = 'src/i18n/en.json';
const AR = 'src/i18n/ar.json';

let guidesTs = read(GUIDES_TS);
const enText = read(EN);
const arText = read(AR);
const enObj = JSON.parse(enText);
const arObj = JSON.parse(arText);

const existingSlugs = [
  ...guidesTs.match(/GUIDE_SLUGS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g),
].map((m) => m[1]);

if (
  existingSlugs.includes(slug) ||
  enObj.guides?.items?.[slug] ||
  arObj.guides?.items?.[slug]
) {
  fail(`a guide with slug "${slug}" already exists — choose another slug.`);
}

// --- build the skeletons ---------------------------------------------------
const skeleton = (lang, name) => {
  const todo = (what) => `TODO (${lang}): ${what}`;
  return {
    name,
    blurb: todo('one-sentence summary shown on the guide card'),
    intro: todo('opening paragraph — plain text, no markdown'),
    sections: [{ h: todo('first section heading'), p: todo('first section body — plain text') }],
    adel: todo('a question a reader could ask Captain Adel about this topic'),
    takeaways: [todo('first key takeaway')],
  };
};

/** Insert `"slug": { ... }` as the first entry of the guides `items` object,
 *  indented to match (6-space key, 8-space fields). Targeted — the rest of the
 *  file is left byte-for-byte unchanged. */
function insertGuideItem(text, entry) {
  // Anchor on the *top-level* guides key (2-space indent) — not a nested
  // "guides" feature card elsewhere in the bundle — then its direct "items".
  const guidesIdx = text.indexOf('\n  "guides": {');
  if (guidesIdx < 0) throw new Error('could not find the top-level "guides" block');
  const marker = '\n    "items": {';
  const itemsIdx = text.indexOf(marker, guidesIdx);
  if (itemsIdx < 0) throw new Error('could not find the guides "items" object');
  const at = itemsIdx + marker.length;
  const block = `"${slug}": ${JSON.stringify(entry, null, 2)}`
    .split('\n')
    .map((line) => '      ' + line)
    .join('\n');
  return text.slice(0, at) + '\n' + block + ',' + text.slice(at);
}

// --- build the guides.ts edits (anchored, insertion-only) ------------------
const slugsAnchor = '\n] as const;';
const metaAnchor =
  'export const GUIDE_META: Record<GuideSlug, { topic: GuideTopic; level: GuideLevel }> = {\n';
const statusAnchor = 'export const GUIDE_STATUS: Record<GuideSlug, GuideStatus> = {\n';
for (const [anchor, label] of [
  [slugsAnchor, 'GUIDE_SLUGS'],
  [metaAnchor, 'GUIDE_META'],
  [statusAnchor, 'GUIDE_STATUS'],
]) {
  if (!guidesTs.includes(anchor)) throw new Error(`anchor for ${label} not found in ${GUIDES_TS}`);
}

guidesTs = guidesTs.replace(slugsAnchor, `\n  '${slug}',` + slugsAnchor);
guidesTs = guidesTs.replace(
  metaAnchor,
  metaAnchor + `  '${slug}': { topic: '${topic}', level: '${level}' },\n`,
);
guidesTs = guidesTs.replace(statusAnchor, statusAnchor + `  '${slug}': 'draft',\n`);

const newEn = insertGuideItem(enText, skeleton('EN', title));
const newAr = insertGuideItem(arText, skeleton('AR', `TODO (AR): ${title}`));

// Safety: the i18n results must still be valid JSON before we write anything.
JSON.parse(newEn);
JSON.parse(newAr);

// --- write (or preview) ----------------------------------------------------
if (DRY) {
  console.log(
    `new-guide (dry run) — would scaffold "${slug}" [${topic} · ${level} · draft]:\n` +
      `  ${GUIDES_TS}  (+3 lines: GUIDE_SLUGS, GUIDE_META, GUIDE_STATUS)\n` +
      `  ${EN}        (+ guides.items.${slug} skeleton)\n` +
      `  ${AR}        (+ guides.items.${slug} skeleton)\n` +
      'Re-run without --dry to write.',
  );
  process.exit(0);
}

write(GUIDES_TS, guidesTs);
write(EN, newEn);
write(AR, newAr);

console.log(
  `✓ Scaffolded guide "${slug}" [${topic} · ${level}] as a DRAFT.\n\n` +
    'Next:\n' +
    `  1. Replace the TODO (...) placeholders under guides.items.${slug} in\n` +
    `     ${EN} and ${AR} with real bilingual content (both required).\n` +
    `  2. (Optional) add related tools / GACAR Parts / a quiz bank in ${GUIDES_TS}\n` +
    '     via GUIDE_TOOLS, GUIDE_REGS, GUIDE_QUIZ — and an `adel` question.\n' +
    '  3. Check your work:  npm run test  (parity + content completeness)\n' +
    `  4. Publish when ready: set GUIDE_STATUS['${slug}'] to 'live' in ${GUIDES_TS}.\n\n` +
    'See GUIDE_AUTHORING.md for the full walkthrough.',
);
