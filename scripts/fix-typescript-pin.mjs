// One-shot repair script (run by maintainer or CI): pin TypeScript 5.9 + resync lockfiles.
// Why: PR #486 bumped typescript 5.9.3 -> 7.0.2; TS7 removed tsconfig `baseUrl`,
// so `tsc -b` fails with TS5102 and every CI/Deploy run on main fails at Build.
// Usage: node scripts/fix-typescript-pin.mjs && npm install && npm --prefix functions install
import fs from 'node:fs';
for (const p of ['package.json', 'functions/package.json']) {
  // JSON.parse keeps the LAST duplicate key, so writing back
  // also removes the stale duplicate typescript/globals entries.
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const sec of ['dependencies', 'devDependencies']) {
    if (d[sec] && d[sec].typescript) d[sec].typescript = '~5.9.2';
  }
  if (d.devDependencies?.globals) d.devDependencies.globals = '^17.9.0';
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  console.log('pinned', p);
}
