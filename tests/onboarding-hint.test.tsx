import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { markOnboardingSeen, replayOnboarding } from '@/lib/prefs/onboardingPrefs';

describe('<OnboardingHint />', () => {
  beforeEach(() => {
    localStorage.clear();
    replayOnboarding();
  });

  afterEach(cleanup);

  it('renders hint for first time visitor', () => {
    render(<OnboardingHint />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('dismisses when close button is clicked', () => {
    render(<OnboardingHint />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(localStorage.getItem('flygaca:onboarding-seen')).toBe('1');
  });

  it('does not render if already marked as seen', () => {
    act(() => {
      markOnboardingSeen();
    });
    const { container } = render(<OnboardingHint />);
    expect(container.firstChild).toBeNull();
  });
});
