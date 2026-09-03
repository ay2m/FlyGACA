import { describe, expect, it } from 'vitest';
import { evaluateBundle, DEFAULT_CHUNK_BUDGETS } from '@/lib/bundleAnalysis';

describe('bundleAnalysis', () => {
  it('exposes default chunk budgets', () => {
    expect(DEFAULT_CHUNK_BUDGETS.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_CHUNK_BUDGETS.find((b) => b.name === 'initial')?.maxSizeKiB).toBe(150);
  });

  it('evaluates passing bundle within size constraints', () => {
    const report = evaluateBundle([
      { name: 'initial', sizeBytes: 100 * 1024 },
      { name: 'vendor-react', sizeBytes: 120 * 1024 },
      { name: 'feature-chat', sizeBytes: 50 * 1024 },
    ]);

    expect(report.totalSizeKiB).toBe(270);
    expect(report.allPassed).toBe(true);
    expect(report.chunks.every((c) => c.passed)).toBe(true);
  });

  it('detects when an individual chunk exceeds its budget', () => {
    const report = evaluateBundle([
      { name: 'initial', sizeBytes: 180 * 1024 }, // exceeds 150KiB
    ]);

    expect(report.allPassed).toBe(false);
    expect(report.chunks[0].passed).toBe(false);
  });

  it('detects when total bundle exceeds max threshold', () => {
    const report = evaluateBundle([
      { name: 'custom-1', sizeBytes: 130 * 1024 },
      { name: 'custom-2', sizeBytes: 130 * 1024 },
      { name: 'custom-3', sizeBytes: 130 * 1024 },
    ]);

    expect(report.totalSizeKiB).toBe(390);
    expect(report.allPassed).toBe(false); // exceeds 350KiB
  });
});
