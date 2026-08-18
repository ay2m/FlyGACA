/**
 * Deterministic layout for the library constellation map: every GACAR Part is
 * a star placed in its category's angular sector (golden-ratio fan, same idea
 * as the home radar's buildBlips), sized by how often other Parts reference
 * it; the real cross-references from regulations-lookup.json become the
 * constellation lines. Pure geometry in unit coordinates — the canvas scales.
 */

export interface ConstellationPart {
  slug: string;
  part: string;
  partNum: number;
  title: string;
  category: string;
  references?: string[];
}

export interface ConstellationNode {
  slug: string;
  part: string;
  title: string;
  category: string;
  /** Unit disc coordinates, y up. */
  x: number;
  y: number;
  /** Visual weight from inbound reference count. */
  r: number;
  /** 0-based category index, for palette rotation. */
  catIndex: number;
}

export interface ConstellationEdge {
  from: string;
  to: string;
}

export interface ConstellationLayout {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
}

const GOLDEN = 0.61803;

export function buildConstellation(parts: readonly ConstellationPart[]): ConstellationLayout {
  // Sorted so sector assignment is stable regardless of the input ordering.
  const categories = [...new Set(parts.map((p) => p.category))].sort();
  const bySlug = new Map(parts.map((p) => [p.slug, p]));

  // Inbound-reference degree drives node size: hub Parts read bigger.
  const inbound = new Map<string, number>();
  const edges: ConstellationEdge[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    for (const ref of p.references ?? []) {
      if (!bySlug.has(ref) || ref === p.slug) continue;
      const key = `${p.slug}→${ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: p.slug, to: ref });
      inbound.set(ref, (inbound.get(ref) ?? 0) + 1);
    }
  }

  const perCat = new Map<string, number>();
  for (const p of parts) perCat.set(p.category, (perCat.get(p.category) ?? 0) + 1);

  const counters = new Map<string, number>();
  const nCat = Math.max(1, categories.length);
  const sectorWidth = ((Math.PI * 2) / nCat) * 0.84;

  const nodes: ConstellationNode[] = [...parts]
    .sort((a, b) => a.partNum - b.partNum)
    .map((p) => {
      const catIndex = Math.max(0, categories.indexOf(p.category));
      const idx = counters.get(p.category) ?? 0;
      counters.set(p.category, idx + 1);
      const total = perCat.get(p.category) ?? 1;
      // Sector centred per category, top-first; fan within by golden offset.
      const base = (catIndex / nCat) * Math.PI * 2 - Math.PI / 2;
      const frac = ((idx * GOLDEN) % 1) - 0.5;
      const angle = base + frac * sectorWidth;
      const radius = total <= 1 ? 0.6 : 0.34 + (idx / (total - 1)) * 0.56;
      const degree = inbound.get(p.slug) ?? 0;
      return {
        slug: p.slug,
        part: p.part,
        title: p.title,
        category: p.category,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: 2.2 + Math.min(4, degree * 0.6),
        catIndex,
      };
    });

  return { nodes, edges };
}
