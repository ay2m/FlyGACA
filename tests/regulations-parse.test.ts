import { describe, expect, it } from 'vitest';
// The parser lib is a build-time ESM module (.mjs); import it directly so the same code that runs
// in CI is what's under test.
// @ts-expect-error — untyped .mjs build script
import { parseRegulationFile, buildLookup } from '../scripts/lib/regulations-parse.mjs';

const part91 = `---
part: '91'
partNum: 91
title: General Operating and Flight Rules
category: airspace
slug: part-91
---

# Part 91 — General Operating and Flight Rules

## Subpart A — General

An air carrier must also comply with [Part 121](./part-121.md) and Part 135. Maintenance
follows Part 43. See § 91.205 for required equipment.

## Subpart C — Equipment

\`\`\`
Part 999 inside a code block must be ignored.
\`\`\`

Aerobatic limits are in § 91.303.
`;

const part121 = `---
part: '121'
partNum: 121
title: Operating Requirements
category: operations
slug: part-121
---

# Part 121

## Subpart A — General

The general rules of [Part 91](./part-91.md) continue to apply.
`;

describe('parseRegulationFile', () => {
  it('parses frontmatter and the document section outline', () => {
    const rec = parseRegulationFile({ slug: 'part-91', raw: part91 });
    expect(rec.partNum).toBe(91);
    expect(rec.title).toBe('General Operating and Flight Rules');
    expect(rec.category).toBe('airspace');
    expect(rec.sections).toEqual(['Subpart A — General', 'Subpart C — Equipment']);
  });

  it('extracts cross-references from both link nodes and prose, excluding self and code blocks', () => {
    const rec = parseRegulationFile({ slug: 'part-91', raw: part91 });
    // Part 121 (link), Part 135 + Part 43 (prose). NOT part-91 (self) or part-999 (code block).
    expect(rec.references).toEqual(['part-43', 'part-121', 'part-135']);
    expect(rec.references).not.toContain('part-91');
    expect(rec.references).not.toContain('part-999');
  });

  it('extracts section (§) citations', () => {
    const rec = parseRegulationFile({ slug: 'part-91', raw: part91 });
    expect(rec.sectionRefs).toEqual(['§ 91.205', '§ 91.303']);
  });

  it('throws when required frontmatter is missing', () => {
    const bad = part91.replace('category: airspace\n', '');
    expect(() => parseRegulationFile({ slug: 'part-91', raw: bad })).toThrow(
      /missing required frontmatter/,
    );
  });

  it('throws when slug disagrees with the filename stem', () => {
    expect(() => parseRegulationFile({ slug: 'part-92', raw: part91 })).toThrow(
      /must equal the filename stem/,
    );
  });
});

describe('buildLookup', () => {
  const records = [
    parseRegulationFile({ slug: 'part-91', raw: part91 }),
    parseRegulationFile({ slug: 'part-121', raw: part121 }),
  ];
  // Canonical registry stand-in: all the real Parts the seeds reference.
  const knownParts = new Set(['part-43', 'part-91', 'part-121', 'part-135']);

  it('builds the reverse referencedBy graph', () => {
    const lookup = buildLookup(records, { knownParts, generated: '2026-06-26' });
    expect(lookup.count).toBe(2);
    expect(lookup.index.byPart).toEqual(['part-91', 'part-121']);
    // part-121 is cited by part-91; part-91 is cited by part-121.
    expect(lookup.index.referencedBy['part-121']).toEqual(['part-91']);
    expect(lookup.index.referencedBy['part-91']).toEqual(['part-121']);
  });

  it('throws listing every unresolved cross-reference', () => {
    const incomplete = new Set(['part-91', 'part-121']); // missing part-43 and part-135
    expect(() => buildLookup(records, { knownParts: incomplete })).toThrow(
      /Unresolved cross-reference/,
    );
    expect(() => buildLookup(records, { knownParts: incomplete })).toThrow(/part-91 → part-43/);
  });
});
