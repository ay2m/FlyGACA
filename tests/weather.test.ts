/**
 * `src/lib/services/weather.ts` — live METAR/TAF from AviationWeather.gov.
 *
 * It shipped at 7.5% statements / 0% branches with the NOAA weather feature, so
 * nothing here had ever been executed: not the guard on short ICAO codes, not
 * the 5-minute cache, and not the catch-all that turns every network and parse
 * failure into `null`. That last one matters most — it swallows *everything*,
 * so a regression inside the try block cannot announce itself. These tests are
 * what makes it visible.
 *
 * The module keeps its caches at module scope, so each test re-imports it
 * through `freshModule` to get empty ones rather than inheriting the previous
 * test's entries.
 *
 * Time is moved with a `Date.now` spy rather than fake timers: the fetch path
 * arms a real `setTimeout` for its 8s abort, and faking the clock would leave
 * that timer unfired and tangled with the awaits for no benefit — cache expiry
 * only ever reads `Date.now()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshModule } from './helpers/freshModule';

type Weather = typeof import('@/lib/services/weather');

const METAR_VFR = 'OERK 121200Z 33015G25KT 9999 FEW040 SCT100 38/12 Q1009';
const METAR_LOW = 'OERK 121200Z 00000KT 3000 +TSRA BKN030 20/18 Q1010';
const TAF_RAW =
  'TAF OERK 121100Z 1212/1318 33012KT 9999 FEW040 BECMG 1318/1320 02008KT TEMPO 1212/1216 5000 TSRA BKN030';

/** A fresh copy of the module, with empty METAR and TAF caches. */
function loadWeather(): Promise<Weather> {
  return freshModule<Weather>(() => import('@/lib/services/weather'));
}

/** A `fetch` returning one canned JSON body. */
function stubFetch(body: unknown, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

/**
 * A `fetch` that never settles on its own — it rejects only when the caller's
 * abort signal fires, which is how the real one behaves against a dead origin.
 */
function stubHangingFetch() {
  const fn = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('SAUDI_PRIMARY_AERODROMES', () => {
  it('lists the Saudi primaries with unique OE** ICAO codes', async () => {
    const { SAUDI_PRIMARY_AERODROMES } = await loadWeather();

    expect(SAUDI_PRIMARY_AERODROMES.length).toBeGreaterThan(0);
    for (const station of SAUDI_PRIMARY_AERODROMES) {
      expect(station.icao).toMatch(/^OE[A-Z]{2}$/);
      expect(station.iata).toMatch(/^[A-Z]{3}$/);
    }

    const icaos = SAUDI_PRIMARY_AERODROMES.map((s) => s.icao);
    expect(new Set(icaos).size).toBe(icaos.length);
  });

  it('carries an Arabic name for every station', async () => {
    const { SAUDI_PRIMARY_AERODROMES } = await loadWeather();

    for (const station of SAUDI_PRIMARY_AERODROMES) {
      expect(station.nameEn.trim()).not.toBe('');
      // The app is RTL-aware and renders these directly; an empty or
      // Latin-only Arabic name would ship untranslated into the Arabic tree.
      expect(station.nameAr).toMatch(/\p{Script=Arabic}/u);
    }
  });

  it('includes the three biggest hubs', async () => {
    const { SAUDI_PRIMARY_AERODROMES } = await loadWeather();
    const icaos = SAUDI_PRIMARY_AERODROMES.map((s) => s.icao);

    expect(icaos).toEqual(expect.arrayContaining(['OERK', 'OEJN', 'OEDF']));
  });
});

describe('fetchLiveMetar', () => {
  it('returns a parsed report and flight category', async () => {
    const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
    const { fetchLiveMetar } = await loadWeather();

    const result = await fetchLiveMetar('OERK');

    expect(result).not.toBeNull();
    expect(result?.icao).toBe('OERK');
    expect(result?.raw).toBe(METAR_VFR);
    expect(result?.report.station).toBe('OERK');
    expect(result?.category).toBe('VFR');
    expect(result?.fetchedAt).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('derives a non-VFR category from a low ceiling', async () => {
    stubFetch([{ rawOb: METAR_LOW }]);
    const { fetchLiveMetar } = await loadWeather();

    const result = await fetchLiveMetar('OERK');

    expect(result?.category).not.toBe('VFR');
    expect(['MVFR', 'IFR', 'LIFR']).toContain(result?.category);
  });

  it('normalises the ICAO code and asks the API for the normalised form', async () => {
    const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
    const { fetchLiveMetar } = await loadWeather();

    const result = await fetchLiveMetar('  oerk  ');

    expect(result?.icao).toBe('OERK');
    expect(String(fetchMock.mock.calls[0][0])).toContain('ids=OERK');
  });

  it.each([['', 'empty'], [' ', 'blank'], ['OE', 'two characters']])(
    'rejects %o (%s) without calling the API',
    async (code) => {
      const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
      const { fetchLiveMetar } = await loadWeather();

      expect(await fetchLiveMetar(code)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('serves a second call for the same station from cache', async () => {
    const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
    const { fetchLiveMetar } = await loadWeather();

    const first = await fetchLiveMetar('OERK');
    const second = await fetchLiveMetar('OERK');

    expect(second).toBe(first); // the cached object itself, not a copy
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches per station rather than globally', async () => {
    const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
    const { fetchLiveMetar } = await loadWeather();

    await fetchLiveMetar('OERK');
    await fetchLiveMetar('OEJN');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-fetches once the 5-minute cache has expired', async () => {
    const start = 1_700_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(start);
    const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
    const { fetchLiveMetar } = await loadWeather();

    await fetchLiveMetar('OERK');

    now.mockReturnValue(start + 5 * 60 * 1000 - 1); // one tick inside the TTL
    await fetchLiveMetar('OERK');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now.mockReturnValue(start + 5 * 60 * 1000); // TTL elapsed
    await fetchLiveMetar('OERK');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null on a non-OK response', async () => {
    stubFetch([{ rawOb: METAR_VFR }], 503);
    const { fetchLiveMetar } = await loadWeather();

    expect(await fetchLiveMetar('OERK')).toBeNull();
  });

  it.each([
    [[], 'an empty array'],
    [[{}], 'a row with no rawOb'],
    [{ error: 'nope' }, 'a non-array body'],
    [null, 'a null body'],
  ])('returns null for %o (%s)', async (body) => {
    stubFetch(body);
    const { fetchLiveMetar } = await loadWeather();

    expect(await fetchLiveMetar('OERK')).toBeNull();
  });

  it('returns null when the network call rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { fetchLiveMetar } = await loadWeather();

    expect(await fetchLiveMetar('OERK')).toBeNull();
  });

  it('does not cache a failed lookup', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchLiveMetar } = await loadWeather();

    await fetchLiveMetar('OERK');
    await fetchLiveMetar('OERK');

    // A cached failure would strand the station until the TTL lapsed.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('passes an abort signal so a hung request cannot wedge the caller', async () => {
    const fetchMock = stubFetch([{ rawOb: METAR_VFR }]);
    const { fetchLiveMetar } = await loadWeather();

    await fetchLiveMetar('OERK');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false); // cleared on the success path
  });

  it('aborts a hung request after 8s rather than hanging the caller', async () => {
    vi.useFakeTimers();
    const fetchMock = stubHangingFetch();
    const { fetchLiveMetar } = await loadWeather();

    const pending = fetchLiveMetar('OERK');
    await vi.advanceTimersByTimeAsync(8000);

    await expect(pending).resolves.toBeNull();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });
});

describe('fetchLiveTaf', () => {
  it('returns a parsed TAF report', async () => {
    const fetchMock = stubFetch([{ rawTAF: TAF_RAW }]);
    const { fetchLiveTaf } = await loadWeather();

    const result = await fetchLiveTaf('OERK');

    expect(result).not.toBeNull();
    expect(result?.icao).toBe('OERK');
    expect(result?.raw).toBe(TAF_RAW);
    expect(result?.report).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/taf?ids=OERK');
  });

  it('rejects a short ICAO code without calling the API', async () => {
    const fetchMock = stubFetch([{ rawTAF: TAF_RAW }]);
    const { fetchLiveTaf } = await loadWeather();

    expect(await fetchLiveTaf('OE')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves a second call from cache', async () => {
    const fetchMock = stubFetch([{ rawTAF: TAF_RAW }]);
    const { fetchLiveTaf } = await loadWeather();

    const first = await fetchLiveTaf('OERK');
    const second = await fetchLiveTaf('OERK');

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-fetches once the cache has expired', async () => {
    const start = 1_700_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(start);
    const fetchMock = stubFetch([{ rawTAF: TAF_RAW }]);
    const { fetchLiveTaf } = await loadWeather();

    await fetchLiveTaf('OERK');
    now.mockReturnValue(start + 5 * 60 * 1000);
    await fetchLiveTaf('OERK');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null on a non-OK response', async () => {
    stubFetch([{ rawTAF: TAF_RAW }], 500);
    const { fetchLiveTaf } = await loadWeather();

    expect(await fetchLiveTaf('OERK')).toBeNull();
  });

  it.each([
    [[], 'an empty array'],
    [[{}], 'a row with no rawTAF'],
    [{ error: 'nope' }, 'a non-array body'],
  ])('returns null for %o (%s)', async (body) => {
    stubFetch(body);
    const { fetchLiveTaf } = await loadWeather();

    expect(await fetchLiveTaf('OERK')).toBeNull();
  });

  it('returns null when the network call rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { fetchLiveTaf } = await loadWeather();

    expect(await fetchLiveTaf('OERK')).toBeNull();
  });

  it('aborts a hung request after 8s rather than hanging the caller', async () => {
    vi.useFakeTimers();
    const fetchMock = stubHangingFetch();
    const { fetchLiveTaf } = await loadWeather();

    const pending = fetchLiveTaf('OERK');
    await vi.advanceTimersByTimeAsync(8000);

    await expect(pending).resolves.toBeNull();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });

  it('keeps its cache separate from the METAR cache', async () => {
    const fetchMock = stubFetch([{ rawOb: METAR_VFR, rawTAF: TAF_RAW }]);
    const { fetchLiveMetar, fetchLiveTaf } = await loadWeather();

    await fetchLiveMetar('OERK');
    await fetchLiveTaf('OERK');

    // Same station, two endpoints: a shared cache would serve the METAR entry.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/metar?');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/taf?');
  });
});
