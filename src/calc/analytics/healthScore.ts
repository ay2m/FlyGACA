/**
 * 5-Factor Customer Health Score ($H \in [0, 100]$) for Fly GACA Cadets.
 *
 * Factors:
 *  - F1 (Platform Engagement / Recency, w1 = 0.20): Inactivity decay (half-life tau = 7.0 days) + 30-day frequency.
 *  - F2 (Syllabus Completion Velocity, w2 = 0.25): Bank pass ratio + ground school progress + Leitner SRS mastery.
 *  - F3 (Mock Exam Mastery, w3 = 0.25): Best exam score + recent attempt average + pass rate.
 *  - F4 (Study Consistency / Streak, w4 = 0.15): Log streak progression minus SRS overdue card penalty.
 *  - F5 (Instructor Risk & Remediation, w5 = 0.15): Flagged question backlog penalty, consecutive failure deduction, instructor rating.
 *
 * Clamped to [0, 100].
 * Health Bands:
 *  - Critical: < 40
 *  - At Risk:  40 – 59.9
 *  - Healthy:  60 – 79.9
 *  - Champion: 80 – 100
 */

export type HealthBand = 'critical' | 'at_risk' | 'healthy' | 'champion';

export interface HealthScoreInput {
  /** ISO string or Date of the most recent activity. */
  lastActivityDate?: string | Date | null;
  /** Active study days in the last 30 days (0-30). */
  activeDaysLast30?: number | null;

  /** Ratio of quiz banks passed (0.0 to 1.0). */
  bankPassRatio?: number | null;
  /** Ground school completion progress (0.0 to 1.0). */
  groundSchoolProgress?: number | null;
  /** Spaced repetition Leitner mastery ratio (0.0 to 1.0). */
  srsMasteryRatio?: number | null;

  /** Best mock exam score (0 to 100). */
  bestExamScore?: number | null;
  /** Average of recent mock exam attempts (0 to 100). */
  recentAttemptAvg?: number | null;
  /** Pass rate across all mock exam attempts (0.0 to 1.0). */
  examPassRate?: number | null;
  /** Total mock exam attempts taken. */
  examCount?: number | null;

  /** Current active study streak in days. */
  streakDays?: number | null;
  /** Number of overdue flashcards in SRS deck. */
  srsOverdueCount?: number | null;

  /** Number of flagged questions pending instructor review. */
  flaggedBacklogCount?: number | null;
  /** Number of consecutive failed attempts. */
  consecutiveFailures?: number | null;
  /** Instructor evaluation score (1-5 star scale or 0-100 percentage). */
  instructorRating?: number | null;

  /** Reference timestamp for decay calculation (defaults to current time). */
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

/** Inactivity half-life in days */
export const RECENCY_HALF_LIFE_DAYS = 7.0;

/** Weights for each factor */
export const HEALTH_WEIGHTS = {
  w1: 0.2,
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
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return fallback;
}

/**
 * F1: Platform Engagement & Recency (w1 = 0.20)
 * Computes inactivity decay: decay = 100 * (0.5)^(daysSinceLastActivity / 7.0)
 * Combined with 30-day frequency: (activeDays / 30) * 100
 */
export function computeEngagementFactor(
  lastActivityDate?: string | Date | null,
  activeDaysLast30?: number | null,
  now: Date = new Date(),
): number {
  let recencyScore = 0;
  if (lastActivityDate) {
    const actDate =
      typeof lastActivityDate === 'string' ? new Date(lastActivityDate) : lastActivityDate;
    if (!Number.isNaN(actDate.getTime())) {
      const diffMs = Math.max(0, now.getTime() - actDate.getTime());
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      // Exponential decay with half-life tau = 7.0 days
      recencyScore = 100 * Math.pow(0.5, diffDays / RECENCY_HALF_LIFE_DAYS);
    }
  }

  const activeDays = clamp(safeNumber(activeDaysLast30, 0), 0, 30);
  const frequencyScore = (activeDays / 30) * 100;

  // 60% recency decay + 40% 30-day frequency
  const f1 = 0.6 * recencyScore + 0.4 * frequencyScore;
  return clamp(f1, 0, 100);
}

/**
 * F2: Syllabus Completion Velocity (w2 = 0.25)
 * Combines Bank Pass Ratio, Ground School Progress, and SRS Mastery Ratio.
 */
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

/**
 * F3: Mock Exam Mastery (w3 = 0.25)
 * Combines Best Exam Score, Recent Attempt Average, and Pass Rate.
 */
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

  const f3 = 0.4 * best + 0.4 * recent + 0.2 * passRate;
  return clamp(f3, 0, 100);
}

/**
 * F4: Study Consistency & Streak (w4 = 0.15)
 * Logarithmic streak progression minus penalty for overdue SRS cards.
 */
export function computeConsistencyFactor(
  streakDays?: number | null,
  srsOverdueCount?: number | null,
): number {
  const streak = Math.max(0, safeNumber(streakDays, 0));
  // 30 days of streak maps to 100 via log curve
  const streakScore = clamp((Math.log(1 + streak) / Math.log(1 + 30)) * 100, 0, 100);

  const overdue = Math.max(0, safeNumber(srsOverdueCount, 0));
  // Each overdue card imposes 2-point penalty, max 50 points
  const overduePenalty = clamp(overdue * 2.0, 0, 50);

  const f4 = streakScore - overduePenalty;
  return clamp(f4, 0, 100);
}

/**
 * F5: Instructor Risk & Remediation (w5 = 0.15)
 * Baseline instructor rating minus penalties for flagged question backlog and consecutive failures.
 */
export function computeRiskRemediationFactor(
  flaggedBacklogCount?: number | null,
  consecutiveFailures?: number | null,
  instructorRating?: number | null,
): number {
  let baseRating = 80; // Default healthy baseline if no manual rating provided
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

/**
 * Classify a health score into its standardized health band.
 */
export function getHealthBand(score: number): HealthBand {
  if (score >= 80) return 'champion';
  if (score >= 60) return 'healthy';
  if (score >= 40) return 'at_risk';
  return 'critical';
}

/**
 * Calculate the overall 5-factor customer health score for a cadet.
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const now = input.now ?? new Date();

  const f1 = computeEngagementFactor(input.lastActivityDate, input.activeDaysLast30, now);
  const f2 = computeVelocityFactor(
    input.bankPassRatio,
    input.groundSchoolProgress,
    input.srsMasteryRatio,
  );
  const f3 = computeMasteryFactor(
    input.bestExamScore,
    input.recentAttemptAvg,
    input.examPassRate,
    input.examCount,
  );
  const f4 = computeConsistencyFactor(input.streakDays, input.srsOverdueCount);
  const f5 = computeRiskRemediationFactor(
    input.flaggedBacklogCount,
    input.consecutiveFailures,
    input.instructorRating,
  );

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
