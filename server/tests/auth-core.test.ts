import { describe, expect, it } from "vitest";
import {
  anonymousAuthContext,
  extractBearerToken,
  toAuthContext,
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
    // Case-sensitive: lowercase scheme is not honoured (Firebase sends "Bearer ").
    expect(extractBearerToken("bearer abc")).toBeUndefined();
  });
});

describe("toAuthContext", () => {
  it("maps the uid and email claims through", () => {
    expect(
      toAuthContext({ uid: "u1", email: "cap@example.com", email_verified: true }),
    ).toEqual({ uid: "u1", email: "cap@example.com", emailVerified: true });
  });

  it("treats a missing or non-true email_verified claim as unverified", () => {
    expect(toAuthContext({ uid: "u1" }).emailVerified).toBe(false);
    expect(toAuthContext({ uid: "u1", email_verified: false }).emailVerified).toBe(false);
    // Only a strict boolean true verifies — a truthy non-boolean must not.
    expect(
      toAuthContext({ uid: "u1", email_verified: "true" as unknown as boolean }).emailVerified,
    ).toBe(false);
  });
});

describe("anonymousAuthContext", () => {
  it("has no uid and reads as unverified", () => {
    expect(anonymousAuthContext()).toEqual({ emailVerified: false });
  });
});
