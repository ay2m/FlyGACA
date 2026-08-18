import { describe, expect, it } from "vitest";
import {
  schoolEntitlement,
  parseSeatEmails,
  inviteKeyForEmail,
  isApprovedSchoolDomain,
  schoolSeatStatus,
  schoolReadiness,
  cohortRow,
} from "../src/school-core.js";

describe("schoolEntitlement", () => {
  it("is a non-expiring school grant tagged as school", () => {
    expect(schoolEntitlement()).toEqual({ plan: "school", source: "school" });
    expect(schoolEntitlement().expiresAt).toBeUndefined();
  });

  it("carries a contract-end expiry when given one", () => {
    const iso = "2027-06-30T23:59:59.000Z";
    expect(schoolEntitlement(iso)).toEqual({
      plan: "school",
      source: "school",
      expiresAt: iso,
    });
  });
});

describe("parseSeatEmails", () => {
  it("parses a newline roster, lowercasing and trimming", () => {
    expect(parseSeatEmails("Alice@School.edu\n  bob@school.edu \n")).toEqual([
      "alice@school.edu",
      "bob@school.edu",
    ]);
  });

  it("splits on commas, semicolons and whitespace", () => {
    expect(parseSeatEmails("a@x.com, b@x.com; c@x.com d@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
      "d@x.com",
    ]);
  });

  it("ignores a leading 'email' header, blanks and non-emails", () => {
    expect(parseSeatEmails("email\n\nreal@x.com\nnot-an-email\n@nope.com\nfoo@bar")).toEqual([
      "real@x.com",
    ]);
  });

  it("de-duplicates case-insensitively", () => {
    expect(parseSeatEmails("dup@x.com\nDUP@x.com\ndup@x.com")).toEqual(["dup@x.com"]);
  });

  it("returns an empty list for empty or junk input", () => {
    expect(parseSeatEmails("")).toEqual([]);
    expect(parseSeatEmails("   \n , ; ")).toEqual([]);
  });
});

describe("inviteKeyForEmail", () => {
  it("normalizes to a trimmed, lowercased key", () => {
    expect(inviteKeyForEmail("  Alice@School.EDU ")).toBe("alice@school.edu");
  });

  it("is null for non-emails and blanks", () => {
    expect(inviteKeyForEmail("not-an-email")).toBeNull();
    expect(inviteKeyForEmail("foo@bar")).toBeNull();
    expect(inviteKeyForEmail("")).toBeNull();
    expect(inviteKeyForEmail(undefined)).toBeNull();
    expect(inviteKeyForEmail(null)).toBeNull();
  });

  it("agrees with parseSeatEmails on the same address", () => {
    const [parsed] = parseSeatEmails("Capt.Sara@academy.edu.sa");
    expect(inviteKeyForEmail("Capt.Sara@academy.edu.sa")).toBe(parsed);
  });
});

describe("isApprovedSchoolDomain", () => {
  const domains = ["academy.edu.sa"];

  it("grants a verified email on an approved domain", () => {
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", true, domains)).toBe(true);
    expect(isApprovedSchoolDomain("Cadet@Academy.EDU.SA", true, domains)).toBe(true);
  });

  it("never grants an unverified email, even on an approved domain", () => {
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", false, domains)).toBe(false);
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", undefined, domains)).toBe(false);
  });

  it("rejects other domains and malformed input", () => {
    expect(isApprovedSchoolDomain("cadet@gmail.com", true, domains)).toBe(false);
    expect(isApprovedSchoolDomain("no-at-sign", true, domains)).toBe(false);
    expect(isApprovedSchoolDomain("", true, domains)).toBe(false);
    expect(isApprovedSchoolDomain(null, true, domains)).toBe(false);
  });

  it("defaults to the empty allowlist — nothing auto-grants until configured", () => {
    expect(isApprovedSchoolDomain("cadet@academy.edu.sa", true)).toBe(false);
  });
});

describe("schoolSeatStatus", () => {
  const now = new Date("2026-07-17T00:00:00Z");

  it("is active for a non-expiring school grant", () => {
    expect(schoolSeatStatus({ entitlement: schoolEntitlement(), hasInvite: true }, now)).toBe(
      "active",
    );
  });

  it("is active for a staff grant (school tier via a different source)", () => {
    expect(
      schoolSeatStatus({ entitlement: { plan: "school", source: "staff" }, hasInvite: false }, now),
    ).toBe("active");
  });

  it("is active for a school seat still within its contract end", () => {
    const ent = schoolEntitlement("2026-12-31T23:59:59.000Z");
    expect(schoolSeatStatus({ entitlement: ent, hasInvite: false }, now)).toBe("active");
  });

  it("is expired for a school seat whose contract end has passed", () => {
    const ent = schoolEntitlement("2026-06-30T23:59:59.000Z");
    expect(schoolSeatStatus({ entitlement: ent, hasInvite: true }, now)).toBe("expired");
  });

  it("is invited when there is an invite but no active seat", () => {
    expect(schoolSeatStatus({ entitlement: null, hasInvite: true }, now)).toBe("invited");
    expect(schoolSeatStatus({ entitlement: { plan: "free" }, hasInvite: true }, now)).toBe(
      "invited",
    );
  });

  it("is none for a known account with no seat and no invite", () => {
    expect(schoolSeatStatus({ entitlement: { plan: "free" }, hasInvite: false }, now)).toBe("none");
    expect(schoolSeatStatus({ entitlement: undefined, hasInvite: false }, now)).toBe("none");
  });

  it("does not treat a paid (pro) plan as a school seat", () => {
    const ent: import("../src/billing-core.js").Entitlement = { plan: "pro", source: "moyasar" };
    expect(schoolSeatStatus({ entitlement: ent, hasInvite: false }, now)).toBe("none");
  });
});

describe("schoolReadiness", () => {
  const AIP = ["aip-ais", "airspace"];

  it("is ready when every bank and the mock exam meet the threshold", () => {
    const r = schoolReadiness({ quizBest: { "aip-ais": 80, airspace: 90 }, examBest: 76 }, AIP);
    expect(r).toEqual({ coveredBanks: 2, totalBanks: 2, examBest: 76, ready: true });
  });

  it("is not ready when a bank is below the threshold", () => {
    const r = schoolReadiness({ quizBest: { "aip-ais": 80, airspace: 60 }, examBest: 90 }, AIP);
    expect(r.coveredBanks).toBe(1);
    expect(r.ready).toBe(false);
  });

  it("is not ready when the mock exam is below the threshold", () => {
    const r = schoolReadiness({ quizBest: { "aip-ais": 80, airspace: 90 }, examBest: 70 }, AIP);
    expect(r.ready).toBe(false);
  });

  it("honours a custom threshold", () => {
    const s = { quizBest: { "aip-ais": 65, airspace: 65 }, examBest: 65 };
    expect(schoolReadiness(s, AIP, 60).ready).toBe(true);
    expect(schoolReadiness(s, AIP, 75).ready).toBe(false);
  });

  it("treats a seat with no synced progress as not ready, zero coverage", () => {
    expect(schoolReadiness(null, AIP)).toEqual({
      coveredBanks: 0,
      totalBanks: 2,
      examBest: 0,
      ready: false,
    });
  });

  it("is never ready with no expected banks", () => {
    expect(schoolReadiness({ quizBest: {}, examBest: 100 }, []).ready).toBe(false);
  });
});

describe("cohortRow", () => {
  const AIP = ["aip-ais", "airspace"];
  const now = new Date("2026-07-18T00:00:00Z");

  it("combines an active seat with full readiness into a ready row", () => {
    const row = cohortRow(
      {
        email: "cadet@academy.edu.sa",
        entitlement: schoolEntitlement(),
        hasInvite: true,
        summary: { quizBest: { "aip-ais": 90, airspace: 80 }, examBest: 85, updatedAt: "2026-07-17T10:00:00Z" },
      },
      AIP,
      75,
      now,
    );
    expect(row).toEqual({
      email: "cadet@academy.edu.sa",
      status: "active",
      source: "school",
      coverage: "2/2",
      coveredBanks: 2,
      totalBanks: 2,
      examBest: 85,
      ready: true,
      hasProgress: true,
      lastActive: "2026-07-17",
    });
  });

  it("marks a seat with no synced progress hasProgress:false and not ready", () => {
    const row = cohortRow(
      { email: "new@academy.edu.sa", entitlement: schoolEntitlement(), hasInvite: true, summary: null },
      AIP,
      75,
      now,
    );
    expect(row.hasProgress).toBe(false);
    expect(row.ready).toBe(false);
    expect(row.coverage).toBe("0/2");
    expect(row.lastActive).toBe("");
  });

  it("reflects a lapsed seat as expired regardless of readiness", () => {
    const row = cohortRow(
      {
        email: "old@academy.edu.sa",
        entitlement: schoolEntitlement("2026-06-30T23:59:59Z"),
        hasInvite: false,
        summary: { quizBest: { "aip-ais": 90, airspace: 90 }, examBest: 90 },
      },
      AIP,
      75,
      now,
    );
    expect(row.status).toBe("expired");
    expect(row.ready).toBe(true); // readiness is independent of seat status
  });
});
