import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { OPEN_CMDK_EVENT } from '@/components/CommandPalette/openCommandPalette';
import { renderWithRouter } from './helpers/render';

// The palette is closed by default and opens on ⌘K or the OPEN_CMDK event. Tools
// and guides come from the in-app registry + i18n (no fetch), so the filter,
// keyboard-nav and navigate paths are exercisable in jsdom without mocking the
// (lazily-fetched) Part / aerodrome indexes.
function open(): void {
  act(() => {
    window.dispatchEvent(new CustomEvent(OPEN_CMDK_EVENT));
  });
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  window.history.replaceState(null, '', '/');
});

describe('CommandPalette', () => {
  it('is closed until opened, then shows the dialog and filter chips', () => {
    renderWithRouter(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Tools' })).toBeInTheDocument();
  });

  it('filters results to the typed query and shows the empty state for no matches', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    const input = screen.getByRole('combobox');

    await user.type(input, 'crosswind');
    const options = await screen.findAllByRole('option');
    expect(options.some((o) => /crosswind/i.test(o.textContent ?? ''))).toBe(true);

    await user.clear(input);
    await user.type(input, 'zzzznotathing');
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
    // The empty copy appears both in the visible row and the sr-only live region.
    expect(screen.getAllByText(/No matches/i).length).toBeGreaterThan(0);
  });

  it('the Guides chip filters out tool matches', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    // A tool query matches under "All"…
    await user.type(screen.getByRole('combobox'), 'crosswind');
    expect((await screen.findAllByRole('option')).length).toBeGreaterThan(0);
    // …but not once the result set is constrained to guides.
    await user.click(screen.getByRole('button', { name: 'Guides' }));
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
  });

  it('navigates to the chosen result and closes', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    await user.type(screen.getByRole('combobox'), 'crosswind');
    const option = (await screen.findAllByRole('option')).find((o) =>
      /crosswind/i.test(o.textContent ?? ''),
    )!;
    await user.click(option);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('location').textContent).toMatch(/^\/tools\//);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Escape is handled on the dialog, so focus must be inside it first.
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('moves the active option with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    const input = screen.getByRole('combobox');
    // Broad query so there are several options to move through.
    await user.type(input, 'a');
    const optionsBefore = await screen.findAllByRole('option');
    expect(optionsBefore.length).toBeGreaterThan(1);
    expect(optionsBefore[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const opts = screen.getAllByRole('option');
      expect(opts[0]).toHaveAttribute('aria-selected', 'false');
      expect(opts[1]).toHaveAttribute('aria-selected', 'true');
    });
  });
});
