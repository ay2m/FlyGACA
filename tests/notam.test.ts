import { describe, expect, it } from 'vitest';
import { formatNotamTime, parseNotam } from '@/calc/notam';

describe('parseNotam', () => {
  it('extracts the id, Q-code and fields', () => {
    const r = parseNotam(
      'A1234/24 NOTAMN Q) OERR/QMRLC/IV/NBO/A/000/999/2446N04643E005 A) OERK B) 2406010600 C) 2406011800 E) RWY 15L/33R CLSD DUE WIP',
    );
    expect(r.id).toBe('A1234/24');
    expect(r.qcode).toBe('QMRLC');
    expect(r.aerodrome).toBe('OERK');
    expect(r.from).toBe('2406010600');
    expect(r.to).toBe('2406011800');
    expect(r.text).toBe('RWY 15L/33R CLSD DUE WIP');
  });
});

describe('formatNotamTime', () => {
  it('formats a NOTAM timestamp', () => {
    expect(formatNotamTime('2406010600')).toBe('2024-06-01 06:00Z');
    expect(formatNotamTime('PERM')).toBe('PERM');
  });
});
