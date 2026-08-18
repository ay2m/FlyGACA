import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import shared from './widgets.module.css';

interface StatValueProps {
  value: number;
  /** Fixed decimal places for the displayed number (default 0). */
  decimals?: number;
  className?: string;
}

/**
 * A big dashboard metric that counts up from zero on mount — a cockpit-gauge
 * micro-interaction on the shared kinetic-entry easing. The text node is driven
 * imperatively (no per-frame React render). Under reduced motion it shows the
 * final value immediately and never animates.
 */
export function StatValue({ value, decimals = 0, className }: StatValueProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fmt = (v: number) => v.toFixed(decimals);
    if (reduce) {
      node.textContent = fmt(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [value, decimals, reduce]);

  // The animated digits are hidden from assistive tech (they'd otherwise be
  // announced mid-count); a visually-hidden sibling carries the true final value.
  // Initial paint shows 0 while animating (avoids a flash of the final value),
  // or the value itself when motion is reduced.
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {(reduce ? value : 0).toFixed(decimals)}
      </span>
      <span className={shared.srOnly}>{value.toFixed(decimals)}</span>
    </span>
  );
}
