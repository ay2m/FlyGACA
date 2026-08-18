import { describe, expect, it } from 'vitest';
import { buildIcs } from '@/calc/pilot/ics';

const now = new Date('2024-06-01T08:30:00Z');

describe('buildIcs', () => {
  it('wraps events in a VCALENDAR with a stable header', () => {
    const ics = buildIcs(
      [{ summary: 'Medical certificate', date: new Date('2024-09-01T12:00:00Z') }],
      now,
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('DTSTAMP:20240601T083000Z');
  });

  it('emits an all-day event with DTEND on the next day plus a 7-day alarm', () => {
    const ics = buildIcs(
      [{ summary: 'Flight review', date: new Date('2024-09-01T00:00:00Z') }],
      now,
    );
    expect(ics).toContain('DTSTART;VALUE=DATE:20240901');
    expect(ics).toContain('DTEND;VALUE=DATE:20240902');
    expect(ics).toContain('TRIGGER:-P7D');
    expect(ics).toContain('SUMMARY:Flight review');
  });

  it('escapes summary text per RFC 5545', () => {
    const ics = buildIcs(
      [{ summary: 'Medical; class 1, renew', date: new Date('2024-09-01T00:00:00Z') }],
      now,
    );
    expect(ics).toContain('SUMMARY:Medical\\; class 1\\, renew');
  });

  it('produces one VEVENT per event', () => {
    const ics = buildIcs(
      [
        { summary: 'A', date: new Date('2024-09-01T00:00:00Z') },
        { summary: 'B', date: new Date('2024-10-01T00:00:00Z') },
      ],
      now,
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });

  it('folds long summary lines to <=75 chars', () => {
    const long = 'X'.repeat(120);
    const ics = buildIcs([{ summary: long, date: new Date('2024-09-01T00:00:00Z') }], now);
    for (const line of ics.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});
