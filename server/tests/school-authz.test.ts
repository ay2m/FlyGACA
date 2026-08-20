/**
 * `server/src/school-core.ts` — the school authorization predicates.
 *
 * `school-core.test.ts` covers the seat/entitlement helpers, but lines 232–255
 * were the module's uncovered tail: `isSchoolStaff`, `isSchoolAdmin` and
 * `canAllocateSeat`. They decide who may act on a school and whether another
 * seat may be handed out, and nothing asserted them — including the distinction
 * that makes them two functions rather than one: an instructor is staff but not
 * an admin.
 */
import { describe, expect, it } from "vitest";
import { isSchoolStaff, isSchoolAdmin, canAllocateSeat } from "../src/school-core.js";

const school = {
  ownerUids: ["owner-1"],
  adminUids: ["admin-1", "admin-2"],
  instructorUids: ["instructor-1"],
};

describe("isSchoolStaff", () => {
  it("accepts an owner, an admin or an instructor", () => {
    expect(isSchoolStaff(school, "owner-1")).toBe(true);
    expect(isSchoolStaff(school, "admin-2")).toBe(true);
    expect(isSchoolStaff(school, "instructor-1")).toBe(true);
  });

  it("rejects an unrelated account", () => {
    expect(isSchoolStaff(school, "stranger")).toBe(false);
  });

  it("rejects an absent school or an absent uid", () => {
    expect(isSchoolStaff(null, "owner-1")).toBe(false);
    expect(isSchoolStaff(undefined, "owner-1")).toBe(false);
    expect(isSchoolStaff(school, null)).toBe(false);
    expect(isSchoolStaff(school, undefined)).toBe(false);
    expect(isSchoolStaff(school, "")).toBe(false);
  });

  it("treats missing roster arrays as empty rather than throwing", () => {
    expect(isSchoolStaff({}, "owner-1")).toBe(false);
    expect(isSchoolStaff({ ownerUids: ["owner-1"] }, "owner-1")).toBe(true);
    expect(isSchoolStaff({ instructorUids: ["i"] }, "i")).toBe(true);
  });

  it("matches uids exactly — no prefix or case leniency", () => {
    expect(isSchoolStaff(school, "owner-11")).toBe(false);
    expect(isSchoolStaff(school, "owner")).toBe(false);
    expect(isSchoolStaff(school, "OWNER-1")).toBe(false);
  });
});

describe("isSchoolAdmin", () => {
  it("accepts an owner or an admin", () => {
    expect(isSchoolAdmin(school, "owner-1")).toBe(true);
    expect(isSchoolAdmin(school, "admin-1")).toBe(true);
  });

  it("rejects an instructor — the whole reason this is separate from isSchoolStaff", () => {
    expect(isSchoolStaff(school, "instructor-1")).toBe(true);
    expect(isSchoolAdmin(school, "instructor-1")).toBe(false);
  });

  it("rejects an absent school or uid", () => {
    expect(isSchoolAdmin(null, "owner-1")).toBe(false);
    expect(isSchoolAdmin(school, undefined)).toBe(false);
  });

  it("treats missing roster arrays as empty", () => {
    expect(isSchoolAdmin({}, "owner-1")).toBe(false);
    expect(isSchoolAdmin({ adminUids: ["a"] }, "a")).toBe(true);
  });
});

describe("canAllocateSeat", () => {
  it("allows a seat while the roster is under the limit", () => {
    expect(canAllocateSeat(0, 10)).toBe(true);
    expect(canAllocateSeat(9, 10)).toBe(true);
  });

  it("refuses at and beyond the limit", () => {
    expect(canAllocateSeat(10, 10)).toBe(false);
    expect(canAllocateSeat(11, 10)).toBe(false);
  });

  it("refuses when there are no seats to give", () => {
    expect(canAllocateSeat(0, 0)).toBe(false);
    expect(canAllocateSeat(0, -1)).toBe(false);
  });

  it("refuses rather than throwing on a non-finite count or limit", () => {
    // A NaN limit from a malformed contract row must not read as "unlimited".
    expect(canAllocateSeat(NaN, 10)).toBe(false);
    expect(canAllocateSeat(1, NaN)).toBe(false);
    expect(canAllocateSeat(1, Infinity)).toBe(false);
    expect(canAllocateSeat(-Infinity, 10)).toBe(false);
  });
});
