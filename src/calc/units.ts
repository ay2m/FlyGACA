/** Multi-domain unit converter. Each table's factor is "base units per 1 unit"
 *  (base = the first unit). Temperature is special-cased. Pure. */

export type UnitCategory =
  'length' | 'speed' | 'altitude' | 'pressure' | 'mass' | 'volume' | 'temperature';

interface Unit {
  id: string;
  factor: number;
}

export const UNIT_TABLES: Record<UnitCategory, Unit[]> = {
  length: [
    { id: 'm', factor: 1 },
    { id: 'ft', factor: 0.3048 },
    { id: 'NM', factor: 1852 },
    { id: 'km', factor: 1000 },
    { id: 'mi', factor: 1609.344 },
  ],
  speed: [
    { id: 'kt', factor: 1 },
    { id: 'mph', factor: 0.868976 },
    { id: 'km/h', factor: 0.539957 },
    { id: 'm/s', factor: 1.943844 },
  ],
  altitude: [
    { id: 'ft', factor: 1 },
    { id: 'm', factor: 3.28084 },
  ],
  pressure: [
    { id: 'hPa', factor: 1 },
    { id: 'inHg', factor: 33.8639 },
    { id: 'mmHg', factor: 1.33322 },
  ],
  mass: [
    { id: 'kg', factor: 1 },
    { id: 'lb', factor: 0.453592 },
  ],
  volume: [
    { id: 'L', factor: 1 },
    { id: 'US gal', factor: 3.78541 },
    { id: 'imp gal', factor: 4.54609 },
  ],
  temperature: [
    { id: '°C', factor: 1 },
    { id: '°F', factor: 1 },
    { id: 'K', factor: 1 },
  ],
};

/** Convert a value (in `fromId`) into every unit of its category. */
export function convertAll(
  value: number,
  fromId: string,
  category: UnitCategory,
): Record<string, number> | null {
  if (!Number.isFinite(value)) return null;

  if (category === 'temperature') {
    const c = fromId === '°F' ? ((value - 32) * 5) / 9 : fromId === 'K' ? value - 273.15 : value;
    return { '°C': c, '°F': (c * 9) / 5 + 32, K: c + 273.15 };
  }

  const units = UNIT_TABLES[category];
  const from = units.find((u) => u.id === fromId);
  if (!from) return null;
  const base = value * from.factor;
  const out: Record<string, number> = {};
  for (const u of units) out[u.id] = base / u.factor;
  return out;
}
