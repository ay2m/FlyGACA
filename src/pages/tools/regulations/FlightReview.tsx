import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { formatDate, parseISO, validityByMonths } from '@/calc/recency';

export function FlightReview() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ last: '', months: '24' });
  const v = validityByMonths(parseISO(inputs.last), nums.months);

  return (
    <CalcShell
      title={t('tools.items.flight-review.name')}
      intro={t('tools.items.flight-review.blurb')}
      category={t('tools.categories.regulations')}
      formula={t('flightReview.formula')}
      onExample={() => {
        set('last', '2023-06-01');
        set('months', '24');
      }}
      related={[{ to: '/tools/part61-currency', label: t('tools.items.part61-currency.name') }]}
    >
      <FieldGrid>
        <TextField
          label={t('flightReview.lastDate')}
          value={inputs.last}
          onChange={(value) => set('last', value)}
          placeholder="2023-06-01"
        />
        <NumberField
          label={t('flightReview.months')}
          value={inputs.months}
          onChange={(value) => set('months', value)}
          unit="mo"
          placeholder="24"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('flightReview.nextDue')}
          value={v != null ? formatDate(v.expiry) : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('validity.daysLeft')}
          value={v != null ? `${v.daysLeft}` : '—'}
          sub={v != null ? (v.current ? t('validity.inDate') : t('validity.overdue')) : undefined}
          tone={v != null ? (v.current ? 'good' : 'bad') : undefined}
        />
      </OutputGrid>
    </CalcShell>
  );
}
