import { describe, expect, it } from "vitest";
import { isStaffEmail, staffEntitlement } from "../src/staff-core.js";

describe("isStaffEmail", () => {
  it("grants a verified allowlisted address (case-insensitive)", () => {
    expect(isStaffEmail("ay2m@hotmail.com", true)).toBe(true);
    expect(isStaffEmail("AY2M@Hotmail.com", true)).toBe(true);
    expect(isStaffEmail("  ay2m@hotmail.com  ", true)).toBe(true);
  });

  it("grants any verified address on a staff domain", () => {
    expect(isStaffEmail("captain@flygaca.com", true)).toBe(true);
    expect(isStaffEmail("Ops@FlyGACA.com", true)).toBe(true);
  });

  it("refuses an unverified email even when it matches", () => {
    expect(isStaffEmail("captain@flygaca.com", false)).toBe(false);
    expect(isStaffEmail("ay2m@hotmail.com", undefined)).toBe(false);
  });

  it("refuses addresses off the allowlist", () => {
    expect(isStaffEmail("someone@gmail.com", true)).toBe(false);
    expect(isStaffEmail("someone@flygaca.com.evil.com", true)).toBe(false);
    expect(isStaffEmail("flygaca.com", true)).toBe(false); // no @
    expect(isStaffEmail("@flygaca.com", true)).toBe(false); // empty local part
  });

  it("handles null/undefined/empty input", () => {
    expect(isStaffEmail(null, true)).toBe(false);
    expect(isStaffEmail(undefined, true)).toBe(false);
    expect(isStaffEmail("", true)).toBe(false);
  });

  it("does not treat the staff domain as a substring match", () => {
    expect(isStaffEmail("user@notflygaca.com", true)).toBe(false);
    expect(isStaffEmail("user@flygaca.com.au", true)).toBe(false);
  });
});

describe("staffEntitlement", () => {
  it("is a non-expiring school grant tagged as staff", () => {
    expect(staffEntitlement()).toEqual({ plan: "school", source: "staff" });
    expect(staffEntitlement().expiresAt).toBeUndefined();
  });
});
