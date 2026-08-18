import type { ReactElement, ReactNode } from 'react';

/**
 * Wrap every case-insensitive occurrence of `needle` in `text` with `<mark>`.
 *
 * Shared by the library search results and the tools catalogue so a hit looks
 * the same wherever the user searches. The needle is trimmed: a trailing space
 * left over from typing should not stop a match.
 */
export function highlight(text: string, needle: string): ReactNode {
  const n = needle.trim().toLowerCase();
  if (!n) return text;

  const lower = text.toLowerCase();
  const out: (string | ReactElement)[] = [];
  let i = 0;
  let hit = lower.indexOf(n);
  let k = 0;
  while (hit !== -1) {
    if (hit > i) out.push(text.slice(i, hit));
    out.push(<mark key={k++}>{text.slice(hit, hit + n.length)}</mark>);
    i = hit + n.length;
    hit = lower.indexOf(n, i);
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}
