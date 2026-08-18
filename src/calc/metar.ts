/** METAR parser — tokenises a raw METAR into structured fields. Shared token
 *  parsers are reused by the TAF decoder. Pure. A decoding aid; always read the
 *  official report. */

export interface Wind {
  dir: number | 'VRB' | null;
  speedKt: number | null;
  gustKt: number | null;
  variableFrom?: number;
  variableTo?: number;
}

export interface Cloud {
  cover: 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'VV';
  baseFt: number | null;
  cb: boolean;
}

export interface MetarReport {
  station: string | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  auto: boolean;
  wind: Wind | null;
  cavok: boolean;
  visibilityM: number | null;
  weather: string[];
  clouds: Cloud[];
  tempC: number | null;
  dewC: number | null;
  qnhHpa: number | null;
  altimInHg: number | null;
  raw: string;
}

const num = (s: string) => (s.startsWith('M') ? -parseInt(s.slice(1), 10) : parseInt(s, 10));

export function parseWind(tok: string): Wind | null {
  const m = tok.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/);
  if (!m) return null;
  const factor = m[4] === 'MPS' ? 1.94384 : 1;
  return {
    dir: m[1] === 'VRB' ? 'VRB' : parseInt(m[1], 10),
    speedKt: Math.round(parseInt(m[2], 10) * factor),
    gustKt: m[3] ? Math.round(parseInt(m[3], 10) * factor) : null,
  };
}

export function parseCloud(tok: string): Cloud | null {
  const m = tok.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/);
  if (!m) return null;
  return { cover: m[1] as Cloud['cover'], baseFt: parseInt(m[2], 10) * 100, cb: m[3] === 'CB' };
}

const WX_RE =
  /^(\+|-|VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+$/;

/** True if a token is a present-weather group (e.g. "+TSRA", "BR"). */
export function isWeather(tok: string): boolean {
  return WX_RE.test(tok) && tok.length <= 8;
}

export function parseMetar(raw: string): MetarReport {
  const tokens = raw.trim().toUpperCase().replace(/=$/, '').split(/\s+/);
  const r: MetarReport = {
    station: null,
    day: null,
    hour: null,
    minute: null,
    auto: false,
    wind: null,
    cavok: false,
    visibilityM: null,
    weather: [],
    clouds: [],
    tempC: null,
    dewC: null,
    qnhHpa: null,
    altimInHg: null,
    raw: raw.trim(),
  };

  for (const tok of tokens) {
    if (tok === 'METAR' || tok === 'SPECI') continue;
    if (tok === 'AUTO') {
      r.auto = true;
      continue;
    }
    if (tok === 'CAVOK') {
      r.cavok = true;
      continue;
    }
    if (!r.station && /^[A-Z]{4}$/.test(tok)) {
      r.station = tok;
      continue;
    }
    const time = tok.match(/^(\d{2})(\d{2})(\d{2})Z$/);
    if (time && r.day == null) {
      r.day = +time[1];
      r.hour = +time[2];
      r.minute = +time[3];
      continue;
    }
    const w = parseWind(tok);
    if (w) {
      r.wind = w;
      continue;
    }
    const vrb = tok.match(/^(\d{3})V(\d{3})$/);
    if (vrb && r.wind) {
      r.wind.variableFrom = +vrb[1];
      r.wind.variableTo = +vrb[2];
      continue;
    }
    if (/^\d{4}$/.test(tok)) {
      r.visibilityM = parseInt(tok, 10);
      continue;
    }
    const c = parseCloud(tok);
    if (c) {
      r.clouds.push(c);
      continue;
    }
    const td = tok.match(/^(M?\d{2})\/(M?\d{2})$/);
    if (td) {
      r.tempC = num(td[1]);
      r.dewC = num(td[2]);
      continue;
    }
    const q = tok.match(/^Q(\d{4})$/);
    if (q) {
      r.qnhHpa = +q[1];
      continue;
    }
    const a = tok.match(/^A(\d{4})$/);
    if (a) {
      r.altimInHg = +a[1] / 100;
      continue;
    }
    if (isWeather(tok)) r.weather.push(tok);
  }
  return r;
}
