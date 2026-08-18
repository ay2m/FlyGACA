import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { renderWithRouter } from './helpers/render';

// Every self-contained CalcShell tool page is mounted here to prove it renders
// without throwing and produces the shared CalcShell frame (an <h1> title). This
// is the cheap, broad complement to tool-pages.test.tsx — which drives the
// example → calc → output path for a representative few. Data/router-bound pages
// (Aerodromes, AerodromeDetail, Airspace, Definitions, MetBrief, RoutePlanner)
// and the multi-export RegLookup are exercised by the Playwright E2E suite, not
// here, because they need live fetches / route params.
import { AiracCycle } from '@/pages/tools/navigation/AiracCycle';
import { Altimeter } from '@/pages/tools/atmosphere-weather/Altimeter';
import { ChartSymbols } from '@/pages/tools/reference/ChartSymbols';
import { ClimbGradient } from '@/pages/tools/performance/ClimbGradient';
import { CloudBase } from '@/pages/tools/atmosphere-weather/CloudBase';
import { CriticalPoint } from '@/pages/tools/navigation/CriticalPoint';
import { Crosswind } from '@/pages/tools/performance/Crosswind';
import { DensityAltitude } from '@/pages/tools/atmosphere-weather/DensityAltitude';
import { DescentVdp } from '@/pages/tools/performance/DescentVdp';
import { E6b } from '@/pages/tools/navigation/E6b';
import { FlightPlan } from '@/pages/tools/navigation/FlightPlan';
import { FlightReview } from '@/pages/tools/regulations/FlightReview';
import { Fuel } from '@/pages/tools/weight-fuel/Fuel';
import { GreatCircle } from '@/pages/tools/navigation/GreatCircle';
import { Holding } from '@/pages/tools/procedures/Holding';
import { Hydroplaning } from '@/pages/tools/performance/Hydroplaning';
import { Isa } from '@/pages/tools/atmosphere-weather/Isa';
import { Loa } from '@/pages/tools/procedures/Loa';
import { Mach } from '@/pages/tools/performance/Mach';
import { MedicalValidity } from '@/pages/tools/regulations/MedicalValidity';
import { Metar } from '@/pages/tools/atmosphere-weather/Metar';
import { Notam } from '@/pages/tools/atmosphere-weather/Notam';
import { OneInSixty } from '@/pages/tools/navigation/OneInSixty';
import { Part61Currency } from '@/pages/tools/regulations/Part61Currency';
import { Phonetic } from '@/pages/tools/reference/Phonetic';
import { PivotalAltitude } from '@/pages/tools/navigation/PivotalAltitude';
import { PressureAltitude } from '@/pages/tools/atmosphere-weather/PressureAltitude';
import { ProceduralSeparation } from '@/pages/tools/procedures/ProceduralSeparation';
import { SpecificRange } from '@/pages/tools/weight-fuel/SpecificRange';
import { StandardRateTurn } from '@/pages/tools/performance/StandardRateTurn';
import { SunTimes } from '@/pages/tools/navigation/SunTimes';
import { Taf } from '@/pages/tools/atmosphere-weather/Taf';
import { TakeoffLanding } from '@/pages/tools/performance/TakeoffLanding';
import { Tas } from '@/pages/tools/performance/Tas';
import { TopOfClimb } from '@/pages/tools/performance/TopOfClimb';
import { TopOfDescent } from '@/pages/tools/performance/TopOfDescent';
import { Transponder } from '@/pages/tools/reference/Transponder';
import { TrueAltitude } from '@/pages/tools/atmosphere-weather/TrueAltitude';
import { Tsd } from '@/pages/tools/navigation/Tsd';
import { TurnPerformance } from '@/pages/tools/performance/TurnPerformance';
import { Units } from '@/pages/tools/reference/Units';
import { VfrBrief } from '@/pages/tools/procedures/VfrBrief';
import { WeightBalance } from '@/pages/tools/weight-fuel/WeightBalance';
import { WindTable } from '@/pages/tools/performance/WindTable';
import { WindTriangle } from '@/pages/tools/navigation/WindTriangle';
import { ZuluClock } from '@/pages/tools/navigation/ZuluClock';

const PAGES: Record<string, ComponentType> = {
  AiracCycle,
  Altimeter,
  ChartSymbols,
  ClimbGradient,
  CloudBase,
  CriticalPoint,
  Crosswind,
  DensityAltitude,
  DescentVdp,
  E6b,
  FlightPlan,
  FlightReview,
  Fuel,
  GreatCircle,
  Holding,
  Hydroplaning,
  Isa,
  Loa,
  Mach,
  MedicalValidity,
  Metar,
  Notam,
  OneInSixty,
  Part61Currency,
  Phonetic,
  PivotalAltitude,
  PressureAltitude,
  ProceduralSeparation,
  SpecificRange,
  StandardRateTurn,
  SunTimes,
  Taf,
  TakeoffLanding,
  Tas,
  TopOfClimb,
  TopOfDescent,
  Transponder,
  TrueAltitude,
  Tsd,
  TurnPerformance,
  Units,
  VfrBrief,
  WeightBalance,
  WindTable,
  WindTriangle,
  ZuluClock,
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('tool pages mount cleanly with the CalcShell frame', () => {
  for (const [name, Component] of Object.entries(PAGES)) {
    it(`${name} renders a titled CalcShell page`, () => {
      renderWithRouter(<Component />);
      // CalcShell always renders the page title as the single <h1>; its presence
      // proves the page → CalcShell wiring mounted without throwing.
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  }
});
