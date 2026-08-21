import { describe, it, expect } from 'vitest';
import {
  extractPartNumber,
  generateClauseAnchorId,
  addClauseAnchors,
} from '@/lib/library/clauseAnchors';
import { getToolCrosslinks, hasToolCrosslinks } from '@/lib/toolLibraryCrosslinks';

describe('Clause Anchors', () => {
  describe('extractPartNumber', () => {
    it('extracts part number from slug', () => {
      expect(extractPartNumber('part-61')).toBe(61);
      expect(extractPartNumber('part-1')).toBe(1);
      expect(extractPartNumber('part-121')).toBe(121);
    });

    it('returns null for non-part slugs', () => {
      expect(extractPartNumber('reference-abc')).toBeNull();
      expect(extractPartNumber('handbook')).toBeNull();
    });
  });

  describe('generateClauseAnchorId', () => {
    it('generates anchor ID from part and section', () => {
      expect(generateClauseAnchorId(61, '57')).toBe('gacar-part-61-57');
      expect(generateClauseAnchorId(61, '1.1')).toBe('gacar-part-61-1-1');
      expect(generateClauseAnchorId(1, '1')).toBe('gacar-part-1-1');
    });
  });

  describe('addClauseAnchors', () => {
    it('adds anchor IDs to headings with section references', () => {
      const html = '<h2>§ 61.57 Recent Flight Experience</h2>';
      const result = addClauseAnchors(html, 61);
      expect(result).toContain('id="gacar-part-61-57"');
      expect(result).toContain('Recent Flight Experience');
    });

    it('preserves existing IDs', () => {
      const html = '<h2 id="existing">§ 61.57 Recent Flight Experience</h2>';
      const result = addClauseAnchors(html, 61);
      expect(result).toContain('id="existing"');
      expect(result).not.toContain('id="gacar-part-61-57"');
    });

    it('ignores headings without section references', () => {
      const html = '<h2>General Provisions</h2>';
      const result = addClauseAnchors(html, 61);
      expect(result).toBe(html); // No change
    });

    it('handles multiple headings', () => {
      const html = `
        <h2>§ 61.1 General</h2>
        <h2>§ 61.57 Recent Flight Experience</h2>
      `;
      const result = addClauseAnchors(html, 61);
      expect(result).toContain('id="gacar-part-61-1"');
      expect(result).toContain('id="gacar-part-61-57"');
    });
  });
});

describe('Tool Library Cross-links', () => {
  describe('getToolCrosslinks', () => {
    it('returns crosslinks for known tools', () => {
      const links = getToolCrosslinks('crosswind');
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveProperty('part');
      expect(links[0]).toHaveProperty('section');
      expect(links[0]).toHaveProperty('title');
    });

    it('returns empty array for unknown tools', () => {
      const links = getToolCrosslinks('unknown-tool');
      expect(links).toEqual([]);
    });
  });

  describe('hasToolCrosslinks', () => {
    it('returns true for tools with crosslinks', () => {
      expect(hasToolCrosslinks('crosswind')).toBe(true);
      expect(hasToolCrosslinks('holding')).toBe(true);
      expect(hasToolCrosslinks('fuel')).toBe(true);
    });

    it('returns false for tools without crosslinks', () => {
      expect(hasToolCrosslinks('unknown-tool')).toBe(false);
    });
  });

  describe('Crosswind tool', () => {
    it('has regulations for crosswind calculations', () => {
      const links = getToolCrosslinks('crosswind');
      const parts = links.map((l) => l.part);
      expect(parts).toContain(1); // Definitions
      expect(parts).toContain(61); // Pilot rules
      expect(parts).toContain(21); // Certification
    });
  });

  describe('Currency tool', () => {
    it('links to recent flight experience regulations', () => {
      const links = getToolCrosslinks('currency');
      expect(links.some((l) => l.section === '57')).toBe(true);
    });
  });
});
