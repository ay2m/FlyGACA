import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { MessageActions } from '@/components/chat/MessageActions';
import * as nativeBridge from '@/lib/native/nativeBridge';

afterEach(() => {
  cleanup();
  // act wraps the i18n reset so any subscribed component re-render is flushed.
  act(() => void i18n.changeLanguage('en'));
});

describe('<MessageActions />', () => {
  it('copies the message text and confirms', async () => {
    // user-event installs its own navigator.clipboard stub on setup(); spy on it.
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(<MessageActions text="grounded answer" onRegenerate={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('grounded answer');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('fires onRegenerate', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(<MessageActions text="x" onRegenerate={onRegenerate} />);
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it('shows Retry (and no Copy) for an errored message', () => {
    render(<MessageActions text="x" isError onRegenerate={() => {}} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('shares the reply through the native bridge', async () => {
    const user = userEvent.setup();
    const shareSpy = vi.spyOn(nativeBridge, 'share').mockResolvedValue();
    render(<MessageActions text="grounded answer" onRegenerate={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(shareSpy).toHaveBeenCalledWith(expect.objectContaining({ text: 'grounded answer' }));
    shareSpy.mockRestore();
  });

  it('reports a feedback rating and reflects the selected state', async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    render(<MessageActions text="x" onRegenerate={() => {}} onFeedback={onFeedback} />);
    await user.click(screen.getByRole('button', { name: 'Helpful answer' }));
    expect(onFeedback).toHaveBeenCalledWith('up');
  });

  it('lights the chosen thumb via aria-pressed', () => {
    render(<MessageActions text="x" rating="down" onRegenerate={() => {}} onFeedback={() => {}} />);
    expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
