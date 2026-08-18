import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementStamp } from '@/components/dashboard/AchievementStamp';

describe('<AchievementStamp />', () => {
  it('shows progress toward an unearned stamp', () => {
    render(<AchievementStamp label="50 flight hours" earned={false} have={12} target={50} />);
    expect(screen.getByText('50 flight hours')).toBeInTheDocument();
    expect(screen.getByText('12/50')).toBeInTheDocument();
    expect(screen.getByTitle('12 / 50')).toBeInTheDocument();
  });

  it('drops the progress readout once earned', () => {
    render(<AchievementStamp label="First night flight" earned have={1} target={1} />);
    expect(screen.getByText('First night flight')).toBeInTheDocument();
    expect(screen.queryByText('1/1')).toBeNull();
  });
});
