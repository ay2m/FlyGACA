import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useStudyProgress } from '@/lib/studyProgress';
import { ProgressBar } from '@/components/ProgressBar';
import type { CorpusIndex, GroundSchoolData, PathsIndex, PdfsIndex, QuizBank } from '@/lib/content';
import styles from './Study.module.css';

/** The unlocked pack's five content sections: banks, reading, modules, paths, sheets. */
export function PackContents({
  banks,
  reading,
  modules,
  readingPaths,
  sheets,
}: {
  banks: QuizBank[];
  reading: CorpusIndex['documents'];
  modules: GroundSchoolData['modules'];
  readingPaths: PathsIndex['paths'];
  sheets: PdfsIndex['documents'];
}) {
  const { t } = useTranslation();
  const { quizBest, flagged } = useStudyProgress();
  return (
    <>
      {banks.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.packInside')}</h2>
          <ul className={styles.packCards}>
            {banks.map((b) => {
              const best = quizBest[b.id];
              const bankFlags = flagged[b.id]?.length ?? 0;
              return (
                <li key={b.id} className={styles.packCard}>
                  <div className={styles.packCardHead}>
                    <span className={styles.bankTitle}>{b.title}</span>
                    <span className={styles.packCardMeta}>
                      <span>{t('study.questions', { n: b.questions.length })}</span>
                      {best != null && (
                        <span className={styles.packCardBest}>
                          {t('study.best', { pct: best })}
                        </span>
                      )}
                    </span>
                  </div>
                  {best != null && (
                    <div className={styles.packCardBar}>
                      <ProgressBar percent={best} label={b.title} />
                    </div>
                  )}
                  <span className={styles.packActions}>
                    <Link to={`/study/quiz?bank=${b.id}`} className={styles.packChip}>
                      {t('study.quiz')}
                    </Link>
                    <Link to={`/study/flashcards?bank=${b.id}`} className={styles.packChip}>
                      {t('study.flashcards')}
                    </Link>
                  </span>
                  {bankFlags > 0 && (
                    <Link to="/study/quiz?review=flagged" className={styles.packFlagChip}>
                      ★ {t('study.reviewFlagged', { n: bankFlags })}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reading.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.packReading')}</h2>
          <p className={styles.subtitle}>{t('study.packReadingDesc')}</p>
          <ul className={styles.readingList}>
            {reading.map((d) => (
              <li key={d.slug}>
                <Link to={`/library/reference/${d.slug}`} className={styles.readingRow}>
                  {d.badge && <span className={styles.readingBadge}>{d.badge}</span>}
                  <span className={styles.readingMain}>
                    <span className={styles.readingTitle}>{d.title}</span>
                    {d.sections != null && (
                      <span className={styles.readingMeta}>
                        {t('study.sections', { n: d.sections })}
                      </span>
                    )}
                  </span>
                  <span className={styles.readingArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {modules.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.groundschool')}</h2>
          <ul className={styles.banks}>
            {modules.map((m) => (
              <li key={m.id}>
                <Link to="/study/groundschool" className={styles.bank}>
                  <span className={styles.bankTitle}>{m.title}</span>
                  <span className={styles.bankDesc}>{m.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {readingPaths.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.paths')}</h2>
          <ul className={styles.banks}>
            {readingPaths.map((p) => (
              <li key={p.id}>
                <Link to="/study/paths" className={styles.bank}>
                  <span className={styles.bankTitle}>{p.title}</span>
                  <span className={styles.bankDesc}>{p.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sheets.length > 0 && (
        <section className={styles.packSection}>
          <h2 className={styles.packSectionHead}>{t('study.sheets')}</h2>
          <ul className={styles.banks}>
            {sheets.map((d) => (
              <li key={d.slug}>
                <Link to="/study/sheets" className={styles.bank}>
                  <span className={styles.bankTitle}>{d.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
