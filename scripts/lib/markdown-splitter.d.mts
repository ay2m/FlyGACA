/**
 * Hand-written declarations for the plain-ESM corpus splitter, typing only what
 * the Vitest suite imports. Keep in sync with markdown-splitter.mjs.
 */
export interface HtmlNode {
  tag: string;
  text: string;
}
export interface PartChunk {
  document: string;
  subpart: string | null;
  section: string | null;
  title: string;
  anchor: string;
  paragraph?: string;
  sub_paragraph?: string;
  text: string;
  effective_date: string | null;
  [key: string]: unknown;
}
export function tokenizeHtml(html: string): HtmlNode[];
export function isRunningHeaderNoise(node: HtmlNode): boolean;
export function subpartOf(node: HtmlNode): string | null;
export function isSectionHeading(node: HtmlNode, part: string): boolean;
export function buildAnchor(part: string | number, section: string): string;
export function levelOf(key: string, stack?: (string | undefined)[]): number;
export function parseMarkers(text: string): { key: string; text: string }[];
export function splitPartHtml(
  html: string,
  meta: { slug: string; part: string; title: string; effectiveDate?: string | null },
): PartChunk[];
