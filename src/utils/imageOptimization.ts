/**
 * Image optimization utilities for responsive loading and WebP/AVIF modern formats.
 */

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function getOptimizedImageAttrs({
  src,
  alt,
  width,
  height,
  priority = false,
}: OptimizedImageProps) {
  return {
    src,
    alt,
    width,
    height,
    loading: priority ? ('eager' as const) : ('lazy' as const),
    decoding: priority ? ('sync' as const) : ('async' as const),
    fetchPriority: priority ? ('high' as const) : ('auto' as const),
  };
}

export function generateSrcSet(basePath: string, widths: number[] = [320, 640, 960, 1280]): string {
  const extMatch = basePath.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) return basePath;
  const ext = extMatch[1];
  const stem = basePath.replace(new RegExp(`\\.${ext}$`), '');

  return widths.map((w) => `${stem}-${w}w.${ext} ${w}w`).join(', ');
}

