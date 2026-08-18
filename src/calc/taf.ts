/** TAF parser — reuses the METAR token parsers. Splits the forecast into its
 *  base group and change groups (FM / BECMG / TEMPO / PROB). Pure. */
import { parseWind, parseCloud, isWeather, type Wind, type Cloud } from './metar';

export type GroupType = 'BASE' | 'FM' | 'BECMG' | 'TEMPO' | 'PROB';

export interface TafGroup {
  type: GroupType;
  /** Period as written, e.g. "1212/1318", or "121800" for FM. */
  period: string | null;
  prob?: number;
  wind: Wind | null;
  cavok: boolean;
  visibilityM: number | null;
  clouds: Cloud[];
  weather: string[];
}

export interface TafReport {
  station: string | null;
  issue: { day: number; hour: number; minute: number } | null;
  validity: string | null;
  groups: TafGroup[];
  raw: string;
}

const emptyGroup = (type: GroupType, period: string | null, prob?: number): TafGroup => ({
  type,
  period,
  prob,
  wind: null,
  cavok: false,
  visibilityM: null,
  clouds: [],
  weather: [],
});

function fill(g: TafGroup, tok: string): void {
  if (tok === 'CAVOK') {
    g.cavok = true;
    return;
  }
  const w = parseWind(tok);
  if (w) {
    g.wind = w;
    return;
  }
  if (/^\d{4}$/.test(tok)) {
    g.visibilityM = parseInt(tok, 10);
    return;
  }
  const c = parseCloud(tok);
  if (c) {
    g.clouds.push(c);
    return;
  }
  if (isWeather(tok)) g.weather.push(tok);
}

export function parseTaf(raw: string): TafReport {
  const tokens = raw.trim().toUpperCase().replace(/=$/, '').split(/\s+/);
  const r: TafReport = { station: null, issue: null, validity: null, groups: [], raw: raw.trim() };
  let group: TafGroup | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === 'TAF' || tok === 'AMD' || tok === 'COR') continue;
    if (!r.station && /^[A-Z]{4}$/.test(tok)) {
      r.station = tok;
      continue;
    }
    const time = tok.match(/^(\d{2})(\d{2})(\d{2})Z$/);
    if (time && !r.issue) {
      r.issue = { day: +time[1], hour: +time[2], minute: +time[3] };
      continue;
    }
    if (/^\d{4}\/\d{4}$/.test(tok) && !r.validity) {
      r.validity = tok;
      group = emptyGroup('BASE', tok);
      r.groups.push(group);
      continue;
    }
    const fm = tok.match(/^FM(\d{6})$/);
    if (fm) {
      group = emptyGroup('FM', fm[1]);
      r.groups.push(group);
      continue;
    }
    if (tok === 'BECMG' || tok === 'TEMPO') {
      const period = /^\d{4}\/\d{4}$/.test(tokens[i + 1]) ? tokens[++i] : null;
      group = emptyGroup(tok, period);
      r.groups.push(group);
      continue;
    }
    const prob = tok.match(/^PROB(\d{2})$/);
    if (prob) {
      const period = /^\d{4}\/\d{4}$/.test(tokens[i + 1]) ? tokens[++i] : null;
      group = emptyGroup('PROB', period, +prob[1]);
      r.groups.push(group);
      continue;
    }
    if (group) fill(group, tok);
  }
  return r;
}
