import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Alert } from '@/components/Alert';

afterEach(cleanup);

describe('<Alert />', () => {
  it('renders the message with a decorative icon and the alert role by default', () => {
    render(<Alert icon="⚠">Could not load.</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load.');
    expect(screen.getByText('⚠')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders no action button when none is given', () => {
    render(<Alert>Failed.</Alert>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('fires the action handler when its button is clicked', () => {
    const onClick = vi.fn();
    render(<Alert action={{ label: 'Retry', onClick }}>Failed.</Alert>);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('honours an explicit status role', () => {
    render(<Alert role="status">Heads up.</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
