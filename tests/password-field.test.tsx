import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from '@/components/calc/PasswordField';

describe('PasswordField', () => {
  it('renders a password input with the show toggle unpressed', () => {
    render(<PasswordField label="Password" value="" onChange={() => {}} />);
    const input = screen.getByLabelText(/password/i);
    expect(input).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Show' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles the input to text and back, flipping label and aria-pressed', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" value="secret" onChange={() => {}} />);
    const input = screen.getByLabelText(/password/i);

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(input).toHaveAttribute('type', 'text');
    const hide = screen.getByRole('button', { name: 'Hide' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');

    await user.click(hide);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('forwards typing to onChange and surfaces an error message', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PasswordField label="Password" value="" onChange={onChange} error="Too weak" />);

    await user.type(screen.getByLabelText(/password/i), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
    expect(screen.getByRole('alert')).toHaveTextContent('Too weak');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'true');
  });
});
