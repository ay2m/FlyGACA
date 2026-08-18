import { describe, expect, it } from 'vitest';
import { TOOLS, TOOL_CATEGORIES } from '@/lib/tools';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

describe('tools registry', () => {
  it('has unique ids and /tools/ routes', () => {
    const ids = TOOLS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tool of TOOLS) {
      expect(tool.route.startsWith('/tools/'), `${tool.id} route`).toBe(true);
    }
  });

  it('every tool belongs to a known category', () => {
    for (const tool of TOOLS) {
      expect(TOOL_CATEGORIES, `${tool.id} category`).toContain(tool.category);
    }
  });

  it('every tool has a bilingual name + blurb', () => {
    const items = (lang: typeof en) =>
      lang.tools.items as Record<string, { name: string; blurb: string }>;
    for (const tool of TOOLS) {
      expect(items(en)[tool.id]?.name, `en name ${tool.id}`).toBeTruthy();
      expect(items(en)[tool.id]?.blurb, `en blurb ${tool.id}`).toBeTruthy();
      expect(items(ar as typeof en)[tool.id]?.name, `ar name ${tool.id}`).toBeTruthy();
      expect(items(ar as typeof en)[tool.id]?.blurb, `ar blurb ${tool.id}`).toBeTruthy();
    }
  });

  it('every category has a bilingual label', () => {
    const cats = (lang: typeof en) => lang.tools.categories as Record<string, string>;
    for (const cat of TOOL_CATEGORIES) {
      expect(cats(en)[cat], `en cat ${cat}`).toBeTruthy();
      expect(cats(ar as typeof en)[cat], `ar cat ${cat}`).toBeTruthy();
    }
  });
});
