import { describe, expect, it } from 'vitest';
import {
  TOOL_REGULATIONS,
  regulationForRoute,
  regulationLink,
  toolsForPartSlug,
} from '@/lib/toolRegulations';
import { TOOLS } from '@/lib/tools';

// The tool ↔ library cross-link map that powers the governing-regulation link on
// tool pages and the reciprocal "flight tools for this Part" list on Part pages.
describe('toolRegulations', () => {
  it('maps only to real, live tool ids', () => {
    const live = new Set(TOOLS.map((tl) => tl.id));
    for (const reg of TOOL_REGULATIONS) expect(live.has(reg.toolId)).toBe(true);
  });

  it('resolves the governing regulation from a tool route', () => {
    expect(regulationForRoute('/tools/oxygen')?.part).toBe('91');
    expect(regulationForRoute('/tools/part61-currency')?.section).toBe('61.57');
    // Query/hash on the route must not defeat the match.
    expect(regulationForRoute('/tools/oxygen?nums.alt=12000')?.toolId).toBe('oxygen');
    expect(regulationForRoute('/tools/tas')).toBeNull();
    expect(regulationForRoute('/library/part-91')).toBeNull();
  });

  it('builds a Part link, appending the section anchor only when present', () => {
    expect(
      regulationLink({ toolId: 'oxygen', part: '91', section: '91.211', anchor: 'sec-91-211' }),
    ).toEqual({ to: '/library/part-91#sec-91-211', label: 'GACAR §91.211' });
    // No verified clean anchor → land on the Part page top, still labelled by section.
    expect(regulationLink({ toolId: 'vfr-minima', part: '91', section: '91.155' })).toEqual({
      to: '/library/part-91',
      label: 'GACAR §91.155',
    });
  });

  it('inverts the map to the tools governed by a Part slug', () => {
    const ids = toolsForPartSlug('part-91').map((r) => r.toolId);
    expect(ids).toContain('oxygen');
    expect(ids).toContain('vfr-minima');
    expect(toolsForPartSlug('part-61').every((r) => r.part === '61')).toBe(true);
    expect(toolsForPartSlug('reference-index')).toEqual([]);
    expect(toolsForPartSlug(undefined)).toEqual([]);
  });
});
