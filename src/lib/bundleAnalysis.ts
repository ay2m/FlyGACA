/**
 * Client and build-time bundle size analysis and budget checking.
 */

export interface ChunkBudget {
  name: string;
  maxSizeKiB: number;
}

export const DEFAULT_CHUNK_BUDGETS: ChunkBudget[] = [
  { name: 'initial', maxSizeKiB: 150 },
  { name: 'vendor-react', maxSizeKiB: 140 },
  { name: 'vendor-framer', maxSizeKiB: 95 },
  { name: 'feature-chat', maxSizeKiB: 80 },
  { name: 'feature-study', maxSizeKiB: 75 },
];

export interface BundleReport {
  totalSizeKiB: number;
  chunks: Array<{ name: string; sizeKiB: number; passed: boolean }>;
  allPassed: boolean;
}

export function evaluateBundle(chunks: Array<{ name: string; sizeBytes: number }>): BundleReport {
  let totalBytes = 0;
  const evaluatedChunks = chunks.map((chunk) => {
    const sizeKiB = parseFloat((chunk.sizeBytes / 1024).toFixed(2));
    totalBytes += chunk.sizeBytes;
    const budget = DEFAULT_CHUNK_BUDGETS.find((b) => b.name === chunk.name);
    const maxSize = budget ? budget.maxSizeKiB : 140;
    return {
      name: chunk.name,
      sizeKiB,
      passed: sizeKiB <= maxSize,
    };
  });

  const totalSizeKiB = parseFloat((totalBytes / 1024).toFixed(2));
  const allPassed = evaluatedChunks.every((c) => c.passed) && totalSizeKiB <= 350;

  return {
    totalSizeKiB,
    chunks: evaluatedChunks,
    allPassed,
  };
}

