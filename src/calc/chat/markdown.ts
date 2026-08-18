/**
 * A tiny, conservative Markdown subset parser. Pure (no DOM, no deps): it turns
 * a model answer into a small block tree that {@link ../components/chat/RichText}
 * renders as React elements — never as HTML — so hostile or malformed output is
 * inert by construction.
 *
 * Supported: paragraphs (blank-line separated), `#`–`###` headings, unordered
 * lists (`-`/`*`/`+`) and ordered lists (`1.`), `**bold**`, `` `code` ``, and
 * `[text](href)` links (with a sanitized href). Anything else stays as literal text.
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string };

/**
 * Allow only hrefs we can render safely: site-relative paths and http(s)/mailto
 * URLs. Anything else (e.g. `javascript:`, `data:`) returns `null` so the caller
 * can fall back to plain text — defence in depth alongside React's escaping.
 */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  return null;
}

export type Block =
  | { type: 'paragraph'; spans: Inline[] }
  | { type: 'heading'; level: number; spans: Inline[] }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'ol'; items: Inline[][] }
  | { type: 'blockquote'; spans: Inline[] };

const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;

/**
 * Split a line into inline spans, honouring `` `code` ``, `**bold**`, and
 * `[text](href)` links. First match wins; a link with an unsafe href degrades
 * to its literal text so nothing dangerous is ever rendered.
 */
export function parseInline(text: string): Inline[] {
  const spans: Inline[] = [];
  // Alternate matches for `code`, **bold**, and [text](href); first match wins.
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) spans.push({ type: 'text', value: text.slice(last, m.index) });
    if (m[1] !== undefined) spans.push({ type: 'code', value: m[1] });
    else if (m[2] !== undefined) spans.push({ type: 'bold', value: m[2] });
    else if (m[3] !== undefined) {
      const href = safeHref(m[4]);
      // Unsafe/unsupported href → keep the raw markdown text, inert.
      spans.push(href ? { type: 'link', value: m[3], href } : { type: 'text', value: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) spans.push({ type: 'text', value: text.slice(last) });
  // Empty input → a single empty text span so callers always get something.
  return spans.length ? spans : [{ type: 'text', value: text }];
}

/**
 * Flatten a Markdown answer into clean, speakable prose for the Web Speech
 * Synthesis API. Reuses {@link parseMarkdown} so the spoken text always matches
 * what {@link ../components/chat/RichText} renders, minus the markup: `**`,
 * `` ` ``, `#`/`-`/`>` markers and link hrefs are dropped (link spans keep only
 * their visible text), `§` becomes the spoken word "section", and blocks/list
 * items are separated by sentence punctuation so the engine pauses naturally
 * instead of announcing symbols letter-by-letter. Pure (no DOM) and testable.
 */
export function toSpeechText(input: string): string {
  const flatten = (spans: Inline[]) => spans.map((s) => s.value).join('');

  const blockTexts = parseMarkdown(input).map((b) => {
    if (b.type === 'ul' || b.type === 'ol') return b.items.map(flatten).join('. ');
    return flatten(b.spans);
  });

  const sentence = blockTexts
    // End each block on sentence punctuation so paragraphs/lists get a pause.
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (/[.?!:]$/.test(t) ? t : `${t}.`))
    .join(' ');

  return sentence
    .replace(/§/g, 'section ') // "§91.155" reads as "section 91.155", not a symbol
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse a Markdown-ish string into a flat list of blocks. */
export function parseMarkdown(input: string): Block[] {
  const lines = (input ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'paragraph', spans: parseInline(para.join(' ')) });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      flushPara();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushPara();
      blocks.push({ type: 'heading', level: heading[1].length, spans: parseInline(heading[2]) });
      continue;
    }

    if (QUOTE.test(line)) {
      flushPara();
      const quoted: string[] = [];
      // Consume the contiguous run of `>` lines into one blockquote.
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(QUOTE.exec(lines[i])![1].trim());
        i++;
      }
      i--; // step back; the for-loop advances past the last quoted line
      blocks.push({ type: 'blockquote', spans: parseInline(quoted.join(' ')) });
      continue;
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      flushPara();
      const ordered = !BULLET.test(line) && ORDERED.test(line);
      const matcher = ordered ? ORDERED : BULLET;
      const items: Inline[][] = [];
      // Consume the contiguous run of list items of the same kind.
      while (i < lines.length && matcher.test(lines[i])) {
        items.push(parseInline(matcher.exec(lines[i])![1]));
        i++;
      }
      i--; // step back; the for-loop will advance past the last item
      blocks.push(ordered ? { type: 'ol', items } : { type: 'ul', items });
      continue;
    }

    para.push(line.trim());
  }
  flushPara();
  return blocks;
}
