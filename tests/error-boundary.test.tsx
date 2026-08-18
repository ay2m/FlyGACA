import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@/i18n';
import { ErrorBoundary } from '@/app/ErrorBoundary';

// The top-level boundary keeps the app from white-screening when a route throws:
// the shared chrome stays mounted and a calm, bilingual fallback is shown.

afterEach(cleanup);

function Boom(): never {
  throw new Error('boom');
}

describe('<ErrorBoundary />', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('safe content')).toBeTruthy();
  });

  it('catches a render throw and shows the fallback', () => {
    // React logs caught render errors to console.error — silence the expected noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    // The fallback is an alert region with reload + back-home affordances.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
    spy.mockRestore();
  });
});
