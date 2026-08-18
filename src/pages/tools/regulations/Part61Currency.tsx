import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { formatDate, parseISO, recencyByDays } from '@/calc/recency';

export function Part61Currency() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ last: '', window: '90' });
  const v = recencyByDays(parseISO(inputs.last), nums.window);

  return (
    <CalcShell
      title={t('tools.items.part61-currency.name')}
      intro={t('tools.items.part61-currency.blurb')}
      category={t('tools.categories.regulations')}
      formula={t('part61Currency.formula')}
      onExample={() => {
        set('last', '2024-01-15');
        set('window', '90');
      }}
      related={[{ to: '/tools/flight-review', label: t('tools.items.flight-review.name') }]}
    >
      <FieldGrid>
        <TextField
          label={t('part61Currency.lastDate')}
          value={inputs.last}
          onChange={(value) => set('last', value)}
          placeholder="2024-01-15"
        />
        <NumberField
          label={t('part61Currency.window')}
          value={inputs.window}
          onChange={(value) => set('window', value)}
          unit="d"
          placeholder="90"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('part61Currency.expiry')}
          value={v != null ? formatDate(v.expiry) : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('validity.daysLeft')}
          value={v != null ? `${v.daysLeft}` : '—'}
          sub={v != null ? (v.current ? t('validity.current') : t('validity.expired')) : undefined}
          tone={v != null ? (v.current ? 'good' : 'bad') : undefined}
        />
      </OutputGrid>
    </CalcShell>
  );
}
