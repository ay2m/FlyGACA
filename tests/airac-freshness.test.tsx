import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { AiracFreshness } from '@/components/AiracFreshness';
import { airacCycle } from '@/calc/airac';

afterEach(cleanup);

describe('<AiracFreshness />', () => {
  it('shows the cycle for the given date with an ISO-dated <time>', () => {
    // 2026-06-20 sits inside a known cycle; assert against the pure calc.
    const date = new Date('2026-06-20T00:00:00Z');
    const cycle = airacCycle(date);
    render(
      <I18nextProvider i18n={i18n}>
        <AiracFreshness date={date} />
      </I18nextProvider>,
    );
    // The cycle id badge is present.
    expect(screen.getByText(`AIRAC ${cycle.id}`)).toBeInTheDocument();
    // The effective date is a machine-readable <time>.
    const iso = cycle.effective.toISOString().slice(0, 10);
    const time = document.querySelector(`time[datetime="${iso}"]`);
    expect(time).not.toBeNull();
    // The countdown names the next cycle and its day count.
    expect(screen.getByText(new RegExp(`${cycle.nextId}.*${cycle.daysToNext}`))).toBeInTheDocument();
  });
});
