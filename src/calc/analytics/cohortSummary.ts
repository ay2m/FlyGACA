/**
 * Cohort Summary Analytics & KSA PDPL Redaction Engine for Fly GACA.
 *
 * Computes aggregated school analytics for aviation academies while strictly
 * enforcing the Kingdom of Saudi Arabia Personal Data Protection Law (KSA PDPL).
 * If a cadet has not granted consent (`pdplConsent.consent === false`), their
 * individual study performance, exam scores, and health metrics are redacted
 * from the cohort analytics aggregates, while seat license allocation counts
 * are preserved for billing and quota management.
 */

import { getHealthBand } from './healthScore';

export interface PDPLConsent {
  consent: boolean;
  consentedAt?: string;
  consentVersion?: string;
}

export interface CadetProgressRecord {
  cadetUid: string;
  cadetEmail: string;
  licenseStatus: 'active' | 'revoked' | 'expired' | 'pending';
  seatAllocated: boolean;
  cohortId?: string | null;
  pdplConsent?: PDPLConsent;

  // Analytics Metrics (computed per cadet)
  healthScore?: number | null; // 0 to 100
  passProbability?: number | null; // 0.0 to 1.0
  examBest?: number | null; // 0 to 100
  quizCoverageRatio?: number | null; // 0.0 to 1.0
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
  quizBankCoverage: number; // percentage 0 - 100
  seatUtilization: number; // percentage 0 - 100
  consentedCadetsCount: number;
  redactedCadetsCount: number;
  updatedAt: string;
}

/**
 * Compute the pre-aggregated cohort summary for a flight school.
 * Respects KSA PDPL consent settings for every cadet in the roster.
 */
export function computeSchoolAnalyticsSummary(
  cadets: CadetProgressRecord[],
  schoolInfo: SchoolInfo,
  now: Date = new Date(),
): SchoolAnalyticsSummary {
  const totalCadets = cadets.length;

  // Seat allocation & license counts (always included regardless of PDPL consent)
  const activeLicenses = cadets.filter(
    (c) => c.seatAllocated === true && c.licenseStatus === 'active',
  ).length;

  const seatLimit = Math.max(0, schoolInfo.seatLimit || 0);
  const seatUtilization =
    seatLimit > 0 ? Math.min(100, Math.round((activeLicenses / seatLimit) * 100)) : 0;

  // Split by KSA PDPL Consent
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
    // Health score & distribution
    if (cadet.healthScore != null && Number.isFinite(cadet.healthScore)) {
      const h = Math.max(0, Math.min(100, cadet.healthScore));
      totalHealth += h;
      validHealthCount++;

      const band = getHealthBand(h);
      if (band === 'champion') distribution.champion++;
      else if (band === 'healthy') distribution.healthy++;
      else if (band === 'at_risk') distribution.atRisk++;
      else distribution.critical++;
    }

    // Mock Exam Score
    if (cadet.examBest != null && Number.isFinite(cadet.examBest)) {
      totalExam += Math.max(0, Math.min(100, cadet.examBest));
      validExamCount++;
    }

    // Quiz bank coverage
    if (cadet.quizCoverageRatio != null && Number.isFinite(cadet.quizCoverageRatio)) {
      totalCoverage += Math.max(0, Math.min(1, cadet.quizCoverageRatio));
    }

    // Pass Readiness (P >= 0.85)
    if (cadet.passProbability != null && cadet.passProbability >= 0.85) {
      readyCadets++;
    }
  }

  const avgHealthScore =
    validHealthCount > 0 ? Math.round((totalHealth / validHealthCount) * 10) / 10 : 0;

  const avgExamScore = validExamCount > 0 ? Math.round((totalExam / validExamCount) * 10) / 10 : 0;

  const quizBankCoverage =
    consentedCount > 0 ? Math.round((totalCoverage / consentedCount) * 100) : 0;

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
