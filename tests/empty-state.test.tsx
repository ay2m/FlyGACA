import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/EmptyState';

afterEach(cleanup);

describe('<EmptyState />', () => {
  it('renders the message and a decorative (aria-hidden) icon', () => {
    render(<EmptyState icon="🔍">No results.</EmptyState>);
    expect(screen.getByText('No results.')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders no action button when none is given', () => {
    render(<EmptyState>Empty.</EmptyState>);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('fires the action handler when its button is clicked', () => {
    const onClick = vi.fn();
    render(<EmptyState action={{ label: 'Clear', onClick }}>Nothing here.</EmptyState>);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('defaults to a status live region and honours an explicit role', () => {
    const { rerender } = render(<EmptyState>Done.</EmptyState>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<EmptyState role="alert">Failed.</EmptyState>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
