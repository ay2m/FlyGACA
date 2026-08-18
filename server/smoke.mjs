/**
 * Smoke test for the pure (non-model) backend pieces, against the REAL corpus.
 * Run: CORPUS_URL=../public/data/library-search.json node smoke.mjs
 * The Gemini call is intentionally excluded (needs a deployed secret).
 */
import assert from "node:assert";
import { retrieve, toChatSource, searchHref, getIndex } from "./lib/corpus.js";
import { frame, doneFrame } from "./lib/sse.js";

let pass = 0;
const ok = (label) => { console.log("  ✓", label); pass++; };

// 1. Corpus loads and indexes.
const t0 = Date.now();
const index = await getIndex();
console.log(`Indexed corpus rev ${index.generated} in ${Date.now() - t0} ms`);
assert(index.generated, "corpus has a generated date");
ok("corpus loads + builds BM25 index");

// 2. A real aviation query returns ranked, grounded hits.
const hits = await retrieve("alternate aerodrome fuel reserve requirements", 5);
assert(hits.length > 0, "got hits");
assert(hits[0].score > 0, "top hit has positive score");
assert(hits[0].score >= hits[hits.length - 1].score, "hits are sorted desc");
console.log("  top hits:");
for (const h of hits.slice(0, 3)) {
  const s = toChatSource(h.entry, index.generated);
  console.log(`    [${h.score.toFixed(2)}] ${s.citation}`);
  console.log(`           url=${s.url}  part=${s.part}  rev=${s.corpusVersion}`);
}
ok("relevant query returns ranked hits");

// 3. Citation mapping is well-formed.
const src = toChatSource(hits[0].entry, index.generated);
assert(src.url.startsWith("/library"), "url maps to an app Library route");
assert(src.corpusVersion === `Rev ${index.generated}`, "corpusVersion stamped");
assert(typeof src.citation === "string" && src.citation.length > 0, "citation present");
ok("toChatSource yields a routable, versioned citation");

// 4. searchHref replicates the frontend mapping for all three corpora.
assert.equal(
  searchHref("document.html?type=regulations&id=part-91#sec-91-155"),
  "/library/part-91#sec-91-155",
);
assert.equal(
  searchHref("document.html?type=reference&id=ac-68-1#sec-x"),
  "/library/reference/ac-68-1#sec-x",
);
assert.equal(
  searchHref("document.html?type=handbooks&id=pilot-guide"),
  "/library/handbook/pilot-guide",
);
ok("searchHref matches src/lib/content.ts for regulations/reference/handbook");

// 5. Gibberish retrieves nothing (→ flow would refuse).
const none = await retrieve("zzzqqq xkcdwabbit floofernutter", 5);
assert(none.length === 0, "no hits for nonsense query");
ok("out-of-corpus query returns no hits (drives server-side refusal)");

// 6. SSE frames serialize to the legacy wire format drainSse() parses.
const f = frame({ type: "token", delta: "hi" });
assert(f.startsWith("data: ") && f.endsWith("\n\n"), "frame is a data: line");
assert.deepEqual(JSON.parse(f.slice(6).trim()), { type: "token", delta: "hi" });
assert.equal(doneFrame(), "data: [DONE]\n\n");
ok("SSE serializer emits the legacy frame protocol");

console.log(`\nAll ${pass} smoke checks passed.`);
