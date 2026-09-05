import { describe, it, expect } from 'vitest';
import { evaluateConversion, type PilotExperience } from '@/calc/conversionWizard';

describe('conversionWizard Engine', () => {
  it('evaluates FAA CPL to GACA CPL with full hours', () => {
    const exp: PilotExperience = {
      originAuthority: 'FAA',
      targetLicense: 'CPL',
      ratingsHeld: ['IR', 'ME'],
      totalHours: 320,
      picHours: 150,
      crossCountryHours: 60,
      instrumentHours: 25,
      nightHours: 15,
      hasCurrentMedical: true,
      englishProficiencyLevel: 5,
    };

    const res = evaluateConversion(exp);
    expect(res.eligibleForDirectConversion).toBe(true);
    expect(res.medicalClassRequired).toBe(1);
    expect(res.deficits).toHaveLength(0);
    expect(res.requirements.find((r) => r.id === 'experience-total')?.satisfied).toBe(true);
    expect(res.requirements.find((r) => r.id === 'medical')?.satisfied).toBe(true);
    expect(res.requirements.find((r) => r.id === 'elp')?.satisfied).toBe(true);
  });

  it('detects hour deficits and missing medical for ATPL conversion', () => {
    const exp: PilotExperience = {
      originAuthority: 'EASA',
      targetLicense: 'ATPL',
      ratingsHeld: ['IR'],
      totalHours: 1200, // deficit: need 1500
      picHours: 200, // deficit: need 250
      crossCountryHours: 250,
      instrumentHours: 80,
      nightHours: 50, // deficit: need 100
      hasCurrentMedical: false,
      englishProficiencyLevel: 4,
    };

    const res = evaluateConversion(exp);
    expect(res.eligibleForDirectConversion).toBe(false);
    expect(res.medicalClassRequired).toBe(1);
    expect(res.deficits.length).toBeGreaterThan(0);
    expect(res.deficits.some((d) => d.includes('Medical'))).toBe(true);
    expect(res.deficits.some((d) => d.includes('PIC hours'))).toBe(true);
    expect(res.deficits.some((d) => d.includes('Night hours'))).toBe(true);
  });

  it('evaluates PPL conversion requires Class 2 medical', () => {
    const exp: PilotExperience = {
      originAuthority: 'UK_CAA',
      targetLicense: 'PPL',
      ratingsHeld: [],
      totalHours: 65,
      picHours: 20,
      crossCountryHours: 10,
      instrumentHours: 5,
      nightHours: 5,
      hasCurrentMedical: true,
      englishProficiencyLevel: 6,
    };

    const res = evaluateConversion(exp);
    expect(res.eligibleForDirectConversion).toBe(true);
    expect(res.medicalClassRequired).toBe(2);
    expect(res.recommendedStepsEn.length).toBe(6);
    expect(res.recommendedStepsAr.length).toBe(6);
  });
});
