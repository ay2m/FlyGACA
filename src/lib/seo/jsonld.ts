/**
 * Pure JSON-LD (schema.org) builders — the structured-data counterpart to the
 * SEO URL helpers in `seo.ts`. Each function returns a plain object (no DOM, no
 * i18n) so they stay unit-testable; `usePageMeta` serializes the result into a
 * single managed `<script type="application/ld+json">` tag per route.
 *
 * Site-wide Organization + WebSite live statically in `index.html` (present in
 * the initial HTML); these per-page builders describe the current document.
 */
import { OG_IMAGE, SITE_ORIGIN, canonicalUrl } from '@/lib/seo/seo';

export type JsonLd = Record<string, unknown>;

/** Stable @id anchors that match the static graph in index.html. */
export const ORG_ID = `${SITE_ORIGIN}/#organization`;
export const SITE_ID = `${SITE_ORIGIN}/#website`;

const CONTEXT = 'https://schema.org';

/**
 * A self-contained Organization node for per-item `author` / `publisher` /
 * `provider` slots. It keeps the stable `@id` so it still merges with the
 * site-wide graph in index.html, but also carries `name` + `logo` so a
 * per-item validator (which won't resolve a cross-script `@id` reference) sees
 * a complete publisher/author instead of a dangling ref.
 */
function orgNode(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Fly GACA',
    legalName: 'BDA Company International',
    url: SITE_ORIGIN,
    logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/img/icon-512.png` },
  };
}

export function organizationLd(): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Fly GACA',
    legalName: 'BDA Company International',
    alternateName: 'شركة بدع الدولية',
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/img/icon-512.png`,
    description:
      'Fly GACA — an independent educational reference library of Saudi civil-aviation regulations (GACAR). Not affiliated with GACA.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Riyadh',
      postalCode: '12965',
      addressCountry: 'SA',
    },
    // The market this library is written for. Explicit for search + AI answer
    // engines deciding which country's question this site can answer.
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
    // Saudi commercial-registration (unified national) number.
    identifier: { '@type': 'PropertyValue', propertyID: 'SA-CR', value: '7030976893' },
    vatID: '311415259500003',
    taxID: '311415259500003',
    sameAs: [
      'https://x.com/flygacax',
      'https://www.snapchat.com/@flygaca',
      'https://www.facebook.com/flygaca',
      'https://www.instagram.com/flygaca',
      'https://www.linkedin.com/company/flygaca',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'i@flygaca.com',
      contactType: 'customer support',
      availableLanguage: ['en', 'ar'],
    },
  };
}

export function webSiteLd(): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: 'Fly GACA',
    url: SITE_ORIGIN,
    inLanguage: ['en', 'ar'],
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/library?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  /** Router path for the crumb (canonicalized internally). */
  path: string;
}

/** A BreadcrumbList for the page's position in the IA. Pass the rendering
 *  language so the Arabic document's crumbs point at its own `/ar` URLs. */
export function breadcrumbLd(items: Crumb[], lang?: string): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path, lang),
    })),
  };
}

export interface ListItem {
  name: string;
  /** Router path of the listed item (canonicalized internally). */
  path: string;
}

/**
 * ItemList — for catalog / hub pages that enumerate their child pages (the
 * tools and guides indexes). It lets crawlers read the page as an ordered list
 * of its leaf pages and can surface as a rich list result.
 */
export function itemListLd(items: ListItem[], lang?: string): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: canonicalUrl(it.path, lang),
    })),
  };
}

export interface ArticleInput {
  title: string;
  description?: string;
  /** Router path of the article (canonicalized internally). */
  path: string;
  /** BCP-47 language of the current rendering (e.g. 'en' | 'ar'). */
  lang?: string;
  /** ISO date the content was last revised (emitted as schema.org dateModified). */
  dateModified?: string;
}

function articleOfType(type: 'TechArticle' | 'Article', a: ArticleInput): JsonLd {
  // The article's URL is its own language document: `/ar/...` when rendering
  // Arabic, the clean path otherwise — so `url`/`mainEntityOfPage` always agree
  // with `inLanguage` (and with the canonical the head declares).
  const url = canonicalUrl(a.path, a.lang);
  return {
    '@context': CONTEXT,
    '@type': type,
    headline: a.title,
    ...(a.description ? { description: a.description } : {}),
    // We track a single revision date; emit it as both datePublished and
    // dateModified so validators that require either are satisfied.
    ...(a.dateModified ? { datePublished: a.dateModified, dateModified: a.dateModified } : {}),
    inLanguage: a.lang ?? 'en',
    url,
    mainEntityOfPage: url,
    image: OG_IMAGE,
    author: orgNode(),
    isPartOf: { '@id': SITE_ID },
    publisher: orgNode(),
  };
}

/** TechArticle — for regulation / handbook / reference reader pages. */
export function techArticleLd(a: ArticleInput): JsonLd {
  return articleOfType('TechArticle', a);
}

/** Article — for editorial guide pages. */
export function articleLd(a: ArticleInput): JsonLd {
  return articleOfType('Article', a);
}

/** Course — for ground school / study-path pages. */
export function courseLd(a: ArticleInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Course',
    name: a.title,
    ...(a.description ? { description: a.description } : {}),
    inLanguage: a.lang ?? 'en',
    url: canonicalUrl(a.path, a.lang),
    provider: orgNode(),
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
    // A free, self-paced online instance — the minimal shape Google's Course
    // rich result expects alongside `provider`.
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
    },
  };
}

/**
 * AboutPage — for the /about page. A schema.org `AboutPage` (a WebPage subtype)
 * whose `mainEntity` is the site's Organization: it tells crawlers the page is
 * *about* Fly GACA the publisher, strengthening the entity/authorship signal
 * that AI answer engines weigh when deciding whom to cite. The Organization is
 * referenced by its stable `@id` (emitted in full by `organizationLd()` on the
 * same page), so the two nodes merge into one entity.
 */
export function aboutPageLd(a: ArticleInput): JsonLd {
  const url = canonicalUrl(a.path, a.lang);
  return {
    '@context': CONTEXT,
    '@type': 'AboutPage',
    name: a.title,
    ...(a.description ? { description: a.description } : {}),
    url,
    inLanguage: a.lang ?? 'en',
    isPartOf: { '@id': SITE_ID },
    mainEntity: { '@id': ORG_ID },
    publisher: orgNode(),
  };
}

export interface QA {
  q: string;
  a: string;
}

/** FAQPage — for pages backed by genuine question/answer pairs. */
export function faqLd(items: QA[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export interface DefinedTerm {
  /** The term or abbreviation being defined. */
  term: string;
  /** Its plain-language definition. */
  def: string;
}

/**
 * DefinedTermSet — for the bilingual aviation glossary. Each entry becomes a
 * schema.org `DefinedTerm` bound back to the set, so a crawler (or AI answer
 * engine) reads the page as a structured vocabulary of Saudi-aviation terms
 * rather than loose prose.
 */
export function definedTermSetLd(a: {
  name: string;
  description?: string;
  /** Router path of the glossary (canonicalized internally). */
  path: string;
  terms: DefinedTerm[];
  /** BCP-47 language of the current rendering (e.g. 'en' | 'ar'). */
  lang?: string;
}): JsonLd {
  const url = canonicalUrl(a.path, a.lang);
  return {
    '@context': CONTEXT,
    '@type': 'DefinedTermSet',
    name: a.name,
    ...(a.description ? { description: a.description } : {}),
    url,
    inLanguage: a.lang ?? 'en',
    hasDefinedTerm: a.terms.map((tm) => ({
      '@type': 'DefinedTerm',
      name: tm.term,
      description: tm.def,
      inDefinedTermSet: url,
    })),
  };
}

export interface SoftwareAppInput {
  title: string;
  description?: string;
  /** Router path of the tool (canonicalized internally). */
  path: string;
  /** BCP-47 language of the current rendering (e.g. 'en' | 'ar'). */
  lang?: string;
}

/** SoftwareApplication — for the free, browser-based calculator tools. */
export function softwareAppLd(a: SoftwareAppInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'SoftwareApplication',
    name: a.title,
    ...(a.description ? { description: a.description } : {}),
    url: canonicalUrl(a.path, a.lang),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'SAR' },
    publisher: { '@id': ORG_ID },
  };
}

export interface AirportInput {
  name: string;
  icao: string;
  iata?: string;
  /** Router path of the aerodrome page (canonicalized internally). */
  path: string;
  lat?: number;
  lon?: number;
  elevationFt?: number;
  country?: string;
  /** BCP-47 language of the current rendering (e.g. 'en' | 'ar'). */
  lang?: string;
}

/**
 * Airport — for an aerodrome directory page. A schema.org `Airport` (a Place)
 * describes the real-world facility, which is what the page is *about*; this is
 * the correct node for it rather than the generic tool SoftwareApplication.
 */
export function airportLd(a: AirportInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Airport',
    name: a.name,
    icaoCode: a.icao,
    ...(a.iata ? { iataCode: a.iata } : {}),
    url: canonicalUrl(a.path, a.lang),
    ...(typeof a.lat === 'number' && typeof a.lon === 'number'
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: a.lat,
            longitude: a.lon,
            ...(typeof a.elevationFt === 'number' ? { elevation: `${a.elevationFt} ft` } : {}),
          },
        }
      : {}),
    ...(a.country ? { address: { '@type': 'PostalAddress', addressCountry: a.country } } : {}),
  };
}
