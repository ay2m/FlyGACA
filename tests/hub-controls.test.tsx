/**
 * Shared browse-hub controls that were previously uncovered:
 *  - ViewToggle — grid⇄list segmented control (aria-pressed, onChange)
 *  - SortSelect — labelled sort dropdown
 * Pure prop-driven components — plain render + role queries per ui-button.test.tsx.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ViewToggle } from '@/components/hub/ViewToggle';
import { SortSelect } from '@/components/hub/SortSelect';

afterEach(cleanup);

describe('ViewToggle', () => {
  const labels = { groupLabel: 'View', gridLabel: 'Grid', listLabel: 'List' };

  it('marks the active view with aria-pressed', () => {
    render(<ViewToggle value="grid" onChange={() => {}} {...labels} />);
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked view', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="grid" onChange={onChange} {...labels} />);
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('exposes an accessible group label', () => {
    render(<ViewToggle value="list" onChange={() => {}} {...labels} />);
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
  });
});

describe('SortSelect', () => {
  const options = [
    { value: 'title', label: 'Title' },
    { value: 'recent', label: 'Most recent' },
  ];

  it('renders the labelled options and reflects the current value', () => {
    render(<SortSelect label="Sort by" value="recent" onChange={() => {}} options={options} />);
    const select = screen.getByRole('combobox', { name: 'Sort by' });
    expect((select as HTMLSelectElement).value).toBe('recent');
    expect(screen.getByRole('option', { name: 'Title' })).toBeInTheDocument();
  });

  it('calls onChange with the selected value', () => {
    const onChange = vi.fn();
    render(<SortSelect label="Sort by" value="title" onChange={onChange} options={options} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'recent' },
    });
    expect(onChange).toHaveBeenCalledWith('recent');
  });
});
