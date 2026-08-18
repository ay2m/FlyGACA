import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import { TOUR_VERSION, replayOnboarding } from '@/lib/prefs/onboardingPrefs';

const KEY = 'flygaca:onboarding-seen';

beforeEach(() => {
  localStorage.clear();
  replayOnboarding();
});
afterEach(cleanup);

function renderTour() {
  return render(
    <MemoryRouter>
      <OnboardingTour />
    </MemoryRouter>,
  );
}

describe('<OnboardingTour />', () => {
  it('opens as a modal dialog on the welcome step', () => {
    renderTour();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Welcome to Fly GACA')).toBeTruthy();
  });

  it('advances to the next surface with Next', () => {
    renderTour();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('The regulation library')).toBeTruthy();
  });

  it('persists "seen" when skipped', () => {
    renderTour();
    fireEvent.click(screen.getByText('Skip'));
    expect(localStorage.getItem(KEY)).toBe(TOUR_VERSION);
  });

  it('persists "seen" when finished from the last step', () => {
    renderTour();
    // Walk to the final step, then confirm "Get started" dismisses + persists.
    fireEvent.click(screen.getByText('Next')); // library
    fireEvent.click(screen.getByText('Next')); // tools
    fireEvent.click(screen.getByText('Next')); // captainAdel
    fireEvent.click(screen.getByText('Next')); // bilingual (last)
    fireEvent.click(screen.getByText('Get started'));
    expect(localStorage.getItem(KEY)).toBe(TOUR_VERSION);
  });
});
