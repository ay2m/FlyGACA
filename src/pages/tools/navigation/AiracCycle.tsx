import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import { airacCycle, cycleProgress } from '@/calc/airac';
import { AiracRing } from '@/components/AiracRing';
import { parseISO } from '@/calc/recency';

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export function AiracCycle() {
  const { t, i18n } = useTranslation();
  const [inputs, set] = useUrlState({ date: '' });
  const when = parseISO(inputs.date) ?? new Date();
  const c = airacCycle(when);
  const prog = cycleProgress(when);
  const locale = i18n.language === 'ar' ? 'ar' : 'en-GB';
  const longDate = (d: Date) =>
    d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <CalcShell
      title={t('tools.items.airac.name')}
      intro={t('tools.items.airac.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('airac.formula')}
      onExample={() => set('date', fmtDate(new Date()))}
      related={[{ to: '/tools/zulu-clock', label: t('tools.items.zulu-clock.name') }]}
    >
      <FieldGrid>
        <TextField
          label={t('airac.date')}
          value={inputs.date}
          onChange={(v) => set('date', v)}
          placeholder={fmtDate(new Date())}
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat label={t('airac.current')} value={c.id} tone="headline" />
        <ResultStat label={t('airac.effective')} value={longDate(c.effective)} />
        <ResultStat label={t('airac.next')} value={`${c.nextId} · ${longDate(c.next)}`} />
        <ResultStat label={t('airac.daysToNext')} value={`${c.daysToNext}`} />
      </OutputGrid>
      <AiracRing
        id={c.id}
        dayInCycle={prog.dayInCycle}
        fraction={prog.fraction}
        label={t('airac.ringAria', { id: c.id, day: prog.dayInCycle })}
      />
    </CalcShell>
  );
}
