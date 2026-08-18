import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { useFetchJson } from '@/hooks/useFetchJson';
import { CORPUS, type GacarIndex } from '@/lib/content';
import { StatValue } from './StatValue';
import { StatusPill } from '@/components/StatusPill';
import { CardCta } from './CardCta';
import shared from './widgets.module.css';

/** GACAR regulatory stream — live count of Parts and category streams. */
export function RegStreamWidget() {
  const { t } = useTranslation();
  const headingId = useId();
  const { data, loading } = useFetchJson<GacarIndex>(CORPUS.regulations.index);

  return (
    <BentoCard span="md" tone="cyan" to="/library" labelledBy={headingId}>
      <StatusPill tone="live" pulse>
        {t('home.dashboard.reg.live')}
      </StatusPill>
      <h3 id={headingId} className={shared.heading}>
        {t('home.dashboard.reg.heading')}
      </h3>
      {loading || !data ? (
        <div className={shared.skeleton} />
      ) : (
        <div className={shared.statRow}>
          <StatValue value={data.count} className={`${shared.stat} ${shared.statCyan}`} />
          <span className={shared.unit}>
            {t('home.dashboard.reg.streams', { count: data.categories.length })}
          </span>
        </div>
      )}
      <CardCta label={t('home.dashboard.reg.cta')} />
    </BentoCard>
  );
}
