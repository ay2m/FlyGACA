import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import { fmtInt } from '@/components/calc/format';
import styles from './RunwayMarginBar.module.css';

/**
 * Horizontal runway-margin bar for the take-off/landing tool: the available
 * runway drawn as a slab, with the factored required distance filling from the
 * threshold (the one focal loop — the fill glides to its new width as the
 * numbers change). When the requirement overruns the runway the fill runs past
 * the end in the danger tone, so "short" reads instantly against the stat cards.
 */
interface RunwayMarginBarProps {
  requiredM: number;
  availableM: number;
  ok: boolean;
}

export function RunwayMarginBar({ requiredM, availableM, ok }: RunwayMarginBarProps) {
  const { t } = useTranslation();
  const total = Math.max(requiredM, availableM, 1);
  const requiredPct = Math.min((requiredM / total) * 100, 100);
  const availablePct = Math.min((availableM / total) * 100, 100);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="img"
        aria-label={t('runwayBar.aria', {
          required: fmtInt(requiredM),
          available: fmtInt(availableM),
        })}
      >
        <div className={styles.runway} style={{ '--w': `${availablePct}%` } as CSSProperties} />
        <div
          className={`${styles.required} ${ok ? styles.ok : styles.short}`}
          style={{ '--w': `${requiredPct}%` } as CSSProperties}
        />
        <div className={styles.threshold} style={{ '--at': `${availablePct}%` } as CSSProperties} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legReq}>{t('runwayBar.required')}</span>
        <span className={styles.legAvail}>{t('runwayBar.available')}</span>
      </div>
    </div>
  );
}
