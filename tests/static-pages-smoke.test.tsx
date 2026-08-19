/**
 * Broad render-smoke for the self-contained top-level pages — the cheap complement
 * to the Playwright E2E suite. Each is a static, i18n-driven page with no required
 * route params and no live fetch, so it can mount under a MemoryRouter and prove it
 * renders without throwing and produces a heading. Mirrors tool-pages-smoke.test.tsx.
 *
 * Data/auth/router-param pages (dashboard, library reader, chat, study runners…)
 * stay E2E-owned — see docs/TESTING-ROADMAP.md Phase 4.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { renderWithRouter } from './helpers/render';
import { About } from '@/pages/about/About';
import { NotFound } from '@/pages/not-found/NotFound';
import { Offline } from '@/pages/offline/Offline';
import { DisclaimerPage, TermsPage, PrivacyPage, SafetyPage } from '@/pages/legal/LegalPage';
import { SupportPage } from '@/pages/support/SupportPage';

const PAGES: Record<string, ComponentType> = {
  About,
  NotFound,
  Offline,
  DisclaimerPage,
  TermsPage,
  PrivacyPage,
  SafetyPage,
  SupportPage,
};

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('static pages mount cleanly and render a heading', () => {
  for (const [name, Component] of Object.entries(PAGES)) {
    it(`${name} renders without throwing`, () => {
      renderWithRouter(<Component />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  }
});
