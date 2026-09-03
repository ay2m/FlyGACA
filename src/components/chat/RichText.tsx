import { Fragment } from 'react';
import { Link } from 'react-router';
import { parseMarkdown, type Inline } from '@/calc/chat/markdown';
import { linkifyCitations } from '@/calc/chat/chatSources';

/**
 * Renders a Captain Adel answer as React elements from the {@link parseMarkdown}
 * block tree. It never injects HTML (no `dangerouslySetInnerHTML`), so malformed
 * or hostile model output renders as inert text. Used for finalized assistant
 * turns; mid-stream text stays plain in the bubble to avoid markdown flicker.
 *
 * When `resolveCitation` is supplied, bare GACAR citations in prose (e.g.
 * "Part 91", "§91.155") are turned into in-app Library links on top of any
 * explicit `[text](href)` markdown links.
 */

/** A site-relative href (`/library/…`) routes in-app; everything else opens out. */
function LinkSpan({ href, children }: { href: string; children: string }) {
  // Detect GACAR citations (e.g., "Part 91", "§91.155", "91.155(a)") and build descriptive aria-label
  let ariaLabel: string | undefined;
  const partMatch = /Part\s+(\d+)|§?\s*(\d+)/.exec(children);
  if (partMatch) {
    const partNum = partMatch[1] ?? partMatch[2];
    const sectionMatch = /(?:§\s*)?(\d+)\.(\d+)(?:\(([a-z0-9]+)\))?/.exec(children);
    if (sectionMatch) {
      const [, part, section, subsection] = sectionMatch;
      ariaLabel = `GACAR Part ${part}, Section ${section}${subsection ? ` (${subsection})` : ''}`;
    } else {
      ariaLabel = `GACAR Part ${partNum}`;
    }
  }

  if (href.startsWith('/')) {
    return (
      <Link to={href} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener" aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function Spans({ spans }: { spans: Inline[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.type === 'bold') return <strong key={i}>{s.value}</strong>;
        if (s.type === 'code') return <code key={i}>{s.value}</code>;
        if (s.type === 'link')
          return (
            <LinkSpan key={i} href={s.href}>
              {s.value}
            </LinkSpan>
          );
        return <Fragment key={i}>{s.value}</Fragment>;
      })}
    </>
  );
}

export function RichText({
  text,
  className,
  resolveCitation,
}: {
  text: string;
  className?: string;
  resolveCitation?: (partNumber: string) => string | null;
}) {
  const blocks = parseMarkdown(text);
  const decorate = (spans: Inline[]) =>
    resolveCitation ? linkifyCitations(spans, resolveCitation) : spans;

  // Nothing parseable (e.g. an answer that is pure whitespace) → render as-is.
  if (blocks.length === 0) return <span className={className}>{text}</span>;

  return (
    <div className={className} role="article">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading': {
            const Tag = `h${Math.min(b.level + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
            return (
              <Tag key={i}>
                <Spans spans={decorate(b.spans)} />
              </Tag>
            );
          }
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Spans spans={decorate(it)} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Spans spans={decorate(it)} />
                  </li>
                ))}
              </ol>
            );
          case 'blockquote':
            return (
              <blockquote key={i}>
                <Spans spans={decorate(b.spans)} />
              </blockquote>
            );
          default:
            return (
              <p key={i}>
                <Spans spans={decorate(b.spans)} />
              </p>
            );
        }
      })}
    </div>
  );
}
