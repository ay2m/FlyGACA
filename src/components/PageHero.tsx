import type { ReactNode } from 'react';
import band from './heroBand.module.css';
import styles from './PageHero.module.css';

interface PageHeroProps {
  /** Uppercase kicker above the title. */
  eyebrow: string;
  title: string;
  subtitle: string;
  /**
   * `split` (default) puts the text and `media` side-by-side and stacks on mobile;
   * `center` is a centered column with no media (e.g. the Pricing header).
   */
  align?: 'split' | 'center';
  /** Inline-end media slot (e.g. a `<CaptainAvatar />`). Ignored visually in `center`. */
  media?: ReactNode;
  /** Extra content rendered under the subtitle (e.g. a billing toggle). */
  children?: ReactNode;
}

/**
 * The shared content-page hero — the signature falcon-stroke band with a sage glow
 * and gold underline, mirroring the hubs' `SearchHero`. Purely presentational;
 * consumed by the About / Schools / Pricing pages.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  align = 'split',
  media,
  children,
}: PageHeroProps) {
  return (
    <header className={`${band.band} ${styles.hero} ${align === 'center' ? styles.center : ''}`}>
      <div className={band.glow} aria-hidden="true" />
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </div>
      {media && <div className={styles.media}>{media}</div>}
    </header>
  );
}
