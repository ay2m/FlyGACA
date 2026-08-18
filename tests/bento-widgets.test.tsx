/**
 * Dashboard bento widgets:
 *  - StatValue   — count-up metric (final value carried in an sr-only node)
 *  - each tile owns a real <h3> that also names its link via aria-labelledby,
 *    so assistive tech hears "Flight tools", not the CTA string
 *  - data-driven stats show a skeleton while loading (never a bogus 0)
 * renderWithRouter because each widget's BentoCard is a router Link.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, cleanup, waitFor } from '@testing-library/react';
import { renderWithRouter } from './helpers/render';
import { StatValue } from '@/components/bento/widgets/StatValue';
import { ToolsWidget } from '@/components/bento/widgets/ToolsWidget';
import { LearnWidget } from '@/components/bento/widgets/LearnWidget';
import { HudWidget } from '@/components/bento/widgets/HudWidget';
import { RegStreamWidget } from '@/components/bento/widgets/RegStreamWidget';
import { ComplianceWidget } from '@/components/bento/widgets/ComplianceWidget';
import { RadarWidget } from '@/components/bento/widgets/RadarWidget';
import HomeDashboard from '@/components/bento/HomeDashboard';
import shared from '@/components/bento/widgets/widgets.module.css';
import { TOOLS } from '@/lib/tools';
import { GUIDE_SLUGS } from '@/pages/guides/guides';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** fetch that never settles — pins useFetchJson in its loading state. */
const pendingFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  );

describe('StatValue', () => {
  it('exposes the true final value to assistive tech regardless of the count-up animation', () => {
    renderWithRouter(<StatValue value={84} />);
    expect(screen.getByText('84')).toBeInTheDocument();
  });

  it('honours the decimals prop', () => {
    renderWithRouter(<StatValue value={12.5} decimals={1} />);
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });
});

describe('ToolsWidget', () => {
  it('shows the live-tool count straight from the registry and links to /tools', () => {
    const liveCount = TOOLS.filter((tool) => tool.status === 'live').length;
    renderWithRouter(<ToolsWidget />);
    expect(screen.getByText(String(liveCount))).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools');
  });

  it('names the link from its heading, not the CTA string', () => {
    renderWithRouter(<ToolsWidget />);
    expect(screen.getByRole('heading', { level: 3, name: 'Flight tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flight tools' })).toBeInTheDocument();
  });
});

describe('LearnWidget', () => {
  it('shows the guide count and links to /learn', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ banks: [] }) }),
    );
    renderWithRouter(<LearnWidget />);
    expect(screen.getByText(String(GUIDE_SLUGS.length))).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn');
    expect(
      screen.getByRole('heading', { level: 3, name: 'Guides & practice' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guides & practice' })).toBeInTheDocument();
  });

  it('holds the question slot with a skeleton until the quiz data loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          banks: [{ questions: [{}, {}, {}] }, { questions: [{}, {}] }],
        }),
      }),
    );
    const { container } = renderWithRouter(<LearnWidget />);
    expect(container.querySelector(`.${shared.skeleton}`)).not.toBeNull();
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
    expect(container.querySelector(`.${shared.skeleton}`)).toBeNull();
  });
});

describe('HudWidget', () => {
  it('links to /hud and keeps the simulated-scenario framing visible', () => {
    renderWithRouter(<HudWidget />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hud');
    // The SIM note is the honesty guard — the teaser must never read as live.
    expect(screen.getByText(/simulated training scenario/i)).toBeInTheDocument();
    expect(screen.getByText(/FALCON-07/)).toBeInTheDocument();
  });

  it('names the link from its heading', () => {
    renderWithRouter(<HudWidget />);
    expect(
      screen.getByRole('link', { name: "Watch the Kingdom's airspace come alive" }),
    ).toBeInTheDocument();
  });
});

describe('RegStreamWidget', () => {
  it('names the link from its heading and shows a skeleton while the index loads', () => {
    pendingFetch();
    const { container } = renderWithRouter(<RegStreamWidget />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'GACAR regulations' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GACAR regulations' })).toBeInTheDocument();
    expect(container.querySelector(`.${shared.skeleton}`)).not.toBeNull();
  });
});

describe('ComplianceWidget', () => {
  it('names the link from its heading and shows a skeleton while the index loads', () => {
    pendingFetch();
    const { container } = renderWithRouter(<ComplianceWidget />);
    expect(screen.getByRole('link', { name: 'Guidance & standards' })).toBeInTheDocument();
    expect(container.querySelector(`.${shared.skeleton}`)).not.toBeNull();
  });
});

describe('RadarWidget', () => {
  it('carries an sr-only heading that names the link, and never captions "0 Parts"', () => {
    pendingFetch();
    const { container } = renderWithRouter(<RadarWidget />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Regulatory coverage' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regulatory coverage' })).toBeInTheDocument();
    expect(screen.queryByText(/0 GACAR Parts/)).toBeNull();
    expect(container.querySelector(`.${shared.skeleton}`)).not.toBeNull();
  });
});

describe('HomeDashboard', () => {
  it('is a labelled region headed by a real h2, with one h3 per tile', () => {
    pendingFetch();
    renderWithRouter(<HomeDashboard />);
    expect(screen.getByRole('region', { name: 'Fly GACA dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(8);
  });
});
