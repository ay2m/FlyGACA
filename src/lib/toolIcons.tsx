/**
 * Category iconography for the tools surface.
 *
 * One icon family (Phosphor), one locked weight, mapped per tool category. These
 * replace the platform emoji the hub used to render — crisp, consistent and
 * on-brand across devices. Icons are decorative (the category label carries the
 * meaning), so every glyph is `aria-hidden`.
 *
 * Imported only by the lazy `/tools` route chunk and the calculator pages, so it
 * never enters the initial JS bundle.
 */
import type { Icon, IconWeight } from '@phosphor-icons/react';
import {
  Gauge,
  CloudSun,
  Compass,
  GasPump,
  AirTrafficControl,
  ClipboardText,
  BookOpen,
} from '@phosphor-icons/react';
import type { ToolCategoryId } from '@/lib/tools';

/** The locked stroke weight for the whole tools surface. */
export const TOOL_ICON_WEIGHT: IconWeight = 'regular';

const CATEGORY_ICONS: Record<ToolCategoryId, Icon> = {
  performance: Gauge,
  'atmosphere-weather': CloudSun,
  navigation: Compass,
  'weight-fuel': GasPump,
  procedures: AirTrafficControl,
  regulations: ClipboardText,
  reference: BookOpen,
};

interface CategoryIconProps {
  cat: ToolCategoryId;
  /** Pixel size of the glyph; inherits the locked weight by default. */
  size?: number;
  className?: string;
}

/** Decorative category glyph — the visible category label carries the meaning. */
export function CategoryIcon({ cat, size = 20, className }: CategoryIconProps) {
  const Glyph = CATEGORY_ICONS[cat];
  return <Glyph size={size} weight={TOOL_ICON_WEIGHT} className={className} aria-hidden />;
}
