/**
 * Saved tool presets — a pilot stores a calculator's inputs (which live in the
 * URL query) under a name, to reload later. Pure list maths only; the page owns
 * localStorage (key `flygaca:tool-presets`). No DOM imports → unit-testable.
 */

export interface Preset {
  /** Tool route the preset belongs to, e.g. `/tools/weight-balance`. */
  path: string;
  /** User-given name. */
  name: string;
  /** The tool's URL query string (without the leading `?`). */
  query: string;
}

/** Cap on stored presets, so the list can't grow unbounded. */
const MAX_PRESETS = 50;

/**
 * Add (or replace, by path+name) a preset and return a new list, newest-first,
 * pruned to `max`. Pure — never mutates `list`. A blank name is ignored.
 */
export function addPreset(list: Preset[], preset: Preset, max = MAX_PRESETS): Preset[] {
  const name = preset.name.trim();
  if (!name) return list;
  const clean: Preset = { path: preset.path, name, query: preset.query };
  const without = list.filter((p) => !(p.path === clean.path && p.name === name));
  return [clean, ...without].slice(0, max);
}

/** Remove the preset matching path+name (pure). */
export function removePreset(list: Preset[], path: string, name: string): Preset[] {
  return list.filter((p) => !(p.path === path && p.name === name));
}

/** The presets for one tool path, in stored order. */
export function presetsFor(list: Preset[], path: string): Preset[] {
  return list.filter((p) => p.path === path);
}

/** Defensively parse whatever was in localStorage into a clean preset list. */
export function normalizePresets(raw: unknown): Preset[] {
  if (!Array.isArray(raw)) return [];
  const out: Preset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Partial<Preset>;
    if (typeof p.path !== 'string' || typeof p.name !== 'string') continue;
    if (!p.name.trim()) continue;
    out.push({ path: p.path, name: p.name, query: typeof p.query === 'string' ? p.query : '' });
  }
  return out;
}
