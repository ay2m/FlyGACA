import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { useFetchJson } from '@/hooks/useFetchJson';
import { type QuizData } from '@/lib/content';
import { GUIDE_SLUGS } from '@/pages/guides/guides';
import { CardCta } from './CardCta';
import shared from './widgets.module.css';

const FEATURED = ['saudi-ppl-requirements', 'airspace-explained', 'reading-metar-taf'];

/** Learn — the merged Guides + Study entry: explainer guides and practice in one
 *  hub. Surfaces the guide count, the question-bank size, and a few featured
 *  guides. `span="full"` closes out the grid as a complete final row. */
export function LearnWidget() {
  const { t } = useTranslation();
  const headingId = useId();
  const { data, loading } = useFetchJson<QuizData>('/data/quiz.json');
  const questions = data?.banks.reduce((sum, bank) => sum + bank.questions.length, 0) ?? 0;

  return (
    <BentoCard span="full" tone="cyan" to="/learn" labelledBy={headingId}>
      <p className={shared.eyebrow}>{t('home.dashboard.learn.eyebrow')}</p>
      <h3 id={headingId} className={shared.heading}>
        {t('home.dashboard.learn.heading')}
      </h3>
      <div className={shared.statRow}>
        <span className={shared.statSecondary}>{GUIDE_SLUGS.length}</span>
        <span className={shared.unit}>{t('home.dashboard.learn.guides')}</span>
        {loading || !data ? (
          <span className={`${shared.skeleton} ${shared.skeletonInline}`} />
        ) : (
          <>
            <span className={shared.statSecondary}>{questions}</span>
            <span className={shared.unit}>{t('home.dashboard.learn.questions')}</span>
          </>
        )}
      </div>
      <div className={shared.chips}>
        {FEATURED.map((slug) => (
          <span key={slug} className={shared.chip}>
            {t(`guides.items.${slug}.name`)}
          </span>
        ))}
      </div>
      <CardCta label={t('home.dashboard.learn.cta')} />
    </BentoCard>
  );
}
