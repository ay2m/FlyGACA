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
        </HeadingTag>,
      );
      i++;
      continue;
    }

    // Unordered lists: - or *
    if (line.match(/^[-*]\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        const itemText = lines[i].replace(/^[-*]\s/, '').trim();
        listItems.push(<li key={`li-${i}`}>{parseInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className={styles.list}>
          {listItems}
        </ul>,
      );
      continue;
    }

    // Ordered lists: 1., 2., etc.
    if (line.match(/^\d+\.\s/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const itemText = lines[i].replace(/^\d+\.\s/, '').trim();
        listItems.push(<li key={`li-${i}`}>{parseInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className={styles.list}>
          {listItems}
        </ol>,
      );
      continue;
    }

    // Code blocks: ```
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${elements.length}`} className={styles.codeBlock}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      i++; // skip closing ```
      continue;
    }

    // Paragraphs (remaining lines)
    elements.push(
      <p key={`p-${i}`} className={styles.paragraph}>
        {parseInline(line)}
      </p>,
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
    // Find all pattern matches and their positions
    const citationMatch = remaining.match(/§([\d.]+)/);
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    // Find the earliest match
    const matches = [
      { match: citationMatch, type: 'citation' },
      { match: boldMatch, type: 'bold' },
      { match: italicMatch, type: 'italic' },
      { match: linkMatch, type: 'link' },
      { match: codeMatch, type: 'code' },
    ].filter((m) => m.match && m.match.index !== undefined);

    if (matches.length === 0) {
      // No more patterns; push the rest and exit
      parts.push(remaining);
      break;
    }

    // Sort by index to find the earliest match
    matches.sort((a, b) => (a.match?.index ?? Infinity) - (b.match?.index ?? Infinity));
    const { match, type } = matches[0];

    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    const beforeMatch = remaining.slice(0, match.index);
    if (beforeMatch) parts.push(beforeMatch);

    if (type === 'citation') {
      const citationText = match[0];
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
        </span>,
      );
    } else if (type === 'bold') {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else if (type === 'italic') {
      parts.push(<em key={key++}>{match[1]}</em>);
    } else if (type === 'link') {
      parts.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
          data-testid="link"
        >
          {match[1]}
        </a>,
      );
    } else if (type === 'code') {
      parts.push(
        <code key={key++} className={styles.inlineCode} data-testid="inline-code">
          {match[1]}
        </code>,
      );
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return parts.length === 0 ? null : parts.length === 1 ? parts[0] : parts;
}
