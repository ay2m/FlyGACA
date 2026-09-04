import type { ReactNode } from 'react';
import { useMemo } from 'react';
import styles from './MarkdownView.module.css';

interface MarkdownViewProps {
  /** Already-rendered markdown content (sanitized, no XSS risk). */
  children: string;
  /** Heading level to render `#` as (default: 3). */
  headingLevel?: 2 | 3 | 4;
  /** Optional className for the wrapper. */
  className?: string;
}

/**
 * Renders sanitized markdown content.
 * Supports: bold, links, lists, paragraphs, code blocks, citations (GACAR sections).
 * Input must be pre-sanitized (DOMPurify) to prevent XSS.
 * No HTML rendering — markdown-safe subset only.
 */
export function MarkdownView({
  children: markdown,
  headingLevel = 3,
  className,
}: MarkdownViewProps) {
  const parsed = useMemo(() => parseMarkdown(markdown, headingLevel), [markdown, headingLevel]);

  const cls = [styles.root, className].filter(Boolean).join(' ');
  return <div className={cls}>{parsed}</div>;
}

/**
 * Minimal markdown parser (regex-based, safe for pre-sanitized input).
 * Renders: headers, bold, italic, links, lists, paragraphs, code blocks, citations.
 */
function parseMarkdown(text: string, headingLevel: 2 | 3 | 4): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings: # -> h3, ## -> h4, etc.
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = (headingLevel + headingMatch[1].length - 1) as 2 | 3 | 4 | 5 | 6;
      const HeadingTag = `h${Math.min(level, 6)}` as const;
      elements.push(
        <HeadingTag key={`h-${i}`} className={styles.heading}>
          {parseInline(headingMatch[2])}
        </HeadingTag>
      );
      i++;
      continue;
    }

    // Unordered lists: - or *
    if (line.match(/^[-*]\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        const itemText = lines[i].replace(/^[-*]\s/, '').trim();
        listItems.push(
          <li key={`li-${i}`}>{parseInline(itemText)}</li>
        );
        i++;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className={styles.list}>
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered lists: 1., 2., etc.
    if (line.match(/^\d+\.\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const itemText = lines[i].replace(/^\d+\.\s/, '').trim();
        listItems.push(
          <li key={`li-${i}`}>{parseInline(itemText)}</li>
        );
        i++;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className={styles.list}>
          {listItems}
        </ol>
      );
      continue;
    }

    // Code blocks: ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${elements.length}`} className={styles.codeBlock}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // Paragraphs (remaining lines)
    elements.push(
      <p key={`p-${i}`} className={styles.paragraph}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

/**
 * Parse inline markdown: **bold**, *italic*, [link](url), `code`, GACAR citations (§...).
 */
function parseInline(text: string): ReactNode {
  if (!text) return null;

  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // GACAR citations: § followed by digits (e.g., §91.155)
    const citationMatch = remaining.match(/§([\d.]+)/);
    if (citationMatch && citationMatch.index !== undefined) {
      const beforeCitation = remaining.slice(0, citationMatch.index);
      if (beforeCitation) parts.push(beforeCitation);
      const citationText = citationMatch[0];
      parts.push(
        <span
          key={key++}
          role="doc-biblioref"
          className={styles.citation}
          data-testid="citation"
          aria-label={`GACAR section ${citationText}`}
          dir="auto"
        >
          {citationText}
        </span>
      );
      remaining = remaining.slice((citationMatch.index || 0) + citationMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      const beforeBold = remaining.slice(0, boldMatch.index);
      if (beforeBold) parts.push(beforeBold);
      parts.push(
        <strong key={key++}>{boldMatch[1]}</strong>
      );
      remaining = remaining.slice((boldMatch.index || 0) + boldMatch[0].length);
      continue;
    }

    // Italic: *text* (non-greedy, avoid ** matching)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    if (italicMatch && italicMatch.index !== undefined) {
      const beforeItalic = remaining.slice(0, italicMatch.index);
      if (beforeItalic) parts.push(beforeItalic);
      parts.push(
        <em key={key++}>{italicMatch[1]}</em>
      );
      remaining = remaining.slice((italicMatch.index || 0) + italicMatch[0].length);
      continue;
    }

    // Links: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined) {
      const beforeLink = remaining.slice(0, linkMatch.index);
      if (beforeLink) parts.push(beforeLink);
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
          data-testid="link"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice((linkMatch.index || 0) + linkMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      const beforeCode = remaining.slice(0, codeMatch.index);
      if (beforeCode) parts.push(beforeCode);
      parts.push(
        <code key={key++} className={styles.inlineCode} data-testid="inline-code">{codeMatch[1]}</code>
      );
      remaining = remaining.slice((codeMatch.index || 0) + codeMatch[0].length);
      continue;
    }

    // No more patterns; push the rest and exit
    parts.push(remaining);
    break;
  }

  return parts.length === 0 ? null : parts.length === 1 ? parts[0] : parts;
}
