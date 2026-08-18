import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { CorpusIndex, GroundSchoolData, PathsIndex, PdfsIndex, QuizData } from '@/lib/content';
import { useStudyProgress } from '@/lib/studyProgress';
import { useAccount, refreshAccount } from '@/lib/services/account';
import { hasPackAccess, ownsPack } from '@/lib/services/packEntitlements';
import { captureRefFromUrl } from '@/lib/services/referral';
import { usePageMeta } from '@/hooks/usePageMeta';
import { courseLd } from '@/lib/seo/jsonld';
import { adelLink } from '@/lib/adel';
import { Disclaimer } from '@/components/Disclaimer';
import { ProgressBar } from '@/components/ProgressBar';
import { findPack } from '@/lib/prepCatalog';
import { PackStorefront, countQuestions } from './PackStorefront';
import { PackContents } from './PackContents';
import { NotFound } from '@/pages/not-found/NotFound';
import styles from './Study.module.css';

interface PackDetailProps {
  /** Standalone flavor apps pin their pack id instead of reading the URL param. */
  fixedId?: string;
  /** Hide the storefront chrome (back-link, checkout banners) in flavor builds. */
  standalone?: boolean;
}

export function PackDetail({ fixedId, standalone = false }: PackDetailProps) {
  const { t, i18n } = useTranslation();
  const { id: paramId } = useParams<{ id: string }>();
  const id = fixedId ?? paramId;
  const pack = findPack(id);
  // `soon` packs are announced but have no content/detail page — treat as not found
  // so the storefront card (with its waitlist form) is the only surface for them.
  const shown = pack && pack.status === 'live' ? pack : undefined;

  // A pack detail page is indexable; an unknown/soon id renders <NotFound/>, so
  // noindex it here (this hook runs before that early return).
  usePageMeta(
    shown ? t(`study.packCatalog.${shown.id}.name`) : undefined,
    shown ? t(`study.packCatalog.${shown.id}.desc`) : undefined,
    shown
      ? courseLd({
          title: t(`study.packCatalog.${shown.id}.name`),
          description: t(`study.packCatalog.${shown.id}.desc`),
          path: `/study/packs/${shown.id}`,
          lang: i18n.language,
        })
      : undefined,
    shown ? undefined : { noindex: true },
  );

  const { entitlement, ownedPacks } = useAccount();
  const { quizBest, flagged, exam } = useStudyProgress();
  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const paths = useFetchJson<PathsIndex>('/data/paths-index.json');
  const pdfs = useFetchJson<PdfsIndex>('/data/pdfs-index.json');
  const refs = useFetchJson<CorpusIndex>('/data/reference-index.json');

  const [searchParams, setSearchParams] = useSearchParams();
  const checkout = searchParams.get('checkout');

  // Persist an inbound ?ref=CODE so it survives the sign-in / checkout round-trip.
  useEffect(() => {
    captureRefFromUrl();
  }, []);

  // After a pack checkout returns, ownership is granted asynchronously by the
  // webhook — poll a few times so the unlocked pack appears without a manual reload.
  useEffect(() => {
    if (checkout !== 'success') return;
    void refreshAccount();
    let n = 0;
    const poll = window.setInterval(() => {
      void refreshAccount();
      if (++n >= 8) window.clearInterval(poll);
    }, 2500);
    return () => window.clearInterval(poll);
  }, [checkout]);

  if (!shown) return <NotFound />;
  const pack2 = shown;

  const packName = t(`study.packCatalog.${pack2.id}.name`);
  const packDesc = t(`study.packCatalog.${pack2.id}.desc`);
  const access = hasPackAccess(pack2, entitlement, ownedPacks);
  const owned = ownsPack(pack2, ownedPacks);
  const justPurchased = checkout === 'success' && owned;

  function dismissCheckoutParam() {
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
  }

  // Locked = a paid pack the user neither owns nor has via a plan; the storefront
  // sibling owns the buy flow.
  if (!access) {
    return <PackStorefront pack={pack2} questionCount={countQuestions(quiz.data, pack2.bankIds)} />;
  }

  const banks = (quiz.data?.banks ?? []).filter((b) => pack2.bankIds.includes(b.id));
  const modules = (gs.data?.modules ?? []).filter((m) => pack2.moduleIds?.includes(m.id));
  const readingPaths = (paths.data?.paths ?? []).filter((p) => pack2.pathIds?.includes(p.id));
  const sheets = (pdfs.data?.documents ?? []).filter((d) => pack2.sheetSlugs?.includes(d.slug));
  // Keep the pack's own slug order so the reading list reads GEN → ENR, not index order.
  const reading = (pack2.librarySlugs ?? [])
    .map((slug) => refs.data?.documents.find((d) => d.slug === slug))
    .filter((d): d is NonNullable<typeof d> => d != null);

  // Overall mastery = mean of each bank's best quiz score (unattempted banks count 0),
  // so the meter reflects progress across the whole pack, not a single good run.
  const mastery = pack2.bankIds.length
    ? Math.round(
        pack2.bankIds.reduce((sum, bid) => sum + (quizBest[bid] ?? 0), 0) / pack2.bankIds.length,
      )
    : 0;
  const flaggedCount = pack2.bankIds.reduce((n, bid) => n + (flagged[bid]?.length ?? 0), 0);

  const adelHref = adelLink(t('study.askAdelPrompt', { topic: packName }));

  return (
    <section className={`container ${styles.page}`}>
      {!standalone && (
        <p className={styles.back}>
          <Link to="/study/packs">← {t('study.packs')}</Link>
        </p>
      )}

      {!standalone && justPurchased && (
        <p role="status" className={styles.purchaseOk}>
          <span>{t('study.packPurchaseSuccess')}</span>
          <button type="button" className={styles.canceledDismiss} onClick={dismissCheckoutParam}>
            {t('pricing.checkoutCanceledDismiss')}
          </button>
        </p>
      )}
      {!standalone && checkout === 'cancel' && (
        <p role="status" className={styles.purchaseCancel}>
          <span>{t('study.packCheckoutCanceled')}</span>
          <button type="button" className={styles.canceledDismiss} onClick={dismissCheckoutParam}>
            {t('pricing.checkoutCanceledDismiss')}
          </button>
        </p>
      )}

      <header className={styles.packHero}>
        <div className={styles.packHeroTop}>
          <h1>{packName}</h1>
          {owned ? (
            <span className={styles.ownedTag}>{t('study.packOwned')}</span>
          ) : (
            pack2.access === 'paid' && (
              <span className={styles.includedTag}>{t('study.packIncluded')}</span>
            )
          )}
        </div>
        <p className={styles.packHeroDesc}>{packDesc}</p>

        {banks.length > 0 && (
          <div className={styles.packMeter}>
            <div className={styles.packMeterHead}>
              <span className={styles.packMeterLabel}>{t('study.packMastery')}</span>
              <span className={styles.packMeterPct}>{mastery}%</span>
            </div>
            <ProgressBar percent={mastery} label={t('study.packMastery')} />
          </div>
        )}

        <ul className={styles.packStats}>
          <li className={styles.packStat}>
            <span className={styles.packStatNum}>{banks.length}</span>
            <span className={styles.packStatLabel}>{t('study.statBanks')}</span>
          </li>
          {reading.length > 0 && (
            <li className={styles.packStat}>
              <span className={styles.packStatNum}>{reading.length}</span>
              <span className={styles.packStatLabel}>{t('study.statReading')}</span>
            </li>
          )}
          {sheets.length > 0 && (
            <li className={styles.packStat}>
              <span className={styles.packStatNum}>{sheets.length}</span>
              <span className={styles.packStatLabel}>{t('study.statSheets')}</span>
            </li>
          )}
          {exam && (
            <li className={styles.packStat}>
              <span className={styles.packStatNum}>{exam.pct}%</span>
              <span className={styles.packStatLabel}>{t('study.statBestExam')}</span>
            </li>
          )}
        </ul>

        <div className={styles.packActionRow}>
          {banks.length > 0 && (
            <Link
              to={`/study/quiz?pack=${pack2.id}`}
              className={styles.primary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.startPackQuiz')}
            </Link>
          )}
          {banks.length > 0 && (
            <Link
              to={`/study/exam?pack=${pack2.id}`}
              className={styles.secondary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.packExamStart')}
            </Link>
          )}
          {adelHref && (
            <Link to={adelHref} className={styles.secondary} style={{ textDecoration: 'none' }}>
              {t('study.askAdel')}
            </Link>
          )}
          {flaggedCount > 0 && (
            <Link
              to="/study/quiz?review=flagged"
              className={styles.secondary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.reviewFlagged', { n: flaggedCount })}
            </Link>
          )}
        </div>
      </header>

      <PackContents
        banks={banks}
        reading={reading}
        modules={modules}
        readingPaths={readingPaths}
        sheets={sheets}
      />

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
