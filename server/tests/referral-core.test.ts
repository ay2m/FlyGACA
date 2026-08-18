import { describe, expect, it } from "vitest";
import { referralCode, normalizeCode, isValidCode } from "../src/referral-core.js";

const AMBIGUOUS = /[ILOU01]/;

describe("referralCode", () => {
  it("is deterministic, 8 chars, and unambiguous", () => {
    const a = referralCode("user-123");
    expect(a).toHaveLength(8);
    expect(referralCode("user-123")).toBe(a); // stable
    expect(a).not.toMatch(AMBIGUOUS);
    expect(isValidCode(a)).toBe(true);
  });

  it("differs across uids", () => {
    expect(referralCode("alice")).not.toBe(referralCode("bob"));
  });
});

describe("normalizeCode", () => {
  it("uppercases and strips separators/spaces", () => {
    expect(normalizeCode(" ab-cd ef2 ")).toBe("ABCDEF2");
    expect(normalizeCode("abcdefgh")).toBe("ABCDEFGH");
  });

  it("caps length at 8 and handles empty/nullish", () => {
    expect(normalizeCode("ABCDEFGHIJ")).toBe("ABCDEFGH");
    expect(normalizeCode("")).toBe("");
    expect(normalizeCode(null)).toBe("");
    expect(normalizeCode(undefined)).toBe("");
  });
});

describe("isValidCode", () => {
  it("accepts a real generated code and rejects malformed ones", () => {
    expect(isValidCode(referralCode("someone"))).toBe(true);
    expect(isValidCode("SHORT")).toBe(false); // wrong length
    expect(isValidCode("ABCDEFG1")).toBe(false); // contains a disallowed char (1)
    expect(isValidCode("abcdefgh")).toBe(false); // lowercase not normalized
    expect(isValidCode("")).toBe(false);
  });
});
