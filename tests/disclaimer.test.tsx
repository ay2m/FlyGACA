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

  it('supports compact mode and applies the correct CSS class', () => {
    const { container: compactContainer } = render(<Disclaimer compact />);
    const compactNote = compactContainer.querySelector('[role="note"]');
    expect(compactNote?.className).toMatch(/_compact/);

    cleanup();
    const { container: normalContainer } = render(<Disclaimer compact={false} />);
    const normalNote = normalContainer.querySelector('[role="note"]');
    expect(normalNote?.className).not.toMatch(/_compact/);
  });

  it('ensures the strong element is always present', () => {
    const { container } = render(<Disclaimer />);
    const strong = container.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toContain('Fly GACA is an independent educational platform.');
  });

  it('includes reference to GACA official resources in both languages', async () => {
    render(<Disclaimer />);
    expect(screen.getByText(/gaca\.gov\.sa/)).toBeInTheDocument();

    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    cleanup();
    render(<Disclaimer />);
    expect(screen.getByText(/gaca\.gov\.sa/)).toBeInTheDocument();
  });
});
