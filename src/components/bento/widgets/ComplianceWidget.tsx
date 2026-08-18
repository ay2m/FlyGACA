import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { useFetchJson } from '@/hooks/useFetchJson';
import { CORPUS, type CorpusIndex } from '@/lib/content';
import { CardCta } from './CardCta';
import shared from './widgets.module.css';

/** Reference library — GACA guidance, FAA/ICAO and safety material, reproduced for study. */
export function ComplianceWidget() {
  const { t } = useTranslation();
  const headingId = useId();
  const { data, loading } = useFetchJson<CorpusIndex>(CORPUS.reference.index);

  return (
    <BentoCard span="md" tone="default" to="/library" labelledBy={headingId}>
      <p className={shared.eyebrow}>{t('home.dashboard.compliance.eyebrow')}</p>
      <h3 id={headingId} className={shared.heading}>
        {t('home.dashboard.compliance.heading')}
      </h3>
      {loading || !data ? (
        <div className={shared.skeleton} />
      ) : (
        <div className={shared.statRow}>
          <span className={shared.statSecondary}>{data.count}</span>
          <span className={shared.unit}>
            {t('home.dashboard.compliance.docs', { count: data.categories.length })}
          </span>
        </div>
      )}
      <CardCta label={t('home.dashboard.compliance.cta')} />
    </BentoCard>
  );
}
