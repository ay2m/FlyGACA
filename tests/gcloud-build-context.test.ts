import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  globSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * `.gcloudignore` decides what `gcloud builds submit` uploads as the build
 * context. Anything it drops can never be COPYed, and the failure surfaces only
 * in Cloud Build — a local `docker build -f server/Dockerfile .` succeeds,
 * because `.dockerignore` uses DIFFERENT matching rules:
 *
 *   .dockerignore  anchors every pattern at the context root, and honours `!`
 *                  exceptions for files inside an excluded directory.
 *   .gcloudignore  uses .gitignore syntax, where a pattern with no slash matches
 *                  at ANY depth, and where a file cannot be re-included once its
 *                  parent directory is excluded.
 *
 * Both differences have already broken this build: a bare `src` also excluded
 * `server/src`, and `public` + `!public/data/rag-chunks.json` silently dropped
 * the corpus. Neither was visible outside a real `gcloud builds submit`.
 *
 * So evaluate the real file with the real semantics: git IS the reference
 * implementation of .gitignore, so a throwaway repo carrying `.gcloudignore` as
 * its `.gitignore` answers the only question that matters — would this path
 * survive the upload?
 */

const REPO = resolve(__dirname, '..');
const scratch = mkdtempSync(join(tmpdir(), 'gcloudignore-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const git = (...args: string[]) => execFileSync('git', args, { cwd: scratch, encoding: 'utf8' });

git('init', '-q', '.');
writeFileSync(join(scratch, '.gitignore'), readFileSync(join(REPO, '.gcloudignore'), 'utf8'));

/** Would `gcloud builds submit` include this repo-relative path? */
function isUploaded(path: string): boolean {
  const full = join(scratch, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, '');
  try {
    execFileSync('git', ['check-ignore', '-q', path], { cwd: scratch });
    return false; // exit 0 => ignored
  } catch {
    return true; // exit 1 => not ignored
  }
}

/** Every path `server/Dockerfile` COPYs *from the build context*. */
function dockerfileContextSources(): string[] {
  const lines = readFileSync(join(REPO, 'server/Dockerfile'), 'utf8').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!/^COPY\s/i.test(line)) continue;
    // `COPY --from=build` reads a previous STAGE, not the uploaded context.
    if (/--from=/.test(line)) continue;
    const parts = line.replace(/^COPY\s+/i, '').split(/\s+/);
    for (const src of parts.slice(0, -1)) {
      if (src.includes('*')) {
        // Expand globs against the real repo so `server/package*.json` is checked
        // as the files it actually resolves to.
        out.push(...globSync(src, { cwd: REPO }).map((p) => p.replace(/\\/g, '/')));
      } else {
        out.push(src);
      }
    }
  }
  return [...new Set(out)];
}

describe('.gcloudignore vs server/Dockerfile', () => {
  const sources = dockerfileContextSources();

  it('finds the COPY sources to check', () => {
    // Guard the parser itself: an empty list would make every assertion below
    // vacuously pass and hide exactly the regression this file exists to catch.
    expect(sources.length).toBeGreaterThan(4);
    expect(sources).toContain('server/src');
    expect(sources).toContain('public/data/rag-chunks.json');
  });

  it.each(sources)('uploads %s, which the image COPYs', (src) => {
    // A directory source means every file under it must survive, so check a real
    // file within it rather than the directory entry alone.
    const target = existsSync(join(REPO, src)) && !src.includes('.')
      ? `${src}/__probe__.txt`
      : src;
    expect(isUploaded(target)).toBe(true);
  });
});

describe('.gcloudignore still keeps the context small', () => {
  // The corpus is 65 MB and the image needs exactly one file from it. The
  // re-include must not turn into "ship all of public/".
  it.each([
    'public/data/library-search.json',
    'public/img/logo.png',
    'src/main.tsx',
    'tests/example.test.ts',
    'e2e/smoke.spec.ts',
    'worker/index.ts',
    'node_modules/pkg/index.js',
    'server/node_modules/pkg/index.js',
    'server/lib/index.js',
    'dist/index.html',
    '.env.local',
  ])('excludes %s', (path) => {
    expect(isUploaded(path)).toBe(false);
  });
});
