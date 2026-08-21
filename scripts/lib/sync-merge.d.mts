/**
 * Hand-written declarations for the plain-ESM sync-merge helper, typing only
 * what the Vitest suite imports. Records are loosely shaped by design — each
 * collection's JSON carries its own fields. Keep in sync with sync-merge.mjs.
 */
export type SyncRecord = Record<string, unknown>;
export interface CollectionConfig {
  arrayKey: string;
  diffKey: (r: SyncRecord) => string;
  changeKey: (r: SyncRecord) => string | null;
  describe: (r: SyncRecord) => string;
}
export const COLLECTIONS: Record<string, CollectionConfig>;
export function projectRecord(record: SyncRecord): SyncRecord;
export function partitionByBody(records: SyncRecord[]): {
  metadata: SyncRecord[];
  deferred: SyncRecord[];
};
export function mergeIndex(
  idx: Record<string, unknown>,
  cfg: CollectionConfig,
  changes?: { newRecs?: SyncRecord[]; changedRecs?: SyncRecord[] },
): Record<string, unknown>;
