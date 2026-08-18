import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AerodromeScope, nearbyAirspaces } from '@/components/aerodrome/AerodromeScope';
import type { AtsAirspace } from '@/lib/content';

const zone = (id: string, lat: number, lon: number): AtsAirspace =>
  ({
    id,
    name: id,
    name_ar: id,
    type: 'CTR',
    class: 'D',
    center: [lat, lon],
    radius_nm: 8,
    unit: '',
  }) as AtsAirspace;

describe('nearbyAirspaces', () => {
  it('keeps zones within range and drops the rest', () => {
    const center = { lat: 24.96278, lon: 46.70806 }; // OERK
    const zones = [zone('near', 24.9576, 46.6988), zone('far', 21.68, 39.16)];
    const near = nearbyAirspaces(zones, center, 120);
    expect(near.map((z) => z.id)).toEqual(['near']);
  });
});

describe('AerodromeScope', () => {
  it('renders the SIM framing (canvas is decorative in jsdom)', () => {
    render(<AerodromeScope center={{ lat: 24.96, lon: 46.7 }} icao="OERK" zones={[]} />);
    expect(screen.getByText(/OERK/)).toBeInTheDocument();
    expect(screen.getByText(/not real air traffic/i)).toBeInTheDocument();
  });
});
