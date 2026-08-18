import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { InstallButton } from '@/components/pwa/InstallButton';

// A synthetic beforeinstallprompt: a real Event carrying a mock prompt() so the
// hook can capture it and the component can reveal the Install affordance.
function fireBeforeInstallPrompt(prompt = vi.fn().mockResolvedValue(undefined)) {
  const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void> };
  e.prompt = prompt;
  act(() => void window.dispatchEvent(e));
  return prompt;
}

beforeEach(() => {
  // jsdom's userAgent is not iOS Safari, so isIosSafari() is false by default.
});
afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<InstallButton />', () => {
  it('renders nothing before the browser offers an install prompt', () => {
    render(<InstallButton />);
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('reveals the button after beforeinstallprompt and prompts on click', async () => {
    const user = userEvent.setup();
    render(<InstallButton />);
    const prompt = fireBeforeInstallPrompt();
    const btn = screen.getByRole('button', { name: 'Install app' });
    await user.click(btn);
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('hides again once the app is installed', () => {
    render(<InstallButton />);
    fireBeforeInstallPrompt();
    expect(screen.getByRole('button', { name: 'Install app' })).toBeInTheDocument();
    act(() => void window.dispatchEvent(new Event('appinstalled')));
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });
});
