/**
 * Simulated-METAR composer for the HUD ticker.
 *
 * These reports are **fabricated training weather** — plausible for the season
 * and station, deterministic per (station, month/day/hour, seed), and always
 * presented with a SIM label in the UI. The repo's no-fabricated-weather rule
 * (see MetBrief) is why this module exists at all: the ticker never claims to
 * be real, and real briefings stay with the official sources.
 *
 * Contract: every composed string round-trips through `parseMetar`
 * (`@/calc/metar`) — enforced by the spec — so the decoders and `wxText`
 * describers can render it like any genuine report.
 */
import { pad2 } from '@/calc/zulu';
import { hash32, intIn, mulberry32 } from './rng';

export interface SimMetarAt {
  /** 0–11, as from `Date#getUTCMonth`. */
  month: number;
  day: number;
  hour: number;
}

interface StationClimate {
  /** Annual mean temperature, °C. */
  meanC: number;
  /** Seasonal swing about the mean (peak in July/August). */
  seasonAmpC: number;
  /** Day/night swing (peak mid-afternoon). */
  diurnalAmpC: number;
  /** Temperature−dewpoint spread range, °C. */
  dewSpread: [number, number];
}

/** Rough climate normals for the ticker stations (training flavour only). */
const CLIMATE: Record<string, StationClimate> = {
  OERK: { meanC: 27, seasonAmpC: 10, diurnalAmpC: 8, dewSpread: [14, 24] },
  OEJN: { meanC: 29, seasonAmpC: 5, diurnalAmpC: 5, dewSpread: [6, 12] },
  OEDF: { meanC: 27, seasonAmpC: 10, diurnalAmpC: 7, dewSpread: [8, 16] },
  OEMA: { meanC: 29, seasonAmpC: 9, diurnalAmpC: 8, dewSpread: [14, 24] },
  OEAB: { meanC: 16, seasonAmpC: 6, diurnalAmpC: 7, dewSpread: [6, 14] },
  OETB: { meanC: 22, seasonAmpC: 9, diurnalAmpC: 8, dewSpread: [12, 20] },
};

/** Stations shown on the ticker, in display order. */
export const TICKER_STATIONS: readonly string[] = Object.keys(CLIMATE);

const fmtTemp = (n: number): string => (n < 0 ? `M${pad2(Math.abs(n))}` : pad2(n));

/**
 * Compose one simulated METAR. Deterministic per (station, month/day/hour,
 * seed); the hour is the bucket, so the ticker only re-rolls once per hour.
 */
export function composeSimMetar(icao: string, at: SimMetarAt, seed: number): string {
  const climate = CLIMATE[icao] ?? CLIMATE.OERK;
  const rng = mulberry32(hash32(`${icao}|${at.month}|${at.day}|${at.hour}|${seed >>> 0}`));

  // Wind — prevailing northerlies (the Shamal flavour), occasionally calm.
  let wind: string;
  if (rng() < 0.08) {
    wind = '00000KT';
  } else {
    let dir = Math.round((330 + intIn(rng, -40, 40)) / 10) * 10;
    dir = ((dir % 360) + 360) % 360;
    if (dir === 0) dir = 360;
    const speed = intIn(rng, 4, 18);
    const gust = speed >= 14 && rng() < 0.5 ? `G${pad2(speed + intIn(rng, 6, 10))}` : '';
    wind = `${String(dir).padStart(3, '0')}${pad2(speed)}${gust}KT`;
  }

  // Visibility / weather / cloud — CAVOK-heavy with the odd blowing-dust day.
  const cavok = rng() < 0.78;
  let visGroup = 'CAVOK';
  let wxGroup = '';
  let cloudGroup = '';
  if (!cavok) {
    const visM = intIn(rng, 35, 90) * 100;
    visGroup = String(visM).padStart(4, '0');
    if (visM < 6000 && rng() < 0.6) wxGroup = 'BLDU';
    const cover = rng() < 0.5 ? 'FEW' : 'SCT';
    cloudGroup = `${cover}${String(intIn(rng, 30, 48)).padStart(3, '0')}`;
  }

  // Temperature — seasonal peak in July, diurnal peak at 12Z (≈15:00 KSA).
  const seasonal = climate.seasonAmpC * Math.cos((2 * Math.PI * (at.month - 6.5)) / 12);
  const diurnal = climate.diurnalAmpC * Math.cos((2 * Math.PI * (at.hour - 12)) / 24);
  const tempC = Math.round(climate.meanC + seasonal + diurnal + intIn(rng, -1, 1));
  const dewC = Math.max(-9, tempC - intIn(rng, climate.dewSpread[0], climate.dewSpread[1]));
  const qnh = intIn(rng, 1002, 1018);

  return [
    icao,
    `${pad2(at.day)}${pad2(at.hour)}00Z`,
    wind,
    visGroup,
    wxGroup,
    cloudGroup,
    `${fmtTemp(tempC)}/${fmtTemp(dewC)}`,
    `Q${qnh}`,
    'NOSIG',
  ]
    .filter(Boolean)
    .join(' ');
}
