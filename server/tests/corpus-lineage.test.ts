import { describe, expect, it } from "vitest";
import { toChatSource, type Lineage } from "../src/corpus.js";

const entry = (lineage?: Lineage) => ({
  d: "Flight Proficiency - Private Pilot",
  b: "Part 61",
  u: "?type=regulations&id=part-61#sec-61-107",
  x: "A person must receive flight training.",
  lineage,
});

describe("toChatSource — lineage-aware citations", () => {
  it("maps a full lineage into section/part/paragraph and an exact citation", () => {
    const lineage: Lineage = {
      document: "GACAR_Part_61",
      subpart: "E",
      section: "61.107",
      paragraph: "b",
      sub_paragraph: "1_i",
      title: "Flight Proficiency - Private Pilot",
      effective_date: "2026-06",
    };
    const src = toChatSource(entry(lineage), "2026-06");
    expect(src.citation).toBe(
      "GACAR Part 61 §61.107(b)(1)(i) — Flight Proficiency - Private Pilot",
    );
    expect(src).toMatchObject({
      section: "61.107",
      part: "61",
      subpart: "E",
      paragraph: "b",
      subParagraph: "1_i",
      effectiveDate: "2026-06",
    });
    expect(src.url).toBe("/library/part-61#sec-61-107");
  });

  it("falls back to badge + title for a non-numbered (Definitions) lineage", () => {
    const lineage: Lineage = {
      document: "GACAR_Part_1",
      section: null,
      title: "ACAS broadcast",
    };
    const src = toChatSource({ ...entry(lineage), b: "Part 1" }, "2026-06");
    expect(src.citation).toBe("GACAR Part 1 — ACAS broadcast");
    expect(src.part).toBe("1");
    expect(src.paragraph).toBeUndefined();
  });

  it("preserves legacy behavior for an entry WITHOUT lineage (regression)", () => {
    const src = toChatSource(entry(undefined), "2026-05-24");
    expect(src.citation).toBe("GACAR Part 61 — Flight Proficiency - Private Pilot");
    expect(src).toMatchObject({ section: "61-107", part: "61", corpusVersion: "Rev 2026-05-24" });
    expect(src.paragraph).toBeUndefined();
    expect(src.subParagraph).toBeUndefined();
  });
});
