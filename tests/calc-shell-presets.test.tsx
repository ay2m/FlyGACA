/**
 * The CalcShell affordances the base calc-shell.test.tsx doesn't reach: the
 * share button, the "How it works" collapsible, and the Pro preset lifecycle
 * (save → appears in the list → load navigates → remove). One frame test
 * protects every tool page's shared chrome. useFeature is forced to Pro here and
 * share is stubbed; react-router is partially mocked to spy on navigation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import '@/i18n';

const h = vi.hoisted(() => ({ navigate: vi.fn(), shareResult: 'shared' as 'shared' | 'copied' }));

vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => h.navigate,
}));
vi.mock('@/lib/services/features', () => ({ useFeature: () => true })); // Pro
vi.mock('@/lib/share', () => ({ shareCurrent: vi.fn(() => Promise.resolve(h.shareResult)) }));

import { CalcShell } from '@/components/CalcShell';

function renderShell(route = '/tools/crosswind?wind=10') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CalcShell title="Crosswind">
        <p>body</p>
      </CalcShell>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  h.navigate.mockClear();
  h.shareResult = 'shared';
});
afterEach(cleanup);

describe('<CalcShell /> share action', () => {
  it('announces "Shared" after a successful Web Share, then restores the label', async () => {
    vi.useFakeTimers();
    try {
      renderShell();
      const btn = screen.getByRole('button', { name: 'Share' });
      await act(async () => {
        fireEvent.click(btn);
      });
      expect(btn).toHaveAccessibleName('✓ Shared');
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('announces "Link copied" when share falls back to the clipboard', async () => {
    h.shareResult = 'copied';
    renderShell();
    const btn = screen.getByRole('button', { name: 'Share' });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAccessibleName('✓ Link copied');
  });
});

describe('<CalcShell /> formula collapsible', () => {
  it('renders the "How it works" explainer when a formula is supplied', () => {
    render(
      <MemoryRouter>
        <CalcShell title="Crosswind" formula={<p>sin of the wind angle</p>}>
          <p>body</p>
        </CalcShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('sin of the wind angle')).toBeInTheDocument();
  });
});

describe('<CalcShell /> preset lifecycle (Pro)', () => {
  it('saves the current setup, lists it, loads it, and removes it', () => {
    renderShell('/tools/crosswind?wind=10');

    // Enter the naming form and save a named preset.
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    fireEvent.change(screen.getByLabelText('Preset name'), { target: { value: 'Gusty day' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Persisted to localStorage and shown in the saved-presets list.
    expect(localStorage.getItem('flygaca:tool-presets')).toContain('Gusty day');
    expect(screen.getByText('Saved presets')).toBeInTheDocument();

    // Loading it navigates to the stored path + query.
    fireEvent.click(screen.getByRole('button', { name: 'Gusty day' }));
    expect(h.navigate).toHaveBeenCalledWith('/tools/crosswind?wind=10');

    // Removing it clears the row and the store.
    fireEvent.click(screen.getByRole('button', { name: 'Remove preset' }));
    expect(screen.queryByText('Gusty day')).not.toBeInTheDocument();
    expect(localStorage.getItem('flygaca:tool-presets')).not.toContain('Gusty day');
  });

  it('ignores a blank preset name', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Save preset' }));
    // The Save button is disabled while the name is blank.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.queryByText('Saved presets')).not.toBeInTheDocument();
  });
});
