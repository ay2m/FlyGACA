import { describe, expect, it } from "vitest";
import {
  COHORT_INTAKE_DAYS,
  COHORT_SEAT_LIMIT,
  DEFAULT_ORG_BANKS,
  buildCohortOrg,
  buildInvite,
  checkSeatLimit,
  parseProvisionInput,
} from "../src/org-core.js";

describe("parseProvisionInput", () => {
  it("accepts a valid payload without expiresAt", () => {
    const r = parseProvisionInput({ orgId: "acme", emails: ["a@b.com"] });
    expect(r).toEqual({ ok: true, value: { orgId: "acme", emails: ["a@b.com"], expiresAt: undefined } });
  });

  it("accepts a valid payload with an expiresAt string", () => {
    const r = parseProvisionInput({ orgId: "acme", emails: ["a@b.com"], expiresAt: "2027-01-01" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.expiresAt).toBe("2027-01-01");
  });

  it("rejects a missing or blank orgId", () => {
    expect(parseProvisionInput({ emails: ["a@b.com"] })).toEqual({ ok: false, code: "orgId-required" });
    expect(parseProvisionInput({ orgId: "", emails: ["a@b.com"] })).toEqual({ ok: false, code: "orgId-required" });
    expect(parseProvisionInput({ orgId: 42, emails: ["a@b.com"] })).toEqual({ ok: false, code: "orgId-required" });
  });

  it("rejects missing, non-array, or empty emails", () => {
    expect(parseProvisionInput({ orgId: "acme" })).toEqual({ ok: false, code: "emails-required" });
    expect(parseProvisionInput({ orgId: "acme", emails: [] })).toEqual({ ok: false, code: "emails-required" });
    expect(parseProvisionInput({ orgId: "acme", emails: "a@b.com" })).toEqual({
      ok: false,
      code: "emails-required",
    });
  });

  it("rejects a non-string expiresAt", () => {
    expect(parseProvisionInput({ orgId: "acme", emails: ["a@b.com"], expiresAt: 123 })).toEqual({
      ok: false,
      code: "expiresAt-must-be-ISO-string",
    });
  });

  it("checks orgId before emails, and treats null/undefined payloads as missing orgId", () => {
    // orgId is validated first, so a fully-empty object surfaces orgId-required.
    expect(parseProvisionInput({})).toEqual({ ok: false, code: "orgId-required" });
    expect(parseProvisionInput(undefined)).toEqual({ ok: false, code: "orgId-required" });
    expect(parseProvisionInput(null)).toEqual({ ok: false, code: "orgId-required" });
  });
});

describe("checkSeatLimit", () => {
  it("allows adding seats below the limit", () => {
    expect(checkSeatLimit({ seatsUsed: 3, seatLimit: 10, requested: 4 })).toEqual({ ok: true });
  });

  it("allows filling the org exactly to its limit", () => {
    expect(checkSeatLimit({ seatsUsed: 8, seatLimit: 10, requested: 2 })).toEqual({ ok: true });
  });

  it("rejects going one seat over the limit with a verbatim message", () => {
    expect(checkSeatLimit({ seatsUsed: 8, seatLimit: 10, requested: 3 })).toEqual({
      ok: false,
      message: "seat-limit-exceeded: 8/10 used, requested 3",
    });
  });

  it("rejects when the org is already full", () => {
    const r = checkSeatLimit({ seatsUsed: 10, seatLimit: 10, requested: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("10/10 used, requested 1");
  });
});

describe("buildInvite", () => {
  it("normalizes the email to both the doc-id key and the doc email", () => {
    const invite = buildInvite("  Pilot@Example.COM ", "acme", { now: new Date("2026-07-20T00:00:00Z") });
    expect(invite).not.toBeNull();
    expect(invite).toEqual({
      key: "pilot@example.com",
      doc: { email: "pilot@example.com", orgId: "acme", createdAt: "2026-07-20T00:00:00.000Z" },
    });
  });

  it("includes expiresAt only when provided", () => {
    const withExp = buildInvite("a@b.com", "acme", { expiresAt: "2027-01-01", now: new Date(0) });
    expect(withExp?.doc.expiresAt).toBe("2027-01-01");
    const without = buildInvite("a@b.com", "acme", { now: new Date(0) });
    expect(without?.doc).not.toHaveProperty("expiresAt");
  });

  it("returns null for a malformed address so the caller records a per-email failure", () => {
    expect(buildInvite("not-an-email", "acme")).toBeNull();
    expect(buildInvite("", "acme")).toBeNull();
    expect(buildInvite("no@domain", "acme")).toBeNull();
  });

  it("is idempotent: the same email yields the same key across calls", () => {
    const a = buildInvite("Dup@X.com", "acme", { now: new Date(0) });
    const b = buildInvite("dup@x.com ", "acme", { now: new Date(1000) });
    expect(a?.key).toBe(b?.key);
  });
});

describe("buildCohortOrg", () => {
  const now = new Date("2026-07-30T00:00:00Z");

  it("builds a 25-seat org owned solely by the buyer, with the intake-window expiry", () => {
    const org = buildCohortOrg("uid_1", "Riyadh Flight Academy", now);
    expect(org).toEqual({
      name: "Riyadh Flight Academy",
      ownerUids: ["uid_1"],
      seatLimit: COHORT_SEAT_LIMIT,
      passThreshold: 75,
      banks: [...DEFAULT_ORG_BANKS],
      source: "moyasar",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + COHORT_INTAKE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  it("trims the name and falls back to a generic label when blank/missing", () => {
    expect(buildCohortOrg("uid_1", "  Padded Name  ", now).name).toBe("Padded Name");
    expect(buildCohortOrg("uid_1", "", now).name).toBe("Untitled cohort");
    expect(buildCohortOrg("uid_1", "   ", now).name).toBe("Untitled cohort");
    expect(buildCohortOrg("uid_1", null, now).name).toBe("Untitled cohort");
    expect(buildCohortOrg("uid_1", undefined, now).name).toBe("Untitled cohort");
  });

  it("caps an overlong name at 120 characters", () => {
    const long = "x".repeat(500);
    expect(buildCohortOrg("uid_1", long, now).name).toHaveLength(120);
  });

  it("returns a fresh banks array each call (never a shared mutable reference)", () => {
    const a = buildCohortOrg("uid_1", "A", now);
    const b = buildCohortOrg("uid_2", "B", now);
    expect(a.banks).not.toBe(b.banks);
  });
});
