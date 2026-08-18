/**
 * Type declarations for the JSON corpus/content shapes fetched via `content.ts`
 * (`fetchJson`/`loadJson`). Split out so `content.ts` stays scannable as the
 * runtime loader; re-exported from `content.ts` so existing `@/lib/content`
 * imports keep working unchanged.
 */

export interface ToolEntry {
  id: string;
  route: string;
  live: boolean;
}

export interface ToolsManifest {
  version: number;
  tools: ToolEntry[];
}

export interface GacarCategory {
  id: string;
  label: string;
}

/**
 * Optional provenance carried on synced records. Written by `scripts/sync-gaca.mjs`
 * from the official-source (GACA / AIP) extraction agents; additive and ignored by
 * the reader (`fetchJson` drops unknown fields), so it never affects rendering. Its
 * only job is to let one refresh/AIRAC cycle be diffed against the next.
 */
export interface SourceProvenance {
  /** Canonical source URL the record was extracted from. */
  sourceUrl?: string;
  /** Document revision / amendment marker (e.g. "Rev 3", AC letter "C"). */
  revision?: string;
  /** ISO date the source became effective (AIRAC effective date, AC date). */
  effectiveDate?: string;
  /** Content hash of the imported body/asset, for change detection. */
  contentHash?: string;
}

export interface GacarDocument extends SourceProvenance {
  part: string;
  partNum: number;
  title: string;
  category: string;
  slug: string;
  pages: number;
  outline?: string[];
}

export interface GacarIndex {
  generated: string;
  source: string;
  sourceUrl: string;
  count: number;
  categories: GacarCategory[];
  documents: GacarDocument[];
}

/**
 * The three browsable/readable corpora behind the Library. They share the
 * GACAR index shape (`{ categories, documents }`); a corpus doc carries either
 * Part metadata (regulations) or a `badge` + `sections` (reference/handbooks).
 */
export type LibraryKind = 'regulations' | 'reference' | 'handbook';

export interface CorpusDoc extends SourceProvenance {
  slug: string;
  title: string;
  category: string;
  part?: string;
  partNum?: number;
  pages?: number;
  badge?: string;
  sections?: number;
  outline?: string[];
}

export interface CorpusIndex {
  generated: string;
  count: number;
  categories: GacarCategory[];
  documents: CorpusDoc[];
  /** Authoritative source URL for the corpus (e.g. the GACA regulations page). */
  sourceUrl?: string;
}

export interface CorpusMeta {
  index: string;
  dir: string;
  base: string;
}

export interface ChartDoc extends SourceProvenance {
  region: string;
  variant: string;
  date: string | null;
  label: string;
  slug: string;
  image: string;
  /** Native pixel dimensions, used to set the Leaflet image-overlay bounds. */
  w: number;
  h: number;
}

export interface ChartsIndex {
  generated: string;
  source: string;
  sourceUrl: string;
  count: number;
  documents: ChartDoc[];
}

export interface PdfCategory {
  id: string;
  label: string;
}

export interface PdfDoc {
  title: string;
  slug: string;
  category: string;
  /** 'reader' docs open in the Library reader; otherwise a deployed PDF file. */
  kind?: 'reader' | 'file';
  file?: string;
  link?: string;
  available?: boolean;
  note?: string;
}

export interface PdfsIndex {
  generated: string;
  categories: PdfCategory[];
  documents: PdfDoc[];
}

export interface Airport extends SourceProvenance {
  icao: string;
  iata: string;
  name_en: string;
  name_ar: string;
  city_en: string;
  city_ar: string;
  /** Present on the worldwide rows; the original curated Saudi set omitted them. */
  country_en?: string;
  country_ar?: string;
  region?: string;
  /** Short OurAirports type: large | medium | small | heliport | seaplane | balloonport. */
  type?: string;
  lat: number;
  lon: number;
  elev_ft: number;
  /** Runway designators; worldwide rows add length (ft) and surface where known. */
  rwys: { id: string; len?: number; surf?: string }[];
  freqs: { l: string; v: string }[];
  /** Magnetic variation, present on the curated Saudi (AIP-KSA) records only. */
  mag?: string;
  /** Aerodrome services (type, runway summary, …) — curated Saudi records only. */
  services?: { l: string; v: string }[];
}

export interface AirportsIndex {
  count: number;
  airports: Airport[];
}

/** An ATS airspace (CTR/TMA) in the study airspace directory. Geometry is the
 *  AIP's approximate circle (`center` + `radius_nm`); a `polygon` ring, when
 *  present, is the published lateral boundary and overrides the circle. */
export interface AtsAirspace extends SourceProvenance {
  id: string;
  name: string;
  name_ar: string;
  type: string;
  class: string;
  center: [number, number];
  radius_nm: number;
  unit: string;
  polygon?: [number, number][];
}

export interface AirspaceClass {
  id: string;
  label: string;
  color: string;
}

export interface AirspacesIndex {
  generated: string;
  source: string;
  note: string;
  count: number;
  classes: AirspaceClass[];
  airspaces: AtsAirspace[];
}

export interface DefinitionTerm {
  term: string;
  def: string;
  url: string;
}

export interface DefinitionsIndex {
  count: number;
  terms: DefinitionTerm[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  /** Human-readable citation label, e.g. "GACAR Part 91, §91.165". */
  cite?: string;
  /** Corpus pointer for the citation. Latent — not yet rendered. */
  citeRef?: SearchRef;
}

export interface QuizBank {
  id: string;
  title: string;
  desc: string;
  source: string;
  questions: QuizQuestion[];
}

export interface QuizData {
  exam: { title: string; questions: number; minutes: number; passMark: number };
  banks: QuizBank[];
}

export interface GsLesson {
  id: string;
  title: string;
  objective: string;
  adel: string;
  read?: ContentLink & { label: string };
}

export interface GsModule {
  id: string;
  title: string;
  summary: string;
  quiz?: string;
  lessons: GsLesson[];
}

export interface GroundSchoolData {
  title: string;
  intro: string;
  modules: GsModule[];
}

export interface PathStep extends ContentLink {
  label: string;
  note: string;
}

export interface ReadingPath {
  id: string;
  title: string;
  desc: string;
  steps: PathStep[];
}

export interface PathsIndex {
  paths: ReadingPath[];
}

/**
 * One hit in the lazy full-text search index (`/data/library-search.json`).
 * `d` heading · `b` badge (e.g. "Part 61") · `x` excerpt. The corpus pointer is
 * either the semantic `kind`/`id`/`anchor` fields (current) or the legacy `u`
 * URL (`document.html?type=…&id=…#…`) still emitted by un-migrated corpus
 * builds — read it through {@link searchEntryLink} so both shapes route alike.
 */
export interface SearchEntry {
  d: string;
  b: string;
  x?: string;
  /** Semantic corpus pointer. */
  kind?: LibraryKind;
  id?: string;
  anchor?: string;
  /** @deprecated Legacy composite URL; superseded by `kind`/`id`/`anchor`. */
  u?: string;
}

export interface SearchIndex {
  generated: string;
  count: number;
  scope: string;
  entries: SearchEntry[];
}

export interface SearchRef {
  kind: LibraryKind;
  /** Document slug. */
  id: string;
  /** In-document heading anchor, if any. */
  anchor?: string;
}

/**
 * A corpus pointer as it may appear in data. The historical shape is a legacy
 * `document.html?type=<t>&id=<slug>#<anchor>` string, still emitted by the
 * upstream corpus builders; the semantic shape keeps routing out of the data
 * (`{ kind, id, anchor }`). Normalise either through `toSearchRef` in
 * `contentLinks.ts` so the app parses both identically and is ready for the
 * data to switch shapes with no frontend change.
 */
export type SearchLink = string | { kind?: string; type?: string; id?: string; anchor?: string };

/**
 * A link inside curated content (reading paths, ground-school lessons, quiz
 * citations). It is one of two semantic shapes — a corpus pointer
 * (`kind`/`id`/`anchor`) or an internal app route (`route`) — with a legacy
 * no-build `url` string tolerated during migration. Resolve with `linkHref` in
 * `contentLinks.ts`.
 */
export interface ContentLink {
  kind?: LibraryKind;
  id?: string;
  anchor?: string;
  /** An in-app route path, e.g. `/tools/vfr-minima` or `/study/quiz?bank=medical`. */
  route?: string;
  /** @deprecated Legacy no-build URL (`…/document.html?…` or `../tools/x.html`). */
  url?: string;
}

/**
 * One compiled regulatory Part, as emitted by scripts/parse-regulations.mjs from the Markdown
 * source under content/regulations/. `references` are the Parts this one cites; `sectionRefs`
 * are `§` citations; `sections` is the document's own heading outline.
 */
export interface RegulationRecord {
  slug: string;
  partNum: number;
  part: string;
  title: string;
  category: string;
  references: string[];
  sectionRefs: string[];
  sections: string[];
}

/**
 * The optimized cross-reference lookup dictionary (public/data/regulations-lookup.json),
 * compiled in CI so the frontend can render "references / referenced by" instantly without
 * re-parsing the corpus. `index.referencedBy` is the reverse graph: slug → Parts that cite it.
 */
export interface RegulationsLookup {
  generated: string | null;
  count: number;
  parts: Record<string, RegulationRecord>;
  index: {
    byPart: string[];
    referencedBy: Record<string, string[]>;
  };
}
