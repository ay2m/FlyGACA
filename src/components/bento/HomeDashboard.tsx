import { useTranslation } from 'react-i18next';
import { BentoGrid } from './BentoGrid';
import { AdelFeatureWidget } from './widgets/AdelFeatureWidget';
import { SearchFeatureWidget } from './widgets/SearchFeatureWidget';
import { RadarWidget } from './widgets/RadarWidget';
import { RegStreamWidget } from './widgets/RegStreamWidget';
import { ComplianceWidget } from './widgets/ComplianceWidget';
import { ToolsWidget } from './widgets/ToolsWidget';
import { LearnWidget } from './widgets/LearnWidget';
import styles from './HomeDashboard.module.css';

/**
 * The bento dashboard for the home page. Bundled as its own lazy chunk (with
 * framer-motion) so the home hero paints without the motion runtime on the
 * critical path; the grid then streams in and runs its staggered kinetic entry.
 */
export default function HomeDashboard() {
  const { t } = useTranslation();
  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        {/* The region's real heading (h1 hero → h2 here → h3 tiles), styled as
            the quiet eyebrow label — .eyebrow undoes the global h2 bolding. */}
        <h2 className={styles.eyebrow}>{t('home.dashboard.overview')}</h2>
        <span className={styles.rule} aria-hidden="true" />
      </header>
      <BentoGrid label={t('home.dashboard.region')}>
        <AdelFeatureWidget />
        <SearchFeatureWidget />
        <RadarWidget />
        <RegStreamWidget />
        <ComplianceWidget />
        <ToolsWidget />
        <LearnWidget />
      </BentoGrid>
    </div>
  );
}
