import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { OutputGrid } from '@/components/calc/Grids';
import { ResultStat } from '@/components/calc/ResultStat';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { resolveCrosswind } from '@/calc/crosswind';
import { NumberField } from '@/components/calc/NumberField';
import { WindDiagram } from './WindDiagram';
import styles from './Crosswind.module.css';

const EXAMPLE = { rwy: '34', wdir: '290', wspd: '18' };

export function Crosswind() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ rwy: '', wdir: '', wspd: '' });

  const result = resolveCrosswind({
    runway: nums.rwy,
    windDir: nums.wdir,
    windSpeed: nums.wspd,
  });

  const side = result
    ? Math.abs(result.crosswind) < 0.5
      ? t('crosswind.negligible')
      : result.crosswind >= 0
        ? t('crosswind.fromRight')
        : t('crosswind.fromLeft')
    : '—';

  const angleNote = result
    ? result.angle === 0
      ? t('crosswind.straightDown')
      : t('crosswind.offCentreline', {
          deg: Math.round(Math.abs(result.angle)),
          side: result.angle > 0 ? t('crosswind.right') : t('crosswind.left'),
        })
    : '';

  const diagramLabel = result
    ? Math.abs(result.crosswind) < 0.5
      ? t('crosswind.diagramLabelCalm', {
          rwy: result.runwayHeading,
          dir: Math.round(nums.wdir),
          spd: Math.round(nums.wspd),
        })
      : t('crosswind.diagramLabel', {
          rwy: result.runwayHeading,
          dir: Math.round(nums.wdir),
          spd: Math.round(nums.wspd),
          xw: Math.abs(result.crosswind).toFixed(1),
          side: result.crosswind >= 0 ? t('crosswind.right') : t('crosswind.left'),
        })
    : undefined;

  const adelPrompt = () => {
    if (!result) return null;
    return (
      `Explain this crosswind computation like a flight instructor. ` +
      `Runway ${inputs.rwy} (heading ${result.runwayHeading}°), wind ${inputs.wdir}° at ${inputs.wspd} kt: ` +
      `crosswind ${Math.abs(result.crosswind).toFixed(1)} kt from the ${result.crosswind >= 0 ? 'right' : 'left'}, ` +
      `${result.headwind >= 0 ? 'headwind' : 'tailwind'} ${Math.abs(result.headwind).toFixed(1)} kt. ` +
      `How do I fly the take-off and landing in this wind, and how do I check it against my ` +
      `aircraft's demonstrated crosswind? Cite the relevant GACAR guidance if any applies.`
    );
  };

  return (
    <CalcShell
      title={t('crosswind.title')}
      intro={t('crosswind.intro')}
      category={t('tools.categories.performance')}
      formula={t('crosswind.formula')}
      onExample={() => {
        set('rwy', EXAMPLE.rwy);
        set('wdir', EXAMPLE.wdir);
        set('wspd', EXAMPLE.wspd);
      }}
      adelPrompt={adelPrompt}
      related={[
        { to: '/tools/wind-table', label: t('tools.items.wind-table.name') },
        { to: '/tools/takeoff-landing', label: t('tools.items.takeoff-landing.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
      ]}
    >
      <div className={styles.grid}>
        <div className={styles.inputs}>
          <NumberField
            label={t('crosswind.runway')}
            value={inputs.rwy}
            onChange={(v) => set('rwy', v)}
            placeholder="34"
          />
          <NumberField
            label={t('crosswind.windDir')}
            value={inputs.wdir}
            onChange={(v) => set('wdir', v)}
            placeholder="290"
          />
          <NumberField
            label={t('crosswind.windSpeed')}
            value={inputs.wspd}
            onChange={(v) => set('wspd', v)}
            placeholder="18"
          />
        </div>

        <div className={styles.diagram}>
          {result ? (
            <WindDiagram
              runwayHeading={result.runwayHeading}
              windDir={nums.wdir}
              windSpeed={nums.wspd}
              crosswind={result.crosswind}
              label={diagramLabel}
            />
          ) : (
            <p className={styles.diagramPlaceholder}>{t('crosswind.diagramHint')}</p>
          )}
        </div>
      </div>

      <OutputGrid>
        <ResultStat
          label={t('crosswind.runwayHeading')}
          value={result ? `${result.runwayHeading}°` : '—'}
        />
        <ResultStat
          label={t('crosswind.crosswind')}
          value={result ? `${Math.abs(result.crosswind).toFixed(1)} kt` : '—'}
          sub={result ? side : undefined}
          tone="headline"
        />
        <ResultStat
          label={result && result.headwind < 0 ? t('crosswind.tailwind') : t('crosswind.headwind')}
          value={result ? `${Math.abs(result.headwind).toFixed(1)} kt` : '—'}
          tone={result ? (result.headwind < 0 ? 'bad' : 'good') : undefined}
        />
        <ResultStat
          label={t('crosswind.angle')}
          value={result ? `${Math.round(Math.abs(result.angle))}°` : '—'}
        />
      </OutputGrid>
      {angleNote && <p className={styles.angleNote}>{angleNote}</p>}
    </CalcShell>
  );
}
