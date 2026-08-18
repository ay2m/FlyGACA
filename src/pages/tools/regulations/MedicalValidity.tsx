import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { formatDate, parseISO, validityByMonths } from '@/calc/recency';

export function MedicalValidity() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ issue: '', months: '12' });
  const v = validityByMonths(parseISO(inputs.issue), nums.months);

  return (
    <CalcShell
      title={t('tools.items.medical-validity.name')}
      intro={t('tools.items.medical-validity.blurb')}
      category={t('tools.categories.regulations')}
      formula={t('medicalValidity.formula')}
      onExample={() => {
        set('issue', '2024-03-01');
        set('months', '12');
      }}
      related={[{ to: '/tools/part61-currency', label: t('tools.items.part61-currency.name') }]}
    >
      <FieldGrid>
        <TextField
          label={t('medicalValidity.issueDate')}
          value={inputs.issue}
          onChange={(value) => set('issue', value)}
          placeholder="2024-03-01"
        />
        <NumberField
          label={t('medicalValidity.months')}
          value={inputs.months}
          onChange={(value) => set('months', value)}
          unit="mo"
          placeholder="12"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('medicalValidity.expiry')}
          value={v != null ? formatDate(v.expiry) : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('validity.daysLeft')}
          value={v != null ? `${v.daysLeft}` : '—'}
          sub={v != null ? (v.current ? t('validity.valid') : t('validity.expired')) : undefined}
          tone={v != null ? (v.current ? 'good' : 'bad') : undefined}
        />
      </OutputGrid>
    </CalcShell>
  );
}
