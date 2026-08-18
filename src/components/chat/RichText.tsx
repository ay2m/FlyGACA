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
  if (href.startsWith('/')) return <Link to={href}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener">
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
    <div className={className}>
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
