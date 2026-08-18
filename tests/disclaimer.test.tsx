import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import i18n from '@/i18n';
import { Disclaimer } from '@/components/Disclaimer';

afterEach(() => {
  cleanup();
  act(() => {
    void i18n.changeLanguage('en');
  });
});

describe('<Disclaimer /> bilingual rendering', () => {
  it('renders the not-affiliated notice in English', () => {
    render(<Disclaimer />);
    expect(screen.getByRole('note')).toHaveTextContent(
      'Fly GACA is an independent educational platform.',
    );
    expect(screen.getByText(/not affiliated with/i)).toBeInTheDocument();
  });

  it('renders the notice in Arabic and flips the document to RTL', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    render(<Disclaimer />);
    expect(screen.getByRole('note')).toHaveTextContent('فلاي جاكا منصة تعليمية مستقلة.');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});
