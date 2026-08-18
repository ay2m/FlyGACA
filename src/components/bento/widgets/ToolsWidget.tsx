import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { TOOLS } from '@/lib/tools';
import { CardCta } from './CardCta';
import shared from './widgets.module.css';

const QUICK = ['crosswind', 'tas', 'density-altitude'];

// The flight-tools registry is the single source of truth the /tools hub also
// counts from — read it directly so the dashboard stat never drifts from the
// real catalog (the public/data/tools.json manifest is only a partial subset).
const LIVE_COUNT = TOOLS.filter((tool) => tool.status === 'live').length;

/** Flight-planning tools — live calculator count + quick chips. */
export function ToolsWidget() {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <BentoCard span="md" tone="default" to="/tools" labelledBy={headingId}>
      <p className={shared.eyebrow}>{t('home.dashboard.tools.eyebrow')}</p>
      <h3 id={headingId} className={shared.heading}>
        {t('home.dashboard.tools.heading')}
      </h3>
      <div className={shared.statRow}>
        <span className={shared.statSecondary}>{LIVE_COUNT}</span>
        <span className={shared.unit}>{t('home.dashboard.tools.live')}</span>
      </div>
      <div className={shared.chips}>
        {QUICK.map((id) => (
          <span key={id} className={shared.chip}>
            {t(`tools.items.${id}.name`)}
          </span>
        ))}
      </div>
      <CardCta label={t('home.dashboard.tools.cta')} />
    </BentoCard>
  );
}
