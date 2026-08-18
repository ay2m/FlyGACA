import { describe, expect, it, afterEach, vi } from 'vitest';
import { screen, cleanup, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { renderWithRouter } from './helpers/render';
import { Flashcards } from '@/pages/study/Flashcards';

const fixture = {
  exam: { title: 'Exam', questions: 1, minutes: 5, passMark: 70 },
  banks: [
    {
      id: 'fc-bank',
      title: 'Card Bank',
      desc: 'A flashcard bank',
      source: 'GACAR Part 91',
      questions: [
        { q: 'What is 2+2?', options: ['2', '3', '4', '5'], answer: 2, explain: 'Arithmetic.' },
      ],
    },
  ],
};

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  act(() => void i18n.changeLanguage('en'));
});

describe('<Flashcards /> interaction', () => {
  it('opens a deck, flips a card, and grades it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(fixture)));
    const user = userEvent.setup();
    renderWithRouter(<Flashcards />);

    await user.click(await screen.findByRole('button', { name: /Card Bank/ }));

    // The card front shows the prompt; the answer is hidden until flipped.
    expect(await screen.findByText('What is 2+2?')).toBeInTheDocument();
    const flip = screen.getByRole('button', { name: 'Reveal answer' });
    await user.click(flip);

    // Flipping reveals the answer and the SRS grade controls. (Scoped to the
    // card's <strong> — the glide-path strip also renders bare stage digits.)
    expect(screen.getByText('4', { selector: 'strong' })).toBeInTheDocument();
    const gotIt = screen.getByRole('button', { name: 'Got it →' });
    expect(screen.getByRole('button', { name: '← Again' })).toBeInTheDocument();

    // Grading starts the card's fly-out; advancing happens on animationend
    // (jsdom never fires it on its own, so dispatch the contract event —
    // unless reduced motion already advanced synchronously).
    await user.click(gotIt);
    const wrapper = screen.queryByRole('button', { name: 'Tap or press Enter to flip' });
    if (wrapper) fireEvent.animationEnd(wrapper);
    expect(screen.queryByRole('button', { name: 'Got it →' })).toBeNull();
  });
});
