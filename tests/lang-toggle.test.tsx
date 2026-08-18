import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18n from '@/i18n';
import { LangToggle } from '@/components/LangToggle';

// LangToggle is a crawlable <a> to the *other* language's URL of the current page.
// Clicking it is a full navigation (the router remounts under the matching
// basename), so here we assert the link target rather than a client-side flip. It
// shows the other language's glyph and points at that language's URL — the
// crawlable link between the English and Arabic documents.

// Reset to English after any test that switches language.
afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

const renderAt = (path: string, className?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LangToggle className={className} />
    </MemoryRouter>,
  );

describe('<LangToggle />', () => {
  it('on English, links to the /ar document of the current page and shows the Arabic glyph', () => {
    renderAt('/library');
    const a = screen.getByRole('link', { name: 'Switch language' });
    expect(a).toHaveAttribute('href', '/ar/library');
    expect(a).toHaveAttribute('hreflang', 'ar');
    expect(a).toHaveTextContent('ع');
  });

  it('on Arabic, links back to the clean English URL and shows the EN glyph', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    // On a real /ar page the router basename strips the prefix, so useLocation
    // returns the logical path; mirror that here.
    renderAt('/library');
    const a = screen.getByRole('link', { name: 'تبديل اللغة' });
    expect(a).toHaveAttribute('href', '/library');
    expect(a).toHaveAttribute('hreflang', 'en');
    expect(a).toHaveTextContent('EN');
  });

  it('preserves query + hash on the alternate URL', () => {
    renderAt('/tools/crosswind?rwy=18#calc');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ar/tools/crosswind?rwy=18#calc');
  });

  it('passes the className through to the link', () => {
    renderAt('/', 'lang-toggle');
    expect(screen.getByRole('link')).toHaveClass('lang-toggle');
  });
});
