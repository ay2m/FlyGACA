import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { subsolarPoint } from '@/calc/sun';
import { flightStateAt, trailFor } from '@/calc/hud/kinematics';
import { KSA_OUTLINE } from '@/calc/hud/geoKsa';
import {
  circlePoints,
  clampZoom,
  destPoint,
  dragToRotation,
  graticule,
  nightPath,
  normLon,
  projectOrtho,
  projectRadar,
  sampleGreatCircle,
} from '@/calc/hud/projection';
import type { Camera } from '@/calc/hud/projection';
import { DRONE_CORRIDOR, HUBS, simTimeAt } from '@/calc/hud/scenario';
import type { FleetKind, FlightState, HudPoint, Scenario } from '@/calc/hud/types';
import type { AtsAirspace } from '@/lib/content';
import styles from './GlobeCanvas.module.css';

export type HudMode = 'globe' | 'radar';
export type FleetFilter = 'all' | 'commercial' | 'drone';

interface GlobeCanvasProps {
  scenario: Scenario;
  /** Real AIP CTR/TMA geometry (fetched; the canvas works fine with none). */
  zones: AtsAirspace[];
  mode: HudMode;
  filter: FleetFilter;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Bumped by the "re-center" button; eases the camera onto the selection. */
  recenterToken: number;
  /** Localized overlay chips supplied by the page (kept out of the raster). */
  sectorLabel: string;
  bandLabel: string;
  statusLabel: string;
  status: 'safe' | 'busy';
  activeFlights: number;
}

interface ZoneRing {
  kind: 'ctr' | 'tma';
  ring: HudPoint[];
}

/** Read a CSS custom property off :root so canvas paint stays token-driven. */
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const matchesFilter = (kind: FleetKind, filter: FleetFilter): boolean =>
  filter === 'all' ? true : filter === 'commercial' ? kind === 'jet' : kind === 'drone';

/** Home view over the Kingdom (zoomed so the peninsula fills the viewport). */
const HOME_CAM: Camera = { lat0: 24.5, lon0: 45, zoom: 2.6 };
const GRATICULE = graticule(15);
const CORRIDOR_LINE = sampleGreatCircle(DRONE_CORRIDOR.a, DRONE_CORRIDOR.b, 12);

interface Palette {
  grid: string;
  outline: string;
  cyan: string;
  green: string;
  dim: string;
  shade: string;
  ctr: string;
  tma: string;
  mono: string;
}

const readPalette = (): Palette => ({
  grid: cssVar('--border', '#1d2b3a'),
  outline: cssVar('--border-bright', '#26384a'),
  cyan: cssVar('--neon-cyan', '#3fe0ff'),
  green: cssVar('--neon-green', '#2bffb0'),
  dim: cssVar('--text-dim', '#8a95a1'),
  shade: cssVar('--shade', '#000'),
  ctr: cssVar('--cat-5', '#cf6b52'),
  tma: cssVar('--cat-1', '#4a9cb8'),
  mono: cssVar('--font-mono', 'ui-monospace, monospace'),
});

/**
 * The HUD viewport: an orthographic globe (drag to rotate, wheel/pinch to zoom,
 * click to select) or an azimuthal radar scope, both painted from the same
 * closed-form flight states. Canvas mechanics follow the home RadarWidget —
 * devicePixel scaling, token-driven paint, a single static frame under reduced
 * motion, percentage-positioned tooltip over the unmirrored raster (RTL-safe) —
 * plus a theme MutationObserver so a mid-session theme switch repaints.
 * The canvas is decorative to AT; the vector list is the accessible interface.
 */
export function GlobeCanvas({
  scenario,
  zones,
  mode,
  filter,
  selectedId,
  onSelect,
  recenterToken,
  sectorLabel,
  bandLabel,
  statusLabel,
  status,
  activeFlights,
}: GlobeCanvasProps) {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tip, setTip] = useState<{ text: string; left: number; top: number } | null>(null);
  const lastTip = useRef<string | null>(null);

  // Camera + interaction state live in refs: the rAF loop reads them without
  // any per-frame React work.
  const camRef = useRef<Camera>({ ...HOME_CAM });
  const targetRef = useRef<Camera | null>(null);
  const scopeRef = useRef<HudPoint>({ ...scenario.sectors[0].center });
  const interactedRef = useRef(false);
  const drawNowRef = useRef<() => void>(() => {});
  const screenPtsRef = useRef<{ id: string; x: number; y: number; text: string }[]>([]);

  const zoneRings = useMemo<ZoneRing[]>(
    () =>
      zones
        .map((z) => {
          const kind: ZoneRing['kind'] = z.type === 'CTR' ? 'ctr' : 'tma';
          if (z.polygon && z.polygon.length >= 3) {
            return { kind, ring: z.polygon.map(([lat, lon]) => ({ lat, lon })) };
          }
          if (z.radius_nm > 0) {
            const center = { lat: z.center[0], lon: z.center[1] };
            return { kind, ring: circlePoints(center, z.radius_nm, 48) };
          }
          return null;
        })
        .filter((r): r is ZoneRing => r !== null),
    [zones],
  );

  const routeArc = useMemo<HudPoint[] | null>(() => {
    const spec = scenario.flights.find((f) => f.id === selectedId);
    return spec ? sampleGreatCircle(spec.from, spec.to, 64) : null;
  }, [scenario, selectedId]);

  // Mirror the reactive props into a ref for the loop.
  const propsRef = useRef({ mode, filter, selectedId, zoneRings, routeArc, onSelect });
  useEffect(() => {
    propsRef.current = { mode, filter, selectedId, zoneRings, routeArc, onSelect };
    if (reduce) drawNowRef.current();
  }, [mode, filter, selectedId, zoneRings, routeArc, onSelect, reduce]);

  // Re-center: ease the camera (or the radar scope) onto the selected flight.
  useEffect(() => {
    if (recenterToken === 0) return;
    const spec = scenario.flights.find((f) => f.id === propsRef.current.selectedId);
    const state = spec ? flightStateAt(spec, simTimeAt(Date.now())) : null;
    if (!state) return;
    interactedRef.current = true;
    if (propsRef.current.mode === 'radar') {
      scopeRef.current = { lat: state.lat, lon: state.lon };
    } else {
      const target = { lat0: state.lat, lon0: state.lon, zoom: Math.max(camRef.current.zoom, 2.4) };
      if (reduce) camRef.current = target;
      else targetRef.current = target;
    }
    if (reduce) drawNowRef.current();
  }, [recenterToken, scenario, reduce]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let palette = readPalette();
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

    // ——— shared draw helpers ———————————————————————————————————————————

    const discRadius = () => (Math.min(cssW, cssH) / 2 - 10) * camRef.current.zoom;

    const strokePolyline = (pts: HudPoint[], cx: number, cy: number, R: number) => {
      let pen = false;
      ctx.beginPath();
      for (const p of pts) {
        const q = projectOrtho(p.lat, p.lon, camRef.current);
        if (!q.visible) {
          pen = false;
          continue;
        }
        const x = cx + q.x * R;
        const y = cy - q.y * R;
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    };

    const glyph = (x: number, y: number, angle: number, kind: FleetKind, size: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (kind !== 'drone') ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      if (kind === 'jet') {
        ctx.moveTo(0, -size * 1.25);
        ctx.lineTo(size * 0.9, size);
        ctx.lineTo(0, size * 0.45);
        ctx.lineTo(-size * 0.9, size);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'ga') {
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.8, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.8, 0);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'heli') {
        ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-size, -size);
        ctx.lineTo(size, size);
        ctx.moveTo(size, -size);
        ctx.lineTo(-size, size);
        ctx.stroke();
      } else {
        ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.7);
        ctx.lineTo(0, -size * 1.6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    };

    // Trails move slowly — refresh the closed-form history every ~2 s of wall
    // time instead of every frame.
    let trailStamp = 0;
    let trailMap = new Map<string, FlightState[]>();
    const trailsAt = (simMs: number, wallNow: number) => {
      if (wallNow - trailStamp > 2000) {
        trailStamp = wallNow;
        trailMap = new Map();
        for (const spec of scenario.flights) {
          trailMap.set(spec.id, trailFor(spec, simMs, 8, 60_000));
        }
      }
      return trailMap;
    };

    let subsolarStamp = 0;
    let subsolar: HudPoint | null = null;
    const subsolarAt = (wallNow: number) => {
      if (wallNow - subsolarStamp > 60_000 || subsolar === null) {
        subsolarStamp = wallNow;
        subsolar = subsolarPoint(new Date());
      }
      return subsolar;
    };

    let sweep = 0;

    // ——— the frame ————————————————————————————————————————————————————

    const draw = (wallNow: number) => {
      const {
        mode: m,
        filter: fl,
        selectedId: sel,
        zoneRings: rings,
        routeArc: arc,
      } = propsRef.current;
      const cx = cssW / 2;
      const cy = cssH / 2;
      if (cssW <= 0 || cssH <= 0) return;
      const simMs = simTimeAt(Date.now());
      const states: FlightState[] = [];
      for (const spec of scenario.flights) {
        const s = flightStateAt(spec, simMs);
        if (s && matchesFilter(s.kind, fl)) states.push(s);
      }

      ctx.clearRect(0, 0, cssW, cssH);
      screenPtsRef.current = [];

      if (m === 'globe') {
        const R = discRadius();
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();

        // Graticule
        ctx.strokeStyle = palette.grid;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.55;
        for (const line of GRATICULE) strokePolyline(line, cx, cy, R);

        // Night side
        const sun = subsolarAt(wallNow);
        if (sun) {
          const shade = nightPath(sun, camRef.current);
          ctx.fillStyle = palette.shade;
          if (shade.kind === 'full') {
            ctx.globalAlpha = 0.22;
            ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
          } else if (shade.kind === 'path') {
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            shade.points.forEach((p, i) => {
              const x = cx + p.x * R;
              const y = cy - p.y * R;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
          }
        }

        // Kingdom outline: hairline plus a faint neon halo.
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = palette.cyan;
        ctx.lineWidth = 3;
        for (const ring of KSA_OUTLINE) strokePolyline([...ring], cx, cy, R);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 1.2;
        for (const ring of KSA_OUTLINE) strokePolyline([...ring], cx, cy, R);

        // Airspace zones — CTR solid, TMA dashed (shape, not hue, carries the
        // distinction: the cockpit theme collapses the accent hues to amber).
        for (const zone of rings) {
          ctx.strokeStyle = zone.kind === 'ctr' ? palette.ctr : palette.tma;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1;
          ctx.setLineDash(zone.kind === 'tma' ? [4, 3] : []);
          strokePolyline(zone.ring, cx, cy, R);
        }
        ctx.setLineDash([]);

        // Simulated UAS corridor
        ctx.strokeStyle = palette.green;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        strokePolyline(CORRIDOR_LINE, cx, cy, R);
        ctx.setLineDash([]);

        // Hub aerodromes
        ctx.font = `600 9px ${palette.mono}`;
        for (const hubPt of HUBS) {
          const q = projectOrtho(hubPt.lat, hubPt.lon, camRef.current);
          if (!q.visible) continue;
          const x = cx + q.x * R;
          const y = cy - q.y * R;
          ctx.fillStyle = palette.dim;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(x, y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Labels only once the Kingdom is reasonably large, to avoid clutter.
          if (camRef.current.zoom >= 1.9) {
            ctx.globalAlpha = 0.7;
            ctx.fillText(hubPt.code, x + 4, y + 3);
          }
        }

        // Selected route arc with marching dashes.
        if (arc) {
          ctx.strokeStyle = palette.green;
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = -((wallNow / 60) % 1000);
          strokePolyline(arc, cx, cy, R);
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
        }

        // Trails then aircraft.
        const trails = trailsAt(simMs, wallNow);
        for (const s of states) {
          const past = trails.get(s.id) ?? [];
          ctx.strokeStyle = palette.cyan;
          ctx.lineWidth = 1.4;
          let prev = { lat: s.lat, lon: s.lon };
          past.forEach((p, i) => {
            ctx.globalAlpha = 0.4 * (1 - i / past.length);
            strokePolyline([prev, p], cx, cy, R);
            prev = p;
          });
        }
        for (const s of states) {
          const q = projectOrtho(s.lat, s.lon, camRef.current);
          if (!q.visible) continue;
          const x = cx + q.x * R;
          const y = cy - q.y * R;
          const aheadNm = Math.max(3, s.gsKt * 0.05);
          const ahead = destPoint({ lat: s.lat, lon: s.lon }, s.trackDeg, aheadNm);
          const qa = projectOrtho(ahead.lat, ahead.lon, camRef.current);
          const angle = Math.atan2(cy - qa.y * R - y, cx + qa.x * R - x);
          const isSel = s.id === sel;
          ctx.fillStyle = isSel ? palette.green : palette.cyan;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.globalAlpha = 0.95;
          glyph(x, y, angle, s.kind, s.kind === 'jet' ? 5.5 : 4);
          if (isSel) {
            const pulse = reduce ? 0 : (Math.sin(wallNow / 300) + 1) / 2;
            ctx.globalAlpha = 0.9;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, 10 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          screenPtsRef.current.push({
            id: s.id,
            x,
            y,
            text: `${s.callsign} · ${Math.round(s.altFt).toLocaleString()} FT`,
          });
        }

        ctx.restore();

        // Disc rim on top of the clipped content.
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }

      // ——— radar scope ———————————————————————————————————————————————
      const R = Math.min(cssW, cssH) / 2 - 12;
      const rangeNm = 480 / camRef.current.zoom;

      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i += 1) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.6;
      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        const inner = a % 90 === 0 ? R - 10 : R - 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R);
        ctx.stroke();
      }

      // Hub context dots.
      ctx.fillStyle = palette.dim;
      for (const hubPt of HUBS) {
        const p = projectRadar(hubPt.lat, hubPt.lon, scopeRef.current, rangeNm);
        if (!p.inRange) continue;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx + p.x * R, cy - p.y * R, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sweep wedge (skipped under reduced motion — the static scope stays legible).
      if (!reduce) {
        const trail = 1.1;
        const grad = ctx.createConicGradient(sweep - trail, cx, cy);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(trail / (Math.PI * 2), palette.cyan);
        grad.addColorStop(trail / (Math.PI * 2) + 0.001, 'rgba(0, 0, 0, 0)');
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, sweep - trail, sweep);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = palette.cyan;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
        ctx.stroke();
      }

      for (const s of states) {
        const p = projectRadar(s.lat, s.lon, scopeRef.current, rangeNm);
        if (!p.inRange) continue;
        const x = cx + p.x * R;
        const y = cy - p.y * R;
        const contactAngle = Math.atan2(y - cy, x - cx);
        let delta = sweep - contactAngle;
        delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const lit = reduce ? 0.6 : Math.max(0, 1 - delta / 1.4);
        const isSel = s.id === sel;
        ctx.fillStyle = isSel || lit > 0.05 ? palette.green : palette.cyan;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.globalAlpha = Math.min(1, 0.65 + lit * 0.35);
        const angle = ((s.trackDeg - 90) * Math.PI) / 180; // scope is north-up
        glyph(x, y, angle, s.kind, s.kind === 'jet' ? 5 : 3.6);
        if (isSel) {
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        screenPtsRef.current.push({
          id: s.id,
          x,
          y,
          text: `${s.callsign} · ${Math.round(s.altFt).toLocaleString()} FT`,
        });
      }

      // Scope centre.
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.cyan;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    drawNowRef.current = () => draw(performance.now());

    // ——— interactions ———————————————————————————————————————————————————

    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;
    let velX = 0;
    let velY = 0;
    let lastMoveAt = 0;

    const hitTest = (mx: number, my: number) => {
      let best: { id: string; x: number; y: number; text: string } | null = null;
      let bestD = Infinity;
      for (const p of screenPtsRef.current) {
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best && bestD <= 14 ? best : null;
    };

    const localXY = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      interactedRef.current = true;
      targetRef.current = null;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = localXY(e);
      pointers.set(e.pointerId, { x, y });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      dragging = true;
      moved = false;
      lastX = x;
      lastY = y;
      velX = 0;
      velY = 0;
      lastMoveAt = performance.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = localXY(e);
      if (!dragging) {
        const hit = hitTest(x, y);
        if (hit) {
          if (lastTip.current !== hit.text) {
            lastTip.current = hit.text;
            setTip({ text: hit.text, left: (hit.x / cssW) * 100, top: (hit.y / cssH) * 100 });
          }
        } else if (lastTip.current !== null) {
          lastTip.current = null;
          setTip(null);
        }
        return;
      }
      pointers.set(e.pointerId, { x, y });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) {
          camRef.current = {
            ...camRef.current,
            zoom: clampZoom((camRef.current.zoom * d) / pinchDist),
          };
        }
        pinchDist = d;
        moved = true;
        if (reduce) drawNowRef.current();
        return;
      }
      const dx = x - lastX;
      const dy = y - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (propsRef.current.mode === 'globe') {
        const R = discRadius();
        camRef.current = dragToRotation(camRef.current, dx, dy, R);
        const now = performance.now();
        const dt = Math.max(1, now - lastMoveAt);
        velX = (dx / dt) * 1000;
        velY = (dy / dt) * 1000;
        lastMoveAt = now;
      }
      lastX = x;
      lastY = y;
      if (reduce) drawNowRef.current();
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size > 0) return;
      dragging = false;
      pinchDist = 0;
      if (!moved) {
        const { x, y } = localXY(e);
        const hit = hitTest(x, y);
        propsRef.current.onSelect(hit ? hit.id : null);
        velX = 0;
        velY = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interactedRef.current = true;
      targetRef.current = null;
      camRef.current = {
        ...camRef.current,
        zoom: clampZoom(camRef.current.zoom * Math.exp(-e.deltaY * 0.0016)),
      };
      if (reduce) drawNowRef.current();
    };

    const onLeave = () => {
      lastTip.current = null;
      setTip(null);
    };

    resize();

    // Guarded for environments without observers (jsdom, very old browsers) —
    // the canvas still paints at its initial size.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            resize();
            if (reduce) drawNowRef.current();
          });
    observer?.observe(canvas);

    // Theme switches re-point the tokens; re-read and repaint.
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      if (reduce) drawNowRef.current();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const removeListeners = () => {
      observer?.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
    };

    if (reduce) {
      drawNowRef.current();
      return removeListeners;
    }

    // ——— the animation loop (paused when hidden or scrolled offscreen) ———
    let raf = 0;
    let running = false;
    let last = performance.now();
    let onscreen = true;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // Gentle attract breathing over the Kingdom until the first interaction.
      if (!interactedRef.current && propsRef.current.mode === 'globe' && !targetRef.current) {
        camRef.current = {
          lat0: HOME_CAM.lat0 + 1.6 * Math.sin(now / 23_000),
          lon0: HOME_CAM.lon0 + 4 * Math.sin(now / 14_000),
          zoom: camRef.current.zoom,
        };
      }

      // Drag inertia.
      if (!dragging && (Math.abs(velX) > 4 || Math.abs(velY) > 4)) {
        const R = discRadius();
        camRef.current = dragToRotation(camRef.current, velX * dt, velY * dt, R);
        velX *= Math.exp(-dt * 3.2);
        velY *= Math.exp(-dt * 3.2);
      }

      // Eased re-center.
      const target = targetRef.current;
      if (target) {
        const k = 1 - Math.exp(-dt * 4.5);
        const cam = camRef.current;
        const dLon = normLon(target.lon0 - cam.lon0);
        camRef.current = {
          lat0: cam.lat0 + (target.lat0 - cam.lat0) * k,
          lon0: normLon(cam.lon0 + dLon * k),
          zoom: cam.zoom + (target.zoom - cam.zoom) * k,
        };
        if (Math.abs(target.lat0 - camRef.current.lat0) < 0.05 && Math.abs(dLon) < 0.05) {
          camRef.current = { ...target };
          targetRef.current = null;
        }
      }

      sweep = (sweep + dt * 0.9) % (Math.PI * 2);
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || document.hidden || !onscreen) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        onscreen = entries.some((e) => e.isIntersecting);
        if (onscreen) start();
        else stop();
      });
      io.observe(wrap);
    }

    start();

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      removeListeners();
    };
  }, [reduce, scenario]);

  const zoomBy = (factor: number) => {
    interactedRef.current = true;
    camRef.current = { ...camRef.current, zoom: clampZoom(camRef.current.zoom * factor) };
    if (reduce) drawNowRef.current();
  };

  return (
    <div ref={wrapRef} className={styles.viewport}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.overlay}>
        <span className={styles.chip}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
              fill="currentColor"
            />
          </svg>
          {sectorLabel}
        </span>
        <span className={styles.chip}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16.5l9 5 9-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <bdi dir="ltr">{bandLabel}</bdi>
        </span>
        <span className={`${styles.chip} ${status === 'safe' ? styles.chipSafe : styles.chipBusy}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2 4 5.5V11c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5.5L12 2Z"
              fill="currentColor"
            />
          </svg>
          {statusLabel}
        </span>
        <span className={styles.hint}>{t('hud.canvas.drag')}</span>
      </div>
      <div className={styles.zoomControls}>
        {/* Zoom is clamped in the camera, so the buttons never need disabling. */}
        <button type="button" onClick={() => zoomBy(1.3)} aria-label={t('hud.canvas.zoomIn')}>
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label={t('hud.canvas.zoomOut')}>
          −
        </button>
      </div>
      {tip && (
        <span
          className={styles.tooltip}
          style={{ left: `${tip.left}%`, top: `${tip.top}%` }}
          aria-hidden="true"
        >
          <bdi dir="ltr">{tip.text}</bdi>
        </span>
      )}
      <p className={styles.srOnly}>{t('hud.canvas.summary', { count: activeFlights })}</p>
    </div>
  );
}
