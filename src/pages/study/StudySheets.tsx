import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useUrlState } from '@/hooks/useUrlState';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { PdfsIndex, PdfDoc } from '@/lib/content';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { Disclaimer } from '@/components/Disclaimer';
import { ExternalLink } from '@/components/ExternalLink';
import { EmptyState } from '@/components/EmptyState';
import { Alert } from '@/components/Alert';
import styles from './StudySheets.module.css';

/** Deployed PDF path (the index stores the legacy `assets/…` path). */
function pdfSrc(doc: PdfDoc): string | null {
  if (!doc.file) return null;
  return `/${doc.file.replace(/^assets\//, '')}`;
}

export function StudySheets() {
  const { t } = useTranslation();
  usePageMeta(t('meta.sheets'), t('metaDesc.sheets'));
  const [reloadToken, setReloadToken] = useState(0);
  const index = useFetchJson<PdfsIndex>('/data/pdfs-index.json', reloadToken);
  const [params, setParam] = useUrlState({ doc: '' });
  const [q, setQ] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // The fullscreen viewer covers the viewport — the page behind must not scroll.
  useEffect(() => {
    if (!fullscreen) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [fullscreen]);

  const files = useMemo(
    () => (index.data?.documents ?? []).filter((d) => d.available && d.file),
    [index.data],
  );
  const categories = useMemo(() => index.data?.categories ?? [], [index.data]);
  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  // The active sheet is tracked against the full list (so search never clears the viewer).
  const active = files.find((d) => d.slug === params.doc) ?? files[0];
  const activeSrc = active ? pdfSrc(active) : null;

  // Picker groups, filtered by the title/category search.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (d: PdfDoc) =>
      !needle ||
      d.title.toLowerCase().includes(needle) ||
      catLabel(d.category).toLowerCase().includes(needle);
    const out: { id: string; label: string; docs: PdfDoc[] }[] = [];
    for (const c of categories) {
      const docs = files.filter((d) => d.category === c.id && match(d));
      if (docs.length) out.push({ id: c.id, label: c.label, docs });
    }
    // Any file whose category isn't in the manifest still shows under its id.
    const known = new Set(categories.map((c) => c.id));
    const orphans = files.filter((d) => !known.has(d.category) && match(d));
    if (orphans.length) out.push({ id: 'other', label: t('sheets.category'), docs: orphans });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, categories, q, t]);

  const hasMatches = groups.some((g) => g.docs.length > 0);

  function print() {
    frameRef.current?.contentWindow?.print();
  }

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/learn?tab=practice">← {t('nav.learn')}</Link>
      </p>
      <header className={styles.head}>
        <h1>{t('sheets.title')}</h1>
        <p className={styles.lead}>{t('sheets.lead')}</p>
      </header>

      {index.loading && <div className={styles.skeleton} aria-hidden="true" />}
      {index.error && (
        <Alert
          tone="error"
          role="alert"
          icon="⚠"
          action={{ label: t('common.retry'), onClick: () => setReloadToken((n) => n + 1) }}
        >
          {t('common.loadError')}
        </Alert>
      )}

      {files.length > 0 && (
        <div className={styles.layout}>
          <nav className={styles.list} aria-label={t('sheets.title')}>
            <input
              className={styles.search}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('sheets.search')}
              aria-label={t('sheets.search')}
            />
            {!hasMatches && (
              <EmptyState
                compact
                icon="🔍"
                action={{ label: t('common.clear'), onClick: () => setQ('') }}
              >
                {t('sheets.noMatch')}
              </EmptyState>
            )}
            {groups.map((g) => (
              <div key={g.id} className={styles.group}>
                <h2 className={styles.groupLabel}>{g.label}</h2>
                {g.docs.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    className={`${styles.item} ${active?.slug === d.slug ? styles.itemActive : ''}`}
                    aria-pressed={active?.slug === d.slug}
                    onClick={() => setParam('doc', d.slug)}
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className={`${styles.viewer} ${fullscreen ? styles.fullscreen : ''}`}>
            <div className={styles.toolbar}>
              <span className={styles.activeTitle}>{active?.title}</span>
              {activeSrc && (
                <span className={styles.actions}>
                  <button type="button" className={styles.toolBtn} onClick={print}>
                    {t('sheets.print')}
                  </button>
                  <button
                    type="button"
                    className={styles.toolBtn}
                    onClick={() => setFullscreen((f) => !f)}
                    aria-pressed={fullscreen}
                  >
                    {fullscreen ? t('sheets.exitFullscreen') : t('sheets.fullscreen')}
                  </button>
                  <ExternalLink className={styles.toolBtn} href={activeSrc}>
                    {t('sheets.open')}
                  </ExternalLink>
                  <a className={styles.toolBtn} href={activeSrc} download>
                    {t('sheets.download')}
                  </a>
                </span>
              )}
            </div>
            {activeSrc && (
              <iframe
                ref={frameRef}
                className={styles.embed}
                src={activeSrc}
                title={active?.title}
              />
            )}
          </div>
        </div>
      )}

      <Disclaimer />
    </section>
  );
}
