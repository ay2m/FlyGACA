import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { Crosswind } from '@/pages/tools/performance/Crosswind';
import { renderWithRouter } from './helpers/render';

// useUrlState mirrors inputs onto window.location via history.replaceState, which
// persists across jsdom tests — reset it so each render starts from blank inputs.
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  act(() => void i18n.changeLanguage('en'));
});

describe('<Crosswind /> page wiring', () => {
  it('feeds typed inputs through the calc into the rendered outputs', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Crosswind />);

    // Before input the outputs are blank placeholders.
    expect(screen.getByText('Crosswind')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('34'), '34');
    await user.type(screen.getByPlaceholderText('290'), '290');
    await user.type(screen.getByPlaceholderText('18'), '18');

    // runway 34 → heading 340°; 18 kt at 290° → 13.8 kt crosswind from the left.
    expect(await screen.findByText('340°')).toBeInTheDocument();
    expect(screen.getByText('13.8 kt')).toBeInTheDocument();
  });
});
