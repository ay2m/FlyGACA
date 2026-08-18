#!/usr/bin/env node
/**
 * Per-flavor iOS pipeline (macOS only): stamp out one standalone prep app.
 *
 *   npm run flavor:ios -- elp              # full: build web bundle + generate ios/
 *   npm run flavor:ios -- elp --skip-build # reuse the existing dist/ flavor build
 *
 * Steps (docs/RUNBOOK-native.md → "Per-flavor app pipeline"):
 *   1. `npm run build:flavor -- <id>` — the sliced, branded web bundle in dist/.
 *   2. Regenerate ios/ fresh via `cap add ios` with APP_FLAVOR set, so
 *      capacitor.config.ts stamps the flavor's bundle id + display name.
 *      ios/ is generated, never committed — one flavor at a time.
 *   3. Apply the iOS best-practice config with PlistBuddy (ships with macOS,
 *      zero extra deps): WKAppBoundDomains (required by
 *      limitsNavigationsToAppBoundDomains), ITSAppUsesNonExemptEncryption=NO,
 *      CFBundleDisplayName, marketing version from package.json, and the
 *      privacy-manifest UserDefaults declaration (CA92.1, @capacitor/preferences).
 *   4. Generate icons/splash from native/assets/<id>/ via @capacitor/assets.
 *   5. `cap open ios` — archive/distribute from Xcode (see the runbook checklist).
 */
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (process.platform !== 'darwin') {
  console.error(
    'flavor:ios needs macOS (Xcode + CocoaPods). On other machines use ' +
      '`npm run build:flavor -- <id>` to build/preview the web bundle; see ' +
      'docs/RUNBOOK-native.md.',
  );
  process.exit(1);
}

const { FLAVORS, toFlavorId } = await import('../src/flavors/registry.ts');
const args = process.argv.slice(2);
const skipBuild = args.includes('--skip-build');
const flavorId = toFlavorId(args.find((a) => !a.startsWith('--')));
if (!flavorId || flavorId === 'main') {
  const ids = Object.keys(FLAVORS).filter((id) => id !== 'main');
  console.error(`Usage: npm run flavor:ios -- <${ids.join('|')}> [--skip-build]`);
  process.exit(1);
}
const flavor = FLAVORS[flavorId];
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const run = (cmd, cmdArgs, opts = {}) => {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, APP_FLAVOR: flavorId, VITE_APP_FLAVOR: flavorId },
    ...opts,
  });
  if (res.status !== 0) {
    console.error(`\nFailed: ${cmd} ${cmdArgs.join(' ')}`);
    process.exit(res.status ?? 1);
  }
};

// ── 1. Web bundle ────────────────────────────────────────────────────────────
if (!skipBuild) run('node', ['scripts/build-flavor.mjs', flavorId]);

// ── 2. Fresh ios/ for THIS flavor ────────────────────────────────────────────
rmSync(join(root, 'ios'), { recursive: true, force: true });
console.log(`\nGenerating ios/ for ${flavor.appName} (${flavor.appId})…`);
run('npx', ['--no-install', 'cap', 'add', 'ios']);
run('npx', ['--no-install', 'cap', 'sync', 'ios']);

// ── 3. Best-practice Info.plist / privacy-manifest config ───────────────────
const appDir = join(root, 'ios/App/App');
const infoPlist = join(appDir, 'Info.plist');
const plistBuddy = (plist, cmd, { allowFail = false } = {}) => {
  const res = spawnSync('/usr/libexec/PlistBuddy', ['-c', cmd, plist], { stdio: 'pipe' });
  if (res.status !== 0 && !allowFail) {
    console.error(`PlistBuddy failed on ${plist}: ${cmd}\n${res.stderr}`);
    process.exit(1);
  }
  return res.status === 0;
};

// WKAppBoundDomains — limitsNavigationsToAppBoundDomains (capacitor.config.ts)
// only takes effect with this array present. localhost = the Capacitor server
// origin; flygaca.com = universal-link continuity.
plistBuddy(infoPlist, 'Delete :WKAppBoundDomains', { allowFail: true });
plistBuddy(infoPlist, 'Add :WKAppBoundDomains array');
plistBuddy(infoPlist, 'Add :WKAppBoundDomains:0 string localhost');
plistBuddy(infoPlist, 'Add :WKAppBoundDomains:1 string flygaca.com');

// Standard HTTPS only → skip the export-compliance questionnaire per upload.
if (!plistBuddy(infoPlist, 'Set :ITSAppUsesNonExemptEncryption false', { allowFail: true }))
  plistBuddy(infoPlist, 'Add :ITSAppUsesNonExemptEncryption bool false');

// Home-screen name (CFBundleDisplayName defaults to the target name).
if (!plistBuddy(infoPlist, `Set :CFBundleDisplayName ${flavor.appName}`, { allowFail: true }))
  plistBuddy(infoPlist, `Add :CFBundleDisplayName string ${flavor.appName}`);

// Marketing version tracks package.json (skip if the template uses build vars).
const currentVersion = spawnSync('/usr/libexec/PlistBuddy', [
  '-c',
  'Print :CFBundleShortVersionString',
  infoPlist,
])
  .stdout?.toString()
  .trim();
if (currentVersion && !currentVersion.startsWith('$('))
  plistBuddy(infoPlist, `Set :CFBundleShortVersionString ${pkg.version}`, { allowFail: true });

// Privacy manifest: Capacitor's template ships one — make sure the
// @capacitor/preferences UserDefaults required-reason (CA92.1) is declared.
// If the template ever drops it, install ours and remind to add it in Xcode.
const privacy = join(appDir, 'PrivacyInfo.xcprivacy');
if (existsSync(privacy)) {
  const text = readFileSync(privacy, 'utf8');
  if (!text.includes('CA92.1')) {
    const n = (text.match(/NSPrivacyAccessedAPIType\b/g) ?? []).length;
    plistBuddy(privacy, `Add :NSPrivacyAccessedAPITypes:${n} dict`, { allowFail: true });
    plistBuddy(
      privacy,
      `Add :NSPrivacyAccessedAPITypes:${n}:NSPrivacyAccessedAPIType string NSPrivacyAccessedAPICategoryUserDefaults`,
    );
    plistBuddy(
      privacy,
      `Add :NSPrivacyAccessedAPITypes:${n}:NSPrivacyAccessedAPITypeReasons array`,
    );
    plistBuddy(
      privacy,
      `Add :NSPrivacyAccessedAPITypes:${n}:NSPrivacyAccessedAPITypeReasons:0 string CA92.1`,
    );
  }
} else {
  cpSync(join(root, 'native/ios/PrivacyInfo.xcprivacy'), privacy);
  console.warn(
    'warn: Capacitor template had no PrivacyInfo.xcprivacy — installed ' +
      'native/ios/PrivacyInfo.xcprivacy; add it to the App target in Xcode ' +
      '(File Inspector → Target Membership) this one time.',
  );
}
console.log('Applied WKAppBoundDomains, encryption-exemption, display name, privacy manifest.');

// ── 4. Icons & splash ────────────────────────────────────────────────────────
const art = join(root, 'native/assets', flavorId);
if (existsSync(join(art, 'icon.png'))) {
  run('npx', [
    '--yes',
    '@capacitor/assets',
    'generate',
    '--ios',
    '--assetPath',
    `native/assets/${flavorId}`,
  ]);
} else {
  console.warn(
    `warn: no app icon at native/assets/${flavorId}/icon.png — the app keeps ` +
      'the Capacitor placeholder art. See native/assets/README.md.',
  );
}

// ── 5. Hand off to Xcode ─────────────────────────────────────────────────────
run('npx', ['--no-install', 'cap', 'open', 'ios']);
console.log(
  `\n${flavor.appName} is open in Xcode: set the signing team, then Product → Archive.\n` +
    'Checklist: docs/RUNBOOK-native.md → "TestFlight / App Store checklist".',
);
