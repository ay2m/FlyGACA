import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { OfflineDownloads } from '@/components/pwa/OfflineDownloads';

const SAVED_KEY = 'flygaca:offline:saved';
const cachesDelete = vi.fn().mockResolvedValue(true);

beforeEach(() => {
  localStorage.clear();
  cachesDelete.mockClear();
  // jsdom has no Cache API; stub the surface offlineCache.ts touches.
  vi.stubGlobal('caches', { delete: cachesDelete, open: vi.fn() });
  Object.defineProperty(navigator, 'storage', {
    value: { estimate: vi.fn().mockResolvedValue({ usage: 2 * 1024 * 1024 }) },
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => void i18n.changeLanguage('en'));
});

describe('<OfflineDownloads />', () => {
  it('offers the bulk save action even when nothing is saved yet', async () => {
    render(<OfflineDownloads />);
    expect(
      await screen.findByRole('button', { name: 'Save all GACAR Parts offline' }),
    ).toBeInTheDocument();
    // No saved summary / remove-all until something is actually saved.
    expect(screen.queryByRole('button', { name: 'Remove all' })).toBeNull();
  });

  it('renders nothing when the Cache API is unavailable', () => {
    vi.stubGlobal('caches', undefined);
    const { container } = render(<OfflineDownloads />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the saved count and clears all on Remove', async () => {
    const user = userEvent.setup();
    localStorage.setItem(SAVED_KEY, JSON.stringify(['part-1', 'part-91']));
    render(<OfflineDownloads />);

    expect(await screen.findByText('2 saved', { exact: false })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove all' }));
    expect(cachesDelete).toHaveBeenCalledWith('flygaca-data');
    expect(screen.queryByRole('button', { name: 'Remove all' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')).toEqual([]);
  });
});
