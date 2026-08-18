/** Resolve a simulation waypoint code to its localized display name. */
type T = (key: string, options?: Record<string, unknown>) => string;

export function waypointName(code: string, t: T): string {
  if (code === 'ZONE-A') return t('hud.corridor.a');
  if (code === 'ZONE-B') return t('hud.corridor.b');
  if (code.startsWith('PAD-')) return t(`hud.pads.${code}`, { defaultValue: code });
  return t(`hud.airports.${code}`, { defaultValue: code });
}
