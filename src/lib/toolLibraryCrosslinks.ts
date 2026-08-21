/**
 * Tool ↔ Library cross-link mappings. Each tool links to the regulatory
 * sections that govern it, enabling users to "verify against GACA" and
 * AI systems to cite the exact regulation.
 *
 * Structure: tool ID → array of { part, section, title } references.
 * Example: "crosswind" → [{ part: 1, section: 1, title: "..." }]
 *
 * Maintain this as the tool registry evolves. Cross-links appear in:
 * - CalcShell footer (on the tool page)
 * - Library reader (reverse link: Part/section mentions the tool)
 */

export interface ToolLibraryCrosslink {
  part: number;
  section: string; // e.g., "1", "61.3", "61.133"
  title: string; // Human-readable section title
  excerpt?: string; // Optional snippet of the regulation
}

// Tool ID → array of governing regulation sections
const TOOL_CROSSLINKS: Record<string, ToolLibraryCrosslink[]> = {
  // Navigation & planning
  crosswind: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 61, section: '1', title: 'General' },
    { part: 21, section: '1', title: 'General Provisions' },
  ],
  holding: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 5, section: '1', title: 'Holding Procedures' },
  ],
  'weight-balance': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '8', title: 'Airworthiness Standards' },
  ],
  fuel: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  isa: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  'runway-landing': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '3', title: 'Aircraft Design' },
  ],
  'runway-takeoff': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '3', title: 'Aircraft Design' },
  ],
  'mach-number': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 61, section: '3', title: 'Pilot Qualifications' },
  ],
  'true-airspeed': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  'ground-speed': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],

  // Pilot currency & training
  currency: [
    { part: 61, section: '57', title: 'Recent Flight Experience' },
    { part: 61, section: '63', title: 'Proficiency Check Requirement' },
  ],
  'sun-times': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '1', title: 'General' },
  ],
  'zulu-clock': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '1', title: 'General Provisions' },
  ],
  airac: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],

  // Performance
  'density-altitude': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  'climb-gradient': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 25, section: '1', title: 'General' },
  ],
  'glide-path': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],

  // Decoding & reference
  metar: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],
  notam: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],
  'altimeter-setting': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
};

/**
 * Get cross-links for a tool.
 */
export function getToolCrosslinks(toolId: string): ToolLibraryCrosslink[] {
  return TOOL_CROSSLINKS[toolId] ?? [];
}

/**
 * Check if a tool has cross-links to the library.
 */
export function hasToolCrosslinks(toolId: string): boolean {
  return (toolId in TOOL_CROSSLINKS) && TOOL_CROSSLINKS[toolId].length > 0;
}
