import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { sunTimes, daylight } from '@/calc/sun';
import { SunArc } from '@/components/SunArc';
import { formatHm, shiftTime, KSA_OFFSET_MIN } from '@/calc/zulu';
import { parseISO } from '@/calc/recency';

const todayIso = () => new Date().toISOString().slice(0, 10);

export function SunTimes() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ lat: '', lon: '', date: '' });
  const dateStr = parseISO(inputs.date) ? inputs.date : todayIso();
  const when = new Date(`${dateStr}T12:00:00Z`);
  const r = sunTimes(when, nums.lat, nums.lon);
  // A live sun marker only makes sense for today; other dates show a static arc.
  const progress = dateStr === todayIso() && r ? daylight(r, new Date()).progress : null;

  function pair(d: Date | null): { utc: string; ksa: string } {
    if (!d) return { utc: t('sunTimes.noEvent'), ksa: '' };
    const uh = d.getUTCHours();
    const um = d.getUTCMinutes();
    const k = shiftTime(uh, um, KSA_OFFSET_MIN);
    return {
      utc: `${formatHm(uh, um)} ${t('sunTimes.utc')}`,
      ksa: k ? `${formatHm(k.hh, k.mm)} ${t('sunTimes.localKsa')}` : '',
    };
  }

  const rise = pair(r?.sunrise ?? null);
  const setT = pair(r?.sunset ?? null);
  const dawn = pair(r?.civilDawn ?? null);
  const dusk = pair(r?.civilDusk ?? null);

  return (
    <CalcShell
      title={t('tools.items.sun-times.name')}
      intro={t('tools.items.sun-times.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('sunTimes.formula')}
      onExample={() => {
        set('lat', '24.71');
        set('lon', '46.68');
        set('date', todayIso());
      }}
      related={[{ to: '/tools/zulu-clock', label: t('tools.items.zulu-clock.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('sunTimes.lat')}
          value={inputs.lat}
          onChange={(v) => set('lat', v)}
          unit="°"
          placeholder="24.71"
        />
        <NumberField
          label={t('sunTimes.lon')}
          value={inputs.lon}
          onChange={(v) => set('lon', v)}
          unit="°"
          placeholder="46.68"
        />
        <TextField
          label={t('sunTimes.date')}
          value={inputs.date}
          onChange={(v) => set('date', v)}
          placeholder={todayIso()}
          hint={t('sunTimes.hint')}
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('sunTimes.sunrise')}
          value={r ? rise.utc : '—'}
          sub={r ? rise.ksa : undefined}
          tone="headline"
        />
        <ResultStat
          label={t('sunTimes.sunset')}
          value={r ? setT.utc : '—'}
          sub={r ? setT.ksa : undefined}
          tone="headline"
        />
        <ResultStat
          label={t('sunTimes.dawn')}
          value={r ? dawn.utc : '—'}
          sub={r ? dawn.ksa : undefined}
        />
        <ResultStat
          label={t('sunTimes.dusk')}
          value={r ? dusk.utc : '—'}
          sub={r ? dusk.ksa : undefined}
        />
      </OutputGrid>
      {r && <SunArc progress={progress} label={t('sunTimes.arcAria')} />}
    </CalcShell>
  );
}
