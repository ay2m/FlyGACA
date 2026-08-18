/**
 * The lazy corpus loader + BM25 search internals — `loadRaw` (disk and HTTP
 * sources), the cached/retry `getIndex`, and `retrieve` over a real index. corpus.ts
 * caches the built index in a module-level promise, so each test gets a fresh module
 * (`vi.resetModules()` + dynamic import) and points `CORPUS_URL` at either a temp
 * fixture file or a stubbed HTTP endpoint. corpus.test.ts covers `parseSearchIndex`;
 * this covers the load/search paths that the `__setIndexForTest` shortcut skips.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = {
  generated: "2026-02-02",
  count: 2,
  scope: "gacar",
  entries: [
    { d: "Runway markings", b: "Part 91", u: "?type=regulations&id=part-91#sec-1", x: "runway holding position markings" },
    { d: "Runway lighting", b: "Part 91", u: "?type=regulations&id=part-91#sec-2", x: "runway edge lighting systems" },
  ],
};

let fixturePath: string;

beforeAll(() => {
  // A distinctive name (no Date/random available) so the on-disk source branch has a
  // real file to read.
  fixturePath = join(tmpdir(), "flygaca-corpus-fixture-loader.json");
  writeFileSync(fixturePath, JSON.stringify(FIXTURE), "utf8");
});

afterAll(() => {
  try {
    rmSync(fixturePath);
  } catch {
    /* best-effort cleanup */
  }
});

beforeEach(() => {
  vi.resetModules();
  delete process.env.CORPUS_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadRaw — on-disk source + BM25 search", () => {
  it("reads a disk fixture, builds the index, and retrieves ranked passages", async () => {
    process.env.CORPUS_URL = fixturePath;
    const corpus = await import("../src/corpus.js");
    // "runway" matches both entries (forcing a ranked sort); "xyzzy" is in no posting
    // list (the skip branch).
    const results = await corpus.retrieve("runway xyzzy", 6);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.score > 0)).toBe(true);
    // Sorted by descending score.
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it("returns nothing for a query of only unknown terms", async () => {
    process.env.CORPUS_URL = fixturePath;
    const corpus = await import("../src/corpus.js");
    expect(await corpus.retrieve("zzz qqq", 6)).toEqual([]);
  });
});

describe("loadRaw — HTTP source", () => {
  it("fetches and parses an http(s) corpus URL", async () => {
    process.env.CORPUS_URL = "https://corpus.test/library-search.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => FIXTURE })),
    );
    const corpus = await import("../src/corpus.js");
    const results = await corpus.retrieve("lighting", 6);
    expect(results.length).toBeGreaterThan(0);
  });

  it("throws a clear error when the corpus fetch is not ok", async () => {
    process.env.CORPUS_URL = "https://corpus.test/library-search.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })),
    );
    const corpus = await import("../src/corpus.js");
    await expect(corpus.retrieve("runway", 6)).rejects.toThrow(/corpus fetch failed: 502/);
  });
});

describe("getIndex — cache invalidation on failure", () => {
  it("clears the cached promise on a load failure so the next call retries", async () => {
    process.env.CORPUS_URL = "https://corpus.test/library-search.json";
    const fetchMock = vi
      .fn()
      // First load fails …
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      // … the retry after the cache reset succeeds.
      .mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE });
    vi.stubGlobal("fetch", fetchMock);
    const corpus = await import("../src/corpus.js");

    await expect(corpus.retrieve("runway", 6)).rejects.toThrow(/corpus fetch failed/);
    // The cached indexPromise was reset in the catch, so a second call rebuilds
    // rather than replaying the rejected promise.
    const results = await corpus.retrieve("runway", 6);
    expect(results.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
