import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import { formatHm, ksaToUtc, utcToKsa } from '@/calc/zulu';
import { ZuluDial } from '@/components/ZuluDial';
import seg from '@/components/calc/calc.module.css';

export function ZuluClock() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ mode: 'utc', hh: '', mm: '' });
  const toKsa = inputs.mode !== 'ksa';
  const hh = parseInt(inputs.hh, 10);
  const mm = inputs.mm === '' ? 0 : parseInt(inputs.mm, 10);
  const r = toKsa ? utcToKsa(hh, mm) : ksaToUtc(hh, mm);

  const dayNote =
    r == null || r.dayOffset === 0 ? '' : r.dayOffset > 0 ? t('zulu.nextDay') : t('zulu.prevDay');

  return (
    <CalcShell
      title={t('tools.items.zulu-clock.name')}
      intro={t('tools.items.zulu-clock.blurb')}
      category={t('tools.categories.navigation')}
      toolId="zulu-clock"
      formula={t('zulu.formula')}
      onExample={() => {
        set('mode', 'utc');
        set('hh', '23');
        set('mm', '30');
      }}
      related={[{ to: '/tools/airac', label: t('tools.items.airac.name') }]}
    >
      <ZuluDial />
      <div className={seg.seg} role="group" aria-label={t('zulu.convert')}>
        <button
          type="button"
          className={`${seg.segBtn} ${toKsa ? seg.segActive : ''}`}
          onClick={() => set('mode', 'utc')}
        >
          {t('zulu.utcToKsa')}
        </button>
        <button
          type="button"
          className={`${seg.segBtn} ${!toKsa ? seg.segActive : ''}`}
          onClick={() => set('mode', 'ksa')}
        >
          {t('zulu.ksaToUtc')}
        </button>
      </div>
      <FieldGrid>
        <NumberField
          label={t('zulu.hours')}
          value={inputs.hh}
          onChange={(v) => set('hh', v)}
          placeholder="23"
        />
        <NumberField
          label={t('zulu.minutes')}
          value={inputs.mm}
          onChange={(v) => set('mm', v)}
          placeholder="30"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('zulu.result')}
          value={r != null ? formatHm(r.hh, r.mm) : '—'}
          sub={dayNote || undefined}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
