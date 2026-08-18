/**
 * Minimal RFC 5545 iCalendar builder for currency-expiry reminders. Pure and
 * i18n-free: the caller supplies already-localized event summaries + dates, so
 * this stays unit-testable. Events are all-day (VALUE=DATE) to dodge timezone
 * drift — a medical that expires on the 1st shows on the 1st everywhere — and
 * each carries a 7-day-ahead display alarm.
 */
export interface IcsEvent {
  summary: string;
  /** The day the item expires / lapses. */
  date: Date;
}

/** YYYYMMDD in UTC (all-day DATE value). */
function dateStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** YYYYMMDDTHHMMSSZ in UTC (DTSTAMP). */
function utcStamp(d: Date): string {
  return `${dateStamp(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escape per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
function escape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

import { DAY_MS as DAY } from '@/calc/recency';
import { pad2 as pad } from '@/calc/zulu';

/** Fold content lines to ≤75 octets (approximated by chars) with CRLF + space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(' ' + rest);
  return parts.join('\r\n');
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'event';

/** Build a VCALENDAR string from currency-expiry events. CRLF-terminated. */
export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fly GACA//Currency Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const stamp = utcStamp(now);
  for (const ev of events) {
    const start = dateStamp(ev.date);
    const end = dateStamp(new Date(ev.date.getTime() + DAY)); // all-day → DTEND is the next day
    lines.push(
      'BEGIN:VEVENT',
      `UID:${start}-${slug(ev.summary)}@flygaca.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escape(ev.summary)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escape(ev.summary)}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  // Fold every content line to the RFC 5545 75-octet limit at the end.
  return lines.map(fold).join('\r\n') + '\r\n';
}
