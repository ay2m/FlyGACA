import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { OutputGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import { formatNotamTime, parseNotam } from '@/calc/notam';

const EXAMPLE =
  'A1234/24 NOTAMN Q) OERR/QMRLC/IV/NBO/A/000/999/2446N04643E005 A) OERK B) 2406010600 C) 2406011800 E) RWY 15L/33R CLSD DUE WIP';

export function Notam() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ raw: '' });
  const has = inputs.raw.trim().length > 0;
  const r = parseNotam(inputs.raw);

  const abbr = t('notam.abbr', { returnObjects: true }) as unknown as Record<string, string>;
  const found = r.text
    ? [
        ...new Set(
          r.text
            .toUpperCase()
            .split(/[^A-Z/]+/)
            .filter((w) => abbr[w]),
        ),
      ]
    : [];

  return (
    <CalcShell
      title={t('tools.items.notam.name')}
      intro={t('tools.items.notam.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('notam.qnote')}
      onExample={() => set('raw', EXAMPLE)}
      related={[{ to: '/tools/metar', label: t('tools.items.metar.name') }]}
    >
      <TextField
        label={t('notam.paste')}
        value={inputs.raw}
        onChange={(v) => set('raw', v)}
        placeholder={EXAMPLE}
      />
      {has && (
        <>
          <OutputGrid>
            <ResultStat label={t('notam.id')} value={r.id ?? '—'} tone="headline" />
            <ResultStat label={t('notam.aerodrome')} value={r.aerodrome ?? '—'} />
            <ResultStat label={t('notam.from')} value={formatNotamTime(r.from) ?? '—'} />
            <ResultStat label={t('notam.to')} value={formatNotamTime(r.to) ?? '—'} />
            <ResultStat label={t('notam.qcode')} value={r.qcode ?? '—'} />
          </OutputGrid>
          {r.text && (
            <p style={{ color: 'var(--text)', margin: 0 }}>
              <strong>{t('notam.text')}:</strong> {r.text}
            </p>
          )}
          {found.length > 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
              <strong>{t('notam.glossary')}:</strong>{' '}
              {found.map((w) => `${w} = ${abbr[w]}`).join(' · ')}
            </p>
          )}
        </>
      )}
    </CalcShell>
  );
}
