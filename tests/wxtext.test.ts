import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import { describeClouds, describeVisibility, describeWeather, describeWind } from '@/lib/wxText';
import type { Cloud, Wind } from '@/calc/metar';

// wxText renders parsed METAR/TAF fields bilingually via an injected translate
// function. We feed it a stub that resolves against the real en.json bundle and
// interpolates {{vars}} the way i18next does — including i18next's behaviour of
// returning the key itself for a miss, which decodeToken relies on for unknown
// weather codes.
const t = (key: string, options?: Record<string, unknown>): string => {
  const val = key
    .split('.')
    .reduce<unknown>(
      (o, k) =>
        o != null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined,
      en,
    );
  if (typeof val !== 'string') return key;
  return options ? val.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(options[k] ?? '')) : val;
};

describe('describeWind', () => {
  it('renders direction and speed', () => {
    const w: Wind = { dir: 330, speedKt: 15, gustKt: null };
    expect(describeWind(w, t)).toBe('330° at 15 kt');
  });

  it('appends gusts and a variable range', () => {
    const w: Wind = { dir: 330, speedKt: 15, gustKt: 25, variableFrom: 300, variableTo: 360 };
    expect(describeWind(w, t)).toBe('330° at 15 kt, gusting 25 kt (variable 300°-360°)');
  });

  it('reports calm and variable winds specially', () => {
    expect(describeWind({ dir: 0, speedKt: 0, gustKt: null }, t)).toBe('calm');
    expect(describeWind({ dir: 'VRB', speedKt: 3, gustKt: null }, t)).toBe('variable direction');
  });

  it('renders a dash for a missing wind group', () => {
    expect(describeWind(null, t)).toBe('-');
  });
});

describe('describeVisibility', () => {
  it('treats 9999 (and above) as ten km or more', () => {
    expect(describeVisibility(9999, t)).toBe('10 km or more');
  });

  it('renders metres otherwise and a dash when absent', () => {
    expect(describeVisibility(3000, t)).toBe('3000 m');
    expect(describeVisibility(null, t)).toBe('-');
  });
});

describe('describeClouds', () => {
  it('joins cover, base and a CB flag', () => {
    const clouds: Cloud[] = [
      { cover: 'FEW', baseFt: 4000, cb: false },
      { cover: 'SCT', baseFt: 2500, cb: true },
    ];
    expect(describeClouds(clouds, t)).toBe('few 4000 ft, scattered 2500 ft CB');
  });

  it('renders a dash for a clear sky', () => {
    expect(describeClouds([], t)).toBe('-');
  });
});

describe('describeWeather', () => {
  it('decodes intensity, descriptor and phenomena', () => {
    expect(describeWeather(['+TSRA'], t)).toBe('heavy thunderstorm rain');
    expect(describeWeather(['VCSH'], t)).toBe('nearby showers of');
    expect(describeWeather(['BR'], t)).toBe('mist');
  });

  it('joins multiple groups and passes unknown codes through verbatim', () => {
    expect(describeWeather(['-RA', 'BR'], t)).toBe('light rain, mist');
    // ZZ is not a known two-char code → i18next returns the key, so the raw
    // chunk is echoed back rather than the dotted key.
    expect(describeWeather(['ZZ'], t)).toBe('ZZ');
  });

  it('renders a dash when there is no weather', () => {
    expect(describeWeather([], t)).toBe('-');
  });
});
