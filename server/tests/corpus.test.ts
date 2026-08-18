import { describe, expect, it, vi } from "vitest";
import { parseSearchIndex } from "../src/corpus.js";

const valid = {
  generated: "2026-01-01",
  count: 1,
  scope: "gacar",
  entries: [{ d: "Heading", b: "Part 1", u: "?type=regulations&id=part-1#sec-1", x: "text" }],
};

describe("parseSearchIndex", () => {
  it("accepts a well-formed index", () => {
    const idx = parseSearchIndex({ ...valid });
    expect(idx.entries).toHaveLength(1);
    expect(idx.generated).toBe("2026-01-01");
    expect(idx.count).toBe(1);
  });

  it("rejects non-object input", () => {
    expect(() => parseSearchIndex(null)).toThrow(/corpus:/);
    expect(() => parseSearchIndex("nope")).toThrow(/corpus:/);
  });

  it("rejects a missing or empty entries array", () => {
    expect(() => parseSearchIndex({ ...valid, entries: [] })).toThrow(/entries/);
    expect(() => parseSearchIndex({ generated: "x", scope: "y", count: 0 })).toThrow(/entries/);
  });

  it("rejects an entry that is not an object", () => {
    expect(() => parseSearchIndex({ ...valid, entries: [null] })).toThrow(/is not an object/);
    expect(() => parseSearchIndex({ ...valid, entries: [42] })).toThrow(/is not an object/);
  });

  it("rejects an entry with a non-string required field", () => {
    expect(() => parseSearchIndex({ ...valid, entries: [{ d: "h", b: "Part 1", u: 5 }] })).toThrow(
      /d\/b\/u/,
    );
  });

  it("rejects a non-string optional x", () => {
    expect(() =>
      parseSearchIndex({ ...valid, entries: [{ d: "h", b: "b", u: "u", x: 5 }] }),
    ).toThrow(/'x'/);
  });

  it("warns but accepts a count mismatch (truncation signal)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const idx = parseSearchIndex({ ...valid, count: 99 });
    expect(idx.entries).toHaveLength(1);
    // The returned count is always reconciled to the real entries length.
    expect(idx.count).toBe(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("accepts an entry carrying a well-formed lineage block", () => {
    const lineage = { document: "GACAR_Part_61", section: "61.107", paragraph: "b" };
    const idx = parseSearchIndex({ ...valid, entries: [{ ...valid.entries[0], lineage }] });
    expect(idx.entries[0].lineage).toMatchObject({ document: "GACAR_Part_61", section: "61.107" });
  });

  it("tolerates a malformed lineage by dropping it and keeping the entry", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const idx = parseSearchIndex({ ...valid, entries: [{ ...valid.entries[0], lineage: { nope: 1 } }] });
    expect(idx.entries).toHaveLength(1);
    expect(idx.entries[0].lineage).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
