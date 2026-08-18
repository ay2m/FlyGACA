import { describe, expect, it, afterEach } from 'vitest';
import type { ComponentType } from 'react';
import { cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { Isa } from '@/pages/tools/atmosphere-weather/Isa';
import { StandardRateTurn } from '@/pages/tools/performance/StandardRateTurn';
import { PressureAltitude } from '@/pages/tools/atmosphere-weather/PressureAltitude';
import { DensityAltitude } from '@/pages/tools/atmosphere-weather/DensityAltitude';
import { Mach } from '@/pages/tools/performance/Mach';
import { renderWithRouter } from './helpers/render';

// Each tool wires its inputs (via useUrlState) through a pure calc into the
// CalcShell outputs. Clicking "Try an example" fills representative inputs, so a
// per-tool output pattern proves the page → calc → render path end to end. The
// patterns are deliberately loose on exact magnitude (the calc is unit-tested
// separately) but strict on format/unit, which is what the page contributes.
const TOOLS: { name: string; Component: ComponentType; output: RegExp }[] = [
  { name: 'Isa', Component: Isa, output: /ISA\+\d+ °C/ },
  { name: 'StandardRateTurn', Component: StandardRateTurn, output: /\d+\.\d{2} NM/ },
  { name: 'PressureAltitude', Component: PressureAltitude, output: /FL\d{3}/ },
  { name: 'DensityAltitude', Component: DensityAltitude, output: /ISA\+\d+°C/ },
  { name: 'Mach', Component: Mach, output: /M \d\.\d{3}/ },
];

afterEach(() => {
  cleanup();
  // useUrlState mirrors inputs onto window.location; reset so the next tool's
  // mount doesn't inherit a previous example's matching query keys.
  window.history.replaceState(null, '', '/');
  act(() => void i18n.changeLanguage('en'));
});

describe('tool pages: example → calc → output', () => {
  for (const { name, Component, output } of TOOLS) {
    it(`${name} renders a computed result from its example`, async () => {
      const user = userEvent.setup();
      renderWithRouter(<Component />);
      await user.click(screen.getByRole('button', { name: 'Try an example' }));
      expect(await screen.findByText(output)).toBeInTheDocument();
    });
  }
});
