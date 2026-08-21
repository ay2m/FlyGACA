import { describe, expect, it } from "vitest";
import { csrfVerdict, isCsrfExempt, type CsrfRequest } from "../src/csrf-core.js";

const allowlist = (origin: string) =>
  origin === "https://flygaca.com" || origin === "https://extra.example";

const req = (over: Partial<CsrfRequest>): CsrfRequest => ({
  method: "POST",
  path: "/api/auth/logout",
  origin: undefined,
  secFetchSite: undefined,
  hasBearer: false,
  isOriginAllowed: allowlist,
  ...over,
});

describe("isCsrfExempt", () => {
  it("exempts exactly the external-service endpoints", () => {
    expect(isCsrfExempt("/api/billing/webhook/moyasar")).toBe(true);
    expect(isCsrfExempt("/api/billing/renew")).toBe(true);
    expect(isCsrfExempt("/api/billing/confirm")).toBe(false);
    expect(isCsrfExempt("/api/auth/logout")).toBe(false);
  });
});

describe("csrfVerdict", () => {
  it("always allows safe methods, whatever the origin", () => {
    for (const method of ["GET", "HEAD", "OPTIONS", "get"]) {
      expect(csrfVerdict(req({ method, origin: "https://evil.example" }))).toBe("allow");
    }
  });

  it("denies a mutating request from a disallowed origin", () => {
    expect(csrfVerdict(req({ origin: "https://evil.example" }))).toBe("deny");
    expect(csrfVerdict(req({ method: "DELETE", origin: "https://evil.example" }))).toBe("deny");
  });

  it("allows a mutating request from an allowlisted origin (incl. EXTRA_ALLOWED_ORIGINS)", () => {
    expect(csrfVerdict(req({ origin: "https://flygaca.com" }))).toBe("allow");
    expect(csrfVerdict(req({ origin: "https://extra.example" }))).toBe("allow");
  });

  it("denies an origin-less request that the browser marks cross-site", () => {
    expect(csrfVerdict(req({ secFetchSite: "cross-site" }))).toBe("deny");
  });

  it("allows origin-less same-origin/same-site/none fetch metadata", () => {
    for (const secFetchSite of ["same-origin", "same-site", "none", undefined]) {
      expect(csrfVerdict(req({ secFetchSite }))).toBe("allow");
    }
  });

  it("Origin wins over Sec-Fetch-Site when both are present", () => {
    // A cross-site request from an ALLOWED origin (another Fly GACA front) is
    // legitimate; a disallowed origin is denied even if metadata is missing.
    expect(
      csrfVerdict(req({ origin: "https://flygaca.com", secFetchSite: "cross-site" })),
    ).toBe("allow");
  });

  it("exempts the Moyasar webhook and the Cloud Scheduler renew POSTs", () => {
    expect(csrfVerdict(req({ path: "/api/billing/webhook/moyasar" }))).toBe("allow");
    expect(
      csrfVerdict(req({ path: "/api/billing/renew", secFetchSite: "cross-site" })),
    ).toBe("allow");
  });

  it("allows Bearer-authenticated calls (the native shell) regardless of origin", () => {
    expect(csrfVerdict(req({ hasBearer: true, origin: "https://evil.example" }))).toBe("allow");
  });
});
