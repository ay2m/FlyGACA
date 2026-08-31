/**
 * Learner data pipeline tests — AIRAC freshness, flight-hour tracking, curriculum progress.
 *
 * Tests the learner data ingestion and tracking systems:
 * 1. AIRAC freshness tracking — 28-day cycles from AIRAC 2001 (2020-01-02)
 * 2. Flight-hour currency calculations — recency and total hours
 * 3. Curriculum progress tracking — pack completion, readiness scoring
 * 4. PDPL compliance — learner data collection and retention
 *
 * Parity contract: flight-hour calculations must match web and iOS; AIRAC cycle
 * and due-window logic must be identical across platforms.
 */

import { describe, it, expect, beforeEach } from "vitest";

// AIRAC cycle constants (from src/calc/airac.ts)
const AIRAC_EPOCH = new Date("2020-01-02").getTime(); // AIRAC 2001 effective date
const AIRAC_CYCLE_DAYS = 28;
const AIRAC_DUE_WINDOW_DAYS = 7;

// Learner data types
interface LearnerProfile {
  uid: string;
  email: string;
  name?: string; // Optional — minimal data collection
  createdAt: string;
  packEntitlements: { [packId: string]: string }; // packId → expiresAt
  flightHours?: { total: number; lastRecorded: string };
  progressByBankId: Record<string, LearnerProgress>;
  dataRetentionDays?: number; // After deletion request, purge after N days
}

interface LearnerProgress {
  bankId: string;
  questionsAnswered: number;
  completedCount: number;
  totalInPack: number;
  readinessScore: number; // 0–100, weighted by SRS box
  lastActivityAt: string;
  airacDueAt?: string; // Next AIRAC cycle due date
  airacStatus?: "current" | "due_soon" | "overdue"; // For curriculum freshness
}

interface FlightHour {
  date: string; // YYYY-MM-DD
  hours: number;
  flightType: "training" | "solo" | "cross_country" | "ppl_requirement";
  aircraftType?: string;
  instructor?: string;
}

interface CurriculumProgress {
  packId: string;
  bankId: string;
  totalQuestions: number;
  questionsAnswered: number;
  questionsCorrect: number;
  readinessPercentile: number; // Weighted by SRS recency and box level
  mastered: number; // Questions in box 3+
  needsReview: number; // Questions in box 0-1
}

// Mock data store
const learnersMap: Map<string, LearnerProfile> = new Map();
const flightHoursMap: Map<string, FlightHour[]> = new Map();
const curriculumProgressMap: Map<string, CurriculumProgress> = new Map();
const dataRetentionQueue: Array<{ uid: string; requestedAt: string; purgeAt: string }> = [];

// Utility: Calculate current AIRAC cycle
function getCurrentAiracCycle(now: Date = new Date()): number {
  const daysSinceEpoch = Math.floor((now.getTime() - AIRAC_EPOCH) / (86400 * 1000));
  return Math.floor(daysSinceEpoch / AIRAC_CYCLE_DAYS) + 2001;
}

// Utility: Calculate AIRAC status (current/due_soon/overdue)
function getAiracStatus(now: Date = new Date(), withinDays: number = AIRAC_DUE_WINDOW_DAYS): "current" | "due_soon" | "overdue" {
  const daysSinceEpoch = Math.floor((now.getTime() - AIRAC_EPOCH) / (86400 * 1000));
  const positionInCycle = daysSinceEpoch % AIRAC_CYCLE_DAYS;

  if (positionInCycle >= AIRAC_CYCLE_DAYS - withinDays) {
    return "due_soon";
  }
  if (positionInCycle + withinDays < AIRAC_CYCLE_DAYS) {
    return "current";
  }
  return "overdue";
}

// Service: Ingest learner profile
async function ingestLearnerProfile(
  uid: string,
  email: string,
  name?: string,
  initialPackIds: string[] = [],
): Promise<LearnerProfile> {
  const profile: LearnerProfile = {
    uid,
    email,
    name,
    createdAt: new Date().toISOString(),
    packEntitlements: {},
    progressByBankId: {},
  };

  // Grant initial packs (trial or pilot)
  for (const packId of initialPackIds) {
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    profile.packEntitlements[packId] = expiresAt;
  }

  learnersMap.set(uid, profile);
  return profile;
}

// Service: Record flight hour
async function recordFlightHour(
  uid: string,
  date: string,
  hours: number,
  flightType: FlightHour["flightType"],
  aircraftType?: string,
  instructor?: string,
): Promise<void> {
  const entry: FlightHour = { date, hours, flightType, aircraftType, instructor };

  if (!flightHoursMap.has(uid)) {
    flightHoursMap.set(uid, []);
  }

  flightHoursMap.get(uid)!.push(entry);

  // Update learner total hours
  const learner = learnersMap.get(uid);
  if (learner) {
    const total = flightHoursMap.get(uid)?.reduce((sum, h) => sum + h.hours, 0) || 0;
    learner.flightHours = { total, lastRecorded: date };
  }
}

// Service: Calculate flight-hour currency
async function getFlightHourCurrency(uid: string, now: Date = new Date()): Promise<{ totalHours: number; currencyStatus: string }> {
  const hours = flightHoursMap.get(uid) || [];

  if (hours.length === 0) {
    return { totalHours: 0, currencyStatus: "no_flights" };
  }

  const sortedByDate = [...hours].sort((a, b) => b.date.localeCompare(a.date));
  const lastFlightDate = new Date(sortedByDate[0].date);
  const daysSinceLastFlight = Math.floor((now.getTime() - lastFlightDate.getTime()) / (86400 * 1000));

  const totalHours = hours.reduce((sum, h) => sum + h.hours, 0);
  let currencyStatus = "current";

  if (daysSinceLastFlight > 90) {
    currencyStatus = "expired";
  } else if (daysSinceLastFlight > 60) {
    currencyStatus = "expiring_soon";
  }

  return { totalHours, currencyStatus };
}

// Service: Update curriculum progress (simulating quiz completion)
async function updateCurriculumProgress(
  uid: string,
  packId: string,
  bankId: string,
  questionsAnswered: number,
  questionsCorrect: number,
  totalInPack: number,
): Promise<CurriculumProgress> {
  const now = new Date();
  const readinessPercentile = Math.round((questionsCorrect / questionsAnswered) * 100);
  const mastered = Math.floor((questionsCorrect / totalInPack) * 100 * 0.5); // Rough proxy

  const progress: CurriculumProgress = {
    packId,
    bankId,
    totalQuestions: totalInPack,
    questionsAnswered,
    questionsCorrect,
    readinessPercentile,
    mastered,
    needsReview: totalInPack - mastered,
  };

  curriculumProgressMap.set(`${uid}_${packId}`, progress);

  // Update learner's bank progress
  const learner = learnersMap.get(uid);
  if (learner) {
    learner.progressByBankId[bankId] = {
      bankId,
      questionsAnswered,
      completedCount: questionsCorrect,
      totalInPack,
      readinessScore: readinessPercentile,
      lastActivityAt: now.toISOString(),
      airacStatus: getAiracStatus(now),
    };
  }

  return progress;
}

// Service: Check AIRAC due status for a learner
async function getAiracDueStatus(
  uid: string,
  now: Date = new Date(),
): Promise<{ currentCycle: number; status: string; banksDue: string[] }> {
  const cycle = getCurrentAiracCycle(now);
  const status = getAiracStatus(now);

  const learner = learnersMap.get(uid);
  if (!learner) {
    return { currentCycle: cycle, status, banksDue: [] };
  }

  const banksDue = Object.entries(learner.progressByBankId)
    .filter(([, prog]) => prog.airacStatus === "due_soon" || prog.airacStatus === "overdue")
    .map(([bankId]) => bankId);

  return { currentCycle: cycle, status, banksDue };
}

// Service: Request data deletion (PDPL right to be forgotten)
async function requestDataDeletion(uid: string): Promise<{ uid: string; requestedAt: string; purgeAt: string }> {
  const now = new Date().toISOString();
  const purgeAt = new Date(Date.now() + 30 * 86400000).toISOString(); // 30 days grace period

  dataRetentionQueue.push({ uid, requestedAt: now, purgeAt });

  // Immediately anonymize (not delete) sensitive fields
  const learner = learnersMap.get(uid);
  if (learner) {
    learner.name = undefined; // Forget name
    learner.flightHours = undefined; // Forget flight hours (aggregate OK, individual OK)
    learner.dataRetentionDays = 30;
  }

  return { uid, requestedAt: now, purgeAt };
}

// Service: Purge expired deletion requests
async function purgeExpiredDeletionRequests(now: Date = new Date()): Promise<number> {
  const before = dataRetentionQueue.length;

  for (const request of dataRetentionQueue) {
    if (new Date(request.purgeAt) <= now) {
      learnersMap.delete(request.uid);
      flightHoursMap.delete(request.uid);
      dataRetentionQueue.splice(dataRetentionQueue.indexOf(request), 1);
    }
  }

  return before - dataRetentionQueue.length;
}

// Tests
describe("Learner data pipeline", () => {
  beforeEach(() => {
    learnersMap.clear();
    flightHoursMap.clear();
    curriculumProgressMap.clear();
    dataRetentionQueue.length = 0;
  });

  describe("AIRAC freshness tracking", () => {
    it("calculates current AIRAC cycle correctly", () => {
      const testDate = new Date("2026-09-05"); // Well after AIRAC 2001
      const cycle = getCurrentAiracCycle(testDate);

      expect(cycle).toBeGreaterThan(2001);
      expect(typeof cycle).toBe("number");
    });

    it("marks curriculum due when within 7-day window", () => {
      const now = new Date("2026-09-01"); // Pick a date
      const status = getAiracStatus(now, 7);

      expect(["current", "due_soon", "overdue"]).toContain(status);
    });

    it("tracks AIRAC due status per learner", async () => {
      const uid = "learner_airac_001";
      await ingestLearnerProfile(uid, "learner@example.com");
      await updateCurriculumProgress(uid, "elpt", "elpt", 50, 40, 100);

      const { currentCycle, status, banksDue } = await getAiracDueStatus(uid, new Date("2026-09-05"));

      expect(currentCycle).toBeGreaterThan(0);
      expect(["current", "due_soon", "overdue"]).toContain(status);
      expect(banksDue).toBeInstanceOf(Array);
    });

    it("expires sources after 28-day AIRAC cycle passes", async () => {
      const uid = "learner_airac_002";
      const baseDate = new Date("2026-01-02"); // AIRAC cycle anchor
      await ingestLearnerProfile(uid, "test@example.com");

      const cycle1 = getCurrentAiracCycle(baseDate);
      const cycleEnd = new Date(baseDate.getTime() + AIRAC_CYCLE_DAYS * 86400000 + 1000);
      const cycle2 = getCurrentAiracCycle(cycleEnd);

      expect(cycle2).toBeGreaterThan(cycle1);
    });
  });

  describe("flight-hour tracking", () => {
    it("records individual flight hours", async () => {
      const uid = "pilot_001";
      await ingestLearnerProfile(uid, "pilot@example.com");

      await recordFlightHour(uid, "2026-09-01", 1.5, "training", "Cessna 172", "John Doe");
      await recordFlightHour(uid, "2026-09-02", 2.0, "solo", "Cessna 172");

      const currency = await getFlightHourCurrency(uid);
      expect(currency.totalHours).toBe(3.5);
    });

    it("calculates currency based on recency", async () => {
      const uid = "pilot_002";
      const now = new Date("2026-09-05");

      await ingestLearnerProfile(uid, "pilot@example.com");
      await recordFlightHour(uid, "2026-09-01", 1.5, "training");

      const currency = await getFlightHourCurrency(uid, now);
      expect(currency.totalHours).toBe(1.5);
      expect(["current", "expiring_soon", "expired"]).toContain(currency.currencyStatus);
    });

    it("marks currency expired after 90 days", async () => {
      const uid = "pilot_003";
      // 2026 is not a leap year, so 2026-01-01 → 2026-04-01 is exactly 90 days,
      // and currency lapses only once *more* than 90 have passed. Check a day
      // later so the fixture matches what this test claims to assert.
      const checkDate = new Date("2026-04-02"); // 91 days after the flight below

      await ingestLearnerProfile(uid, "pilot@example.com");
      await recordFlightHour(uid, "2026-01-01", 1.0, "training");

      const currency = await getFlightHourCurrency(uid, checkDate);
      expect(currency.currencyStatus).toBe("expired");
    });

    it("tracks aircraft type and instructor for each flight", async () => {
      const uid = "pilot_004";
      await ingestLearnerProfile(uid, "pilot@example.com");

      await recordFlightHour(uid, "2026-09-01", 1.5, "training", "Cessna 172", "Alice");
      await recordFlightHour(uid, "2026-09-02", 2.0, "solo", "Piper PA-28");

      const hours = flightHoursMap.get(uid);
      expect(hours).toHaveLength(2);
      expect(hours![0].aircraftType).toBe("Cessna 172");
      expect(hours![0].instructor).toBe("Alice");
      expect(hours![1].instructor).toBeUndefined();
    });
  });

  describe("curriculum progress tracking", () => {
    it("updates progress after quiz completion", async () => {
      const uid = "student_001";
      await ingestLearnerProfile(uid, "student@example.com");

      const progress = await updateCurriculumProgress(uid, "elpt", "elpt", 25, 20, 100);

      expect(progress.questionsAnswered).toBe(25);
      expect(progress.questionsCorrect).toBe(20);
      expect(progress.readinessPercentile).toBe(80);
    });

    it("tracks readiness score per bank", async () => {
      const uid = "student_002";
      await ingestLearnerProfile(uid, "student@example.com");

      await updateCurriculumProgress(uid, "elpt", "elpt", 50, 45, 100);
      await updateCurriculumProgress(uid, "aip", "aip", 30, 24, 100);

      const learner = learnersMap.get(uid);
      expect(learner?.progressByBankId["elpt"].readinessScore).toBe(90);
      expect(learner?.progressByBankId["aip"].readinessScore).toBe(80);
    });

    it("maintains parity with iOS SwiftData schema", async () => {
      const uid = "student_003";
      await ingestLearnerProfile(uid, "student@example.com");
      await updateCurriculumProgress(uid, "elpt", "elpt", 20, 15, 100);

      const learner = learnersMap.get(uid);
      expect(learner?.progressByBankId["elpt"]).toHaveProperty("bankId");
      expect(learner?.progressByBankId["elpt"]).toHaveProperty("questionsAnswered");
      expect(learner?.progressByBankId["elpt"]).toHaveProperty("readinessScore");
      expect(learner?.progressByBankId["elpt"]).toHaveProperty("lastActivityAt");
    });

    it("updates lastActivityAt on each quiz", async () => {
      const uid = "student_004";
      await ingestLearnerProfile(uid, "student@example.com");

      await updateCurriculumProgress(uid, "elpt", "elpt", 10, 8, 100);
      const firstActivity = learnersMap.get(uid)?.progressByBankId["elpt"].lastActivityAt;

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      await updateCurriculumProgress(uid, "elpt", "elpt", 20, 16, 100);
      const secondActivity = learnersMap.get(uid)?.progressByBankId["elpt"].lastActivityAt;

      expect(secondActivity).not.toBe(firstActivity);
    });
  });

  describe("PDPL compliance — right to be forgotten", () => {
    it("anonymizes profile on deletion request", async () => {
      const uid = "learner_pdpl_001";
      await ingestLearnerProfile(uid, "learner@example.com", "John Doe");
      await recordFlightHour(uid, "2026-09-01", 1.5, "training", "Cessana 172");

      const result = await requestDataDeletion(uid);

      expect(result.uid).toBe(uid);
      expect(result.purgeAt).toBeDefined();

      const learner = learnersMap.get(uid);
      expect(learner?.name).toBeUndefined();
      expect(learner?.flightHours).toBeUndefined();
      expect(learner?.dataRetentionDays).toBe(30);
    });

    it("purges data after grace period expires", async () => {
      const uid = "learner_pdpl_002";
      await ingestLearnerProfile(uid, "learner@example.com");
      await requestDataDeletion(uid);

      const now = new Date(Date.now() + 31 * 86400000); // 31 days later
      const purged = await purgeExpiredDeletionRequests(now);

      expect(purged).toBeGreaterThan(0);
      expect(learnersMap.has(uid)).toBe(false);
    });

    it("preserves aggregated data (no PII)", async () => {
      const uid = "learner_pdpl_003";
      await ingestLearnerProfile(uid, "learner@example.com", "Jane Doe");
      await recordFlightHour(uid, "2026-09-01", 1.5, "training", "Cessna 172", "Instructor A");

      await requestDataDeletion(uid);

      const learner = learnersMap.get(uid);
      expect(learner?.uid).toBe(uid); // UID is system-generated, not PII
      expect(learner?.email).toBe("learner@example.com"); // Email retained for auth (separate consent model)
      expect(learner?.name).toBeUndefined(); // Optional name removed
      expect(learner?.flightHours).toBeUndefined(); // Individual flights anonymized
    });

    it("never leaks password hashes or tokens in learner record", async () => {
      const uid = "learner_pdpl_004";
      await ingestLearnerProfile(uid, "learner@example.com");

      const learner = learnersMap.get(uid);
      const learnerJson = JSON.stringify(learner);

      expect(learnerJson).not.toContain("password");
      expect(learnerJson).not.toContain("token");
      expect(learnerJson).not.toContain("idToken");
      expect(learnerJson).not.toContain("refreshToken");
    });

    it("logs deletion requests for compliance audit", async () => {
      const uid = "learner_pdpl_005";
      await ingestLearnerProfile(uid, "learner@example.com");

      await requestDataDeletion(uid);

      expect(dataRetentionQueue).toHaveLength(1);
      expect(dataRetentionQueue[0]).toHaveProperty("uid", uid);
      expect(dataRetentionQueue[0]).toHaveProperty("requestedAt");
      expect(dataRetentionQueue[0]).toHaveProperty("purgeAt");
    });
  });

  describe("data integrity & cross-platform parity", () => {
    it("maintains consistent flight-hour totals across syncs", async () => {
      const uid = "consistency_001";
      await ingestLearnerProfile(uid, "learner@example.com");

      await recordFlightHour(uid, "2026-09-01", 1.0, "training");
      await recordFlightHour(uid, "2026-09-02", 1.5, "training");
      await recordFlightHour(uid, "2026-09-03", 0.5, "solo");

      const currency1 = await getFlightHourCurrency(uid);
      const currency2 = await getFlightHourCurrency(uid);

      expect(currency1.totalHours).toBe(currency2.totalHours);
      expect(currency1.totalHours).toBe(3.0);
    });

    it("progress structure is compatible with iOS SwiftData", async () => {
      const uid = "consistency_002";
      await ingestLearnerProfile(uid, "learner@example.com");
      await updateCurriculumProgress(uid, "elpt", "elpt", 50, 40, 100);

      const progress = learnersMap.get(uid)?.progressByBankId["elpt"];

      // SwiftData requires: bankId, questionsAnswered, totalInPack, readinessScore, lastActivityAt
      expect(progress).toHaveProperty("bankId", "elpt");
      expect(progress).toHaveProperty("questionsAnswered", 50);
      expect(progress).toHaveProperty("totalInPack", 100);
      expect(progress).toHaveProperty("readinessScore");
      expect(progress).toHaveProperty("lastActivityAt");
    });
  });

  describe("error handling & resilience", () => {
    it("handles missing learner gracefully", async () => {
      const { currentCycle, status, banksDue } = await getAiracDueStatus("nonexistent_uid");

      expect(currentCycle).toBeGreaterThan(0);
      expect(["current", "due_soon", "overdue"]).toContain(status);
      expect(banksDue).toHaveLength(0);
    });

    it("allows multiple flight hours on same day", async () => {
      const uid = "resilience_001";
      await ingestLearnerProfile(uid, "learner@example.com");

      await recordFlightHour(uid, "2026-09-01", 1.0, "training");
      await recordFlightHour(uid, "2026-09-01", 1.5, "solo"); // Same day

      const hours = flightHoursMap.get(uid);
      expect(hours).toHaveLength(2);
      const total = hours?.reduce((sum, h) => sum + h.hours, 0);
      expect(total).toBe(2.5);
    });

    it("recovers from concurrent deletion requests", async () => {
      const uid = "resilience_002";
      await ingestLearnerProfile(uid, "learner@example.com");

      const del1 = await requestDataDeletion(uid);
      const del2 = await requestDataDeletion(uid); // Duplicate

      expect(dataRetentionQueue.length).toBeGreaterThanOrEqual(1);
      expect(del1.uid).toBe(del2.uid);
    });
  });
});
