import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { Provenance } from '@/components/Provenance';

const wrap = (ui: React.ReactElement) =>
  render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

afterEach(cleanup);

describe('<Provenance />', () => {
  it('renders the date, revision and an external official-source link', () => {
    wrap(
      <Provenance
        date="2026-06-13"
        revision="3"
        sourceUrl="https://gaca.gov.sa/en/Rules-and-Regulations-Category"
      />,
    );
    expect(screen.getByText(/2026-06-13/)).toBeInTheDocument();
    expect(screen.getByText(/Rev 3/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Official source/ });
    expect(link).toHaveAttribute('href', 'https://gaca.gov.sa/en/Rules-and-Regulations-Category');
    // External authority link — nofollow + safe target.
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders nothing when it has no provenance to show', () => {
    const { container } = wrap(<Provenance />);
    expect(container).toBeEmptyDOMElement();
  });
});
