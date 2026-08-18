import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './app/Layout';
import { FlavorRoot } from './app/flavor/FlavorRoot';
import { Home } from './pages/Home/Home';
import { AR_PREFIX, isArabicPath } from '@/lib/seo/seo';
import { FLAVOR, IS_FLAVOR_APP } from './flavors/current';

/**
 * Lazy a named export into a route component. Every page except Home is
 * code-split; the Layout's Suspense boundary renders the fallback while a
 * route chunk loads. Vite groups co-located pages into per-section chunks,
 * so the initial bundle carries only Home + the shared chrome.
 */
function lazyNamed<M, K extends keyof M>(loader: () => Promise<M>, key: K) {
  return lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));
}

// Library
const Library = lazyNamed(() => import('./pages/library/Library'), 'Library');
const Document = lazyNamed(() => import('./pages/library/Document'), 'Document') as ComponentType<{
  kind?: 'reference' | 'handbook';
}>;
const Charts = lazyNamed(() => import('./pages/library/Charts'), 'Charts');
const LibraryMap = lazyNamed(() => import('./pages/library/LibraryMap'), 'LibraryMap');
const Glossary = lazyNamed(() => import('./pages/library/Glossary'), 'Glossary');
const Updates = lazyNamed(() => import('./pages/updates/Updates'), 'Updates');
const Chat = lazyNamed(() => import('./pages/chat/Chat'), 'Chat');

// Tools
const ToolsIndex = lazyNamed(() => import('./pages/tools/ToolsIndex'), 'ToolsIndex');
const Crosswind = lazyNamed(() => import('./pages/tools/performance/Crosswind'), 'Crosswind');
const DensityAltitude = lazyNamed(
  () => import('./pages/tools/atmosphere-weather/DensityAltitude'),
  'DensityAltitude',
);
const Tas = lazyNamed(() => import('./pages/tools/performance/Tas'), 'Tas');
const PressureAltitude = lazyNamed(
  () => import('./pages/tools/atmosphere-weather/PressureAltitude'),
  'PressureAltitude',
);
const Isa = lazyNamed(() => import('./pages/tools/atmosphere-weather/Isa'), 'Isa');
const Altimeter = lazyNamed(
  () => import('./pages/tools/atmosphere-weather/Altimeter'),
  'Altimeter',
);
const CloudBase = lazyNamed(
  () => import('./pages/tools/atmosphere-weather/CloudBase'),
  'CloudBase',
);
const Mach = lazyNamed(() => import('./pages/tools/performance/Mach'), 'Mach');
const ClimbGradient = lazyNamed(
  () => import('./pages/tools/performance/ClimbGradient'),
  'ClimbGradient',
);
const StandardRateTurn = lazyNamed(
  () => import('./pages/tools/performance/StandardRateTurn'),
  'StandardRateTurn',
);
const WindTable = lazyNamed(() => import('./pages/tools/performance/WindTable'), 'WindTable');
const Hydroplaning = lazyNamed(
  () => import('./pages/tools/performance/Hydroplaning'),
  'Hydroplaning',
);
const TakeoffLanding = lazyNamed(
  () => import('./pages/tools/performance/TakeoffLanding'),
  'TakeoffLanding',
);
const WindTriangle = lazyNamed(
  () => import('./pages/tools/navigation/WindTriangle'),
  'WindTriangle',
);
const GreatCircle = lazyNamed(() => import('./pages/tools/navigation/GreatCircle'), 'GreatCircle');
const OneInSixty = lazyNamed(() => import('./pages/tools/navigation/OneInSixty'), 'OneInSixty');
const Tsd = lazyNamed(() => import('./pages/tools/navigation/Tsd'), 'Tsd');
const E6b = lazyNamed(() => import('./pages/tools/navigation/E6b'), 'E6b');
const TopOfDescent = lazyNamed(
  () => import('./pages/tools/performance/TopOfDescent'),
  'TopOfDescent',
);
const DescentVdp = lazyNamed(() => import('./pages/tools/performance/DescentVdp'), 'DescentVdp');
const Fuel = lazyNamed(() => import('./pages/tools/weight-fuel/Fuel'), 'Fuel');
const SpecificRange = lazyNamed(
  () => import('./pages/tools/weight-fuel/SpecificRange'),
  'SpecificRange',
);
const WeightBalance = lazyNamed(
  () => import('./pages/tools/weight-fuel/WeightBalance'),
  'WeightBalance',
);
const ZuluClock = lazyNamed(() => import('./pages/tools/navigation/ZuluClock'), 'ZuluClock');
const AiracCycle = lazyNamed(() => import('./pages/tools/navigation/AiracCycle'), 'AiracCycle');
const SunTimes = lazyNamed(() => import('./pages/tools/navigation/SunTimes'), 'SunTimes');
const Part61Currency = lazyNamed(
  () => import('./pages/tools/regulations/Part61Currency'),
  'Part61Currency',
);
const MedicalValidity = lazyNamed(
  () => import('./pages/tools/regulations/MedicalValidity'),
  'MedicalValidity',
);
const FlightReview = lazyNamed(
  () => import('./pages/tools/regulations/FlightReview'),
  'FlightReview',
);
const Holding = lazyNamed(() => import('./pages/tools/procedures/Holding'), 'Holding');
const ProceduralSeparation = lazyNamed(
  () => import('./pages/tools/procedures/ProceduralSeparation'),
  'ProceduralSeparation',
);
const VfrBrief = lazyNamed(() => import('./pages/tools/procedures/VfrBrief'), 'VfrBrief');
const Loa = lazyNamed(() => import('./pages/tools/procedures/Loa'), 'Loa');
const Units = lazyNamed(() => import('./pages/tools/reference/Units'), 'Units');
const Transponder = lazyNamed(() => import('./pages/tools/reference/Transponder'), 'Transponder');
const Phonetic = lazyNamed(() => import('./pages/tools/reference/Phonetic'), 'Phonetic');
const Metar = lazyNamed(() => import('./pages/tools/atmosphere-weather/Metar'), 'Metar');
const Taf = lazyNamed(() => import('./pages/tools/atmosphere-weather/Taf'), 'Taf');
const Notam = lazyNamed(() => import('./pages/tools/atmosphere-weather/Notam'), 'Notam');
const MetBrief = lazyNamed(() => import('./pages/tools/atmosphere-weather/MetBrief'), 'MetBrief');
const ChartSymbols = lazyNamed(
  () => import('./pages/tools/reference/ChartSymbols'),
  'ChartSymbols',
);
const VfrMinima = lazyNamed(() => import('./pages/tools/regulations/RegLookup'), 'VfrMinima');
const Oxygen = lazyNamed(() => import('./pages/tools/regulations/RegLookup'), 'Oxygen');
const FuelReserves = lazyNamed(() => import('./pages/tools/regulations/RegLookup'), 'FuelReserves');
const ConversionChecker = lazyNamed(
  () => import('./pages/tools/regulations/RegLookup'),
  'ConversionChecker',
);
const Aerodromes = lazyNamed(() => import('./pages/tools/procedures/Aerodromes'), 'Aerodromes');
const AerodromeDetail = lazyNamed(
  () => import('./pages/tools/procedures/AerodromeDetail'),
  'AerodromeDetail',
);
const Airspace = lazyNamed(() => import('./pages/tools/procedures/Airspace'), 'Airspace');
const Definitions = lazyNamed(() => import('./pages/tools/procedures/Definitions'), 'Definitions');
const RoutePlanner = lazyNamed(
  () => import('./pages/tools/navigation/RoutePlanner'),
  'RoutePlanner',
);
const FlightPlan = lazyNamed(() => import('./pages/tools/navigation/FlightPlan'), 'FlightPlan');
const CriticalPoint = lazyNamed(
  () => import('./pages/tools/navigation/CriticalPoint'),
  'CriticalPoint',
);
const TopOfClimb = lazyNamed(() => import('./pages/tools/performance/TopOfClimb'), 'TopOfClimb');
const TurnPerformance = lazyNamed(
  () => import('./pages/tools/performance/TurnPerformance'),
  'TurnPerformance',
);
const PivotalAltitude = lazyNamed(
  () => import('./pages/tools/navigation/PivotalAltitude'),
  'PivotalAltitude',
);
const TrueAltitude = lazyNamed(
  () => import('./pages/tools/atmosphere-weather/TrueAltitude'),
  'TrueAltitude',
);

// Learn (unified Guides + Study hub)
const LearnHub = lazyNamed(() => import('./pages/learn/LearnHub'), 'LearnHub');

// Guides
const Guide = lazyNamed(() => import('./pages/guides/Guide'), 'Guide');

// Study
const Quiz = lazyNamed(() => import('./pages/study/Quiz'), 'Quiz');
const Flashcards = lazyNamed(() => import('./pages/study/Flashcards'), 'Flashcards');
const GroundSchool = lazyNamed(() => import('./pages/study/GroundSchool'), 'GroundSchool');
const MockExam = lazyNamed(() => import('./pages/study/MockExam'), 'MockExam');
const Paths = lazyNamed(() => import('./pages/study/Paths'), 'Paths');
const Packs = lazyNamed(() => import('./pages/study/Packs'), 'Packs');
const PackDetail = lazyNamed(
  () => import('./pages/study/PackDetail'),
  'PackDetail',
) as ComponentType<{ fixedId?: string; standalone?: boolean }>;
const StudySheets = lazyNamed(() => import('./pages/study/StudySheets'), 'StudySheets');

// Account
const Account = lazyNamed(() => import('./pages/account/Account'), 'Account');
const Dashboard = lazyNamed(() => import('./pages/account/Dashboard'), 'Dashboard');
const Currency = lazyNamed(() => import('./pages/account/Currency'), 'Currency');
const Logbook = lazyNamed(() => import('./pages/account/Logbook'), 'Logbook');
const Records = lazyNamed(() => import('./pages/account/Records'), 'Records');
const Settings = lazyNamed(() => import('./pages/account/Settings'), 'Settings');

// Marketing / legal
const Checkout = lazyNamed(() => import('./pages/checkout/Checkout'), 'Checkout');
const Pricing = lazyNamed(() => import('./pages/pricing/Pricing'), 'Pricing');
const Schools = lazyNamed(() => import('./pages/schools/Schools'), 'Schools');
const Developers = lazyNamed(() => import('./pages/developers/Developers'), 'Developers');
const Hud = lazyNamed(() => import('./pages/hud/Hud'), 'Hud');
const BusinessAdmin = lazyNamed(() => import('./pages/business/Admin'), 'BusinessAdmin');
const About = lazyNamed(() => import('./pages/about/About'), 'About');
const SupportPage = lazyNamed(() => import('./pages/support/SupportPage'), 'SupportPage');
const DisclaimerPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'DisclaimerPage');
const TermsPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'TermsPage');
const PrivacyPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'PrivacyPage');
const RefundPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'RefundPage');
const SafetyPage = lazyNamed(() => import('./pages/legal/LegalPage'), 'SafetyPage');
const NotFound = lazyNamed(() => import('./pages/not-found/NotFound'), 'NotFound');
const Offline = lazyNamed(() => import('./pages/offline/Offline'), 'Offline');

// Standalone prep-app (flavor) chrome — FlavorRoot is a tiny eager shell that
// lazy-loads the real layout, so on the main web build (where the flavor tree
// is never mounted) none of the flavor chunks are ever fetched.
const FlavorSettings = lazyNamed(() => import('./app/flavor/FlavorSettings'), 'FlavorSettings');

/**
 * The Arabic variant of every content route lives under `/ar`. When the current
 * URL is in that prefix we mount the *same* route tree under `basename: '/ar'`,
 * so react-router matches the `/ar`-stripped path, `useLocation()` returns the
 * logical path, and every `<Link>` automatically prepends `/ar` — keeping all
 * in-app navigation inside the Arabic cluster with no per-link changes.
 */
const basename =
  typeof window !== 'undefined' && isArabicPath(window.location.pathname) ? AR_PREFIX : undefined;

/**
 * Route table for a standalone prep app: the pack dashboard is home, plus the
 * shared study runners (their data is already sliced to the pack by
 * scripts/build-flavor.mjs), the Document reader for the pack's reading list,
 * slim settings and the legal pages. Every path literal here also exists in the
 * main table below, so scripts/build-sitemap.mjs's textual scan of this file
 * (and the prerender coverage that mirrors it) is unaffected.
 */
const flavorRoutes = [
  {
    path: '/',
    element: <FlavorRoot />,
    children: [
      { index: true, element: <PackDetail fixedId={FLAVOR.packId} standalone /> },
      { path: 'study/quiz', element: <Quiz /> },
      { path: 'study/flashcards', element: <Flashcards /> },
      { path: 'study/groundschool', element: <GroundSchool /> },
      { path: 'study/exam', element: <MockExam /> },
      { path: 'study/paths', element: <Paths /> },
      { path: 'study/sheets', element: <StudySheets /> },
      // In-app links from the shared runners point at the pack's storefront
      // routes; in a single-pack app both collapse onto the dashboard.
      { path: 'study/packs', element: <Navigate to="/" replace /> },
      { path: 'study/packs/:id', element: <Navigate to="/" replace /> },
      { path: 'library/reference/:slug', element: <Document kind="reference" /> },
      { path: 'library/handbook/:slug', element: <Document kind="handbook" /> },
      { path: 'library/:slug', element: <Document /> },
      { path: 'settings', element: <FlavorSettings /> },
      { path: 'disclaimer', element: <DisclaimerPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'refund', element: <RefundPage /> },
      { path: 'safety', element: <SafetyPage /> },
      { path: 'offline', element: <Offline /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

/**
 * Route table for the app. Each page lives under src/pages/. As more pages are
 * ported from the legacy site they slot in here (see MIGRATION.md).
 */
const mainRoutes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'library', element: <Library /> },
      { path: 'library/charts', element: <Charts /> },
      { path: 'library/map', element: <LibraryMap /> },
      { path: 'library/glossary', element: <Glossary /> },
      { path: 'library/reference/:slug', element: <Document kind="reference" /> },
      { path: 'library/handbook/:slug', element: <Document kind="handbook" /> },
      { path: 'library/:slug', element: <Document /> },
      { path: 'updates', element: <Updates /> },
      { path: 'chat', element: <Chat /> },
      { path: 'tools', element: <ToolsIndex /> },
      { path: 'tools/crosswind', element: <Crosswind /> },
      { path: 'tools/density-altitude', element: <DensityAltitude /> },
      { path: 'tools/tas', element: <Tas /> },
      { path: 'tools/pressure-altitude', element: <PressureAltitude /> },
      { path: 'tools/isa', element: <Isa /> },
      { path: 'tools/altimeter', element: <Altimeter /> },
      { path: 'tools/cloud-base', element: <CloudBase /> },
      { path: 'tools/mach', element: <Mach /> },
      { path: 'tools/climb-gradient', element: <ClimbGradient /> },
      { path: 'tools/standard-rate-turn', element: <StandardRateTurn /> },
      { path: 'tools/wind-table', element: <WindTable /> },
      { path: 'tools/hydroplaning', element: <Hydroplaning /> },
      { path: 'tools/takeoff-landing', element: <TakeoffLanding /> },
      { path: 'tools/wind-triangle', element: <WindTriangle /> },
      { path: 'tools/great-circle', element: <GreatCircle /> },
      { path: 'tools/one-in-sixty', element: <OneInSixty /> },
      { path: 'tools/tsd', element: <Tsd /> },
      { path: 'tools/e6b', element: <E6b /> },
      { path: 'tools/top-of-descent', element: <TopOfDescent /> },
      { path: 'tools/descent-vdp', element: <DescentVdp /> },
      { path: 'tools/fuel', element: <Fuel /> },
      { path: 'tools/specific-range', element: <SpecificRange /> },
      { path: 'tools/weight-balance', element: <WeightBalance /> },
      { path: 'tools/zulu-clock', element: <ZuluClock /> },
      { path: 'tools/airac', element: <AiracCycle /> },
      { path: 'tools/sun-times', element: <SunTimes /> },
      { path: 'tools/part61-currency', element: <Part61Currency /> },
      { path: 'tools/medical-validity', element: <MedicalValidity /> },
      { path: 'tools/flight-review', element: <FlightReview /> },
      { path: 'tools/holding', element: <Holding /> },
      { path: 'tools/procedural-separation', element: <ProceduralSeparation /> },
      { path: 'tools/vfr-brief', element: <VfrBrief /> },
      { path: 'tools/loa', element: <Loa /> },
      { path: 'tools/units', element: <Units /> },
      { path: 'tools/transponder', element: <Transponder /> },
      { path: 'tools/phonetic', element: <Phonetic /> },
      { path: 'tools/metar', element: <Metar /> },
      { path: 'tools/taf', element: <Taf /> },
      { path: 'tools/notam', element: <Notam /> },
      { path: 'tools/met-brief', element: <MetBrief /> },
      { path: 'tools/chart-symbols', element: <ChartSymbols /> },
      { path: 'tools/vfr-minima', element: <VfrMinima /> },
      { path: 'tools/oxygen', element: <Oxygen /> },
      { path: 'tools/fuel-reserves', element: <FuelReserves /> },
      { path: 'tools/conversion-checker', element: <ConversionChecker /> },
      { path: 'tools/aerodromes', element: <Aerodromes /> },
      { path: 'tools/aerodromes/:icao', element: <AerodromeDetail /> },
      { path: 'tools/airspace', element: <Airspace /> },
      { path: 'tools/definitions', element: <Definitions /> },
      { path: 'tools/route-planner', element: <RoutePlanner /> },
      { path: 'tools/flight-plan', element: <FlightPlan /> },
      { path: 'tools/critical-point', element: <CriticalPoint /> },
      { path: 'tools/top-of-climb', element: <TopOfClimb /> },
      { path: 'tools/turn-performance', element: <TurnPerformance /> },
      { path: 'tools/pivotal-altitude', element: <PivotalAltitude /> },
      { path: 'tools/true-altitude', element: <TrueAltitude /> },
      { path: 'learn', element: <LearnHub /> },
      // The former Guides + Study hubs are merged into /learn; keep their URLs working.
      { path: 'guides', element: <Navigate to="/learn" replace /> },
      { path: 'guides/:slug', element: <Guide /> },
      { path: 'study', element: <Navigate to="/learn?tab=practice" replace /> },
      { path: 'study/quiz', element: <Quiz /> },
      { path: 'study/flashcards', element: <Flashcards /> },
      { path: 'study/groundschool', element: <GroundSchool /> },
      { path: 'study/exam', element: <MockExam /> },
      { path: 'study/paths', element: <Paths /> },
      { path: 'study/packs', element: <Packs /> },
      { path: 'study/packs/:id', element: <PackDetail /> },
      { path: 'study/sheets', element: <StudySheets /> },
      { path: 'account', element: <Account /> },
      // Legacy/expected auth URLs — sign-in and sign-up both live on /account.
      { path: 'signin', element: <Navigate to="/account" replace /> },
      { path: 'signup', element: <Navigate to="/account" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'currency', element: <Currency /> },
      { path: 'logbook', element: <Logbook /> },
      { path: 'records', element: <Records /> },
      { path: 'settings', element: <Settings /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'checkout/return', element: <Checkout /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'schools', element: <Schools /> },
      { path: 'developers', element: <Developers /> },
      { path: 'hud', element: <Hud /> },
      { path: 'business/admin', element: <BusinessAdmin /> },
      { path: 'about', element: <About /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'disclaimer', element: <DisclaimerPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'refund', element: <RefundPage /> },
      { path: 'safety', element: <SafetyPage /> },
      { path: 'offline', element: <Offline /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

/** Flavor builds swap in the reduced tree; the main web app is untouched. */
export const routes = IS_FLAVOR_APP ? flavorRoutes : mainRoutes;

/**
 * Arabic is the SAME route tree mounted under `basename: '/ar'` when the URL is an
 * Arabic document (`/ar`, `/ar/…`). React Router then strips the prefix — so
 * `<Link>`s auto-prepend `/ar` (Arabic pages self-reference) and `useLocation()`
 * reports the logical path meta/canonical code already expects. `main.tsx`'s
 * `localeRedirect` guarantees the URL and the mounted basename always agree.
 */
export const router = createBrowserRouter(routes, { basename });
