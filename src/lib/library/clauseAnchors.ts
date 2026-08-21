/**
 * Add clause-level anchor IDs to regulation HTML based on heading structure.
 * Enables deep-linking to specific sections like Part 61.57 (Recent Flight Experience).
 *
 * Pattern: detect "§ 61.57" or "61.57" in headings, generate id="gacar-part-61-57"
 */

import type { ToolLibraryCrosslink } from './toolLibraryCrosslinks';

/**
 * Extract Part number from a document slug (e.g., "part-61" → "61").
 */
export function extractPartNumber(slug: string): number | null {
  const match = slug.match(/part-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse section number from text. For Part-Section format (e.g., "61.57"),
 * return only the section part. For standalone sections (e.g., "Section 3"), return as-is.
 */
function parseSection(text: string): string | null {
  // Look for Part.Section patterns like "61.57" and extract just the section ".57"
  const fullMatch = text.match(/§?\s*\d+(\.\d+(?:\.\d+)?)/);
  if (fullMatch) {
    // "61.57" → ".57", then strip the dot → "57"
    return fullMatch[1].substring(1);
  }

  // Standalone section patterns: "§ 3", "Section 3"
  const patterns = [
    /Section\s+(\d+(?:\.\d+)*)/i,
    /§\s+(\d+(?:\.\d+)*)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate a clause anchor ID (e.g., "gacar-part-61-57" for Part 61.57).
 */
export function generateClauseAnchorId(part: number, section: string): string {
  const cleanSection = section.replace(/\./g, '-');
  return `gacar-part-${part}-${cleanSection}`;
}

/**
 * Enhance regulation HTML by adding clause-level anchor IDs to headings.
 * For each heading that contains a section reference, generates an id attribute.
 *
 * @param html - The regulation HTML
 * @param partNumber - The Part number (e.g., 61 for "part-61")
 * @returns Enhanced HTML with clause-level IDs
 */
export function addClauseAnchors(html: string, partNumber: number): string {
  // Match h2 and h3 tags, extract their text, detect sections, add id if missing
  return html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, level, attrs, content) => {
      const section = parseSection(content);
      if (!section) return match; // No section found, keep original

      // If heading already has an id, keep it
      if (/id="/.test(attrs)) return match;

      // Generate new ID and inject it
      const anchorId = generateClauseAnchorId(partNumber, section);
      const newAttrs = `${attrs} id="${anchorId}"`;
      return `<h${level}${newAttrs}>${content}</h${level}>`;
    }
  );
}
