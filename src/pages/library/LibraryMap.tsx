import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHero } from '@/components/PageHero';
import { useFetchJson } from '@/hooks/useFetchJson';
import { usePageMeta } from '@/hooks/usePageMeta';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { breadcrumbLd } from '@/lib/seo/jsonld';
import { buildConstellation } from '@/calc/library/constellation';
import type { ConstellationNode } from '@/calc/library/constellation';
import type { RegulationsLookup } from '@/lib/content.types';
import styles from './LibraryMap.module.css';

/** Read a CSS custom property off :root so canvas paint stays token-driven. */
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const CAT_TOKENS = ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5', '--neon-cyan'];

/**
 * The regulation constellation — every GACAR Part as a star in its category's
 * sector, connected by the corpus's real cross-references. Hover names a Part
 * and lights the references that touch it; click opens it in the library.
 * Canvas mechanics follow the HUD viewport (DPR scaling, token palette,
 * reduced-motion single frame, %-positioned tooltip over the unmirrored
 * raster); the sr-only summary plus the library's own index remain the
 * accessible path.
 */
export function LibraryMap() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tip, setTip] = useState<{ text: string; left: number; top: number } | null>(null);
  const lastTip = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const { data } = useFetchJson<RegulationsLookup>('/data/regulations-lookup.json');

  const layout = useMemo(() => buildConstellation(Object.values(data?.parts ?? {})), [data]);

  usePageMeta(t('meta.libraryMap'), t('metaDesc.libraryMap'), [
    breadcrumbLd([
      { name: t('nav.breadcrumbHome'), path: '/' },
      { name: t('nav.library'), path: '/library' },
      { name: t('libraryMap.title'), path: '/library/map' },
    ]),
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layout.nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let palette = CAT_TOKENS.map((tok) => cssVar(tok, '#4a9cb8'));
    let line = cssVar('--border-bright', '#26384a');
    let text = cssVar('--text', '#e8edf2');
    let mono = cssVar('--font-mono', 'ui-monospace, monospace');

    let cssW = 0;
    let cssH = 0;
    const screen = new Map<string, { x: number; y: number }>();
    const mounted = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const R = Math.min(cssW, cssH) / 2 - 26;
      if (R <= 0) return;
      ctx.clearRect(0, 0, cssW, cssH);
      screen.clear();
      for (const n of layout.nodes) {
        screen.set(n.slug, { x: cx + n.x * R, y: cy - n.y * R });
      }
      const hovered = hoverRef.current;
      const sinceMount = reduce ? Infinity : now - mounted;

      // Constellation lines — brighter when they touch the hovered star.
      for (const e of layout.edges) {
        const a = screen.get(e.from);
        const b = screen.get(e.to);
        if (!a || !b) continue;
        const hot = hovered !== null && (e.from === hovered || e.to === hovered);
        ctx.strokeStyle = hot ? palette[5] : line;
        ctx.globalAlpha = hot ? 0.9 : 0.28;
        ctx.lineWidth = hot ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Stars — staggered entrance, then a slow twinkle.
      ctx.font = `600 9px ${mono}`;
      layout.nodes.forEach((n: ConstellationNode, i: number) => {
        const p = screen.get(n.slug);
        if (!p) return;
        const born = Math.min(1, Math.max(0, (sinceMount - i * 22) / 500));
        if (born === 0) return;
        const twinkle = reduce ? 1 : 0.82 + 0.18 * Math.sin(now / 1400 + i * 1.7);
        const hot = hovered === n.slug;
        const r = n.r * (0.6 + 0.4 * born) + (hot ? 2 : 0);
        ctx.globalAlpha = born * twinkle;
        ctx.fillStyle = palette[n.catIndex % palette.length];
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (hot) {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = palette[n.catIndex % palette.length];
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (n.r >= 4 || hot) {
          ctx.globalAlpha = Math.min(1, born) * 0.85;
          ctx.fillStyle = text;
          ctx.fillText(n.part, p.x + r + 3, p.y + 3);
        }
      });
      ctx.globalAlpha = 1;
    };

    const nearest = (mx: number, my: number) => {
      let best: ConstellationNode | null = null;
      let bestD = Infinity;
      for (const n of layout.nodes) {
        const p = screen.get(n.slug);
        if (!p) continue;
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      return best && bestD <= 16 ? best : null;
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = nearest(e.clientX - rect.left, e.clientY - rect.top);
      hoverRef.current = hit?.slug ?? null;
      canvas.style.cursor = hit ? 'pointer' : 'default';
      const label = hit ? `§${hit.part} · ${hit.title}` : null;
      if (label !== lastTip.current) {
        lastTip.current = label;
        if (hit && label) {
          const p = screen.get(hit.slug);
          if (p) setTip({ text: label, left: (p.x / cssW) * 100, top: (p.y / cssH) * 100 });
        } else {
          setTip(null);
        }
      }
      if (reduce) draw(performance.now());
    };
    const onLeave = () => {
      hoverRef.current = null;
      lastTip.current = null;
      setTip(null);
      if (reduce) draw(performance.now());
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = nearest(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) void navigate(`/library/${hit.slug}`);
    };

    resize();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            resize();
            if (reduce) draw(performance.now());
          });
    observer?.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      palette = CAT_TOKENS.map((tok) => cssVar(tok, '#4a9cb8'));
      line = cssVar('--border-bright', '#26384a');
      text = cssVar('--text', '#e8edf2');
      mono = cssVar('--font-mono', 'ui-monospace, monospace');
      if (reduce) draw(performance.now());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);

    const cleanup = () => {
      observer?.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };

    if (reduce) {
      draw(performance.now());
      return cleanup;
    }
    let raf = 0;
    const loop = (now: number) => {
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [layout, reduce, navigate]);

  return (
    <section className={`container ${styles.page}`}>
      <PageHero
        align="center"
        eyebrow={t('libraryMap.eyebrow')}
        title={t('libraryMap.title')}
        subtitle={t('libraryMap.subtitle')}
      />
      <div className={styles.mapWrap}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {tip && (
          <span
            className={styles.tooltip}
            style={{ left: `${tip.left}%`, top: `${tip.top}%` }}
            aria-hidden="true"
          >
            {tip.text}
          </span>
        )}
        <p className={styles.hint}>{t('libraryMap.hint')}</p>
      </div>
      <p className={styles.srOnly}>{t('libraryMap.summary', { count: layout.nodes.length })}</p>
      <Disclaimer compact />
    </section>
  );
}
