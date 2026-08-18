import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { convertAll, UNIT_TABLES, type UnitCategory } from '@/calc/units';
import seg from '@/components/calc/calc.module.css';

const CATEGORIES = Object.keys(UNIT_TABLES) as UnitCategory[];

const fmt = (n: number) => {
  const abs = Math.abs(n);
  return abs !== 0 && (abs < 0.01 || abs >= 1e6)
    ? n.toExponential(3)
    : Number(n.toFixed(3)).toString();
};

export function Units() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ cat: 'speed', from: '', val: '' });
  const cat = (CATEGORIES as string[]).includes(inputs.cat)
    ? (inputs.cat as UnitCategory)
    : 'speed';
  const units = UNIT_TABLES[cat];
  const from = units.some((u) => u.id === inputs.from) ? inputs.from : units[0].id;
  const result = convertAll(nums.val, from, cat);

  return (
    <CalcShell
      title={t('tools.items.units.name')}
      intro={t('tools.items.units.blurb')}
      category={t('tools.categories.reference')}
      formula={t('unitsTool.formula')}
      onExample={() => {
        set('cat', 'speed');
        set('from', 'kt');
        set('val', '120');
      }}
    >
      <div className={seg.seg} role="group" style={{ flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`${seg.segBtn} ${cat === c ? seg.segActive : ''}`}
            onClick={() => set('cat', c)}
          >
            {t(`unitsTool.cat.${c}`)}
          </button>
        ))}
      </div>
      <FieldGrid>
        <NumberField
          label={t('unitsTool.value')}
          value={inputs.val}
          onChange={(v) => set('val', v)}
          placeholder="120"
        />
      </FieldGrid>
      <div
        className={seg.seg}
        role="group"
        aria-label={t('unitsTool.from')}
        style={{ flexWrap: 'wrap' }}
      >
        {units.map((u) => (
          <button
            key={u.id}
            type="button"
            className={`${seg.segBtn} ${from === u.id ? seg.segActive : ''}`}
            onClick={() => set('from', u.id)}
          >
            {u.id}
          </button>
        ))}
      </div>
      <OutputGrid>
        {units.map((u) => (
          <ResultStat
            key={u.id}
            label={u.id}
            value={result ? fmt(result[u.id]) : '—'}
            tone={u.id === from ? 'headline' : undefined}
          />
        ))}
      </OutputGrid>
    </CalcShell>
  );
}
