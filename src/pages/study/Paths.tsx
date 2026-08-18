import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { PathsIndex } from '@/lib/content';
import { linkHref } from '@/lib/contentLinks';
import { useStudyProgress, togglePathStep } from '@/lib/studyProgress';
import { usePageMeta } from '@/hooks/usePageMeta';
import { courseLd } from '@/lib/seo/jsonld';
import { ProgressBar } from '@/components/ProgressBar';
import { Disclaimer } from '@/components/Disclaimer';
import { HubBackLink } from '@/components/HubBackLink';
import styles from './Paths.module.css';

export function Paths() {
  const { t, i18n } = useTranslation();
  usePageMeta(
    t('meta.paths'),
    t('metaDesc.paths'),
    courseLd({
      title: t('meta.paths'),
      description: t('metaDesc.paths'),
      path: '/study/paths',
      lang: i18n.language,
    }),
  );
  const { data, error, loading } = useFetchJson<PathsIndex>('/data/paths-index.json');
  const { pathDone } = useStudyProgress();

  return (
    <section className={`container ${styles.page}`}>
      <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
      <header className={styles.head}>
        <h1>{t('study.paths')}</h1>
        <p className={styles.subtitle}>{t('study.pathsDesc')}</p>
      </header>
      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data?.paths.map((p) => {
        const done = new Set(pathDone[p.id] ?? []);
        const pct = p.steps.length ? Math.round((done.size / p.steps.length) * 100) : 0;
        return (
          <section key={p.id} className={styles.path}>
            <h2>{p.title}</h2>
            <p className={styles.desc}>{p.desc}</p>
            <div className={styles.pathProgress}>
              <ProgressBar percent={pct} label={p.title} />
              <span className={styles.pathProgressLabel}>
                {t('study.pathProgress', { done: done.size, total: p.steps.length })}
              </span>
            </div>
            <ol className={styles.steps}>
              {p.steps.map((s, i) => {
                const href = linkHref(s);
                const isDone = done.has(i);
                return (
                  <li key={i} className={`${styles.step} ${isDone ? styles.stepDone : ''}`}>
                    <button
                      type="button"
                      className={styles.check}
                      role="checkbox"
                      aria-checked={isDone}
                      aria-label={s.label}
                      onClick={() => togglePathStep(p.id, i)}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <div className={styles.stepBody}>
                      <span className={styles.stepLabel}>{s.label}</span>
                      {s.note && <span className={styles.stepNote}>{s.note}</span>}
                    </div>
                    {href && (
                      <Link to={href} className={styles.open}>
                        {t('study.pathOpen')}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <Disclaimer compact />
    </section>
  );
}
