/* eslint-disable react-refresh/only-export-components -- test-only helper, never HMR-mounted */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';

/** Writes the current location into a testid so navigation is assertable. */
export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

/** Render a component inside a MemoryRouter with a LocationProbe appended. */
export function renderWithRouter(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
      <LocationProbe />
    </MemoryRouter>,
  );
}
