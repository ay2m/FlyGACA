/**
 * Mock Exam Pass Probability ($P \in [0.0, 1.0]$ or $[0, 100]\%$) for Fly GACA.
 *
 * Calibrated logistic regression / readiness model against GACA 75% passing mark ($\theta = 75$).
 * Features:
 *  - Best score vs passing threshold ($x_1 = \text{bestScore} - 75$)
 *  - Bank coverage ($x_2 = \text{bankCoverageRatio}$)
 *  - Score trend ($x_3 = \text{scoreTrend}$)
 *  - SRS Leitner mastery ($x_4 = \text{srsMasteryRatio}$)
 *  - Pacing / time per question ($x_5 = \text{avgSecondsPerQuestion}$)
 *  - Score volatility ($x_6 = \text{scoreVolatility}$)
 *
 * Readiness Tiers:
 *  - Ready:      $P \ge 0.85$ (85%+)
 *  - Near Ready: $0.70 \le P < 0.85$ (70% - 84.9%)
 *  - Not Ready:  $P < 0.70$ (< 70%)
 */

export type ReadinessTier = 'ready' | 'near_ready' | 'not_ready';

export interface PassProbabilityInput {
  /** Candidate's highest mock exam score (0 to 100). */
  bestScore?: number | null;
  /** Proportion of required syllabus banks covered (0.0 to 1.0). */
  bankCoverageRatio?: number | null;
  /** Score trajectory: recent attempt average minus earlier baseline (-30 to +30). */
  scoreTrend?: number | null;
  /** Spaced repetition cards in box >= 3 over total cards (0.0 to 1.0). */
  srsMasteryRatio?: number | null;
  /** Average answer duration in seconds (optimal: 45 - 80s for GACA exams). */
  avgSecondsPerQuestion?: number | null;
  /** Standard deviation of recent exam/quiz attempts (0 to 30). */
  scoreVolatility?: number | null;
}

export interface PassProbabilityResult {
  /** Calibrated probability in [0.0, 1.0]. */
  probability: number;
  /** Probability as percentage integer [0, 100]. */
  percentage: number;
  /** Categorical readiness tier. */
  tier: ReadinessTier;
  /** Diagnostic logistic components. */
  logitZ: number;
}

export const GACA_PASSING_THRESHOLD = 75;

/** Logistic regression calibration coefficients */
export const MODEL_COEFFICIENTS = {
  intercept: 0.0,
  wBestScore: 0.1, // +1.0 logit per 10 points above 75
  wCoverage: 2.8, // strong positive weight for bank coverage
  wTrend: 0.04, // trajectory bonus
  wSrsMastery: 1.5, // long-term memory retention
  wPacingPenalty: 0.4, // penalty for rushing (<15s) or excessive drag (>120s)
  wVolatilityPenalty: 0.6, // penalty for inconsistent erratic scoring
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
 * Pacing quality assessment: GACA CBT questions are standard multiple choice.
 * Pacing between 35s and 85s is optimal. Rushing (< 15s) or stalling (> 120s)
 * reflects guessing or conceptual gaps.
 */
export function computePacingPenalty(avgSeconds?: number | null): number {
  const sec = safeNumber(avgSeconds, 60);
  if (sec <= 0) return 0; // default / unmeasured
  if (sec >= 35 && sec <= 85) return 0;
  if (sec < 35) {
    // Rushing penalty (e.g. 10s -> (35-10)/25 = 1.0)
    return clamp((35 - sec) / 25, 0, 1.5);
  }
  // Excessive drag penalty (e.g. 150s -> (150-85)/50 = 1.3)
  return clamp((sec - 85) / 50, 0, 1.5);
}

/**
 * Volatility penalty: High variance across tests indicates guessing or unstable retention.
 */
export function computeVolatilityPenalty(volatility?: number | null): number {
  const vol = Math.max(0, safeNumber(volatility, 0));
  // StdDev above 10 starts incurring penalty (e.g. 20 -> 1.0)
  return clamp(vol / 15.0, 0, 2.0);
}

/**
 * Classify a pass probability into standardized readiness tier.
 */
export function getReadinessTier(prob: number): ReadinessTier {
  if (prob >= 0.85) return 'ready';
  if (prob >= 0.7) return 'near_ready';
  return 'not_ready';
}

/**
 * Calculate the calibrated pass probability for a cadet.
 */
export function calculatePassProbability(input: PassProbabilityInput): PassProbabilityResult {
  // If bestScore is completely missing or 0, candidate is not ready
  const bestScore = safeNumber(input.bestScore, 0);
  if (bestScore <= 0 && safeNumber(input.bankCoverageRatio, 0) <= 0) {
    return {
      probability: 0.0,
      percentage: 0,
      tier: 'not_ready',
      logitZ: -10,
    };
  }

  // Feature extraction with strict guards
  const xScore = bestScore - GACA_PASSING_THRESHOLD; // Centered at 75%
  const xCoverage = clamp(safeNumber(input.bankCoverageRatio, 0.5), 0, 1) - 0.75; // Centered at 75%
  const xTrend = clamp(safeNumber(input.scoreTrend, 0), -30, 30);
  const xSrs = clamp(safeNumber(input.srsMasteryRatio, 0.5), 0, 1) - 0.7; // Centered at 70%
  const xPacing = computePacingPenalty(input.avgSecondsPerQuestion);
  const xVolatility = computeVolatilityPenalty(input.scoreVolatility);

  // Compute log-odds (logit z)
  const z =
    MODEL_COEFFICIENTS.intercept +
    MODEL_COEFFICIENTS.wBestScore * xScore +
    MODEL_COEFFICIENTS.wCoverage * xCoverage +
    MODEL_COEFFICIENTS.wTrend * xTrend +
    MODEL_COEFFICIENTS.wSrsMastery * xSrs -
    MODEL_COEFFICIENTS.wPacingPenalty * xPacing -
    MODEL_COEFFICIENTS.wVolatilityPenalty * xVolatility;

  // Safe sigmoid with numerical stability
  let prob: number;
  if (z >= 20) {
    prob = 0.999;
  } else if (z <= -20) {
    prob = 0.001;
  } else {
    prob = 1 / (1 + Math.exp(-z));
  }

  // Bound within [0.001, 0.999]
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
