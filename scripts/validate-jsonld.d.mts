/**
 * Hand-written declarations for the plain-ESM JSON-LD gate, typing only what the
 * Vitest suite imports. Keep in sync with validate-jsonld.mjs.
 */
export function extractLdBlocks(html: string): string[];
export function nodesFromLd(parsed: unknown): Record<string, unknown>[];
export function validateNode(node: unknown, where?: string): string[];
export function isContentRoute(relPath: string): boolean;
export function hasManagedLd(html: string): boolean;
export function validateHtml(html: string, label?: string): string[];
