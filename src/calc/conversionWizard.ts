/**
 * Interactive Foreign License to GACA Conversion Logic & Engine (GACAR Part 61 & Part 67).
 * Evaluates foreign flight experience against GACA conversion mandates.
 */

export type OriginAuthority = 'FAA' | 'EASA' | 'UK_CAA' | 'ICAO_OTHER';
export type TargetLicense = 'PPL' | 'CPL' | 'ATPL';
export type RatingAddon = 'IR' | 'ME' | 'CFI';

export interface PilotExperience {
  originAuthority: OriginAuthority;
  targetLicense: TargetLicense;
  ratingsHeld: RatingAddon[];
  totalHours: number;
  picHours: number;
  crossCountryHours: number;
  instrumentHours: number;
  nightHours: number;
  hasCurrentMedical: boolean;
  englishProficiencyLevel: number; // 1-6 (ICAO level)
}

export interface ConversionRequirementItem {
  id: string;
  category: 'medical' | 'theory' | 'experience' | 'elp' | 'practical' | 'admin';
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  gacarCitation: string;
  satisfied: boolean;
  hoursDeficit?: number;
}

export interface ConversionEvaluationResult {
  eligibleForDirectConversion: boolean;
  minimumTotalHoursReq: number;
  medicalClassRequired: number; // 1 or 2
  requirements: ConversionRequirementItem[];
  deficits: string[];
  recommendedStepsEn: string[];
  recommendedStepsAr: string[];
}

export const GACA_MINIMUM_EXPERIENCE: Record<
  TargetLicense,
  { total: number; pic: number; xc: number; ifr: number; night: number }
> = {
  PPL: { total: 40, pic: 10, xc: 5, ifr: 3, night: 3 },
  CPL: { total: 250, pic: 100, xc: 50, ifr: 10, night: 5 },
  ATPL: { total: 1500, pic: 250, xc: 200, ifr: 75, night: 100 },
};

/** Evaluates pilot experience against GACAR Part 61 conversion mandates. */
export function evaluateConversion(exp: PilotExperience): ConversionEvaluationResult {
  const reqHours = GACA_MINIMUM_EXPERIENCE[exp.targetLicense];
  const medicalClass = exp.targetLicense === 'PPL' ? 2 : 1;
  const requirements: ConversionRequirementItem[] = [];
  const deficits: string[] = [];

  // 1. Medical Certificate (GACAR Part 67)
  const medSatisfied = exp.hasCurrentMedical;
  requirements.push({
    id: 'medical',
    category: 'medical',
    titleEn: `GACA Class ${medicalClass} Medical Certificate`,
    titleAr: `شهادة فحص طبي فئة ${medicalClass} معتمدة من GACA`,
    descEn: `Must hold a valid Class ${medicalClass} medical issued or validated by an authorized GACA AME (Aviation Medical Examiner).`,
    descAr: `يجب الحصول على شهادة فحص طبي فئة ${medicalClass} صادرة أو معتمدة من طبيب فحص طيران معتمد لدى الهيئة.`,
    gacarCitation: 'GACAR Part 67',
    satisfied: medSatisfied,
  });
  if (!medSatisfied) {
    deficits.push(`Requires GACA Class ${medicalClass} Medical.`);
  }

  // 2. English Language Proficiency (ICAO Level 4+)
  const elpSatisfied = exp.englishProficiencyLevel >= 4;
  requirements.push({
    id: 'elp',
    category: 'elp',
    titleEn: 'ICAO English Language Proficiency (ELP Level 4+)',
    titleAr: 'إتقان اللغة الإنجليزية الملاحية (مستوى ICAO 4 فأعلى)',
    descEn: `GACAR requires operational English proficiency at or above ICAO Level 4 (Operational/Extended/Expert).`,
    descAr: `تتطلب لوائح GACAR مستوى تشغيلياً في اللغة الإنجليزية لا يقل عن المستوى الرابع (ICAO Level 4+).`,
    gacarCitation: 'GACAR Part 61.31(c)',
    satisfied: elpSatisfied,
  });
  if (!elpSatisfied) {
    deficits.push('Must demonstrate ICAO Level 4+ English Proficiency.');
  }

  // 3. Experience & Flight Hours (GACAR Part 61)
  const totalDeficit = Math.max(0, reqHours.total - exp.totalHours);
  const picDeficit = Math.max(0, reqHours.pic - exp.picHours);
  const xcDeficit = Math.max(0, reqHours.xc - exp.crossCountryHours);
  const ifrDeficit = Math.max(0, reqHours.ifr - exp.instrumentHours);
  const nightDeficit = Math.max(0, reqHours.night - exp.nightHours);

  const hoursSatisfied =
    totalDeficit === 0 &&
    picDeficit === 0 &&
    xcDeficit === 0 &&
    ifrDeficit === 0 &&
    nightDeficit === 0;

  requirements.push({
    id: 'experience-total',
    category: 'experience',
    titleEn: `Total Flight Time (${exp.totalHours} / ${reqHours.total} hrs)`,
    titleAr: `إجمالي ساعات الطيران (${exp.totalHours} / ${reqHours.total} ساعة)`,
    descEn: `Minimum ${reqHours.total} total flight hours required for ${exp.targetLicense}.`,
    descAr: `الحد الأدنى المطلوب ${reqHours.total} ساعة طيران إجمالية لرخصة ${exp.targetLicense}.`,
    gacarCitation:
      exp.targetLicense === 'PPL'
        ? 'GACAR §61.109'
        : exp.targetLicense === 'CPL'
          ? 'GACAR §61.129'
          : 'GACAR §61.159',
    satisfied: totalDeficit === 0,
    hoursDeficit: totalDeficit,
  });

  if (picDeficit > 0) deficits.push(`Deficit of ${picDeficit} PIC hours.`);
  if (xcDeficit > 0) deficits.push(`Deficit of ${xcDeficit} Cross-Country hours.`);
  if (ifrDeficit > 0) deficits.push(`Deficit of ${ifrDeficit} Instrument hours.`);
  if (nightDeficit > 0) deficits.push(`Deficit of ${nightDeficit} Night hours.`);

  // 4. Theory: GACA Air Law & Regulations Written Examination
  requirements.push({
    id: 'theory-airlaw',
    category: 'theory',
    titleEn: 'GACA Aviation Law & Regulations Written Exam',
    titleAr: 'اختبار قانون ولوائح الطيران المدني السعودي (GACA Air Law)',
    descEn: `Mandatory written theory examination covering GACAR Parts 1, 61, 91, AIP-KSA, and Saudi airspace procedures.`,
    descAr: `اختبار نظري إلزامي يغطي أجزاء GACAR رقم 1 و 61 و 91 ودليل AIP السعودي وإجراءات المجال الجوي.`,
    gacarCitation: 'GACAR §61.75(b) / §61.123',
    satisfied: false, // Must be taken in KSA
  });

  // 5. Verification of Foreign Authenticity
  requirements.push({
    id: 'foreign-verification',
    category: 'admin',
    titleEn: `Foreign Authority Verification (${exp.originAuthority})`,
    titleAr: `التحقق والتوثيق من سلطة الطيران الأجنبية (${exp.originAuthority})`,
    descEn: `Official letter of authenticity from ${exp.originAuthority} directly to GACA Airman Certification Branch.`,
    descAr: `خطاب توثيق رسمي وصحة بيانات مرسل مباشرة من ${exp.originAuthority} إلى إدارة التراخيص بهيئة الطيران المدني.`,
    gacarCitation: 'GACAR §61.75(c)',
    satisfied: true,
  });

  // 6. Practical Flight Skill Test / Proficiency Check
  requirements.push({
    id: 'skill-test',
    category: 'practical',
    titleEn: `GACA Conversion Practical Skill Test (${exp.targetLicense})`,
    titleAr: `اختبار المهارة العملي لمعادلة رخصة (${exp.targetLicense})`,
    descEn: `Proficiency check with a GACA Designated Pilot Examiner (DPE) or ATO Chief Flight Instructor.`,
    descAr: `فحص كفاءة واختبار مهارة عملي مع ممتحن طيران مفوض (DPE) أو في مدرسة طيران معتمدة (Part 141).`,
    gacarCitation: 'GACAR §61.75(d) / §61.127',
    satisfied: false,
  });

  const eligibleForDirectConversion = medSatisfied && elpSatisfied && hoursSatisfied;

  const recommendedStepsEn = [
    `1. Obtain GACA Class ${medicalClass} Medical from an authorized Saudi AME.`,
    `2. Submit Verification of Foreign License request from ${exp.originAuthority} to GACA.`,
    `3. Register on GACA e-Services and study GACAR Part 91 & AIP-KSA with Fly GACA / Captain Adel.`,
    '4. Pass the GACA Air Law & Saudi Regulations computer-based exam.',
    `5. Complete the practical flight skill check with a GACA-authorized examiner.`,
    '6. Receive your permanent GACA Pilot License.',
  ];

  const recommendedStepsAr = [
    `١. استخراج شهادة فحص طبي فئة ${medicalClass} من طبيب فحص طيران معتمد لدى الهيئة.`,
    `٢. تقديم طلب التحقق من صحة الرخصة الأجنبية من سلطة (${exp.originAuthority}) مباشرة إلى GACA.`,
    `٣. التسجيل عبر بوابة الخدمات الإلكترونية للهيئة ومذاكرة لوائح GACAR 91 و AIP عبر Fly GACA وكابتن عادل.`,
    `٤. اجتياز اختبار الأنظمة والقوانين السعودية (Air Law) المحوسب.`,
    `٥. إتمام اختبار المهارة العملي مع ممتحن طيران معتمد من الهيئة (DPE).`,
    `٦. استلام رخصة الطيران المدني السعودي (GACA) المعتمدة.`,
  ];

  return {
    eligibleForDirectConversion,
    minimumTotalHoursReq: reqHours.total,
    medicalClassRequired: medicalClass,
    requirements,
    deficits,
    recommendedStepsEn,
    recommendedStepsAr,
  };
}
