import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { E6b } from '@/pages/tools/navigation/E6b';
import { renderWithRouter } from './helpers/render';

/**
 * E6B was the one tool page with numeric inputs that kept them in component
 * state instead of `useNumericInputs`. It still rendered CalcShell, so the
 * copy-link button was there — but the URL it copied carried none of the user's
 * numbers, and a shared E6B link always arrived blank. These tests pin the fix
 * from both directions: typing updates the query, and a query hydrates the page.
 */

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  act(() => void i18n.changeLanguage('en'));
});

const query = () => new URLSearchParams(window.location.search);

describe('E6B keeps its inputs in the URL', () => {
  it('mirrors typed values onto the query string', async () => {
    const user = userEvent.setup();
    renderWithRouter(<E6b />);

    await user.type(screen.getByLabelText(/CAS/i), '110');
    await user.type(screen.getByLabelText(/Pressure altitude/i), '8000');

    expect(query().get('cas')).toBe('110');
    expect(query().get('pa')).toBe('8000');
  });

  it('hydrates every tab from a shared link, and computes from it', () => {
    window.history.replaceState(null, '', '/tools/e6b?tab=wind&crs=270&wtas=110&wdir=320&wspd=25');
    renderWithRouter(<E6b />, { route: '/tools/e6b' });

    expect(screen.getByRole('tab', { name: /wind/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Course/i)).toHaveValue('270');
    // 110 kt TAS against a 25 kt wind 50° off the nose — heading crabs right of
    // course and groundspeed drops below TAS.
    expect(screen.getByText(/^\d+°$/)).toBeInTheDocument();
  });

  it('records the active tab so a copied link reopens on it', async () => {
    const user = userEvent.setup();
    renderWithRouter(<E6b />);

    await user.click(screen.getByRole('tab', { name: /time/i }));
    expect(query().get('tab')).toBe('tsd');
  });

  it('falls back to the first tab when the query names an unknown one', () => {
    window.history.replaceState(null, '', '/tools/e6b?tab=nonsense');
    renderWithRouter(<E6b />, { route: '/tools/e6b' });

    expect(screen.getByRole('tab', { name: /true airspeed/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
