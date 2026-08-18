#!/usr/bin/env node
/**
 * Wire Arabic (ar) localization into the generated Capacitor iOS project.
 *
 * The `ios/` project is generated on a Mac via `npx cap add ios` and is not
 * committed here (see docs/RUNBOOK-native.md), so the localized *app name* has
 * to be re-applied to the freshly generated Xcode project. This script does
 * mechanically what the Xcode GUI does by hand:
 *
 *   1. ensures ios/App/App/{en,ar}.lproj/InfoPlist.strings exist (the localized
 *      CFBundleDisplayName / CFBundleName), matching common.appName in the
 *      i18n bundles;
 *   2. registers `ar` (and `en` / `Base`) in the project's knownRegions;
 *   3. links InfoPlist.strings as a localized variant group in the App target's
 *      resources — UNLESS the project uses Xcode-16 synchronized folder groups,
 *      in which case the on-disk .lproj files are picked up automatically and
 *      only knownRegions / Info.plist need touching;
 *   4. ensures Info.plist declares the keys + CFBundleLocalizations so iOS
 *      treats the bundle as Arabic-capable.
 *
 * The pbxproj is parsed and rewritten with Apple's own `plutil` (a proper plist
 * parser — no fragile text munging, no Ruby), so this must run on macOS. It is
 * idempotent: run it once after `cap add ios`, and harmlessly again any time.
 *
 * Usage:  npm run cap:localize      (or: node scripts/native/ios-localize.mjs)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const IOS_APP = join(ROOT, 'ios', 'App');
const APP_DIR = join(IOS_APP, 'App');
const PBXPROJ = join(IOS_APP, 'App.xcodeproj', 'project.pbxproj');
const INFO_PLIST = join(APP_DIR, 'Info.plist');

/**
 * Localized app names. These mirror `common.appName` in src/i18n/{en,ar}.json —
 * keep them in sync so the native home-screen label matches the product brand.
 * `en` is also used as the base (development-region) fallback value.
 */
const LOCALES = { en: 'Fly GACA', ar: 'فلاي جاكا' };
const BASE_LOCALE = 'en';

const log = (m) => console.log(`[ios-localize] ${m}`);
const die = (m) => {
  console.error(`[ios-localize] ERROR: ${m}`);
  process.exit(1);
};

// ── InfoPlist.strings source of truth ──────────────────────────────────────
function stringsBody(lang) {
  const name = LOCALES[lang];
  return (
    `/*\n` +
    `  InfoPlist.strings (${lang === BASE_LOCALE ? `${lang} — base` : lang})\n` +
    `  Localized Info.plist values for the FlyGACA iOS shell. Mirrors\n` +
    `  common.appName in src/i18n/${lang}.json. Managed by scripts/native/ios-localize.mjs.\n` +
    `*/\n\n` +
    `"CFBundleDisplayName" = "${name}";\n` +
    `"CFBundleName" = "${name}";\n`
  );
}

function ensureStringsFiles() {
  for (const lang of Object.keys(LOCALES)) {
    const dir = join(APP_DIR, `${lang}.lproj`);
    const file = join(dir, 'InfoPlist.strings');
    if (!existsSync(file)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, stringsBody(lang), 'utf8');
      log(`created ${lang}.lproj/InfoPlist.strings`);
    }
  }
}

// ── plutil I/O (macOS) ──────────────────────────────────────────────────────
function readPlistJson(path) {
  const out = execFileSync('plutil', ['-convert', 'json', '-o', '-', path], {
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function writePbxproj(plist) {
  const tmp = `${PBXPROJ}.tmp.json`;
  writeFileSync(tmp, JSON.stringify(plist));
  try {
    execFileSync('plutil', ['-convert', 'xml1', '-o', PBXPROJ, tmp]);
  } finally {
    rmSync(tmp, { force: true });
  }
}

// ── Info.plist patching ─────────────────────────────────────────────────────
function plistHasKey(path, keyPath) {
  try {
    execFileSync('plutil', ['-extract', keyPath, 'raw', '-o', '-', path], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function plutil(path, args) {
  execFileSync('plutil', [...args, path]);
}

function patchInfoPlist() {
  // Ensure the keys localization overrides exist as base values, plus declare
  // the supported localizations so iOS/App Store treat the bundle as Arabic.
  const setString = (key, value) => {
    const op = plistHasKey(INFO_PLIST, key) ? '-replace' : '-insert';
    plutil(INFO_PLIST, [op, key, '-string', value]);
  };
  setString('CFBundleDisplayName', LOCALES[BASE_LOCALE]);
  setString('CFBundleName', LOCALES[BASE_LOCALE]);
  if (!plistHasKey(INFO_PLIST, 'CFBundleDevelopmentRegion')) {
    plutil(INFO_PLIST, ['-insert', 'CFBundleDevelopmentRegion', '-string', BASE_LOCALE]);
  }
  const langs = JSON.stringify(Object.keys(LOCALES));
  const op = plistHasKey(INFO_PLIST, 'CFBundleLocalizations') ? '-replace' : '-insert';
  plutil(INFO_PLIST, [op, 'CFBundleLocalizations', '-json', langs]);
  log(`Info.plist: ensured CFBundleDisplayName/Name + CFBundleLocalizations ${langs}`);
}

// ── pbxproj mutation (pure + testable) ──────────────────────────────────────
/**
 * Mutate a parsed project.pbxproj plist in place to register Arabic
 * localization. Pure (no I/O) so it can be unit-tested off-Mac. Returns a
 * summary of what changed.
 *
 * @param {object} plist  parsed pbxproj (top-level: objects, rootObject, …)
 * @param {() => string} [uuidFn]  UUID generator (injectable for tests)
 */
export function mutatePbxproj(plist, uuidFn) {
  const objects = plist.objects;
  const newUuid =
    uuidFn ||
    (() => {
      let id;
      do {
        id = randomBytes(12).toString('hex').toUpperCase();
      } while (objects[id]);
      return id;
    });
  const summary = { knownRegionsAdded: [], variantGroupCreated: false, mode: 'classic' };

  // 1) knownRegions on the root PBXProject.
  const project = objects[plist.rootObject];
  if (!project) throw new Error('rootObject not found in pbxproj');
  project.knownRegions = project.knownRegions || [];
  for (const region of [BASE_LOCALE, 'Base', ...Object.keys(LOCALES).filter((l) => l !== BASE_LOCALE)]) {
    if (!project.knownRegions.includes(region)) {
      project.knownRegions.push(region);
      summary.knownRegionsAdded.push(region);
    }
  }

  // 2) Xcode-16 synchronized folder groups: on-disk .lproj is auto-included, so
  //    do NOT hand-build a variant group (it would double-list the files).
  const hasSyncGroups = Object.values(objects).some(
    (o) => o && o.isa === 'PBXFileSystemSynchronizedRootGroup',
  );
  const existingVG = Object.entries(objects).find(
    ([, o]) => o && o.isa === 'PBXVariantGroup' && o.name === 'InfoPlist.strings',
  );
  if (hasSyncGroups && !existingVG) {
    summary.mode = 'synchronized';
    return summary;
  }

  // 3) Classic groups → ensure an InfoPlist.strings variant group with en + ar
  //    children, in the App group, linked into the resources build phase.
  const langChild = (lang) => {
    const found = Object.entries(objects).find(
      ([, o]) =>
        o &&
        o.isa === 'PBXFileReference' &&
        o.name === lang &&
        typeof o.path === 'string' &&
        o.path === `${lang}.lproj/InfoPlist.strings`,
    );
    if (found) return found[0];
    const id = newUuid();
    objects[id] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.strings',
      name: lang,
      path: `${lang}.lproj/InfoPlist.strings`,
      sourceTree: '<group>',
    };
    return id;
  };

  const childUuids = Object.keys(LOCALES).map(langChild);

  let vgUuid;
  if (existingVG) {
    vgUuid = existingVG[0];
    const vg = existingVG[1];
    vg.children = vg.children || [];
    for (const c of childUuids) if (!vg.children.includes(c)) vg.children.push(c);
  } else {
    vgUuid = newUuid();
    objects[vgUuid] = {
      isa: 'PBXVariantGroup',
      children: childUuids,
      name: 'InfoPlist.strings',
      sourceTree: '<group>',
    };
    summary.variantGroupCreated = true;
  }

  // Add the variant group to the App PBXGroup's children.
  const appGroup = Object.values(objects).find(
    (o) => o && o.isa === 'PBXGroup' && (o.name === 'App' || o.path === 'App'),
  );
  if (!appGroup) throw new Error('App PBXGroup not found in pbxproj');
  appGroup.children = appGroup.children || [];
  if (!appGroup.children.includes(vgUuid)) appGroup.children.push(vgUuid);

  // Ensure a PBXBuildFile for the variant group is in the App resources phase.
  const target = Object.values(objects).find(
    (o) => o && o.isa === 'PBXNativeTarget' && o.name === 'App',
  );
  if (!target) throw new Error('App PBXNativeTarget not found in pbxproj');
  const resPhaseUuid = (target.buildPhases || []).find(
    (u) => objects[u] && objects[u].isa === 'PBXResourcesBuildPhase',
  );
  if (!resPhaseUuid) throw new Error('Resources build phase not found for App target');
  const resPhase = objects[resPhaseUuid];
  resPhase.files = resPhase.files || [];

  const alreadyLinked = resPhase.files.some(
    (bfUuid) => objects[bfUuid] && objects[bfUuid].fileRef === vgUuid,
  );
  if (!alreadyLinked) {
    const bfUuid = newUuid();
    objects[bfUuid] = { isa: 'PBXBuildFile', fileRef: vgUuid };
    resPhase.files.push(bfUuid);
  }

  return summary;
}

// ── main ─────────────────────────────────────────────────────────────────────
function main() {
  if (process.platform !== 'darwin') {
    log('warning: not running on macOS; `plutil` is required and may be absent.');
  }
  if (!existsSync(PBXPROJ)) {
    die(
      `no Xcode project at ${PBXPROJ}.\n` +
        `  Generate the iOS platform first: npm run build && npx cap add ios\n` +
        `  (see docs/RUNBOOK-native.md → "Arabic app-name localization").`,
    );
  }
  ensureStringsFiles();

  copyFileSync(PBXPROJ, `${PBXPROJ}.bak`);
  const plist = readPlistJson(PBXPROJ);
  const summary = mutatePbxproj(plist);
  writePbxproj(plist);

  if (summary.mode === 'synchronized') {
    log('project uses synchronized folder groups — .lproj files auto-included.');
  } else {
    log(
      summary.variantGroupCreated
        ? 'linked InfoPlist.strings as a localized variant group.'
        : 'InfoPlist.strings variant group already present.',
    );
  }
  log(
    summary.knownRegionsAdded.length
      ? `knownRegions += [${summary.knownRegionsAdded.join(', ')}]`
      : 'knownRegions already complete.',
  );

  if (existsSync(INFO_PLIST)) patchInfoPlist();
  else log(`note: ${INFO_PLIST} not found; skipped Info.plist keys.`);

  rmSync(`${PBXPROJ}.bak`, { force: true });
  log('done. Open the project in Xcode once to normalize pbxproj formatting before committing.');
}

// Only run when invoked directly (not when imported by the test harness).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
