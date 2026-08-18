import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useUrlState } from '@/hooks/useUrlState';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { dataUrl, type ChartsIndex, type ChartDoc } from '@/lib/content';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { Disclaimer } from '@/components/Disclaimer';
import { ExternalLink } from '@/components/ExternalLink';
import { Alert } from '@/components/Alert';
import { EmptyState } from '@/components/EmptyState';
import { AiracFreshness } from '@/components/AiracFreshness';
import styles from './Charts.module.css';

/** Public path for a chart image (the index stores the legacy `assets/…` path);
    routed through the configured data origin (charts live under /data/charts). */
function chartSrc(doc: ChartDoc): string {
  return dataUrl(`/${doc.image.replace(/^assets\//, '')}`);
}

export function Charts() {
  const { t } = useTranslation();
  usePageMeta(t('meta.charts'), t('metaDesc.charts'));
  const [reloadToken, setReloadToken] = useState(0);
  const index = useFetchJson<ChartsIndex>('/data/charts-index.json', reloadToken);
  const docs = useMemo(() => index.data?.documents ?? [], [index.data]);
  const [params, setParam] = useUrlState({ chart: '' });
  const [fullscreen, setFullscreen] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  // The fullscreen viewer covers the viewport — the page behind must not scroll.
  useEffect(() => {
    if (!fullscreen) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [fullscreen]);

  const active = docs.find((d) => d.slug === params.chart) ?? docs[0];
  const activeIdx = active ? docs.findIndex((d) => d.slug === active.slug) : -1;

  // Group by region for the selector + thumbnails.
  const regions = useMemo(() => {
    const map = new Map<string, ChartDoc[]>();
    for (const d of docs) {
      const list = map.get(d.region) ?? [];
      list.push(d);
      map.set(d.region, list);
    }
    return [...map.entries()];
  }, [docs]);
  const regionVariants = useMemo(
    () => (active ? docs.filter((d) => d.region === active.region) : []),
    [docs, active],
  );

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (!docs.length || activeIdx < 0) return;
      const nextI = (activeIdx + delta + docs.length) % docs.length;
      setParam('chart', docs[nextI].slug);
    },
    [docs, activeIdx, setParam],
  );

  const copyLink = useCallback(() => {
    if (!active) return;
    void copy(`${window.location.origin}${window.location.pathname}?chart=${active.slug}`);
  }, [active, copy]);

  // Create the Leaflet map once the (data-gated) container is in the DOM.
  const ready = docs.length > 0;
  useEffect(() => {
    if (!ready || !mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;
    // Label the native zoom controls for assistive tech.
    mapEl.current
      .querySelector('.leaflet-control-zoom-in')
      ?.setAttribute('aria-label', t('charts.zoomIn'));
    mapEl.current
      .querySelector('.leaflet-control-zoom-out')
      ?.setAttribute('aria-label', t('charts.zoomOut'));
    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [ready, t]);

  // Swap the image overlay whenever the active chart changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [active.h, active.w],
    ];
    if (overlayRef.current) overlayRef.current.remove();
    overlayRef.current = L.imageOverlay(chartSrc(active), bounds, {
      alt: active.label,
    }).addTo(map);
    map.fitBounds(bounds);
  }, [active]);

  // After a fullscreen toggle the container resized — tell Leaflet and re-fit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds([
        [0, 0],
        [active.h, active.w],
      ]);
    }, 60);
    return () => window.clearTimeout(id);
  }, [fullscreen, active]);

  // Keyboard: ←/→ switch sheets, Esc exits fullscreen. When the Leaflet map (or
  // any control) has focus, leave the arrows to it — Leaflet makes its container
  // focusable and pans the chart with the arrow keys, so hijacking them here
  // would trap keyboard users who are trying to pan. Esc still exits fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') {
        setFullscreen(false);
        return;
      }
      if (mapEl.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <section className={`container ${styles.page}`}>
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      <header className={styles.head}>
        <h1>{t('charts.title')}</h1>
        <p className={styles.lead}>{t('charts.lead')}</p>
        <AiracFreshness />
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

      {!index.loading && !index.error && docs.length === 0 && (
        <EmptyState icon="🗺️">{t('charts.empty')}</EmptyState>
      )}

      {docs.length > 0 && (
        <div className={styles.layout}>
          <nav className={styles.picker} aria-label={t('charts.title')}>
            {regions.map(([region, list]) => (
              <div key={region} className={styles.region}>
                <h2 className={styles.regionName}>{region}</h2>
                <div className={styles.variants}>
                  {list.map((d) => (
                    <button
                      key={d.slug}
                      type="button"
                      className={`${styles.variant} ${
                        active?.slug === d.slug ? styles.variantActive : ''
                      }`}
                      aria-pressed={active?.slug === d.slug}
                      onClick={() => setParam('chart', d.slug)}
                    >
                      {d.variant || t('charts.sheet')}
                      {d.date && <span className={styles.date}>{d.date}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={`${styles.viewer} ${fullscreen ? styles.fullscreen : ''}`}>
            <div className={styles.mapToolbar}>
              <div className={styles.toolbarMain}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => go(-1)}
                  aria-label={t('charts.prevSheet')}
                >
                  ←
                </button>
                <span className={styles.activeLabel}>{active?.label}</span>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => go(1)}
                  aria-label={t('charts.nextSheet')}
                >
                  →
                </button>
              </div>
              <div className={styles.toolbarActions}>
                <button type="button" className={styles.toolBtn} onClick={copyLink}>
                  {copied ? t('charts.copied') : t('charts.copyLink')}
                </button>
                {active && (
                  <a className={styles.toolBtn} href={chartSrc(active)} download>
                    {t('charts.download')}
                  </a>
                )}
                {active && (
                  <ExternalLink className={styles.toolBtn} href={chartSrc(active)}>
                    {t('charts.openImage')}
                  </ExternalLink>
                )}
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setFullscreen((f) => !f)}
                  aria-pressed={fullscreen}
                >
                  {fullscreen ? t('charts.exitFullscreen') : t('charts.fullscreen')}
                </button>
              </div>
            </div>

            {active && (active.date || active.revision || active.sourceUrl) && (
              <p className={styles.metaLine}>
                {active.date && <span>{active.date}</span>}
                {active.revision && (
                  <span>
                    {t('charts.revision')}: {active.revision}
                  </span>
                )}
                {active.sourceUrl && (
                  <a href={active.sourceUrl} target="_blank" rel="noopener">
                    {t('charts.source')} ↗
                  </a>
                )}
              </p>
            )}

            {/* Interactive map: role=group (not img) so its focusable zoom
                controls aren't flagged as nested inside a leaf img role. */}
            <div className={styles.map} ref={mapEl} role="group" aria-label={active?.label} />

            {regionVariants.length > 1 && (
              <div className={styles.thumbs} aria-label={t('charts.thumbnails')}>
                {regionVariants.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    className={`${styles.thumb} ${active?.slug === d.slug ? styles.thumbActive : ''}`}
                    aria-pressed={active?.slug === d.slug}
                    aria-label={d.label}
                    onClick={() => setParam('chart', d.slug)}
                  >
                    <img src={chartSrc(d)} alt="" loading="lazy" decoding="async" />
                    <span>{d.variant || t('charts.sheet')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Disclaimer />
    </section>
  );
}
