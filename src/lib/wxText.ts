/** Bilingual rendering of parsed METAR/TAF fields. Takes a translate function so
 *  the calc layer stays pure. Shared by the METAR and TAF pages. */
import type { Cloud, Wind } from '@/calc/metar';

type T = (key: string, options?: Record<string, unknown>) => string;

export function describeWind(w: Wind | null, t: T): string {
  if (!w) return t('wx.none');
  if (w.speedKt === 0) return t('wx.calm');
  let s = w.dir === 'VRB' ? t('wx.vrb') : t('wx.atKt', { dir: w.dir, spd: w.speedKt });
  if (w.gustKt) s += t('wx.gusting', { g: w.gustKt });
  if (w.variableFrom != null && w.variableTo != null) {
    s += t('wx.variableBetween', { from: w.variableFrom, to: w.variableTo });
  }
  return s;
}

export function describeVisibility(m: number | null, t: T): string {
  if (m == null) return t('wx.none');
  return m >= 9999 ? t('wx.tenKm') : t('wx.metres', { m });
}

export function describeClouds(clouds: Cloud[], t: T): string {
  if (clouds.length === 0) return t('wx.none');
  return clouds
    .map((c) => `${t(`wx.cover.${c.cover}`)} ${t('wx.ft', { ft: c.baseFt })}${c.cb ? ' CB' : ''}`)
    .join(', ');
}

function decodeToken(tok: string, t: T): string {
  let s = tok;
  let out = '';
  if (s[0] === '+' || s[0] === '-') {
    out += t(`wx.code.${s[0]}`);
    s = s.slice(1);
  } else if (s.startsWith('VC')) {
    out += t('wx.code.VC');
    s = s.slice(2);
  }
  for (let i = 0; i < s.length; i += 2) {
    const ch = s.slice(i, i + 2);
    const key = `wx.code.${ch}`;
    const d = t(key);
    out += d === key ? ch : d;
  }
  return out.trim();
}

export function describeWeather(tokens: string[], t: T): string {
  if (tokens.length === 0) return t('wx.none');
  return tokens.map((tok) => decodeToken(tok, t)).join(', ');
}
