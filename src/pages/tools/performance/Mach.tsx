import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { machFromTas, tasFromMach } from '@/calc/speed';
import { GaugeDial } from '@/components/calc/GaugeDial';
import seg from '@/components/calc/calc.module.css';

export function Mach() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ mode: 'tas', val: '', oat: '' });
  const toMach = inputs.mode !== 'mach';
  const oat = nums.oat;
  const val = nums.val;
  const r = toMach ? machFromTas(val, oat) : tasFromMach(val, oat);

  return (
    <CalcShell
      title={t('tools.items.mach.name')}
      intro={t('tools.items.mach.blurb')}
      category={t('tools.categories.performance')}
      toolId="mach"
      formula={t('mach.formula')}
      onExample={() => {
        set('mode', 'tas');
        set('val', '480');
        set('oat', '-45');
      }}
      adelPrompt={() =>
        r != null
          ? `At OAT ${inputs.oat}°C the speed of sound is ${r.lss.toFixed(0)} kt; ${r.tas.toFixed(0)} kt TAS is Mach ${r.mach.toFixed(3)}. Why does Mach matter more than TAS at altitude?`
          : null
      }
      related={[{ to: '/tools/tas', label: t('tools.items.tas.name') }]}
    >
      <div className={seg.seg} role="group" aria-label={t('mach.convert')}>
        <button
          type="button"
          className={`${seg.segBtn} ${toMach ? seg.segActive : ''}`}
          onClick={() => set('mode', 'tas')}
        >
          {t('mach.toMach')}
        </button>
        <button
          type="button"
          className={`${seg.segBtn} ${!toMach ? seg.segActive : ''}`}
          onClick={() => set('mode', 'mach')}
        >
          {t('mach.toTas')}
        </button>
      </div>

      <FieldGrid>
        <NumberField
          label={toMach ? t('mach.tas') : t('mach.mach')}
          value={inputs.val}
          onChange={(v) => set('val', v)}
          unit={toMach ? 'kt' : 'M'}
          placeholder={toMach ? '480' : '0.78'}
        />
        <NumberField
          label={t('mach.oat')}
          value={inputs.oat}
          onChange={(v) => set('oat', v)}
          unit="°C"
          placeholder="-45"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={toMach ? t('mach.outMach') : t('mach.outTas')}
          value={r != null ? (toMach ? `M ${r.mach.toFixed(3)}` : `${Math.round(r.tas)} kt`) : '—'}
          tone="headline"
        />
        <ResultStat label={t('mach.lss')} value={r != null ? `${r.lss.toFixed(0)} kt` : '—'} />
      </OutputGrid>
      {r != null && (
        <GaugeDial label={t('mach.mach')} value={r.mach} min={0} max={1} unit="M" decimals={2} />
      )}
    </CalcShell>
  );
}
