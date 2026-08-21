import { describe, expect, it } from "vitest";
import { GROUNDING, gradeRetrieval } from "../src/grounding-core.js";

/**
 * The numbers in these cases are measured against the shipped 29,165-chunk
 * corpus (`public/data/rag-chunks.json`), not invented: each comment names the
 * query that produced that `matched`/`queryTerms` pair. They are the regression
 * fence for the gate that previously badged 9 of 10 off-topic questions
 * "grounded".
 */
describe("gradeRetrieval — off-topic questions must refuse", () => {
  it("refuses a wordy off-topic question that scores well on raw BM25", () => {
    // "who won the world cup in 2018 and what was the final score" → 2/8, score 11.17
    expect(gradeRetrieval({ matched: 2, queryTerms: 8, topScore: 11.17 })).toBe("refusal");
    // "best exercises to build upper body strength at home ..." → 2/9, score 14.53
    expect(gradeRetrieval({ matched: 2, queryTerms: 9, topScore: 14.53 })).toBe("refusal");
    // "what is the best way to make a chocolate cake ..." → 2/7, score 12.10
    expect(gradeRetrieval({ matched: 2, queryTerms: 7, topScore: 12.1 })).toBe("refusal");
  });

  it("refuses a single stray rare word inside a long question", () => {
    // "translate good morning into french and spanish for my trip" → 1/7.
    // This one scored the HIGHEST term rarity of any query tested, which is why
    // the gate cannot key off idf.
    expect(gradeRetrieval({ matched: 1, queryTerms: 7, topScore: 11.2 })).toBe("refusal");
  });

  it("refuses when nothing matched at all", () => {
    // "recipe for lasagna" → 0/2; also every Arabic query against this English corpus.
    expect(gradeRetrieval({ matched: 0, queryTerms: 2, topScore: 0 })).toBe("refusal");
    expect(gradeRetrieval({ matched: 0, queryTerms: 6, topScore: 0 })).toBe("refusal");
  });
});

describe("gradeRetrieval — real regulatory questions must answer", () => {
  it("grounds a focused question whose terms are well covered", () => {
    // "VFR weather minimums for class C airspace" → 5/5
    expect(gradeRetrieval({ matched: 5, queryTerms: 5, topScore: 32.44 })).toBe("grounded");
    // "flight duty time limits for commercial pilots" → 4/6
    expect(gradeRetrieval({ matched: 4, queryTerms: 6, topScore: 23.28 })).toBe("grounded");
    // "minimum equipment list requirements for dispatch" → 3/5
    expect(gradeRetrieval({ matched: 3, queryTerms: 5, topScore: 17.7 })).toBe("grounded");
  });

  it("grounds a terse query that is entirely covered", () => {
    // "MEL" → 1/1, "logbook" → 1/1: one term, but it IS the question.
    expect(gradeRetrieval({ matched: 1, queryTerms: 1, topScore: 10.6 })).toBe("grounded");
    // "medical class 1" → 2/2; "VFR weather minimums" → 3/3
    expect(gradeRetrieval({ matched: 2, queryTerms: 2, topScore: 14.9 })).toBe("grounded");
    expect(gradeRetrieval({ matched: 3, queryTerms: 3, topScore: 26.65 })).toBe("grounded");
  });

  it("answers a verbose genuine question as partial rather than refusing it", () => {
    // "I am a student pilot preparing for my checkride next month and I would
    // really like to understand exactly what the weather minimums are ..." → 5/21.
    // Length-normalised scoring refused these, which is why that approach was
    // rejected: the student gets an answer, honestly badged.
    expect(gradeRetrieval({ matched: 5, queryTerms: 21, topScore: 32.44 })).toBe("partial");
    expect(gradeRetrieval({ matched: 4, queryTerms: 14, topScore: 18.6 })).toBe("partial");
  });

  it("marks an aviation question that is adjacent to the corpus as partial", () => {
    // "how do I get a pilot license in the United States with the FAA" → 3/6.
    // GACAR is not the right authority, so it must not read as fully grounded.
    expect(gradeRetrieval({ matched: 3, queryTerms: 6, topScore: 18.4 })).toBe("partial");
  });
});

describe("gradeRetrieval — the documented abbreviation limitation", () => {
  it("refuses a short abbreviation query, because junk has the same signature", () => {
    // Measured: "ELT battery" retrieves the correct "Emergency locator
    // transmitter (ELT)" chunk, but that chunk does not contain "battery", so it
    // reads 1/2 — byte-identical to "laptop battery" (also 1/2). Term statistics
    // cannot tell them apart, so both refuse. Pinned so that anyone loosening
    // this rule sees what else it lets in. See the module docblock.
    expect(gradeRetrieval({ matched: 1, queryTerms: 2, topScore: 15.83 })).toBe("refusal");
    expect(gradeRetrieval({ matched: 1, queryTerms: 4, topScore: 15.83 })).toBe("refusal");
  });
});

describe("gradeRetrieval — the score floor and degenerate input", () => {
  it("refuses below the score floor however good the overlap looks", () => {
    expect(
      gradeRetrieval({ matched: 5, queryTerms: 5, topScore: GROUNDING.minScore - 0.01 }),
    ).toBe("refusal");
  });

  it("refuses on an empty query or a non-finite score", () => {
    expect(gradeRetrieval({ matched: 0, queryTerms: 0, topScore: 0 })).toBe("refusal");
    expect(gradeRetrieval({ matched: 5, queryTerms: 5, topScore: Number.NaN })).toBe("refusal");
  });

  it("never reports coverage above 1 as anything but grounded", () => {
    // Defensive: matched can't exceed queryTerms, but the gate must not misbehave.
    expect(gradeRetrieval({ matched: 6, queryTerms: 5, topScore: 20 })).toBe("grounded");
  });
});
