import { describe, expect, it } from 'vitest';
import {
  CALLSIGN_PREFIXES,
  RESERVED_SQUAWKS,
  assignCallsign,
  assignSquawk,
} from '@/calc/hud/callsigns';
import { mulberry32 } from '@/calc/hud/rng';
import type { FleetKind } from '@/calc/hud/types';

const KINDS: FleetKind[] = ['jet', 'ga', 'heli', 'drone'];

describe('assignCallsign', () => {
  it('uses only training prefixes — never a real operator or the regulator', () => {
    const rng = mulberry32(11);
    const used = new Set<string>();
    for (const kind of KINDS) {
      for (let i = 0; i < 10; i += 1) {
        const cs = assignCallsign(rng, kind, used);
        const prefix = cs.slice(0, cs.lastIndexOf('-'));
        expect(CALLSIGN_PREFIXES[kind]).toContain(prefix);
        // Regression guard: fabricated traffic must not read as GACA/airline ops.
        expect(prefix).not.toMatch(/GACA|SAUDIA|NEOM/i);
      }
    }
  });
  it('never repeats a callsign', () => {
    const rng = mulberry32(5);
    const used = new Set<string>();
    const all = Array.from({ length: 60 }, () => assignCallsign(rng, 'jet', used));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('assignSquawk', () => {
  it('emits unique, octal-only codes outside the reserved set', () => {
    const rng = mulberry32(23);
    const used = new Set<string>();
    const all = Array.from({ length: 80 }, () => assignSquawk(rng, used));
    expect(new Set(all).size).toBe(all.length);
    for (const code of all) {
      expect(code).toMatch(/^[0-7]{4}$/);
      expect(RESERVED_SQUAWKS.has(code)).toBe(false);
      // First digit capped so the 7xxx emergency block is unreachable.
      expect(Number(code[0])).toBeLessThanOrEqual(6);
    }
  });
});
