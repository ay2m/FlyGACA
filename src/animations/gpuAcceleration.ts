import type { CSSProperties } from 'react';

/**
 * GPU acceleration helpers to prevent layout thrashing and enforce composite-layer rendering.
 */

export const GPU_LAYER_STYLE: CSSProperties = {
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
  perspective: 1000,
  WebkitFontSmoothing: 'subpixel-antialiased',
};

export const WILL_CHANGE_TRANSFORM: CSSProperties = {
  willChange: 'transform, opacity',
};

export const ISOLATED_LAYER: CSSProperties = {
  ...GPU_LAYER_STYLE,
  contain: 'layout style paint',
};

export function getHardwareAcceleration(enableWillChange = false): CSSProperties {
  return {
    ...GPU_LAYER_STYLE,
    ...(enableWillChange ? WILL_CHANGE_TRANSFORM : {}),
  };
}

