import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { FlightForm } from '@/components/account/FlightForm';
import { BLANK_FLIGHT } from '@/components/account/flight';

afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<FlightForm />', () => {
  it('does not submit an empty flight (needs a date or type)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FlightForm
        initial={BLANK_FLIGHT}
        submitLabel="Save"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the edited draft once a field is filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FlightForm
        initial={BLANK_FLIGHT}
        submitLabel="Save"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    await user.type(screen.getByLabelText('Date'), '2026-06-21');
    await user.type(screen.getByLabelText('Type'), 'C172');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-06-21', type: 'C172' }),
    );
  });

  it('fires onCancel from the cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <FlightForm
        initial={BLANK_FLIGHT}
        submitLabel="Save"
        onSubmit={() => {}}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
