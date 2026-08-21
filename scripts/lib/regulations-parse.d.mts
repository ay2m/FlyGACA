/**
 * Hand-written declarations for the plain-ESM regulations parser, typing only
 * what the Vitest suite imports. Keep in sync with regulations-parse.mjs.
 */
export interface RegulationRecord {
  slug: string;
  partNum: number;
  part: string;
  title: string;
  category: string;
  references: string[];
  sectionRefs: string[];
  sections: string[];
}
export function parseRegulationFile(input: { slug: string; raw: string }): RegulationRecord;
export function buildLookup(
  records: RegulationRecord[],
  opts: { knownParts: number[]; generated: string },
): Record<string, unknown>;
