import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { Glossary } from '@/pages/library/Glossary';
import { renderWithRouter } from './helpers/render';

afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<Glossary /> page', () => {
  it('renders the authored terms as a definition list', () => {
    renderWithRouter(<Glossary />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Aviation glossary' }),
    ).toBeInTheDocument();
    // A representative acronym + its definition are both on the page.
    expect(screen.getByText('METAR')).toBeInTheDocument();
    expect(
      screen.getByText(/routine, coded observation of the actual weather/i),
    ).toBeInTheDocument();
    // ≥50 terms is the SEO bar; the block should comfortably clear it.
    expect(screen.getByText(/\d+ terms/)).toBeInTheDocument();
  });

  it('filters the list by the search query', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Glossary />);
    expect(screen.getByText('METAR')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search the glossary' }), 'notam');
    expect(screen.getByText('NOTAM')).toBeInTheDocument();
    expect(screen.queryByText('METAR')).not.toBeInTheDocument();
  });
});
