import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import '@/i18n';
import { CalcShell } from '@/components/CalcShell';

// CalcShell is the shared frame every calculator follows. The conditional
// affordances (try-an-example, ask-Adel, formula, related) and the always-on
// disclaimer are the contract tool pages rely on.

afterEach(cleanup);

function renderShell(props: Partial<Parameters<typeof CalcShell>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CalcShell title="Crosswind" {...props}>
        <p>body</p>
      </CalcShell>
    </MemoryRouter>,
  );
}

describe('<CalcShell />', () => {
  it('always renders the title, body and the disclaimer', () => {
    renderShell({ intro: 'Headwind and crosswind components.' });
    expect(screen.getByRole('heading', { name: 'Crosswind' })).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByRole('note')).toBeInTheDocument();
  });

  it('omits the example and Adel actions unless their props are given', () => {
    renderShell();
    expect(screen.queryByText('Try an example')).not.toBeInTheDocument();
    expect(screen.queryByText('Ask Captain Adel to explain')).not.toBeInTheDocument();
  });

  it('wires the example button and links Adel to the prompt', () => {
    const onExample = vi.fn();
    renderShell({ onExample, adelPrompt: () => 'Explain crosswind' });
    fireEvent.click(screen.getByText('Try an example'));
    expect(onExample).toHaveBeenCalledOnce();
    expect(screen.getByText('Ask Captain Adel to explain').closest('a')).toHaveAttribute(
      'href',
      '/chat?q=Explain%20crosswind',
    );
  });

  it('hides the Adel action when the prompt resolves to null', () => {
    renderShell({ adelPrompt: () => null });
    expect(screen.queryByText('Ask Captain Adel to explain')).not.toBeInTheDocument();
  });

  it('copies the page link and restores the label after the timeout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    try {
      renderShell();
      // Copy is an icon button; its accessible name carries the label and the
      // transient confirmation (the sr-only live region announces it too).
      const btn = screen.getByRole('button', { name: 'Copy link to this setup' });
      await act(async () => {
        fireEvent.click(btn);
      });
      expect(writeText).toHaveBeenCalledWith(window.location.href);
      expect(btn).toHaveAccessibleName('✓ Link copied');
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByRole('button', { name: 'Copy link to this setup' })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('renders related-tool chips as links', () => {
    renderShell({ related: [{ to: '/tools/wind-triangle', label: 'Wind triangle' }] });
    expect(screen.getByText('Wind triangle').closest('a')).toHaveAttribute(
      'href',
      '/tools/wind-triangle',
    );
  });
});
