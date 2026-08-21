/**
 * Hand-written declarations for the plain-ESM deploy script, typing only the pure
 * planners the Vitest suite imports. Keep in sync with deploy-web.mjs.
 */
export interface DeployStep {
  label: string;
  argv: string[];
}
export function gsWildcards(glob: string, bucket: string): string[];
export function shellQuote(argv: string[]): string;
export function buildPlan(opts: {
  webBucket: string;
  dataBucket?: string | null;
  urlMap?: string | null;
  dist?: string;
  corpus?: string;
}): DeployStep[];
