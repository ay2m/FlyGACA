import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { holdTiming, holdingEntry } from '@/calc/holding';
import seg from '@/components/calc/calc.module.css';
import { HoldingDiagram } from './HoldingDiagram';

export function Holding() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({
    inbound: '',
    heading: '',
    turns: 'right',
    leg: '1',
    burn: '',
    laps: '1',
  });
  const right = inputs.turns !== 'left';
  const entry = holdingEntry(nums.inbound, nums.heading, right);
  const timing = holdTiming(nums.leg, nums.burn, nums.laps);

  return (
    <CalcShell
      title={t('tools.items.holding.name')}
      intro={t('tools.items.holding.blurb')}
      category={t('tools.categories.procedures')}
      toolId="holding"
      formula={t('holding.formula')}
      onExample={() => {
        set('inbound', '270');
        set('heading', '110');
        set('turns', 'right');
        set('leg', '1');
        set('burn', '600');
        set('laps', '2');
      }}
      adelPrompt={() =>
        entry != null
          ? `For a ${right ? 'right' : 'left'}-hand hold with inbound course ${inputs.inbound}° arriving heading ${inputs.heading}°, the entry is ${entry}. Walk me through flying a ${entry} entry.`
          : null
      }
      related={[
        { to: '/tools/standard-rate-turn', label: t('tools.items.standard-rate-turn.name') },
      ]}
    >
      <div className={seg.seg} role="group" aria-label={t('holding.turns')}>
        <button
          type="button"
          className={`${seg.segBtn} ${right ? seg.segActive : ''}`}
          onClick={() => set('turns', 'right')}
        >
          {t('holding.right')}
        </button>
        <button
          type="button"
          className={`${seg.segBtn} ${!right ? seg.segActive : ''}`}
          onClick={() => set('turns', 'left')}
        >
          {t('holding.left')}
        </button>
      </div>
      <FieldGrid>
        <NumberField
          label={t('holding.inbound')}
          value={inputs.inbound}
          onChange={(v) => set('inbound', v)}
          unit="°"
          placeholder="270"
        />
        <NumberField
          label={t('holding.heading')}
          value={inputs.heading}
          onChange={(v) => set('heading', v)}
          unit="°"
          placeholder="110"
        />
        <NumberField
          label={t('holding.legMin')}
          value={inputs.leg}
          onChange={(v) => set('leg', v)}
          unit="min"
          placeholder="1"
        />
        <NumberField
          label={t('holding.burn')}
          value={inputs.burn}
          onChange={(v) => set('burn', v)}
          placeholder="600"
        />
        <NumberField
          label={t('holding.laps')}
          value={inputs.laps}
          onChange={(v) => set('laps', v)}
          placeholder="2"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('holding.entry')}
          value={entry != null ? t(`holding.${entry}`) : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('holding.lapMin')}
          value={timing != null ? `${timing.lapMin} min` : '—'}
        />
        <ResultStat
          label={t('holding.totalMin')}
          value={timing != null ? `${timing.totalMin} min` : '—'}
        />
        <ResultStat
          label={t('holding.fuel')}
          value={timing?.fuel != null ? `${Math.round(timing.fuel)}` : '—'}
        />
      </OutputGrid>
      {entry != null && (
        <HoldingDiagram inboundDeg={nums.inbound} entry={entry} rightTurns={right} />
      )}
    </CalcShell>
  );
}
