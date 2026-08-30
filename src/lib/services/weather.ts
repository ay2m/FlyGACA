/**
 * Live Saudi & global aviation weather service (NOAA / AviationWeather.gov API).
 * Fetches real-time METAR & TAF with in-memory caching and parsing.
 */

import {
  parseMetar,
  computeFlightCategory,
  type MetarReport,
  type FlightCategory,
} from '@/calc/metar';
import { parseTaf, type TafReport } from '@/calc/taf';

export interface LiveMetarResult {
  icao: string;
  raw: string;
  report: MetarReport;
  category: FlightCategory;
  fetchedAt: number;
}

export interface LiveTafResult {
  icao: string;
  raw: string;
  report: TafReport;
  fetchedAt: number;
}

export interface SaudiStationQuickItem {
  icao: string;
  iata: string;
  nameEn: string;
  nameAr: string;
}

export const SAUDI_PRIMARY_AERODROMES: SaudiStationQuickItem[] = [
  { icao: 'OERK', iata: 'RUH', nameEn: 'Riyadh (King Khalid)', nameAr: 'الرياض (الملك خالد)' },
  { icao: 'OEJN', iata: 'JED', nameEn: 'Jeddah (King Abdulaziz)', nameAr: 'جدة (الملك عبدالعزيز)' },
  { icao: 'OEDF', iata: 'DMM', nameEn: 'Dammam (King Fahd)', nameAr: 'الدمام (الملك فهد)' },
  {
    icao: 'OEMA',
    iata: 'MED',
    nameEn: 'Medina (Prince Mohammad)',
    nameAr: 'المدينة المنورة (الأمير محمد)',
  },
  { icao: 'OEAH', iata: 'AHB', nameEn: 'Abha', nameAr: 'أبها' },
  { icao: 'OETB', iata: 'TUU', nameEn: 'Tabuk', nameAr: 'تبوك' },
  { icao: 'OETF', iata: 'TIF', nameEn: 'Taif', nameAr: 'الطائف' },
  { icao: 'OEGS', iata: 'ELQ', nameEn: 'Gassim', nameAr: 'القصيم' },
  { icao: 'OEHL', iata: 'HAS', nameEn: 'Hail', nameAr: 'حائل' },
  { icao: 'OEGN', iata: 'GIZ', nameEn: 'Jizan', nameAr: 'جازان' },
  { icao: 'OEBA', iata: 'ABT', nameEn: 'Al Baha', nameAr: 'الباحة' },
  { icao: 'OENM', iata: 'EAM', nameEn: 'Najran', nameAr: 'نجران' },
  { icao: 'OERR', iata: 'RAE', nameEn: 'Arar', nameAr: 'عرعر' },
  { icao: 'OEJB', iata: 'JUB', nameEn: 'Jubail', nameAr: 'الجبيل' },
  { icao: 'OEWD', iata: 'WAE', nameEn: 'Wadi Ad Dawasir', nameAr: 'وادي الدواسر' },
  { icao: 'OEUD', iata: 'URY', nameEn: 'Gurayat', nameAr: 'القريات' },
];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const metarCache = new Map<string, LiveMetarResult>();
const tafCache = new Map<string, LiveTafResult>();

/** Fetches live METAR for an ICAO code from AviationWeather.gov API. */
export async function fetchLiveMetar(icao: string): Promise<LiveMetarResult | null> {
  const code = icao.trim().toUpperCase();
  if (!code || code.length < 3) return null;

  const cached = metarCache.get(code);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(code)}&format=json`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || !data[0].rawOb) {
      return null;
    }

    const raw = String(data[0].rawOb).trim();
    const report = parseMetar(raw);
    const category = computeFlightCategory(report);

    const result: LiveMetarResult = {
      icao: code,
      raw,
      report,
      category,
      fetchedAt: Date.now(),
    };

    metarCache.set(code, result);
    return result;
  } catch {
    // Fallback: If network is offline or CORS issue occurs, return null or fallback
    return null;
  }
}

/** Fetches live TAF for an ICAO code from AviationWeather.gov API. */
export async function fetchLiveTaf(icao: string): Promise<LiveTafResult | null> {
  const code = icao.trim().toUpperCase();
  if (!code || code.length < 3) return null;

  const cached = tafCache.get(code);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const url = `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(code)}&format=json`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0 || !data[0].rawTAF) {
      return null;
    }

    const raw = String(data[0].rawTAF).trim();
    const report = parseTaf(raw);

    const result: LiveTafResult = {
      icao: code,
      raw,
      report,
      fetchedAt: Date.now(),
    };

    tafCache.set(code, result);
    return result;
  } catch {
    return null;
  }
}
