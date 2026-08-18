import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import {
  TOUR_VERSION,
  markOnboardingSeen,
  replayOnboarding,
  useOnboardingSeen,
} from '@/lib/prefs/onboardingPrefs';

const KEY = 'flygaca:onboarding-seen';

// A tiny probe so we can observe the useSyncExternalStore-backed hook re-render.
function Probe() {
  return <span data-testid="seen">{String(useOnboardingSeen())}</span>;
}

beforeEach(() => {
  localStorage.clear();
  replayOnboarding(); // reset the module singleton between tests
});
afterEach(cleanup);

describe('onboardingPrefs', () => {
  it('reports not-seen on a fresh profile', () => {
    render(<Probe />);
    expect(screen.getByTestId('seen').textContent).toBe('false');
  });

  it('marks the current tour version as seen and persists it', () => {
    render(<Probe />);
    act(() => markOnboardingSeen());
    expect(screen.getByTestId('seen').textContent).toBe('true');
    expect(localStorage.getItem(KEY)).toBe(TOUR_VERSION);
  });

  it('replay clears the seen flag', () => {
    render(<Probe />);
    act(() => markOnboardingSeen());
    act(() => replayOnboarding());
    expect(screen.getByTestId('seen').textContent).toBe('false');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('persists the version string (so a future bump can re-show the tour)', () => {
    act(() => markOnboardingSeen());
    expect(localStorage.getItem(KEY)).toBe(TOUR_VERSION);
  });
});
