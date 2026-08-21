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
  // Performance & runway
  crosswind: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 61, section: '1', title: 'General' },
    { part: 21, section: '1', title: 'General Provisions' },
  ],
  'takeoff-landing': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '3', title: 'Aircraft Design' },
  ],
  tas: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  mach: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 61, section: '3', title: 'Pilot Qualifications' },
  ],
  'climb-gradient': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 25, section: '1', title: 'General' },
  ],
  'descent-vdp': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  'density-altitude': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  'standard-rate-turn': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 61, section: '3', title: 'Pilot Qualifications' },
  ],
  'top-of-descent': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'top-of-climb': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],

  // Atmosphere & weather
  metar: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],
  notam: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],
  altimeter: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  isa: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 23, section: '1', title: 'General' },
  ],
  'pressure-altitude': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '2', title: 'Flight Crew' },
  ],
  'true-altitude': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'cloud-base': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '1', title: 'General' },
  ],

  // Navigation & planning
  'wind-triangle': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'great-circle': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'one-in-sixty': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  tsd: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'critical-point': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'zulu-clock': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '1', title: 'General Provisions' },
  ],
  airac: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],
  'sun-times': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '1', title: 'General' },
  ],

  // Weight & fuel
  'weight-balance': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 21, section: '8', title: 'Airworthiness Standards' },
  ],
  fuel: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'specific-range': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],

  // Procedures & airspace
  holding: [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 5, section: '1', title: 'Holding Procedures' },
  ],
  'procedural-separation': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'vfr-brief': [
    { part: 1, section: '1', title: 'Definitions' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],

  // Regulations & currency
  'part61-currency': [
    { part: 61, section: '57', title: 'Recent Flight Experience' },
    { part: 61, section: '63', title: 'Proficiency Check Requirement' },
  ],
  'vfr-minima': [
    { part: 91, section: '1', title: 'General' },
    { part: 11, section: '1', title: 'Airspace Definitions' },
  ],
  oxygen: [
    { part: 91, section: '3', title: 'General Operating Limitations' },
    { part: 61, section: '3', title: 'Pilot Qualifications' },
  ],
  'fuel-reserves': [
    { part: 121, section: '3', title: 'General Operating Limitations' },
    { part: 91, section: '3', title: 'General Operating Limitations' },
  ],
  'medical-validity': [
    { part: 67, section: '1', title: 'Applicability' },
    { part: 61, section: '3', title: 'Pilot Qualifications' },
  ],
  'flight-review': [
    { part: 61, section: '56', title: 'Flight Review' },
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
