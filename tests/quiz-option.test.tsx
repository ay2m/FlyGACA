import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { QuizOption } from '@/components/quiz/QuizOption';

afterEach(cleanup);

describe('<QuizOption />', () => {
  it('renders children with default idle state and role button', () => {
    render(<QuizOption>Option A</QuizOption>);
    const button = screen.getByRole('button', { name: 'Option A' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('tabIndex', '0');
  });

  it('triggers onClick when clicked and not disabled', () => {
    const onClick = vi.fn();
    render(<QuizOption onClick={onClick}>Option B</QuizOption>);
    fireEvent.click(screen.getByRole('button', { name: 'Option B' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <QuizOption disabled onClick={onClick}>
        Option C
      </QuizOption>,
    );
    const button = screen.getByRole('button', { name: 'Option C' });
    expect(button).toHaveAttribute('tabIndex', '-1');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('handles isCorrect, isIncorrect, and isSelected states', () => {
    const { rerender } = render(<QuizOption isCorrect>Correct Choice</QuizOption>);
    expect(screen.getByText('Correct Choice')).toBeInTheDocument();

    rerender(<QuizOption isIncorrect>Incorrect Choice</QuizOption>);
    expect(screen.getByText('Incorrect Choice')).toBeInTheDocument();

    rerender(<QuizOption isSelected>Selected Choice</QuizOption>);
    expect(screen.getByText('Selected Choice')).toBeInTheDocument();
  });

  it('attaches index and custom className', () => {
    render(
      <QuizOption index={2} className="custom-class">
        Option with Index
      </QuizOption>,
    );
    const elem = screen.getByRole('button', { name: 'Option with Index' });
    expect(elem).toHaveAttribute('data-option-index', '2');
    expect(elem.className).toContain('custom-class');
  });
});
