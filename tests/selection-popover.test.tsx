/**
 * src/components/library/SelectionPopover.tsx — the floating highlight/add-note
 * toolbar shown over a text selection in the reader (previously 0%). Prop-driven;
 * plain render + role queries + userEvent.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionPopover, type SelectionRect } from '@/components/library/SelectionPopover';

const rect: SelectionRect = { top: 100, left: 40, width: 80, height: 20 };

afterEach(cleanup);

function setup(over: Partial<Parameters<typeof SelectionPopover>[0]> = {}) {
  const onHighlight = vi.fn();
  const onSaveNote = vi.fn();
  const onClose = vi.fn();
  render(
    <SelectionPopover
      rect={rect}
      onHighlight={onHighlight}
      onSaveNote={onSaveNote}
      onClose={onClose}
      {...over}
    />,
  );
  return { onHighlight, onSaveNote, onClose };
}

describe('SelectionPopover — default actions', () => {
  it('offers Highlight and Add note and fires onHighlight', () => {
    const { onHighlight } = setup();
    expect(screen.getByRole('dialog', { name: 'Annotate' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Highlight/ }));
    expect(onHighlight).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SelectionPopover — note mode', () => {
  it('reveals the textarea, keeps Save disabled until text is entered, then reports the trimmed note', async () => {
    const user = userEvent.setup();
    const { onSaveNote } = setup();

    await user.click(screen.getByRole('button', { name: /Add note/ }));
    const save = screen.getByRole('button', { name: 'Save note' });
    expect(save).toBeDisabled();

    await user.type(screen.getByRole('textbox'), '  keep this  ');
    expect(save).toBeEnabled();
    await user.click(save);
    expect(onSaveNote).toHaveBeenCalledWith('keep this');
  });
});
