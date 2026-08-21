import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Axe sweep over the routes a first-time visitor actually lands on.
 *
 * Everything here hinges on scanning the SETTLED page. The entry animations
 * (`.stagger-grid` fade-up) start each card at low opacity, and axe faithfully
 * reports those intermediate colours as contrast failures — a card whose resting
 * contrast is 5.8:1 reads as 1.86:1 two frames in.
 *
 * `playwright.config.ts` asks for `reducedMotion: 'reduce'` to avoid exactly
 * that, but the runner does not apply it (as of @playwright/test 1.62.1
 * `matchMedia('(prefers-reduced-motion: reduce)')` is still false inside the
 * page, at config level and via `test.use`; a runtime `page.emulateMedia` call
 * does work). So do not trust the config for this — settle explicitly below.
 */
/**
 * English routes plus the Arabic twins of the highest-traffic ones: the RTL
 * tree is half the product's URLs and previously had ZERO axe coverage, so a
 * contrast or focus-order break that only reproduces under `dir="rtl"` shipped
 * silently. `/chat` and `/study/quiz` render fully without a backend (the
 * composer shows its not-ready state; the quiz reads public/data/quiz.json).
 */
const ROUTES = [
  '/',
  '/library',
  '/tools',
  '/tools/crosswind',
  '/learn',
  '/pricing',
  '/chat',
  '/study/quiz',
  '/about',
  '/ar',
  '/ar/library',
  '/ar/tools/crosswind',
];

/** Wait out the entry animations. Infinite ones (shimmers, glows) never end — skip those. */
async function settle(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .every((a) => a.playState === 'finished' || a.playState === 'idle'),
    undefined,
    { timeout: 15_000 },
  );
}

for (const route of ROUTES) {
  test(`${route} has no WCAG A/AA violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await page.waitForSelector('main');
    // `.skeleton` is RouteFallback's alone. Its `role="status"` is not: several
    // pages keep a status live region permanently (`ToolsIndex`'s result count),
    // and waiting on that to detach burns the whole timeout.
    await page
      .locator('main .skeleton')
      .first()
      .waitFor({ state: 'detached' })
      .catch(() => {});
    await settle(page);

    // The /ar tree must actually mount as an Arabic RTL document — an English
    // LTR shell under an /ar URL would "pass" axe while being the wrong page.
    if (route.startsWith('/ar')) {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    }

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Name the rule and the offending node — a bare count is unactionable in CI.
    const summary = violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id} (${v.impact}) — ${n.target.join(' ')}`),
    );
    expect(summary, `Accessibility violations on ${route}`).toEqual([]);
  });
}
