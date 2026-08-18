import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChatComposer } from '@/components/chat/ChatComposer';

const handlers = () => ({ onInput: vi.fn(), onSubmit: vi.fn(), onStop: vi.fn() });

afterEach(cleanup);

describe('ChatComposer', () => {
  it('reports typing through onInput', () => {
    const h = handlers();
    render(<ChatComposer input="" busy={false} {...h} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'What is VFR?' } });
    expect(h.onInput).toHaveBeenCalledWith('What is VFR?');
  });

  it('Enter submits; Shift+Enter does not', () => {
    const h = handlers();
    render(<ChatComposer input="question" busy={false} {...h} />);
    const box = screen.getByRole('textbox');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(h.onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(h.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('submitting the form asks the page to send', () => {
    const h = handlers();
    render(<ChatComposer input="question" busy={false} {...h} />);
    fireEvent.submit(screen.getByRole('form'));
    expect(h.onSubmit).toHaveBeenCalled();
  });

  it('disables send while the input is blank', () => {
    render(<ChatComposer input="   " busy={false} {...handlers()} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('swaps send for stop while busy', () => {
    const h = handlers();
    render(<ChatComposer input="" busy {...h} />);
    const stop = screen.getByRole('button');
    fireEvent.click(stop);
    expect(h.onStop).toHaveBeenCalled();
    expect(h.onSubmit).not.toHaveBeenCalled();
  });
});
