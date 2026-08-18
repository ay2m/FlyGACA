import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { useFetchJson } from '@/hooks/useFetchJson';
import { CORPUS, type GacarIndex } from '@/lib/content';
import { withAlpha } from '@/lib/color';
import { CardCta } from './CardCta';
import shared from './widgets.module.css';
import styles from './RadarWidget.module.css';

/** One plotted GACAR Part: polar position + visual weight + label. */
interface Blip {
  angle: number;
  radiusFrac: number;
  size: number;
  bright: number;
  title: string;
}

/**
 * Map the real GACAR corpus onto the radar scope: each Part is a contact placed
 * in its domain's angular sector and pushed outward by page-count (corpus depth),
 * so the scope reads as genuine regulatory coverage. Deterministic — no real-time
 * feed — but data-driven rather than decorative.
 */
export function buildBlips(data: GacarIndex | null | undefined): Blip[] {
  if (!data || data.documents.length === 0) return [];
  const cats = data.categories.map((c) => c.id);
  const nCat = cats.length || 1;
  const pages = data.documents.map((d) => d.pages);
  const minP = Math.min(...pages);
  const span = Math.max(1, Math.max(...pages) - minP);
  const sectorWidth = ((Math.PI * 2) / nCat) * 0.82;
  const perSector: Record<string, number> = {};

  return data.documents.map((d) => {
    const sector = Math.max(0, cats.indexOf(d.category));
    const idx = (perSector[d.category] = (perSector[d.category] ?? 0) + 1);
    // Sector centred at the top (−90°), Parts fanned within it by a golden offset.
    const base = (sector / nCat) * Math.PI * 2 - Math.PI / 2;
    const frac = ((idx * 0.61803) % 1) - 0.5;
    const depth = (d.pages - minP) / span; // 0..1
    return {
      angle: base + frac * sectorWidth,
      radiusFrac: 0.4 + depth * 0.52, // deeper Parts sit further out
      size: 1.8 + depth * 2.6,
      bright: 0.45 + depth * 0.5,
      title: `${d.part} · ${d.title}`,
    };
  });
}

/** Read a CSS custom property off :root so canvas paint stays token-driven. */
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * The dashboard's "regulatory coverage map" — a radar scope whose contacts are the
 * 74 GACAR Parts, grouped by domain sector and weighted by corpus depth. Anti-aliased
 * via devicePixel scaling; a continuous sweep lights contacts as it passes, and a
 * single roving tooltip names the Part under the pointer. Honours reduced-motion by
 * painting a single static frame (data still shown).
 */
export function RadarWidget() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const headingId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data, loading } = useFetchJson<GacarIndex>(CORPUS.regulations.index);
  const blips = useMemo(() => buildBlips(data), [data]);
  const [tip, setTip] = useState<{ title: string; left: number; top: number } | null>(null);
  const lastTitle = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cyan = cssVar('--neon-cyan', '#3fe0ff');
    const ring = cssVar('--border-bright', '#26384a');
    const green = cssVar('--neon-green', '#2bffb0');

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (sweep: number) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const maxR = Math.min(cssW, cssH) / 2 - 6;
      if (maxR <= 0) return;

      ctx.clearRect(0, 0, cssW, cssH);

      // Range rings + cross-hairs
      ctx.strokeStyle = ring;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i += 1) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, (maxR * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Bearing ticks around the perimeter (every 30°, longer on the cardinals)
      ctx.globalAlpha = 0.6;
      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        const inner = a % 90 === 0 ? maxR - 10 : maxR - 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Sweep wedge with a fading trailing gradient. The transparent stops are
      // derived from the same token as the leading edge so themed sweeps
      // (cockpit amber, day teal) fade through their own hue, not cyan.
      const trail = 1.1; // radians of trail behind the leading edge
      const grad = ctx.createConicGradient(sweep - trail, cx, cy);
      grad.addColorStop(0, withAlpha(cyan, 0));
      grad.addColorStop(trail / (Math.PI * 2), cyan);
      grad.addColorStop(trail / (Math.PI * 2) + 0.001, withAlpha(cyan, 0));
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - trail, sweep);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Leading edge line
      ctx.strokeStyle = cyan;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Contacts — one per GACAR Part (cyan = data), brightening to green as the
      // sweep passes, then fading.
      for (const b of blips) {
        const bx = cx + Math.cos(b.angle) * b.radiusFrac * maxR;
        const by = cy + Math.sin(b.angle) * b.radiusFrac * maxR;
        let delta = sweep - b.angle;
        delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const lit = Math.max(0, 1 - delta / 1.4);
        ctx.beginPath();
        ctx.fillStyle = lit > 0.05 ? green : cyan;
        ctx.globalAlpha = Math.min(1, b.bright * (0.6 + lit * 0.7));
        ctx.arc(bx, by, b.size + lit * 1.6, 0, Math.PI * 2);
        ctx.fill();
        if (lit > 0.05) {
          ctx.globalAlpha = lit * 0.4;
          ctx.strokeStyle = green;
          ctx.beginPath();
          ctx.arc(bx, by, b.size + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Centre hub
      ctx.globalAlpha = 1;
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    // Roving tooltip: hit-test the nearest Part contact under the pointer. Uses
    // raw canvas (physical) coordinates — the raster isn't direction-mirrored, so
    // percentage left/top track the painted blip in both LTR and RTL.
    const onMove = (e: MouseEvent) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const maxR = Math.min(cssW, cssH) / 2 - 6;
      if (maxR <= 0 || blips.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let best: Blip | null = null;
      let bestD = Infinity;
      let bx = 0;
      let by = 0;
      for (const b of blips) {
        const px = cx + Math.cos(b.angle) * b.radiusFrac * maxR;
        const py = cy + Math.sin(b.angle) * b.radiusFrac * maxR;
        const d = Math.hypot(px - mx, py - my);
        if (d < bestD) {
          bestD = d;
          best = b;
          bx = px;
          by = py;
        }
      }
      if (best && bestD <= Math.max(10, best.size + 6)) {
        if (lastTitle.current !== best.title) {
          lastTitle.current = best.title;
          setTip({ title: best.title, left: (bx / cssW) * 100, top: (by / cssH) * 100 });
        }
      } else if (lastTitle.current !== null) {
        lastTitle.current = null;
        setTip(null);
      }
    };

    const onLeave = () => {
      lastTitle.current = null;
      setTip(null);
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
      if (reduce) draw(-Math.PI / 4);
    });
    observer.observe(canvas);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    const cleanupListeners = () => {
      observer.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };

    if (reduce) {
      draw(-Math.PI / 4); // single static frame
      return cleanupListeners;
    }

    let raf = 0;
    let last = performance.now();
    let sweep = 0;
    const speed = 1.1; // radians / second
    const loop = (now: number) => {
      sweep = (sweep + ((now - last) / 1000) * speed) % (Math.PI * 2);
      last = now;
      draw(sweep);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      cleanupListeners();
    };
  }, [reduce, blips]);

  const parts = data?.count ?? 0;
  const domains = data?.categories.length ?? 0;
  const caption = t('home.dashboard.radar.concept', { parts, domains });

  return (
    <BentoCard span="tall" tone="cyan" to="/library" labelledBy={headingId}>
      <p className={shared.eyebrow}>{t('home.dashboard.radar.eyebrow')}</p>
      {/* The tile's design has no visible title; the sr-only heading names the
          link and keeps the tile in the document outline. The canvas stays
          decorative to AT — the visible caption carries the coverage figure. */}
      <h3 id={headingId} className={shared.srOnly}>
        {t('home.dashboard.radar.title')}
      </h3>
      <div className={styles.scope}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {tip && (
          <span
            className={styles.tooltip}
            style={{ left: `${tip.left}%`, top: `${tip.top}%` }}
            aria-hidden="true"
          >
            {tip.title}
          </span>
        )}
      </div>
      {loading || !data ? (
        <span className={`${shared.skeleton} ${shared.skeletonText}`} />
      ) : (
        <p className={styles.concept}>{caption}</p>
      )}
      <CardCta label={t('home.dashboard.radar.cta')} />
    </BentoCard>
  );
}
