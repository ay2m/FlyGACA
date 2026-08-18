import { describe, expect, it } from "vitest";
import {
  calculateHealthScore,
  computeEngagementFactor,
  computeVelocityFactor,
  computeMasteryFactor,
  computeConsistencyFactor,
  computeRiskRemediationFactor,
  getHealthBand,
  calculatePassProbability,
  computePacingPenalty,
  computeVolatilityPenalty,
  getReadinessTier,
  computeSchoolAnalyticsSummary,
  type CadetProgressRecord,
  type SchoolInfo,
} from "../src/analytics-core.js";

describe("functions/analytics-core — Health Score Engine", () => {
  const refDate = new Date("2026-08-16T12:00:00Z");

  it("computes F1 engagement with 7-day half-life decay", () => {
    const f1Full = computeEngagementFactor("2026-08-16T12:00:00Z", 30, refDate);
    expect(f1Full).toBeCloseTo(100, 1);

    const f1Decayed = computeEngagementFactor("2026-08-09T12:00:00Z", 0, refDate);
    expect(f1Decayed).toBeCloseTo(30, 1);
  });

  it("computes F2 velocity across bank, ground school, and SRS", () => {
    const f2 = computeVelocityFactor(0.9, 0.8, 0.7);
    expect(f2).toBeCloseTo(80, 1);
  });

  it("computes F3 mock exam mastery", () => {
    const f3 = computeMasteryFactor(95, 85, 1.0, 3);
    expect(f3).toBeCloseTo(92, 1);
  });

  it("computes F4 consistency with overdue penalties", () => {
    const f4Clean = computeConsistencyFactor(30, 0);
    expect(f4Clean).toBeCloseTo(100, 1);

    const f4Penalized = computeConsistencyFactor(30, 5);
    expect(f4Penalized).toBeCloseTo(90, 1);
  });

  it("computes F5 risk and remediation", () => {
    const f5 = computeRiskRemediationFactor(1, 1, 4); // 4-star = 80, -4 (flagged), -15 (failure) = 61
    expect(f5).toBe(61);
  });

  it("classifies health bands properly", () => {
    expect(getHealthBand(82)).toBe("champion");
    expect(getHealthBand(72)).toBe("healthy");
    expect(getHealthBand(52)).toBe("at_risk");
    expect(getHealthBand(32)).toBe("critical");
  });

  it("calculates full health score object", () => {
    const full = calculateHealthScore({
      lastActivityDate: "2026-08-16T12:00:00Z",
      activeDaysLast30: 30,
      bankPassRatio: 1.0,
      groundSchoolProgress: 1.0,
      srsMasteryRatio: 1.0,
      bestExamScore: 90,
      recentAttemptAvg: 90,
      examCount: 2,
      streakDays: 30,
      now: refDate,
    });
    expect(full.score).toBeGreaterThanOrEqual(80);
    expect(full.band).toBe("champion");
  });
});

describe("functions/analytics-core — Pass Probability Engine", () => {
  it("computes pass probability calibrated to 75% GACA threshold", () => {
    const neutral = calculatePassProbability({
      bestScore: 75,
      bankCoverageRatio: 0.75,
      scoreTrend: 0,
      srsMasteryRatio: 0.70,
    });
    expect(neutral.probability).toBeCloseTo(0.50, 1);

    const strong = calculatePassProbability({
      bestScore: 90,
      bankCoverageRatio: 0.95,
      scoreTrend: 5,
      srsMasteryRatio: 0.90,
    });
    expect(strong.probability).toBeGreaterThanOrEqual(0.85);
    expect(strong.tier).toBe("ready");
  });

  it("guards against zero and non-finite inputs", () => {
    const res = calculatePassProbability({ bestScore: 0 });
    expect(res.probability).toBe(0);
    expect(res.tier).toBe("not_ready");
  });

  it("applies pacing and volatility penalties correctly", () => {
    expect(computePacingPenalty(10)).toBeGreaterThan(0);
    expect(computeVolatilityPenalty(15)).toBe(1.0);
    expect(getReadinessTier(0.9)).toBe("ready");
    expect(getReadinessTier(0.75)).toBe("near_ready");
    expect(getReadinessTier(0.5)).toBe("not_ready");
  });
});

describe("functions/analytics-core — Cohort Summary with KSA PDPL Redaction", () => {
  const schoolInfo: SchoolInfo = {
    schoolId: "school-jeddah-01",
    seatLimit: 100,
    allocatedSeats: 2,
  };

  it("redacts scores for non-consented cadets while retaining seat counts", () => {
    const cadets: CadetProgressRecord[] = [
      {
        cadetUid: "cadet-a",
        cadetEmail: "a@school.sa",
        licenseStatus: "active",
        seatAllocated: true,
        pdplConsent: { consent: true, consentedAt: "2026-08-01", consentVersion: "v1.0-2026" },
        healthScore: 80,
        passProbability: 0.88,
        examBest: 85,
        quizCoverageRatio: 0.9,
      },
      {
        cadetUid: "cadet-b",
        cadetEmail: "b@school.sa",
        licenseStatus: "active",
        seatAllocated: true,
        pdplConsent: { consent: false }, // Non-consented
        healthScore: 95,
        passProbability: 0.99,
        examBest: 98,
        quizCoverageRatio: 1.0,
      },
    ];

    const summary = computeSchoolAnalyticsSummary(cadets, schoolInfo);
    expect(summary.totalCadets).toBe(2);
    expect(summary.activeLicenses).toBe(2);
    expect(summary.seatUtilization).toBe(2);
    expect(summary.consentedCadetsCount).toBe(1);
    expect(summary.redactedCadetsCount).toBe(1);
    expect(summary.readyCadets).toBe(1);
    expect(summary.avgHealthScore).toBe(80); // only cadet-a included
    expect(summary.avgExamScore).toBe(85); // only cadet-a included
  });
});
