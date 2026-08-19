/**
 * Local dev runner: compile, then watch both halves.
 *
 * Node cannot run `src/` directly. Type stripping leaves import specifiers
 * alone, and this package is NodeNext, so `import { config } from "./config.js"`
 * stays literal and resolution fails with
 * `ERR_MODULE_NOT_FOUND … server/src/config.js`. Rather than rewrite every
 * specifier, compile first and run the emitted `lib/`.
 *
 *   npm run dev            (from server/)   ·   npm run server:dev  (from root)
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const children = [];

function run(command, args, opts = {}) {
  const child = spawn(command, args, { cwd: serverDir, stdio: 'inherit', ...opts });
  children.push(child);
  return child;
}

function shutdown(code) {
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// One blocking build first: `node --watch` would otherwise race an empty lib/ on
// a fresh clone and exit before tsc ever emits.
const first = run('npx', ['tsc']);
first.on('exit', (code) => {
  if (code !== 0) shutdown(code ?? 1);
  children.length = 0;

  run('npx', ['tsc', '--watch', '--preserveWatchOutput']);
  // --env-file-if-exists so a missing .env surfaces as the config assertion
  // ("Missing required environment variable: DATABASE_URL") rather than ENOENT.
  const api = run('node', [
    '--env-file-if-exists=../.env',
    '--watch',
    '--watch-path=lib',
    'lib/index.js',
  ]);
  api.on('exit', (c) => shutdown(c ?? 0));
});
