import { describe, expect, it } from "vitest";
import {
  anonymousAuthContext,
  extractBearerToken,
  meetsPasswordPolicy,
} from "../src/auth-core.js";

describe("extractBearerToken", () => {
  it("pulls the token from a Bearer header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("trims surrounding whitespace", () => {
    expect(extractBearerToken("Bearer   spaced  ")).toBe("spaced");
  });

  it("returns undefined for a missing, empty, or non-Bearer header", () => {
    expect(extractBearerToken(undefined)).toBeUndefined();
    expect(extractBearerToken(null)).toBeUndefined();
    expect(extractBearerToken("")).toBeUndefined();
    expect(extractBearerToken("Bearer ")).toBeUndefined();
    expect(extractBearerToken("Bearer    ")).toBeUndefined();
    expect(extractBearerToken("Basic abc")).toBeUndefined();
    // Case-sensitive: lowercase scheme is not honoured.
    expect(extractBearerToken("bearer abc")).toBeUndefined();
  });
});

describe("anonymousAuthContext", () => {
  it("has no uid and reads as unverified", () => {
    expect(anonymousAuthContext()).toEqual({ emailVerified: false });
  });
});

describe("meetsPasswordPolicy", () => {
  it("accepts a password satisfying all four rules", () => {
    expect(meetsPasswordPolicy("A-good-password1")).toBe(true);
    expect(meetsPasswordPolicy("Aa1!Aa1!")).toBe(true); // exactly 8, all rules
  });

  it("rejects each single-rule failure", () => {
    expect(meetsPasswordPolicy("Aa1!Aa1")).toBe(false); // 7 chars
    expect(meetsPasswordPolicy("aa1!aa1!")).toBe(false); // no upper
    expect(meetsPasswordPolicy("AA1!AA1!")).toBe(false); // no lower
    expect(meetsPasswordPolicy("Aa!!Aa!!")).toBe(false); // no digit
    expect(meetsPasswordPolicy("Aa11Aa11")).toBe(false); // no special
    expect(meetsPasswordPolicy("")).toBe(false);
  });

  it("counts a unicode letter-less password by the same regexes as the client", () => {
    // Arabic script has no upper/lower distinction → the mixed rule fails, the
    // special rule passes (non-ASCII-alphanumeric). Mirrors the client meter.
    expect(meetsPasswordPolicy("كلمةسر1234")).toBe(false);
  });
});
