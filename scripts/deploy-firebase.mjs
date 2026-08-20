#!/usr/bin/env node

/**
 * Deploy to Firebase Hosting after running the full prerender + coverage gate.
 *
 * Invoked by `npm run deploy:firebase` — not `npm run deploy`, which exits with
 * a pointer to RUNBOOK-deploy.md for the canonical Cloud Run + GCS deployment.
 *
 * This script:
 * 1. Builds the site (`npm run build` — prerender-head only)
 * 2. Runs the full-body prerender over the build, with Playwright + Chromium
 * 3. Runs the coverage gate — fails if any sitemap URL stays head-only or missing
 * 4. Deploys to Firebase Hosting (flygaca-prod by default, configurable via .firebaserc)
 *
 * Usage:
 *   npm run deploy:firebase                          # Deploy to default project
 *   npm run deploy:firebase -- --project flygaca-sa  # Deploy to a specific project
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const isCI = process.env.CI === 'true';

function run(cmd, args = [], opts = {}) {
  const { verbose = true, exitOnError = true } = opts;
  if (verbose) console.log(`\n> ${cmd} ${args.join(' ')}`);

  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PRERENDER_MAX: '0', // Full corpus, not 560
      NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS || '',
    },
  });

  if (r.error) throw r.error;
  if (r.status !== 0 && exitOnError) {
    console.error(`\n✗ ${cmd} exited ${r.status}`);
    process.exit(r.status);
  }
  return r.status;
}

// Check prereq: Firebase CLI
if (!process.env.CI) {
  const firebaseExe = spawnSync('which', ['firebase'], { stdio: 'pipe' });
  if (firebaseExe.status !== 0) {
    console.error(
      '✗ Firebase CLI not found. Install with: npm install -g firebase-tools',
    );
    process.exit(1);
  }
}

console.log('🚀 Deploy to Firebase Hosting (with full prerender)\n');

// 1. Build (prerender-head only)
console.log('📦 Build (prerender-head)…');
run('npm', ['run', 'build']);

// 2. Full-body prerender
console.log('\n📄 Full-body prerender (PRERENDER_MAX=0)…');
run('npm', ['run', 'prerender']);

// 3. Coverage gate — must pass
console.log('\n✓ Coverage gate…');
run('npm', ['run', 'check:prerender:coverage']);

// 4. Deploy to Firebase Hosting
// Pass through any --project or other args
const firebaseArgs = ['deploy', '--only', 'hosting'];
// Add any args after --
const dashdashIdx = process.argv.indexOf('--');
if (dashdashIdx >= 0) {
  firebaseArgs.push(...process.argv.slice(dashdashIdx + 1));
}
// Omit interactive prompts in CI
if (isCI) {
  firebaseArgs.push('--non-interactive');
}

console.log('\n🔥 Firebase Hosting deploy…');
run('firebase', firebaseArgs);

console.log('\n✅ Deploy complete! Check Firebase console for live status.');
