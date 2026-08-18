import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { QuizBank, QuizData } from '@/lib/content';
import { useStudyProgress, setLastBank } from '@/lib/studyProgress';
import { usePageMeta } from '@/hooks/usePageMeta';
import { courseLd } from '@/lib/seo/jsonld';
import { Disclaimer } from '@/components/Disclaimer';
import { HubBackLink } from '@/components/HubBackLink';
import { buildSession } from './session';
import { Runner, Shell } from './QuizRunner';
import { findPack } from '@/lib/prepCatalog';
import { hasPackAccess } from '@/lib/services/packEntitlements';
import { useAccount } from '@/lib/services/account';
import styles from './Study.module.css';

export function Quiz() {
  const { t, i18n } = useTranslation();
  usePageMeta(
    t('meta.quiz'),
    t('metaDesc.quiz'),
    courseLd({
      title: t('meta.quiz'),
      description: t('metaDesc.quiz'),
      path: '/study/quiz',
      lang: i18n.language,
    }),
  );
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const { quizBest, flagged } = useStudyProgress();
  const { entitlement, ownedPacks } = useAccount();
  const [bank, setBank] = useState<QuizBank | null>(null);
  const [params, setParams] = useSearchParams();

  // A combined pack session is a paid surface — resolve the pack and gate on access
  // so `/study/quiz?pack=medical` can't bypass the storefront paywall. Per-bank
  // (`?bank=`) and flagged-review sessions stay open (free surfaces).
  const packParam = params.get('pack');
  const gatedPack = packParam ? findPack(packParam) : undefined;
  const packLocked = !!gatedPack && !hasPackAccess(gatedPack, entitlement, ownedPacks);

  // Launch a focused session (pack / single bank / flagged review) from the URL.
  useEffect(() => {
    if (!data || bank || packLocked) return;
    const sess = buildSession(
      data,
      { pack: params.get('pack'), bank: params.get('bank'), review: params.get('review') },
      flagged,
      t,
    );
    if (sess) setBank(sess);
    // Build once when data/params resolve; flagged/t are snapshotted intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, params, bank, packLocked]);

  const openBank = (b: QuizBank) => {
    setBank(b);
    setLastBank(b.id);
  };
  const backToBanks = () => {
    setBank(null);
    if ([...params.keys()].length) setParams({}, { replace: true });
  };

  if (loading) return <Shell>{t('common.loading')}</Shell>;
  if (error || !data)
    return (
      <Shell>
        <div className={styles.errorBox} role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={styles.primary} onClick={() => setReload((r) => r + 1)}>
            {t('library.retry')}
          </button>
        </div>
      </Shell>
    );

  if (packLocked && gatedPack) {
    return (
      <Shell>
        <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
        <h1>{t(`study.packCatalog.${gatedPack.id}.name`)}</h1>
        <p className={styles.subtitle}>{t('study.packLockedNote')}</p>
        <Link
          to={`/study/packs/${gatedPack.id}`}
          className={styles.primary}
          style={{ textDecoration: 'none' }}
        >
          {t('study.packView')}
        </Link>
        <Disclaimer compact />
      </Shell>
    );
  }

  if (!bank) {
    return (
      <Shell>
        <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
        <h1>{t('study.quiz')}</h1>
        <p className={styles.subtitle}>{t('study.pickBank')}</p>
        <ul className={styles.banks}>
          {data.banks.map((b) => {
            const best = quizBest[b.id];
            return (
              <li key={b.id}>
                <button type="button" className={styles.bank} onClick={() => openBank(b)}>
                  <span className={styles.bankTitle}>{b.title}</span>
                  <span className={styles.bankDesc}>{b.desc}</span>
                  <span className={styles.bankMeta}>
                    {t('study.questions', { n: b.questions.length })}
                    {best != null ? ` · ${t('study.best', { pct: best })}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Disclaimer compact />
      </Shell>
    );
  }

  return <Runner bank={bank} onBack={backToBanks} />;
}
