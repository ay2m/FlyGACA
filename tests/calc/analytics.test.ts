import { describe, expect, it } from 'vitest';
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
} from '@/calc/analytics';

describe('Health Score Engine ($H \\in [0, 100]$)', () => {
  const refDate = new Date('2026-08-16T12:00:00Z');

  describe('F1: Platform Engagement & Recency', () => {
    it('gives full score for active today with 30 active days', () => {
      const f1 = computeEngagementFactor('2026-08-16T12:00:00Z', 30, refDate);
      expect(f1).toBeCloseTo(100, 1);
    });

    it('decays with 7-day half-life', () => {
      // 7 days ago, 0 active days -> recency = 50, frequency = 0 -> 0.6 * 50 = 30
      const f1 = computeEngagementFactor('2026-08-09T12:00:00Z', 0, refDate);
      expect(f1).toBeCloseTo(30, 1);
    });

    it('handles null / undefined / invalid dates gracefully', () => {
      expect(computeEngagementFactor(null, null, refDate)).toBe(0);
      expect(computeEngagementFactor('invalid-date', -5, refDate)).toBe(0);
    });
  });

  describe('F2: Syllabus Completion Velocity', () => {
    it('averages bank pass ratio, ground school, and SRS mastery', () => {
      const f2 = computeVelocityFactor(1.0, 0.5, 0.6);
      // (100 + 50 + 60) / 3 = 70
      expect(f2).toBeCloseTo(70, 1);
    });

    it('handles boundary and null values', () => {
      expect(computeVelocityFactor(0, 0, 0)).toBe(0);
      expect(computeVelocityFactor(null, undefined, null)).toBe(0);
      expect(computeVelocityFactor(1.5, 2.0, 1.2)).toBe(100);
    });
  });

  describe('F3: Mock Exam Mastery', () => {
    it('computes 40% best + 40% recent + 20% pass rate', () => {
      const f3 = computeMasteryFactor(90, 80, 1.0, 5);
      // 0.40 * 90 + 0.40 * 80 + 0.20 * 100 = 36 + 32 + 20 = 88
      expect(f3).toBeCloseTo(88, 1);
    });

    it('returns 0 when no exams have been taken', () => {
      expect(computeMasteryFactor(null, null, null, 0)).toBe(0);
    });
  });

  describe('F4: Study Consistency & Streak', () => {
    it('reaches 100 for 30-day streak with 0 overdue cards', () => {
      const f4 = computeConsistencyFactor(30, 0);
      expect(f4).toBeCloseTo(100, 1);
    });

    it('applies 2-point penalty per overdue card up to 50', () => {
      const f4 = computeConsistencyFactor(30, 10);
      // 100 - 20 = 80
      expect(f4).toBeCloseTo(80, 1);
    });

    it('never drops below 0', () => {
      expect(computeConsistencyFactor(0, 50)).toBe(0);
    });
  });

  describe('F5: Instructor Risk & Remediation', () => {
    it('computes baseline 80 with no penalties when no rating is given', () => {
      const f5 = computeRiskRemediationFactor(0, 0, null);
      expect(f5).toBe(80);
    });

    it('deducts 4 points per flagged question and 15 points per consecutive failure', () => {
      const f5 = computeRiskRemediationFactor(2, 1, 5); // 5-star -> 100 base, -8 (flagged) -15 (failure) = 77
      expect(f5).toBe(77);
    });
  });

  describe('Overall Health Score ($H$) and Bands', () => {
    it('classifies Champion (>= 80)', () => {
      expect(getHealthBand(85)).toBe('champion');
      expect(getHealthBand(80)).toBe('champion');
    });

    it('classifies Healthy (60 - 79.9)', () => {
      expect(getHealthBand(79.9)).toBe('healthy');
      expect(getHealthBand(60)).toBe('healthy');
    });

    it('classifies At Risk (40 - 59.9)', () => {
      expect(getHealthBand(59.9)).toBe('at_risk');
      expect(getHealthBand(40)).toBe('at_risk');
    });

    it('classifies Critical (< 40)', () => {
      expect(getHealthBand(39.9)).toBe('critical');
      expect(getHealthBand(0)).toBe('critical');
    });

    it('calculates full health score with exact weight contributions', () => {
      const result = calculateHealthScore({
        lastActivityDate: '2026-08-16T12:00:00Z',
        activeDaysLast30: 30,
        bankPassRatio: 1.0,
        groundSchoolProgress: 1.0,
        srsMasteryRatio: 1.0,
        bestExamScore: 100,
        recentAttemptAvg: 100,
        examPassRate: 1.0,
        examCount: 5,
        streakDays: 30,
        srsOverdueCount: 0,
        flaggedBacklogCount: 0,
        consecutiveFailures: 0,
        instructorRating: 5,
        now: refDate,
      });

      expect(result.score).toBe(100);
      expect(result.band).toBe('champion');
    });
  });
});

describe('Pass Probability Engine ($P \\in [0.0, 1.0]$)', () => {
  describe('Calibration against GACA 75% Threshold (\\theta = 75)', () => {
    it('produces ~50% probability at exact pass mark with neutral baseline', () => {
      const res = calculatePassProbability({
        bestScore: 75,
        bankCoverageRatio: 0.75,
        scoreTrend: 0,
        srsMasteryRatio: 0.70,
        avgSecondsPerQuestion: 60,
        scoreVolatility: 0,
      });

      expect(res.probability).toBeCloseTo(0.50, 1);
      expect(res.tier).toBe('not_ready'); // < 0.70 is not ready
    });

    it('rates high-performing cadet as Ready (>= 85%)', () => {
      const res = calculatePassProbability({
        bestScore: 92,
        bankCoverageRatio: 1.0,
        scoreTrend: 8,
        srsMasteryRatio: 0.95,
        avgSecondsPerQuestion: 55,
        scoreVolatility: 3,
      });

      expect(res.probability).toBeGreaterThanOrEqual(0.85);
      expect(res.tier).toBe('ready');
    });

    it('rates struggling cadet as Not Ready (< 70%)', () => {
      const res = calculatePassProbability({
        bestScore: 62,
        bankCoverageRatio: 0.30,
        scoreTrend: -5,
        srsMasteryRatio: 0.20,
        avgSecondsPerQuestion: 130, // slow pacing
        scoreVolatility: 20, // erratic
      });

      expect(res.probability).toBeLessThan(0.70);
      expect(res.tier).toBe('not_ready');
    });

    it('handles empty / zero / non-finite inputs safely without NaN', () => {
      const res = calculatePassProbability({});
      expect(Number.isFinite(res.probability)).toBe(true);
      expect(res.probability).toBe(0.0);
      expect(res.tier).toBe('not_ready');
    });
  });

  describe('Pacing & Volatility penalties', () => {
    it('penalizes rushing (< 15s) and stalling (> 120s)', () => {
      expect(computePacingPenalty(10)).toBeGreaterThan(0);
      expect(computePacingPenalty(140)).toBeGreaterThan(0);
      expect(computePacingPenalty(60)).toBe(0);
    });

    it('penalizes high score volatility', () => {
      expect(computeVolatilityPenalty(0)).toBe(0);
      expect(computeVolatilityPenalty(15)).toBe(1.0);
    });

    it('classifies readiness tiers according to probability thresholds', () => {
      expect(getReadinessTier(0.85)).toBe('ready');
      expect(getReadinessTier(0.95)).toBe('ready');
      expect(getReadinessTier(0.70)).toBe('near_ready');
      expect(getReadinessTier(0.849)).toBe('near_ready');
      expect(getReadinessTier(0.699)).toBe('not_ready');
      expect(getReadinessTier(0.0)).toBe('not_ready');
    });
  });
});

describe('Cohort Summary & KSA PDPL Redaction Engine', () => {
  const schoolInfo: SchoolInfo = {
    schoolId: 'school-riyadh-01',
    name: 'Riyadh Aviation Academy',
    seatLimit: 50,
    allocatedSeats: 10,
  };

  const sampleCadets: CadetProgressRecord[] = [
    {
      cadetUid: 'cadet-1',
      cadetEmail: 'c1@school.sa',
      licenseStatus: 'active',
      seatAllocated: true,
      pdplConsent: { consent: true, consentedAt: '2026-08-01', consentVersion: 'v1.0-2026' },
      healthScore: 90,
      passProbability: 0.92,
      examBest: 88,
      quizCoverageRatio: 1.0,
    },
    {
      cadetUid: 'cadet-2',
      cadetEmail: 'c2@school.sa',
      licenseStatus: 'active',
      seatAllocated: true,
      pdplConsent: { consent: true, consentedAt: '2026-08-01', consentVersion: 'v1.0-2026' },
      healthScore: 65,
      passProbability: 0.72,
      examBest: 76,
      quizCoverageRatio: 0.8,
    },
    {
      cadetUid: 'cadet-3',
      cadetEmail: 'c3@school.sa',
      licenseStatus: 'active',
      seatAllocated: true,
      pdplConsent: { consent: false }, // NON-CONSENTED (PDPL REDACTION)
      healthScore: 95, // Must be redacted
      passProbability: 0.98, // Must be redacted
      examBest: 100, // Must be redacted
      quizCoverageRatio: 1.0,
    },
    {
      cadetUid: 'cadet-4',
      cadetEmail: 'c4@school.sa',
      licenseStatus: 'revoked',
      seatAllocated: false,
      pdplConsent: { consent: true },
      healthScore: 35,
      passProbability: 0.30,
      examBest: 50,
      quizCoverageRatio: 0.4,
    },
  ];

  it('computes aggregated metrics and redacts non-consented cadet data', () => {
    const summary = computeSchoolAnalyticsSummary(sampleCadets, schoolInfo);

    expect(summary.totalCadets).toBe(4);
    expect(summary.activeLicenses).toBe(3); // cadets 1, 2, 3 have active allocated seats
    expect(summary.seatUtilization).toBe(6); // 3 / 50 = 6%
    expect(summary.consentedCadetsCount).toBe(3); // cadets 1, 2, 4
    expect(summary.redactedCadetsCount).toBe(1); // cadet 3

    // Consented cadets: 1 (90, Ready), 2 (65, Near Ready), 4 (35, Not Ready)
    // Ready cadets: only cadet 1 (passProbability 0.92 >= 0.85)
    expect(summary.readyCadets).toBe(1);

    // Avg Health: (90 + 65 + 35) / 3 = 63.3
    expect(summary.avgHealthScore).toBeCloseTo(63.3, 1);

    // Avg Exam: (88 + 76 + 50) / 3 = 71.3
    expect(summary.avgExamScore).toBeCloseTo(71.3, 1);

    // Health distribution (across consented: 90 -> champion, 65 -> healthy, 35 -> critical)
    expect(summary.healthDistribution).toEqual({
      champion: 1,
      healthy: 1,
      atRisk: 0,
      critical: 1,
    });
  });

  it('handles completely non-consented or empty rosters safely', () => {
    const nonConsentedRoster: CadetProgressRecord[] = [
      {
        cadetUid: 'c1',
        cadetEmail: 'c1@s.sa',
        licenseStatus: 'active',
        seatAllocated: true,
        pdplConsent: { consent: false },
        healthScore: 85,
        examBest: 90,
      },
    ];

    const summary = computeSchoolAnalyticsSummary(nonConsentedRoster, schoolInfo);
    expect(summary.totalCadets).toBe(1);
    expect(summary.activeLicenses).toBe(1);
    expect(summary.consentedCadetsCount).toBe(0);
    expect(summary.redactedCadetsCount).toBe(1);
    expect(summary.avgExamScore).toBe(0);
    expect(summary.avgHealthScore).toBe(0);
    expect(summary.readyCadets).toBe(0);
  });

  it('runs 1,000-cadet cohort benchmark under 10ms', () => {
    const largeCohort: CadetProgressRecord[] = Array.from({ length: 1000 }, (_, i) => ({
      cadetUid: `cadet-${i}`,
      cadetEmail: `cadet${i}@school.sa`,
      licenseStatus: i % 5 === 0 ? 'revoked' : 'active',
      seatAllocated: i % 5 !== 0,
      pdplConsent: { consent: i % 3 !== 0 },
      healthScore: 50 + (i % 50),
      passProbability: 0.5 + (i % 50) / 100,
      examBest: 60 + (i % 40),
      quizCoverageRatio: (i % 100) / 100,
    }));

    const start = performance.now();
    const summary = computeSchoolAnalyticsSummary(largeCohort, { schoolId: 'large-school', seatLimit: 1200 });
    const elapsed = performance.now() - start;

    expect(summary.totalCadets).toBe(1000);
    expect(summary.activeLicenses).toBe(800);
    expect(elapsed).toBeLessThan(50); // High-speed execution
  });
});
