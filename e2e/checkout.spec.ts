import { expect, test } from '@playwright/test';

/**
 * Checkout degradation over the PRODUCTION preview build (no `VITE_API_BASE_URL`,
 * see playwright.config.ts). The full mocked-network checkout loop can't run
 * here — the build's `apiFetch` throws `backend-unavailable` before any request
 * a `page.route` mock could intercept — so this spec pins the honest offline
 * contract instead: every entry point renders a localized, recoverable error
 * state rather than a crash, a spinner that never resolves, or a blank page.
 * (The mocked start/return legs are covered in jsdom by
 * tests/checkout-page.test.tsx; a real network-mocked e2e needs a second
 * Playwright project with a `VITE_API_SAME_ORIGIN=1` build — see
 * docs/TESTING-ROADMAP.md Phase 8.)
 */

async function gotoRoute(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForSelector('main');
  await page
    .locator('main .skeleton')
    .first()
    .waitFor({ state: 'detached' })
    .catch(() => {});
}

test('/checkout?kind=pro asks the visitor to sign in instead of crashing', async ({ page }) => {
  await gotoRoute(page, '/checkout?kind=pro');
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Sign in');
});

test('/checkout/return with an unknown payment id degrades to a retryable error', async ({
  page,
}) => {
  await gotoRoute(page, '/checkout/return?id=fake-payment-id');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('checkout is noindexed — a payment page must never enter the index', async ({ page }) => {
  await gotoRoute(page, '/checkout?kind=pro');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('/pricing renders its plan cards as the way into checkout', async ({ page }) => {
  await gotoRoute(page, '/pricing');
  await expect(page.locator('h1')).toBeVisible();
  // The CTA buttons exist even offline (clicking would surface the checkout
  // error path asserted above); the exact count tracks the plan cards.
  await expect(page.getByRole('button').first()).toBeVisible();
});
