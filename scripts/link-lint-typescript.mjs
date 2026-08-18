#!/usr/bin/env node
/**
 * Give typescript-eslint its own TypeScript 6, side by side with the TypeScript 7
 * the build uses. Runs from this package's `postinstall`.
 *
 * Why: `typescript-eslint@8` throws on load under TS 7.0 ("typescript-eslint does
 * not support TS 7.0"), so `npm run lint` exits 2 before ESLint reads a single
 * file — while `tsc -b` needs TS 7. Both must coexist.
 *
 * Why not npm `overrides`: an override is per-dependency-name across the whole
 * tree, so pinning `typescript` to 6 would also downgrade the compiler the build
 * runs. There is no way to express "TS 6 for these packages only" declaratively,
 * hence the symlink: the `typescript-6` alias is installed as a normal devDep and
 * linked into each linting package's own `node_modules`, where Node's resolution
 * finds it first.
 *
 * Delete this file, the `typescript-6` devDependency and the `postinstall` once
 * typescript-eslint ships TS 7 support (typescript-eslint#10940).
 *
 * Safe to run repeatedly, and non-fatal by design — a failure here must never break
 * an install. Under `--omit=dev` the alias is absent and this no-ops.
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const modules = join(root, 'node_modules');
const source = join(modules, 'typescript-6');

/** Every package that resolves `typescript` for itself. */
function consumers() {
  const found = [];
  for (const name of ['typescript-eslint', 'ts-api-utils']) {
    if (existsSync(join(modules, name))) found.push(name);
  }
  const scope = join(modules, '@typescript-eslint');
  if (existsSync(scope)) {
    for (const name of readdirSync(scope)) found.push(join('@typescript-eslint', name));
  }
  return found;
}

function link(pkg) {
  const targetDir = join(modules, pkg, 'node_modules');
  const target = join(targetDir, 'typescript');
  if (lstatSync(target, { throwIfNoEntry: false })) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });
  symlinkSync(relative(targetDir, source), target, 'junction');
}

function main() {
  if (!existsSync(source)) return;
  const linked = consumers();
  for (const pkg of linked) link(pkg);
  if (linked.length > 0) {
    console.log(
      `link-lint-typescript: ${linked.length} typescript-eslint package(s) → typescript-6 ` +
        '(TS 7 stays for the build)',
    );
  }
}

try {
  main();
} catch (err) {
  console.warn(`link-lint-typescript: skipped (${err.message}). \`npm run lint\` may fail.`);
}
