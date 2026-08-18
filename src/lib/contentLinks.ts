/**
 * Corpus link routing — normalises every historical shape of corpus pointer
 * (legacy `document.html?type=…&id=…#…` URLs, semantic `{ kind, id, anchor }`
 * objects, curated {@link ContentLink}s) into app routes. Extracted from
 * `content.ts` so the fetch/typing layer stays eager-graph-light while these
 * helpers ship only in the lazy pages that route corpus links.
 */
import { CORPUS } from './content';
import type { ContentLink, LibraryKind, SearchEntry, SearchLink, SearchRef } from './content';

/** Legacy `type=` tokens that don't already match a {@link LibraryKind}. */
const SEARCH_TYPE_TO_KIND: Record<string, LibraryKind> = {
  handbooks: 'handbook',
};

/** Resolve a legacy `type=` token or a semantic `kind` to a corpus kind. */
function toCorpusKind(token: string | undefined): LibraryKind | undefined {
  if (!token) return undefined;
  return token in CORPUS ? (token as LibraryKind) : SEARCH_TYPE_TO_KIND[token];
}

/** Parse a legacy `document.html?type=…&id=…#…` search-index URL into a {@link SearchRef}. */
export function parseSearchUrl(u: string): SearchRef | null {
  const kind = toCorpusKind(/[?&]type=([^&#]+)/.exec(u)?.[1]);
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  if (!id || !kind) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return anchor ? { kind, id, anchor } : { kind, id };
}

/**
 * Normalise any corpus pointer — legacy URL string or semantic object — into a
 * {@link SearchRef}. Returns null when the pointer names no routable document.
 */
export function toSearchRef(link: SearchLink): SearchRef | null {
  if (typeof link === 'string') return parseSearchUrl(link);
  const kind = toCorpusKind(link.kind ?? link.type);
  if (!kind || !link.id) return null;
  return link.anchor ? { kind, id: link.id, anchor: link.anchor } : { kind, id: link.id };
}

/**
 * Build the app's Document-reader route for a corpus pointer.
 * `document.html?type=reference&id=ac-68-1#sec-x` → `/library/reference/ac-68-1#sec-x`.
 * Returns null for pointers we can't route. Pass `q` to carry the search phrase
 * through to the reader so it can highlight and scroll to the matched passage.
 */
export function searchHref(link: SearchLink, q?: string): string | null {
  const ref = toSearchRef(link);
  if (!ref) return null;
  const query = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return `${CORPUS[ref.kind].base}/${ref.id}${query}${ref.anchor ? `#${ref.anchor}` : ''}`;
}

/**
 * The corpus pointer for a search hit, tolerant of both the current semantic
 * entry (`kind`/`id`/`anchor`) and the legacy `u` URL. Pass the result to
 * {@link toSearchRef} or {@link searchHref}.
 */
export function searchEntryLink(e: SearchEntry): SearchLink {
  return e.u ?? e;
}

/**
 * Rewrite a legacy no-build internal `.html` link to its app route. Handles the
 * `guides/`, `tools/`, `library`, `study/groundschool`, and `study/quiz?bank=…`
 * pages the vanilla PWA linked by file. Returns null for corpus URLs (those go
 * through {@link searchHref}) and anything unrecognised.
 */
function legacyRouteHref(u: string): string | null {
  const s = u.replace(/^(?:\.\.\/)+/, '').replace(/^\//, '');
  const page = /^(guides|tools)\/([a-z0-9-]+)\.html$/i.exec(s);
  if (page) return `/${page[1]}/${page[2]}`;
  if (/^library\.html$/i.test(s)) return '/library';
  if (/^study\/groundschool\.html$/i.test(s)) return '/study/groundschool';
  const quiz = /^study\/quiz\.html(\?[^#]*)?$/i.exec(s);
  if (quiz) return `/study/quiz${quiz[1] ?? ''}`;
  return null;
}

/**
 * Resolve any {@link ContentLink} (or legacy URL string) to an in-app href, or
 * null if it names nothing routable. Corpus pointers route through the Library
 * reader; `route` links pass through; legacy strings are parsed as a corpus URL
 * first, then as an internal `.html` page.
 */
export function linkHref(link: ContentLink | string, q?: string): string | null {
  if (typeof link === 'string') return searchHref(link, q) ?? legacyRouteHref(link);
  if (link.route) return link.route;
  if (link.url) return searchHref(link.url, q) ?? legacyRouteHref(link.url);
  return searchHref(link, q);
}
