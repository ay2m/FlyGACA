/** NOTAM field parser — pulls the id, Q-code and the A)/B)/C)/E) fields from a
 *  raw NOTAM. Abbreviation and Q-code meaning lookups live in i18n. Pure. */

export interface NotamReport {
  id: string | null;
  /** Five-letter Q-code, e.g. "QMRLC". */
  qcode: string | null;
  aerodrome: string | null;
  from: string | null;
  to: string | null;
  text: string | null;
  raw: string;
}

export function parseNotam(raw: string): NotamReport {
  const s = raw.trim();
  const grab = (re: RegExp) => s.match(re)?.[1] ?? null;
  return {
    id: grab(/\b([A-Z]\d{4}\/\d{2})\b/),
    qcode: grab(/Q\)\s*[A-Z]{4}\/(Q[A-Z]{4})/),
    aerodrome: grab(/\bA\)\s*([A-Z]{4})/),
    from: grab(/\bB\)\s*(\d{10})/),
    to: grab(/\bC\)\s*(\d{10}|PERM)/),
    text: grab(/\bE\)\s*([\s\S]*?)(?:\s+[A-Z]\)|$)/)?.trim() ?? null,
    raw: s,
  };
}

/** "2406010600" → "2024-06-01 06:00Z"; passes through PERM. */
export function formatNotamTime(t: string | null): string | null {
  if (!t) return null;
  if (t === 'PERM') return 'PERM';
  const m = t.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return t;
  return `20${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}Z`;
}
