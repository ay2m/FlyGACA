import { describe, expect, it } from "vitest";
import {
  anonymousAuthContext,
  extractBearerToken,
  mayLinkGoogleToExistingAccount,
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

describe("mayLinkGoogleToExistingAccount", () => {
  it("refuses an unverified password row — the account-takeover case", () => {
    // Someone registered the victim's address and never verified it. Linking would
    // leave their password working on the victim's account and mark it verified.
    expect(
      mayLinkGoogleToExistingAccount({
        googleEmailVerified: true,
        existingEmailVerified: false,
        existingHasPassword: true,
      }),
    ).toBe(false);
  });

  it("links when both sides have proven the mailbox", () => {
    expect(
      mayLinkGoogleToExistingAccount({
        googleEmailVerified: true,
        existingEmailVerified: true,
        existingHasPassword: true,
      }),
    ).toBe(true);
  });

  it("links an unverified row that has no password to inherit", () => {
    expect(
      mayLinkGoogleToExistingAccount({
        googleEmailVerified: true,
        existingEmailVerified: false,
        existingHasPassword: false,
      }),
    ).toBe(true);
  });

  it("refuses whenever Google has not verified the address", () => {
    // Google asserting an address it hasn't verified is no proof of ownership,
    // so it cannot claim even an already-verified row.
    for (const existingEmailVerified of [true, false]) {
      for (const existingHasPassword of [true, false]) {
        expect(
          mayLinkGoogleToExistingAccount({
            googleEmailVerified: false,
            existingEmailVerified,
            existingHasPassword,
          }),
        ).toBe(false);
      }
    }
  });
});
