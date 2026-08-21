#!/usr/bin/env node
/**
 * Lighthouse performance gate — runs Lighthouse against the production build
 * and fails if Performance, Accessibility, Best Practices, or SEO scores fall
 * below thresholds.
 *
 * Run after `vite build && vite preview` (preview server must be running on port 5000).
 * Requires `lighthouse` in devDependencies.
 *
 * Node-based Lighthouse runner: spawns Chrome locally and measures Core Web Vitals,
 * performance metrics, accessibility, and SEO. Re-base thresholds after intentional
 * changes that move the baseline (framework updates, new critical assets, etc).
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

// Lighthouse score thresholds (0–100). Scores are weighted averages of multiple
// metrics per category. These are conservative — they allow gradual regression
// detection without being brittle to minor shifts.
const THRESHOLDS = {
  performance: 80,
  accessibility: 90,
  'best-practices': 85,
  seo: 90,
};

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

async function runLighthouse() {
  return new Promise((resolve, reject) => {
    // Run lighthouse as a CLI subprocess (simpler than importing the module).
    // Points at http://localhost:5000 (the vite preview server).
    const proc = spawn('npx', ['lighthouse', 'http://localhost:5000', '--output=json', '--quiet'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000, // 2 min timeout for the full run
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data;
    });

    proc.stderr?.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Lighthouse exited with code ${code}\n${stderr}`));
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result.categories);
      } catch (e) {
        reject(new Error(`Failed to parse Lighthouse JSON: ${e.message}`));
      }
    });

    proc.on('error', reject);
  });
}

async function checkLighthouse() {
  console.log('Running Lighthouse against http://localhost:5000…\n');

  try {
    const categories = await runLighthouse();

    const results = [];
    let allPass = true;

    for (const [name, threshold] of Object.entries(THRESHOLDS)) {
      const category = categories[name];
      if (!category) {
        console.error(`✗ Category "${name}" not found in Lighthouse results`);
        allPass = false;
        continue;
      }

      const score = Math.round(category.score * 100);
      const pass = score >= threshold;
      allPass = allPass && pass;

      const icon = pass ? '✓' : '✗';
      const color = pass ? colors.green : colors.red;
      const label = name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' ');

      console.log(
        `${color}${icon}${colors.reset} ${label.padEnd(18)} ${score.toString().padStart(3)}/100  (threshold ${threshold})`,
      );
      results.push({ name, score, threshold, pass });
    }

    console.log('');

    if (!allPass) {
      const failures = results.filter((r) => !r.pass);
      const msg = failures.map((r) => `${r.name}: ${r.score}/${r.threshold}`).join(', ');
      console.error(`${colors.red}✗ Lighthouse check FAILED — ${msg}.${colors.reset}`);
      process.exit(1);
    }

    console.log(`${colors.green}✓ All Lighthouse categories above thresholds.${colors.reset}`);
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      console.error(
        `${colors.red}✗ Cannot connect to http://localhost:5000. Is the preview server running?${colors.reset}\n` +
          `   Run: npm run preview (in another terminal) before running this script.`,
      );
    } else {
      console.error(
        `${colors.red}✗ Lighthouse check failed: ${error.message}${colors.reset}\n` +
          `   Install lighthouse: npm install --save-dev lighthouse`,
      );
    }
    process.exit(1);
  }
}

checkLighthouse();
