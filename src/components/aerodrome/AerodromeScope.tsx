import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { greatCircle } from '@/calc/navigation';
import { flightStateAt } from '@/calc/hud/kinematics';
import { projectRadar } from '@/calc/hud/projection';
import { DEFAULT_SEED, buildScenario, simTimeAt } from '@/calc/hud/scenario';
import type { HudPoint } from '@/calc/hud/types';
import type { AtsAirspace } from '@/lib/content';
import styles from './AerodromeScope.module.css';

interface AerodromeScopeProps {
  center: HudPoint;
  icao: string;
  /** CTR/TMA zones (already fetched by the page); may be empty. */
  zones?: readonly AtsAirspace[];
  rangeNm?: number;
}

/** Zones whose centre lies within `rangeNm` of the scope centre. Pure. */
export function nearbyAirspaces(
  zones: readonly AtsAirspace[],
  center: HudPoint,
  rangeNm: number,
): AtsAirspace[] {
  return zones.filter((z) => {
    const gc = greatCircle(center.lat, center.lon, z.center[0], z.center[1]);
    return gc !== null && gc.distanceNm <= rangeNm;
  });
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * A miniature radar scope for one aerodrome: range rings around the field,
 * its nearby CTR/TMA rings, and the shared HUD training scenario's simulated
 * traffic passing within range. Same honesty posture as /hud — SIM-labelled,
 * never real traffic. Reduced motion paints one static frame; the canvas is
 * decorative to AT (the caption carries the meaning).
 */
export function AerodromeScope({ center, icao, zones = [], rangeNm = 120 }: AerodromeScopeProps) {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scenario = useMemo(() => buildScenario(DEFAULT_SEED), []);
  const near = useMemo(() => nearbyAirspaces(zones, center, rangeNm), [zones, center, rangeNm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ring = cssVar('--border-bright', '#26384a');
    const cyan = cssVar('--neon-cyan', '#3fe0ff');
    const green = cssVar('--neon-green', '#2bffb0');
    const ctr = cssVar('--cat-5', '#cf6b52');
    const tma = cssVar('--cat-1', '#4a9cb8');

    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (sweep: number) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const R = Math.min(cssW, cssH) / 2 - 8;
      if (R <= 0) return;
      ctx.clearRect(0, 0, cssW, cssH);

      ctx.strokeStyle = ring;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i += 1) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, (R * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Nearby controlled airspace — CTR solid, TMA dashed (shape not hue).
      for (const z of near) {
        const p = projectRadar(z.center[0], z.center[1], center, rangeNm);
        const zr = (z.radius_nm / rangeNm) * R;
        if (zr <= 0) continue;
        ctx.strokeStyle = z.type === 'CTR' ? ctr : tma;
        ctx.setLineDash(z.type === 'CTR' ? [] : [4, 3]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(cx + p.x * R, cy - p.y * R, zr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Sweep
      if (!reduce) {
        const trail = 1.1;
        const grad = ctx.createConicGradient(sweep - trail, cx, cy);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(trail / (Math.PI * 2), cyan);
        grad.addColorStop(trail / (Math.PI * 2) + 0.001, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, sweep - trail, sweep);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // Simulated traffic within range.
      const simMs = simTimeAt(Date.now());
      for (const spec of scenario.flights) {
        const s = flightStateAt(spec, simMs);
        if (!s) continue;
        const p = projectRadar(s.lat, s.lon, center, rangeNm);
        if (!p.inRange) continue;
        const x = cx + p.x * R;
        const y = cy - p.y * R;
        const a = Math.atan2(y - cy, x - cx);
        let delta = sweep - a;
        delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const lit = reduce ? 0.5 : Math.max(0, 1 - delta / 1.4);
        ctx.fillStyle = lit > 0.05 ? green : cyan;
        ctx.globalAlpha = 0.6 + lit * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 2.6 + lit, 0, Math.PI * 2);
        ctx.fill();
      }

      // The field itself.
      ctx.globalAlpha = 1;
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    resize();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            resize();
            if (reduce) draw(-Math.PI / 4);
          });
    observer?.observe(canvas);

    if (reduce) {
      draw(-Math.PI / 4);
      return () => observer?.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    let sweep = 0;
    const loop = (now: number) => {
      sweep = (sweep + ((now - last) / 1000) * 0.9) % (Math.PI * 2);
      last = now;
      draw(sweep);
      raf = requestAnimationFrame(loop);
    };
    // Pause the loop while the tab is hidden (the HUD globe's pattern) — the
    // sweep resumes from wherever it was, nothing else carries state.
    const start = () => {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, [center, near, rangeNm, reduce, scenario]);

  return (
    <section className={styles.scope} aria-labelledby="aero-scope-head">
      <div className={styles.head}>
        <h2 id="aero-scope-head" className={styles.title}>
          {t('aerodromesTool.scopeTitle', { icao })}
        </h2>
        <span className={styles.sim}>{t('aerodromesTool.simTag')}</span>
      </div>
      <div className={styles.frame}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      </div>
      <p className={styles.note}>{t('aerodromesTool.scopeNote')}</p>
    </section>
  );
}
