import { describe, expect, it } from "vitest";
import {
  FREE_DAILY_LIMIT,
  checkDailyQuota,
  dayKey,
  secondsUntilUtcReset,
} from "../src/chat-quota-core.js";

const now = new Date("2026-07-12T10:00:00Z");
const today = "2026-07-12";

describe("dayKey", () => {
  it("returns the UTC calendar day", () => {
    expect(dayKey(now)).toBe(today);
    // Just before UTC midnight is still the same day; just after rolls over.
    expect(dayKey(new Date("2026-07-12T23:59:59Z"))).toBe("2026-07-12");
    expect(dayKey(new Date("2026-07-13T00:00:00Z"))).toBe("2026-07-13");
  });
});

describe("secondsUntilUtcReset", () => {
  it("counts whole seconds until the next UTC midnight", () => {
    // 10:00:00Z → 14h to 00:00:00Z next day = 50400s.
    expect(secondsUntilUtcReset(now)).toBe(50_400);
  });

  it("never returns less than 1 (at the boundary)", () => {
    expect(secondsUntilUtcReset(new Date("2026-07-12T00:00:00Z"))).toBe(86_400);
    expect(secondsUntilUtcReset(new Date("2026-07-12T23:59:59.999Z"))).toBeGreaterThanOrEqual(1);
  });
});

describe("checkDailyQuota", () => {
  it("allows and starts a fresh count when there is no prior usage", () => {
    const v = checkDailyQuota(null, now);
    expect(v.allowed).toBe(true);
    expect(v.usage).toEqual({ day: today, count: 1 });
    expect(v.retryAfterSec).toBe(50_400);
  });

  it("resets a record carried over from a previous day", () => {
    const v = checkDailyQuota({ day: "2026-07-11", count: FREE_DAILY_LIMIT }, now);
    expect(v.allowed).toBe(true);
    expect(v.usage).toEqual({ day: today, count: 1 });
  });

  it("increments within the allowance", () => {
    const v = checkDailyQuota({ day: today, count: 2 }, now);
    expect(v.allowed).toBe(true);
    expect(v.usage).toEqual({ day: today, count: 3 });
  });

  it("allows the last question at the limit boundary", () => {
    const v = checkDailyQuota({ day: today, count: FREE_DAILY_LIMIT - 1 }, now);
    expect(v.allowed).toBe(true);
    expect(v.usage.count).toBe(FREE_DAILY_LIMIT);
  });

  it("blocks once the allowance is spent and does not bump the count", () => {
    const v = checkDailyQuota({ day: today, count: FREE_DAILY_LIMIT }, now);
    expect(v.allowed).toBe(false);
    expect(v.usage).toEqual({ day: today, count: FREE_DAILY_LIMIT });
    expect(v.retryAfterSec).toBeGreaterThan(0);
  });

  it("treats malformed stored usage as a fresh day", () => {
    expect(checkDailyQuota({ day: today, count: -3 }, now).usage.count).toBe(1);
    expect(
      checkDailyQuota({ day: today, count: "oops" as unknown as number }, now).usage.count,
    ).toBe(1);
    expect(checkDailyQuota({}, now).usage.count).toBe(1);
  });

  it("floors a fractional stored count before comparing", () => {
    const v = checkDailyQuota({ day: today, count: 1.9 }, now);
    expect(v.usage.count).toBe(2);
  });

  it("honours a custom limit (for A/B tuning of the free tier)", () => {
    // limit 3: the 3rd is allowed, the 4th is blocked.
    expect(checkDailyQuota({ day: today, count: 2 }, now, 3).allowed).toBe(true);
    expect(checkDailyQuota({ day: today, count: 3 }, now, 3).allowed).toBe(false);
    // limit 1: only the first free question per day.
    expect(checkDailyQuota(null, now, 1).allowed).toBe(true);
    expect(checkDailyQuota({ day: today, count: 1 }, now, 1).allowed).toBe(false);
  });
});
