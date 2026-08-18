import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface CountUpProps {
  /** The final value to count to. */
  to: number;
  /** Duration of the count in ms. */
  duration?: number;
  /** Decimal places to render (default 0 — whole numbers). */
  decimals?: number;
}

/**
 * Counts up to `to` — from zero when it first scrolls into view (the hero "proof"
 * stats from the animated landing comp), and re-animating from the current figure
 * whenever `to` changes afterwards. That late-update path matters: hero stats often
 * arrive from async JSON or switch with a corpus tab, and a one-shot counter would
 * otherwise freeze on its first value. Honours reduced-motion by rendering the final
 * value immediately, and the live number is announced to assistive tech only as it settles.
 */
export function CountUp({ to, duration = 1300, decimals = 0 }: CountUpProps) {
  const reduce = usePrefersReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  // Latest rendered value, so a re-run (when `to` changes) eases from where we are.
  const valueRef = useRef(value);
  valueRef.current = value;
  // True once the readout has scrolled into view and run its first count.
  const seen = useRef(reduce);
  const frame = useRef(0);

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const animate = () => {
      cancelAnimationFrame(frame.current);
      const from = valueRef.current;
      if (from === to) return;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // easeOutCubic — fast then settling, matching the comp's counters.
        const eased = 1 - Math.pow(1 - p, 3);
        // Ease the raw figure; formatting to `decimals` happens at render so
        // fractional stats (e.g. logbook hours) count smoothly, not in jumps.
        setValue(from + (to - from) * eased);
        if (p < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    };

    // Already visible (e.g. a late `to` update from async data or a tab switch):
    // ease straight to the new figure without waiting to intersect again.
    if (seen.current) {
      animate();
      return () => cancelAnimationFrame(frame.current);
    }

    const run = () => {
      seen.current = true;
      animate();
    };

    if (!('IntersectionObserver' in window)) {
      run();
      return () => cancelAnimationFrame(frame.current);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [to, duration, reduce]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}
