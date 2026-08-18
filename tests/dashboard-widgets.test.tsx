import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from './helpers/render';

// Several widget stores (studyProgress, toolPrefs, libraryPrefs, guidePrefs,
// account) hydrate from localStorage once, at first import. Seed storage
// BEFORE importing the widgets (dynamic imports only — a static import of any
// store would hoist above this seeding) so cached state reflects the fixtures.
const TODAY = new Date().toISOString().slice(0, 10);
localStorage.setItem('flygaca:study:streak', JSON.stringify({ day: TODAY, count: 5 }));
localStorage.setItem(
  'flygaca:study:exam',
  JSON.stringify({ pct: 84, passed: true, date: '2026-07-01' }),
);
localStorage.setItem(
  'flygaca:study:exam-history',
  JSON.stringify([
    { pct: 60, passed: false, date: '2026-06-01' },
    { pct: 84, passed: true, date: '2026-07-01' },
  ]),
);
localStorage.setItem(
  'flygaca:study:srs',
  JSON.stringify({
    part91: {
      '0': { box: 1, due: '2000-01-01' }, // overdue → counts as due
      '1': { box: 3, due: '2999-01-01' }, // far future → not due
    },
  }),
);
localStorage.setItem('flygaca:study:last-bank', JSON.stringify('part91'));
localStorage.setItem('flygaca:tool-favorites', JSON.stringify(['crosswind']));
localStorage.setItem('flygaca:tool-recents', JSON.stringify(['tas', 'crosswind']));
localStorage.setItem(
  'flygaca:library-bookmarks',
  JSON.stringify([
    {
      kind: 'regulations',
      slug: 'gacar-part-91',
      title: 'GACAR Part 91',
      anchor: 'fuel',
      anchorText: 'IFR fuel requirements',
    },
  ]),
);
localStorage.setItem('flygaca:guide-bookmarks', JSON.stringify(['gacar-explained']));
localStorage.setItem('flygaca:updates-watch', JSON.stringify(['gacar-91', 'aip']));
localStorage.setItem('flygaca:offline:saved', JSON.stringify(['gacar-part-91', 'gacar-part-61']));

const { StudyWidget } = await import('@/components/dashboard/StudyWidget');
const { ToolShortcutsWidget } = await import('@/components/dashboard/ToolShortcutsWidget');
const { BookmarksWidget } = await import('@/components/dashboard/BookmarksWidget');
const { AdelThreadsWidget } = await import('@/components/dashboard/AdelThreadsWidget');
const { OfflineWidget } = await import('@/components/dashboard/OfflineWidget');
const { RolePickerCard } = await import('@/components/dashboard/RolePickerCard');

describe('StudyWidget', () => {
  it('shows streak, due-card count and last exam score from storage', () => {
    renderWithRouter(<StudyWidget />);
    expect(screen.getByText('5')).toBeInTheDocument(); // streak
    expect(screen.getByText('1')).toBeInTheDocument(); // one card due
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume last quiz/i })).toHaveAttribute(
      'href',
      '/study/quiz?bank=part91',
    );
  });
});

describe('ToolShortcutsWidget', () => {
  it('lists favorites first, then recents, as links to the tools', () => {
    renderWithRouter(<ToolShortcutsWidget />);
    const links = screen.getAllByRole('link').filter((a) => {
      const href = a.getAttribute('href') ?? '';
      return href.startsWith('/tools/');
    });
    expect(links[0]).toHaveAttribute('href', '/tools/crosswind');
    expect(links.map((a) => a.getAttribute('href'))).toContain('/tools/tas');
  });
});

describe('BookmarksWidget', () => {
  it('links section bookmarks with anchors and bookmarked guides', () => {
    renderWithRouter(<BookmarksWidget />);
    expect(screen.getByRole('link', { name: /IFR fuel requirements/i })).toHaveAttribute(
      'href',
      '/library/gacar-part-91#fuel',
    );
    const guideLink = screen
      .getAllByRole('link')
      .find((a) => a.getAttribute('href') === '/guides/gacar-explained');
    expect(guideLink).toBeDefined();
  });
});

describe('AdelThreadsWidget', () => {
  it('renders recent conversation titles from the archive', () => {
    localStorage.setItem(
      'flygaca:adel-conversations',
      JSON.stringify([
        {
          id: 'c1',
          title: 'IFR alternate fuel',
          messages: [{ role: 'user', text: 'fuel?' }],
          updatedAt: 1750000000000,
        },
        { id: 'c2', title: '', messages: [{ role: 'user', text: 'x' }], updatedAt: 1749000000000 },
      ]),
    );
    renderWithRouter(<AdelThreadsWidget />);
    expect(screen.getByText('IFR alternate fuel')).toBeInTheDocument();
    expect(screen.getByText(/untitled conversation/i)).toBeInTheDocument();
  });

  it('shows the starter empty state when there is no archive', () => {
    localStorage.removeItem('flygaca:adel-conversations');
    localStorage.removeItem('flygaca:adel-transcript');
    renderWithRouter(<AdelThreadsWidget />);
    expect(screen.getByText(/cites the exact part and section/i)).toBeInTheDocument();
  });
});

describe('OfflineWidget', () => {
  it('shows the saved-offline count and a healthy sync status', () => {
    renderWithRouter(<OfflineWidget />);
    expect(screen.getByText('2')).toBeInTheDocument(); // two docs saved offline
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
  });

  it('prompts to save when nothing is cached offline', async () => {
    vi.resetModules();
    localStorage.setItem('flygaca:offline:saved', JSON.stringify([]));
    const { OfflineWidget: Empty } = await import('@/components/dashboard/OfflineWidget');
    renderWithRouter(<Empty />);
    expect(screen.getByText(/lose signal/i)).toBeInTheDocument();
  });
});

describe('RolePickerCard', () => {
  it('saves the chosen role to the profile', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RolePickerCard />);
    await user.click(screen.getByRole('button', { name: /student pilot/i }));
    const profile = JSON.parse(localStorage.getItem('flygaca:profile')!) as { role: string };
    expect(profile.role).toBe('student');
  });

  it('records dismissal for the dashboard to honour', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RolePickerCard />);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(localStorage.getItem('flygaca:dashboard-role-dismissed')).toBe('1');
  });
});

describe('adelConversations loader', () => {
  it('migrates a legacy single transcript into one conversation', async () => {
    vi.resetModules();
    localStorage.removeItem('flygaca:adel-conversations');
    localStorage.setItem(
      'flygaca:adel-transcript',
      JSON.stringify([
        { role: 'user', text: 'What is GACAR Part 91?' },
        { role: 'assistant', text: 'It covers general operating rules…' },
      ]),
    );
    const { loadConversations } = await import('@/lib/adelConversations');
    const list = loadConversations();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('What is GACAR Part 91?');
    expect(list[0].messages).toHaveLength(2);
  });

  it('returns an empty list for corrupt storage', async () => {
    vi.resetModules();
    localStorage.setItem('flygaca:adel-conversations', '{nope');
    localStorage.removeItem('flygaca:adel-transcript');
    const { loadConversations } = await import('@/lib/adelConversations');
    expect(loadConversations()).toEqual([]);
  });
});
