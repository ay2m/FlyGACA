/**
 * The citation-shaping + retrieval path in corpus.ts — the promise that Captain
 * Adel cites the exact Part/section. parseSearchIndex is covered in corpus.test.ts;
 * this covers searchHref (legacy URL → reader route), toChatSource (lineage-aware
 * citation assembly), and retrieve (BM25 ranking via the test-injected index).
 */
import { describe, it, expect } from "vitest";
import { searchHref, toChatSource, retrieve, __setIndexForTest } from "../src/corpus.js";

type Entry = Parameters<typeof toChatSource>[0];
type Index = Parameters<typeof __setIndexForTest>[0];

describe("searchHref", () => {
  it("rewrites regulation / reference / handbook URLs to reader routes", () => {
    expect(searchHref("?type=regulations&id=part-1#sec-1")).toBe("/library/part-1#sec-1");
    expect(searchHref("?type=reference&id=aim")).toBe("/library/reference/aim");
    expect(searchHref("?type=handbooks&id=phak")).toBe("/library/handbook/phak");
  });

  it("returns null for a missing id or an unknown type", () => {
    expect(searchHref("?type=regulations")).toBeNull();
    expect(searchHref("?type=mystery&id=x")).toBeNull();
  });
});

describe("toChatSource", () => {
  it("builds an exact, lineage-aware GACAR citation and metadata", () => {
    const entry: Entry = {
      d: "Aeronautical experience",
      b: "Part 61",
      u: "?type=regulations&id=part-61#sec-61.107",
      x: "  An applicant must have...  ",
      lineage: {
        document: "GACAR_Part_61",
        section: "61.107",
        paragraph: "b",
        sub_paragraph: "1_i",
        title: "Flight proficiency",
        effective_date: "2024-01-01",
        subpart: "C",
      },
    };
    const src = toChatSource(entry, "2026-01-01");
    expect(src.citation).toBe("GACAR Part 61 §61.107(b)(1)(i) — Flight proficiency");
    expect(src.url).toBe("/library/part-61#sec-61.107");
    expect(src.part).toBe("61");
    expect(src.section).toBe("61.107");
    expect(src.subpart).toBe("C");
    expect(src.verbatim).toBe("An applicant must have..."); // trimmed
    expect(src.effectiveDate).toBe("2024-01-01");
    expect(src.corpusVersion).toBe("Rev 2026-01-01");
  });

  it("strips the splitter's #N occurrence suffix from the paragraph path", () => {
    const entry: Entry = {
      d: "",
      b: "Part 61",
      u: "?type=regulations&id=part-61",
      lineage: { document: "GACAR_Part_61", section: "61.1", paragraph: "a#2", sub_paragraph: "3#1" },
    };
    expect(toChatSource(entry, "x").citation).toBe("GACAR Part 61 §61.1(a)(3)");
  });

  it("falls back to badge + heading when there is no lineage", () => {
    const src = toChatSource({ d: "Definitions", b: "Part 1", u: "?type=regulations&id=part-1" }, "x");
    expect(src.citation).toBe("GACAR Part 1 — Definitions");
    expect(src.url).toBe("/library/part-1");
  });

  it("joins a non-Part badge with the heading and defaults the url", () => {
    const src = toChatSource({ d: "Weather", b: "AIM", u: "bogus-url" }, "x");
    expect(src.citation).toBe("AIM — Weather");
    expect(src.url).toBe("/library"); // searchHref(bogus) is null → default
  });
});

describe("retrieve", () => {
  const index: Index = {
    generated: "2026-01-01",
    scope: "gacar",
    count: 2,
    entries: [
      {
        d: "Crosswind limits",
        b: "Part 91",
        u: "?type=regulations&id=part-91#a",
        x: "maximum demonstrated crosswind component for the aircraft",
      },
      {
        d: "Fuel requirements",
        b: "Part 91",
        u: "?type=regulations&id=part-91#b",
        x: "minimum fuel reserve for day VFR flight",
      },
    ],
  };

  it("ranks the passage matching the query first", async () => {
    __setIndexForTest(index);
    const hits = await retrieve("crosswind component", 6);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.u).toBe("?type=regulations&id=part-91#a");
  });

  it("returns an empty list for an empty query", async () => {
    __setIndexForTest(index);
    expect(await retrieve("", 6)).toEqual([]);
  });
});
