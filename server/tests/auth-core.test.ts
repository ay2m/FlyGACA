import { describe, expect, it } from "vitest";
import { anonymousAuthContext, extractBearerToken } from "../src/auth-core.js";

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
