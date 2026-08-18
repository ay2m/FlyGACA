/**
 * Profile/setup completeness for the dashboard onboarding checklist. Pure: maps
 * the profile + logbook to a short list of "get current" steps and an overall
 * percentage so a new pilot is guided to the data the currency board needs
 * (medical, last flight review, home base, a first logged flight).
 */
import type { Flight, Profile } from '@/lib/services/account';

export type SetupStepId = 'medical' | 'review' | 'homeBase' | 'firstFlight';

export interface SetupStep {
  id: SetupStepId;
  done: boolean;
  /** Where the step is completed. */
  to: string;
}

export interface Completeness {
  steps: SetupStep[];
  doneCount: number;
  total: number;
  /** 0–100, rounded. */
  percent: number;
}

export function profileCompleteness(
  profile: Pick<Profile, 'medicalExpiry' | 'lastFlightReview' | 'homeBase'>,
  flights: Flight[],
): Completeness {
  const steps: SetupStep[] = [
    { id: 'medical', done: profile.medicalExpiry.trim() !== '', to: '/settings' },
    { id: 'review', done: profile.lastFlightReview.trim() !== '', to: '/settings' },
    { id: 'homeBase', done: profile.homeBase.trim() !== '', to: '/settings' },
    { id: 'firstFlight', done: flights.length > 0, to: '/logbook?add=1' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    doneCount,
    total: steps.length,
    percent: Math.round((doneCount / steps.length) * 100),
  };
}
