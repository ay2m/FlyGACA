import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import i18n from '@/i18n';
import { Offline } from '@/pages/offline/Offline';
import { renderWithRouter } from './helpers/render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  act(() => void i18n.changeLanguage('en'));
});

describe('<Offline /> page', () => {
  it('renders the offline heading and the offline-capable links', () => {
    renderWithRouter(<Offline />);

    expect(screen.getByRole('heading', { name: "You're offline" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flight tools' })).toHaveAttribute('href', '/tools');
    expect(screen.getByRole('link', { name: 'Saved library' })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: 'Study' })).toHaveAttribute('href', '/learn');
  });

  it('surfaces a "back online" status only once connectivity returns', () => {
    // useOnline seeds from navigator.onLine at mount, so start it offline.
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderWithRouter(<Offline />);

    expect(screen.queryByText("You're back online.")).not.toBeInTheDocument();

    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.getByText("You're back online.")).toBeInTheDocument();
  });
});
