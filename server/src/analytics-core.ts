/**
 * Analytics Core Engine for Fly GACA Cloud Functions.
 *
 * Implements:
 *  1. 5-Factor Customer Health Score ($H \in [0, 100]$)
 *  2. Mock Exam Pass Probability ($P \in [0.0, 1.0]$) calibrated to GACA pass threshold (75%)
 *  3. Pre-aggregated Cohort Summary with KSA PDPL Consent redaction.
 */

// ── 1. HEALTH SCORE ──────────────────────────────────────────

export type HealthBand = "critical" | "at_risk" | "healthy" | "champion";

export interface HealthScoreInput {
  lastActivityDate?: string | Date | null;
  activeDaysLast30?: number | null;
  bankPassRatio?: number | null;
  groundSchoolProgress?: number | null;
  srsMasteryRatio?: number | null;
  bestExamScore?: number | null;
  recentAttemptAvg?: number | null;
  examPassRate?: number | null;
  examCount?: number | null;
  streakDays?: number | null;
  srsOverdueCount?: number | null;
  flaggedBacklogCount?: number | null;
  consecutiveFailures?: number | null;
  instructorRating?: number | null;
  now?: Date;
}

export interface FactorBreakdown {
  f1Engagement: number;
  f2Velocity: number;
  f3Mastery: number;
  f4Consistency: number;
  f5RiskRemediation: number;
}

export interface HealthScoreResult {
  score: number;
  band: HealthBand;
  factors: FactorBreakdown;
}

export const RECENCY_HALF_LIFE_DAYS = 7.0;

export const HEALTH_WEIGHTS = {
  w1: 0.20,
  w2: 0.25,
  w3: 0.25,
  w4: 0.15,
  w5: 0.15,
} as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  return fallback;
}

export function computeEngagementFactor(
  lastActivityDate?: string | Date | null,
  activeDaysLast30?: number | null,
  now: Date = new Date(),
): number {
  let recencyScore = 0;
  if (lastActivityDate) {
    const actDate = typeof lastActivityDate === "string" ? new Date(lastActivityDate) : lastActivityDate;
    if (!Number.isNaN(actDate.getTime())) {
      const diffMs = Math.max(0, now.getTime() - actDate.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      recencyScore = 100 * Math.pow(0.5, diffDays / RECENCY_HALF_LIFE_DAYS);
    }
  }

  const activeDays = clamp(safeNumber(activeDaysLast30, 0), 0, 30);
  const frequencyScore = (activeDays / 30) * 100;
  const f1 = 0.60 * recencyScore + 0.40 * frequencyScore;
  return clamp(f1, 0, 100);
}

export function computeVelocityFactor(
  bankPassRatio?: number | null,
  groundSchoolProgress?: number | null,
  srsMasteryRatio?: number | null,
): number {
  const bPass = clamp(safeNumber(bankPassRatio, 0), 0, 1) * 100;
  const gsProg = clamp(safeNumber(groundSchoolProgress, 0), 0, 1) * 100;
  const srsProg = clamp(safeNumber(srsMasteryRatio, 0), 0, 1) * 100;
  const f2 = (bPass + gsProg + srsProg) / 3;
  return clamp(f2, 0, 100);
}

export function computeMasteryFactor(
  bestExamScore?: number | null,
  recentAttemptAvg?: number | null,
  examPassRate?: number | null,
  examCount?: number | null,
): number {
  const count = safeNumber(examCount, 0);
  if (count <= 0 && bestExamScore == null && recentAttemptAvg == null) {
    return 0;
  }
  const best = clamp(safeNumber(bestExamScore, 0), 0, 100);
  const recent = clamp(safeNumber(recentAttemptAvg, best), 0, 100);
  const passRate = clamp(safeNumber(examPassRate, best >= 75 ? 1 : 0), 0, 1) * 100;
  const f3 = 0.40 * best + 0.40 * recent + 0.20 * passRate;
  return clamp(f3, 0, 100);
}

export function computeConsistencyFactor(
  streakDays?: number | null,
  srsOverdueCount?: number | null,
): number {
  const streak = Math.max(0, safeNumber(streakDays, 0));
  const streakScore = clamp((Math.log(1 + streak) / Math.log(1 + 30)) * 100, 0, 100);
  const overdue = Math.max(0, safeNumber(srsOverdueCount, 0));
  const overduePenalty = clamp(overdue * 2.0, 0, 50);
  const f4 = streakScore - overduePenalty;
  return clamp(f4, 0, 100);
}

export function computeRiskRemediationFactor(
  flaggedBacklogCount?: number | null,
  consecutiveFailures?: number | null,
  instructorRating?: number | null,
): number {
  let baseRating = 80;
  if (instructorRating != null && Number.isFinite(instructorRating)) {
    if (instructorRating <= 5 && instructorRating >= 0) {
      baseRating = (instructorRating / 5) * 100;
    } else {
      baseRating = clamp(instructorRating, 0, 100);
    }
  }
  const flagged = Math.max(0, safeNumber(flaggedBacklogCount, 0));
  const flaggedPenalty = clamp(flagged * 4.0, 0, 40);
  const failures = Math.max(0, safeNumber(consecutiveFailures, 0));
  const failureDeduction = clamp(failures * 15.0, 0, 60);
  const f5 = baseRating - flaggedPenalty - failureDeduction;
  return clamp(f5, 0, 100);
}

export function getHealthBand(score: number): HealthBand {
  if (score >= 80) return "champion";
  if (score >= 60) return "healthy";
  if (score >= 40) return "at_risk";
  return "critical";
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const now = input.now ?? new Date();

  const f1 = computeEngagementFactor(input.lastActivityDate, input.activeDaysLast30, now);
  const f2 = computeVelocityFactor(input.bankPassRatio, input.groundSchoolProgress, input.srsMasteryRatio);
  const f3 = computeMasteryFactor(input.bestExamScore, input.recentAttemptAvg, input.examPassRate, input.examCount);
  const f4 = computeConsistencyFactor(input.streakDays, input.srsOverdueCount);
  const f5 = computeRiskRemediationFactor(input.flaggedBacklogCount, input.consecutiveFailures, input.instructorRating);

  const rawScore =
    HEALTH_WEIGHTS.w1 * f1 +
    HEALTH_WEIGHTS.w2 * f2 +
    HEALTH_WEIGHTS.w3 * f3 +
    HEALTH_WEIGHTS.w4 * f4 +
    HEALTH_WEIGHTS.w5 * f5;

  const score = Math.round(clamp(rawScore, 0, 100) * 10) / 10;
  const band = getHealthBand(score);

  return {
    score,
    band,
    factors: {
      f1Engagement: Math.round(f1 * 10) / 10,
      f2Velocity: Math.round(f2 * 10) / 10,
      f3Mastery: Math.round(f3 * 10) / 10,
      f4Consistency: Math.round(f4 * 10) / 10,
      f5RiskRemediation: Math.round(f5 * 10) / 10,
    },
  };
}

// ── 2. PASS PROBABILITY ──────────────────────────────────────

export type ReadinessTier = "ready" | "near_ready" | "not_ready";

export interface PassProbabilityInput {
  bestScore?: number | null;
  bankCoverageRatio?: number | null;
  scoreTrend?: number | null;
  srsMasteryRatio?: number | null;
  avgSecondsPerQuestion?: number | null;
  scoreVolatility?: number | null;
}

export interface PassProbabilityResult {
  probability: number;
  percentage: number;
  tier: ReadinessTier;
  logitZ: number;
}

export const GACA_PASSING_THRESHOLD = 75;

export const MODEL_COEFFICIENTS = {
  intercept: 0.0,
  wBestScore: 0.10,
  wCoverage: 2.80,
  wTrend: 0.04,
  wSrsMastery: 1.50,
  wPacingPenalty: 0.40,
  wVolatilityPenalty: 0.60,
} as const;

export function computePacingPenalty(avgSeconds?: number | null): number {
  const sec = safeNumber(avgSeconds, 60);
  if (sec <= 0) return 0;
  if (sec >= 35 && sec <= 85) return 0;
  if (sec < 35) {
    return clamp((35 - sec) / 25, 0, 1.5);
  }
  return clamp((sec - 85) / 50, 0, 1.5);
}

export function computeVolatilityPenalty(volatility?: number | null): number {
  const vol = Math.max(0, safeNumber(volatility, 0));
  return clamp(vol / 15.0, 0, 2.0);
}

export function getReadinessTier(prob: number): ReadinessTier {
  if (prob >= 0.85) return "ready";
  if (prob >= 0.70) return "near_ready";
  return "not_ready";
}

export function calculatePassProbability(input: PassProbabilityInput): PassProbabilityResult {
  const bestScore = safeNumber(input.bestScore, 0);
  if (bestScore <= 0 && safeNumber(input.bankCoverageRatio, 0) <= 0) {
    return {
      probability: 0.0,
      percentage: 0,
      tier: "not_ready",
      logitZ: -10,
    };
  }

  const xScore = bestScore - GACA_PASSING_THRESHOLD;
  const xCoverage = clamp(safeNumber(input.bankCoverageRatio, 0.5), 0, 1) - 0.75;
  const xTrend = clamp(safeNumber(input.scoreTrend, 0), -30, 30);
  const xSrs = clamp(safeNumber(input.srsMasteryRatio, 0.5), 0, 1) - 0.70;
  const xPacing = computePacingPenalty(input.avgSecondsPerQuestion);
  const xVolatility = computeVolatilityPenalty(input.scoreVolatility);

  const z =
    MODEL_COEFFICIENTS.intercept +
    MODEL_COEFFICIENTS.wBestScore * xScore +
    MODEL_COEFFICIENTS.wCoverage * xCoverage +
    MODEL_COEFFICIENTS.wTrend * xTrend +
    MODEL_COEFFICIENTS.wSrsMastery * xSrs -
    MODEL_COEFFICIENTS.wPacingPenalty * xPacing -
    MODEL_COEFFICIENTS.wVolatilityPenalty * xVolatility;

  let prob: number;
  if (z >= 20) {
    prob = 0.999;
  } else if (z <= -20) {
    prob = 0.001;
  } else {
    prob = 1 / (1 + Math.exp(-z));
  }

  prob = clamp(prob, 0.001, 0.999);
  const percentage = Math.round(prob * 100);
  const tier = getReadinessTier(prob);

  return {
    probability: Math.round(prob * 1000) / 1000,
    percentage,
    tier,
    logitZ: Math.round(z * 100) / 100,
  };
}

// ── 3. COHORT SUMMARY & KSA PDPL REDACTION ───────────────────

export interface PDPLConsent {
  consent: boolean;
  consentedAt?: string;
  consentVersion?: string;
}

export interface CadetProgressRecord {
  cadetUid: string;
  cadetEmail: string;
  licenseStatus: "active" | "revoked" | "expired" | "pending";
  seatAllocated: boolean;
  cohortId?: string | null;
  pdplConsent?: PDPLConsent;

  healthScore?: number | null;
  passProbability?: number | null;
  examBest?: number | null;
  quizCoverageRatio?: number | null;
  lastActive?: string | null;
}

export interface SchoolInfo {
  schoolId: string;
  name?: string;
  seatLimit: number;
  allocatedSeats?: number;
}

export interface HealthDistribution {
  critical: number;
  atRisk: number;
  healthy: number;
  champion: number;
}

export interface SchoolAnalyticsSummary {
  schoolId: string;
  totalCadets: number;
  activeLicenses: number;
  readyCadets: number;
  avgExamScore: number;
  avgHealthScore: number;
  healthDistribution: HealthDistribution;
  quizBankCoverage: number;
  seatUtilization: number;
  consentedCadetsCount: number;
  redactedCadetsCount: number;
  updatedAt: string;
}

export function computeSchoolAnalyticsSummary(
  cadets: CadetProgressRecord[],
  schoolInfo: SchoolInfo,
  now: Date = new Date(),
): SchoolAnalyticsSummary {
  const totalCadets = cadets.length;

  const activeLicenses = cadets.filter(
    (c) => c.seatAllocated === true && c.licenseStatus === "active",
  ).length;

  const seatLimit = Math.max(0, schoolInfo.seatLimit || 0);
  const seatUtilization = seatLimit > 0
    ? Math.min(100, Math.round((activeLicenses / seatLimit) * 100))
    : 0;

  const consentedCadets = cadets.filter((c) => c.pdplConsent?.consent === true);
  const consentedCount = consentedCadets.length;
  const redactedCount = totalCadets - consentedCount;

  const distribution: HealthDistribution = {
    critical: 0,
    atRisk: 0,
    healthy: 0,
    champion: 0,
  };

  let totalHealth = 0;
  let validHealthCount = 0;
  let totalExam = 0;
  let validExamCount = 0;
  let totalCoverage = 0;
  let readyCadets = 0;

  for (const cadet of consentedCadets) {
    if (cadet.healthScore != null && Number.isFinite(cadet.healthScore)) {
      const h = Math.max(0, Math.min(100, cadet.healthScore));
      totalHealth += h;
      validHealthCount++;

      const band = getHealthBand(h);
      if (band === "champion") distribution.champion++;
      else if (band === "healthy") distribution.healthy++;
      else if (band === "at_risk") distribution.atRisk++;
      else distribution.critical++;
    }

    if (cadet.examBest != null && Number.isFinite(cadet.examBest)) {
      totalExam += Math.max(0, Math.min(100, cadet.examBest));
      validExamCount++;
    }

    if (cadet.quizCoverageRatio != null && Number.isFinite(cadet.quizCoverageRatio)) {
      totalCoverage += Math.max(0, Math.min(1, cadet.quizCoverageRatio));
    }

    if (cadet.passProbability != null && cadet.passProbability >= 0.85) {
      readyCadets++;
    }
  }

  const avgHealthScore = validHealthCount > 0
    ? Math.round((totalHealth / validHealthCount) * 10) / 10
    : 0;

  const avgExamScore = validExamCount > 0
    ? Math.round((totalExam / validExamCount) * 10) / 10
    : 0;

  const quizBankCoverage = consentedCount > 0
    ? Math.round((totalCoverage / consentedCount) * 100)
    : 0;

  return {
    schoolId: schoolInfo.schoolId,
    totalCadets,
    activeLicenses,
    readyCadets,
    avgExamScore,
    avgHealthScore,
    healthDistribution: distribution,
    quizBankCoverage,
    seatUtilization,
    consentedCadetsCount: consentedCount,
    redactedCadetsCount: redactedCount,
    updatedAt: now.toISOString(),
  };
}
