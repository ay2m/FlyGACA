import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { setTheme } from '@/lib/theme';

// ThemeToggle cycles the three themes on <html> via data-theme: Falcon (default,
// no attribute) → Cockpit / Night-Ops → Day (light reading) → back. Its label
// names the theme the next click will switch to.

afterEach(() => {
  cleanup();
  setTheme('falcon');
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

describe('<ThemeToggle />', () => {
  it('labels the button with the next theme on the default (Falcon) theme', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to night-ops theme' })).toBeInTheDocument();
  });

  it('cycles falcon → cockpit → day → falcon on successive clicks', () => {
    render(<ThemeToggle />);
    const btn = () => screen.getByRole('button');
    const root = document.documentElement;

    fireEvent.click(btn());
    expect(root.getAttribute('data-theme')).toBe('cockpit');
    expect(btn()).toHaveAccessibleName('Switch to day (reading) theme');

    fireEvent.click(btn());
    expect(root.getAttribute('data-theme')).toBe('day');
    expect(btn()).toHaveAccessibleName('Switch to Falcon (dark) theme');

    fireEvent.click(btn());
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(btn()).toHaveAccessibleName('Switch to night-ops theme');
  });

  it('passes the className through to the button', () => {
    render(<ThemeToggle className="theme-toggle" />);
    expect(screen.getByRole('button')).toHaveClass('theme-toggle');
  });
});
