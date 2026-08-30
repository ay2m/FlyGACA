import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import {
  evaluateConversion,
  type OriginAuthority,
  type TargetLicense,
  type RatingAddon,
  type PilotExperience,
} from '@/calc/conversionWizard';
import styles from './ConversionWizard.module.css';

export function ConversionWizard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';

  const [step, setStep] = useState<number>(1);
  const [originAuthority, setOriginAuthority] = useState<OriginAuthority>('FAA');
  const [targetLicense, setTargetLicense] = useState<TargetLicense>('CPL');
  const [ratingsHeld, setRatingsHeld] = useState<RatingAddon[]>(['IR', 'ME']);
  const [totalHours, setTotalHours] = useState<number>(260);
  const [picHours, setPicHours] = useState<number>(110);
  const [crossCountryHours, setCrossCountryHours] = useState<number>(55);
  const [instrumentHours, setInstrumentHours] = useState<number>(20);
  const [nightHours, setNightHours] = useState<number>(10);
  const [hasCurrentMedical, setHasCurrentMedical] = useState<boolean>(true);
  const [englishProficiencyLevel, setEnglishProficiencyLevel] = useState<number>(5);

  const exp: PilotExperience = {
    originAuthority,
    targetLicense,
    ratingsHeld,
    totalHours: Number(totalHours) || 0,
    picHours: Number(picHours) || 0,
    crossCountryHours: Number(crossCountryHours) || 0,
    instrumentHours: Number(instrumentHours) || 0,
    nightHours: Number(nightHours) || 0,
    hasCurrentMedical,
    englishProficiencyLevel: Number(englishProficiencyLevel) || 4,
  };

  const evalResult = evaluateConversion(exp);

  const toggleRating = (r: RatingAddon) => {
    setRatingsHeld((prev) => (prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]));
  };

  const adelPrompt = () =>
    ar
      ? `أنا طيار أحمل رخصة ${originAuthority} وأرغب في معادلتها إلى رخصة ${targetLicense} سعودية وفق لوائح GACAR 61. ما هي المتطلبات والخطوات بالتفصيل؟`
      : `I am a pilot holding an ${originAuthority} licence and want to convert it to a Saudi GACA ${targetLicense} under GACAR Part 61. What are the detailed steps and requirements?`;

  return (
    <CalcShell
      title={t(
        'tools.items.conversion-checker.name',
        'License Conversion Wizard (Foreign to GACA)',
      )}
      intro={t(
        'conversion.confirm',
        'Interactive GACAR Part 61 foreign license validation & conversion pathway calculator.',
      )}
      category={t('tools.categories.regulations', 'Regulations')}
      toolId="conversion-checker"
      formula="GACAR Part 61.75 / Part 61.129 / Part 67"
      adelPrompt={adelPrompt}
      related={[
        {
          to: '/guides/foreign-license-conversion-to-gaca',
          label: t('guides.title', 'Conversion Guide'),
        },
        { to: '/library/gacar-61', label: 'GACAR Part 61' },
      ]}
    >
      <div className={styles.wizardContainer}>
        {/* Step Indicator Bar */}
        <nav className={styles.stepNav} aria-label="Wizard Steps">
          {[
            { id: 1, labelEn: '1. Origin & Target', labelAr: '١. جهة الإصدار والرخصة' },
            { id: 2, labelEn: '2. Flight Experience', labelAr: '٢. ساعات الطيران' },
            { id: 3, labelEn: '3. Medical & ELP', labelAr: '٣. الفحص الطبي واللغة' },
            { id: 4, labelEn: '4. Evaluation Summary', labelAr: '٤. نتيجة المطابقة' },
            { id: 5, labelEn: '5. Action Roadmap', labelAr: '٥. خطة العمل الموصى بها' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.stepBtn} ${step === s.id ? styles.stepBtnActive : ''} ${step > s.id ? styles.stepBtnCompleted : ''}`}
              onClick={() => setStep(s.id)}
            >
              {ar ? s.labelAr : s.labelEn}
            </button>
          ))}
        </nav>

        {/* Step 1: Origin & Target */}
        {step === 1 && (
          <div className={styles.stepBody}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="origin-auth">
                  {ar ? 'سلطة الطيران المصدرة للرخصة' : 'Issuing Civil Aviation Authority'}
                </label>
                <select
                  id="origin-auth"
                  className={styles.select}
                  value={originAuthority}
                  onChange={(e) => setOriginAuthority(e.target.value as OriginAuthority)}
                >
                  <option value="FAA">FAA (United States)</option>
                  <option value="EASA">EASA (European Union)</option>
                  <option value="UK_CAA">UK CAA (United Kingdom)</option>
                  <option value="ICAO_OTHER">ICAO Standard / Other Member State</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="target-lic">
                  {ar ? 'رخصة GACA المستهدفة' : 'Target GACA License'}
                </label>
                <select
                  id="target-lic"
                  className={styles.select}
                  value={targetLicense}
                  onChange={(e) => setTargetLicense(e.target.value as TargetLicense)}
                >
                  <option value="PPL">Private Pilot License (PPL)</option>
                  <option value="CPL">Commercial Pilot License (CPL)</option>
                  <option value="ATPL">Airline Transport Pilot License (ATPL)</option>
                </select>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {ar ? 'الأهليات الحالية' : 'Current Ratings Held'}
              </label>
              <div className={styles.pillsGroup}>
                {(
                  [
                    {
                      id: 'IR',
                      labelEn: 'Instrument Rating (IR)',
                      labelAr: 'أهلية طيران آلي (IR)',
                    },
                    { id: 'ME', labelEn: 'Multi-Engine (ME)', labelAr: 'متعدد المحركات (ME)' },
                    { id: 'CFI', labelEn: 'Flight Instructor (CFI)', labelAr: 'مدرّب طيران (CFI)' },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`${styles.pillToggle} ${ratingsHeld.includes(r.id) ? styles.pillToggleActive : ''}`}
                    onClick={() => toggleRating(r.id)}
                  >
                    {ar ? r.labelAr : r.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Flight Experience */}
        {step === 2 && (
          <div className={styles.stepBody}>
            <p className={styles.reqDesc}>
              {ar
                ? `الحد الأدنى المطلوب لرخصة ${targetLicense} بموجب GACAR هو ${evalResult.minimumTotalHoursReq} ساعة طيران إجمالية.`
                : `GACAR Part 61 mandates a minimum of ${evalResult.minimumTotalHoursReq} total flight hours for ${targetLicense}.`}
            </p>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="total-hrs">
                  {ar ? 'إجمالي ساعات الطيران' : 'Total Flight Hours'}
                </label>
                <input
                  id="total-hrs"
                  type="number"
                  className={styles.input}
                  value={totalHours}
                  onChange={(e) => setTotalHours(Number(e.target.value))}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="pic-hrs">
                  {ar ? 'ساعات قائد الطائرة (PIC)' : 'Pilot-in-Command (PIC) Hours'}
                </label>
                <input
                  id="pic-hrs"
                  type="number"
                  className={styles.input}
                  value={picHours}
                  onChange={(e) => setPicHours(Number(e.target.value))}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="xc-hrs">
                  {ar ? 'ساعات الملاحة الجوية (Cross-Country)' : 'Cross-Country (XC) Hours'}
                </label>
                <input
                  id="xc-hrs"
                  type="number"
                  className={styles.input}
                  value={crossCountryHours}
                  onChange={(e) => setCrossCountryHours(Number(e.target.value))}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="ifr-hrs">
                  {ar ? 'ساعات الطيران الآلي (Instrument)' : 'Actual / Simulated Instrument Hours'}
                </label>
                <input
                  id="ifr-hrs"
                  type="number"
                  className={styles.input}
                  value={instrumentHours}
                  onChange={(e) => setInstrumentHours(Number(e.target.value))}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="night-hrs">
                  {ar ? 'ساعات الطيران الليلي (Night)' : 'Night Flight Hours'}
                </label>
                <input
                  id="night-hrs"
                  type="number"
                  className={styles.input}
                  value={nightHours}
                  onChange={(e) => setNightHours(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Medical & ELP */}
        {step === 3 && (
          <div className={styles.stepBody}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="medical-status">
                  {ar ? 'الفحص الطبي (Part 67 Medical)' : 'Medical Certificate Status'}
                </label>
                <select
                  id="medical-status"
                  className={styles.select}
                  value={hasCurrentMedical ? 'yes' : 'no'}
                  onChange={(e) => setHasCurrentMedical(e.target.value === 'yes')}
                >
                  <option value="yes">
                    {ar
                      ? `أحمل شهادة طبية سارية (فئة ${evalResult.medicalClassRequired})`
                      : `Valid Class ${evalResult.medicalClassRequired} Medical Certificate`}
                  </option>
                  <option value="no">
                    {ar ? 'لا أحمل شهادة طبية سارية حالياً' : 'Expired / Not Yet Obtained'}
                  </option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="elp-level">
                  {ar
                    ? 'مستوى كفاءة اللغة الإنجليزية (ICAO ELP)'
                    : 'ICAO English Proficiency (ELP)'}
                </label>
                <select
                  id="elp-level"
                  className={styles.select}
                  value={englishProficiencyLevel}
                  onChange={(e) => setEnglishProficiencyLevel(Number(e.target.value))}
                >
                  <option value="6">
                    {ar ? 'المستوى 6 (خبير / مدى الحياة)' : 'Level 6 (Expert / Lifetime)'}
                  </option>
                  <option value="5">
                    {ar ? 'المستوى 5 (ممتد / 6 سنوات)' : 'Level 5 (Extended / 6 yrs)'}
                  </option>
                  <option value="4">
                    {ar ? 'المستوى 4 (تشغيلي / 3 سنوات)' : 'Level 4 (Operational / 3 yrs)'}
                  </option>
                  <option value="3">
                    {ar ? 'أقل من المستوى 4 (غير مؤهل للتحويل)' : 'Below Level 4 (Pre-operational)'}
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Evaluation Summary */}
        {step === 4 && (
          <div className={styles.stepBody}>
            <div className={styles.resultsCard}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                }}
              >
                <span
                  className={
                    evalResult.eligibleForDirectConversion
                      ? styles.badgeEligible
                      : styles.badgeDeficit
                  }
                >
                  {evalResult.eligibleForDirectConversion
                    ? ar
                      ? '✓ مؤهل لمعادلة الرخصة المباشرة'
                      : '✓ Eligible for Conversion Pathway'
                    : ar
                      ? '⚠ يلزم استكمال المتطلبات أدناه'
                      : '⚠ Additional Prerequisites Required'}
                </span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)' }}>
                  {originAuthority} → GACA {targetLicense}
                </span>
              </div>

              {evalResult.deficits.length > 0 && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <strong style={{ color: '#ef4444', fontSize: 'var(--fs-xs)' }}>
                    {ar ? 'النواقص المطلوب استيفاؤها:' : 'Deficits to satisfy:'}
                  </strong>
                  <ul
                    style={{
                      margin: 0,
                      paddingInlineStart: 'var(--space-4)',
                      fontSize: 'var(--fs-xs)',
                      color: 'var(--text)',
                    }}
                  >
                    {evalResult.deficits.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className={styles.reqList}>
                {evalResult.requirements.map((req) => (
                  <li key={req.id} className={styles.reqItem}>
                    <div className={styles.reqHeader}>
                      <span className={styles.reqTitle}>
                        {req.satisfied ? '✅ ' : '⏳ '}
                        {ar ? req.titleAr : req.titleEn}
                      </span>
                      <span className={styles.reqCitation}>{req.gacarCitation}</span>
                    </div>
                    <p className={styles.reqDesc}>{ar ? req.descAr : req.descEn}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Step 5: Action Roadmap */}
        {step === 5 && (
          <div className={styles.stepBody}>
            <div className={styles.resultsCard}>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-base)' }}>
                {ar
                  ? 'خطة العمل التنفيذية لمعادلة رخصتك في المملكة'
                  : 'Step-by-Step GACA Conversion Action Plan'}
              </h3>
              <ol
                style={{
                  margin: 0,
                  paddingInlineStart: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                {(ar ? evalResult.recommendedStepsAr : evalResult.recommendedStepsEn).map(
                  (st, i) => (
                    <li key={i} style={{ fontSize: 'var(--fs-sm)', lineHeight: '1.5' }}>
                      {st}
                    </li>
                  ),
                )}
              </ol>
            </div>
          </div>
        )}

        {/* Step Navigation Buttons */}
        <div className={styles.navRow}>
          {step > 1 ? (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setStep((s) => s - 1)}
            >
              ← {ar ? 'السابق' : 'Previous'}
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setStep((s) => s + 1)}
            >
              {ar ? 'التالي' : 'Next'} →
            </button>
          ) : (
            <button type="button" className={styles.btnPrimary} onClick={() => setStep(1)}>
              {ar ? 'إعادة ضبط' : 'Start Over'} ↺
            </button>
          )}
        </div>
      </div>
    </CalcShell>
  );
}
