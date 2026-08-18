import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { Stepper } from '@/components/Stepper';

afterEach(cleanup);

const steps = [
  { title: 'Find', body: 'Search the regulation.' },
  { title: 'Ask', body: 'Captain Adel cites the section.' },
  { title: 'Verify', body: 'Confirm against GACA.' },
];

describe('<Stepper />', () => {
  it('renders an ordered list with one item per step', () => {
    render(<Stepper steps={steps} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders each step title (h3) and body', () => {
    render(<Stepper steps={steps} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Find' })).toBeInTheDocument();
    expect(screen.getByText('Captain Adel cites the section.')).toBeInTheDocument();
  });

  it('numbers the nodes from 1 in order and hides them from assistive tech', () => {
    const { container } = render(<Stepper steps={steps} />);
    const nums = Array.from(container.querySelectorAll('li > span')).map((n) => n.textContent);
    expect(nums).toEqual(['1', '2', '3']);
    container.querySelectorAll('li > span').forEach((n) => {
      expect(n).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('appends a caller className to the list', () => {
    render(<Stepper steps={steps} className="extra" />);
    expect(screen.getByRole('list').className).toContain('extra');
  });
});
