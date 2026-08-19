import { expect, test } from '@playwright/test';

/**
 * Critical-path smoke over the PRODUCTION preview build (see playwright.config.ts):
 * the shell renders, deep links resolve through the SPA fallback, a calculator
 * computes, and the Arabic tree mounts RTL.
 *
 * No account flows here. With no `VITE_API_BASE_URL` the preview build shows the
 * "sign-in unavailable" notice by design — a production deploy must never offer
 * the dev-only local form — so `/logbook` and friends are unreachable and their
 * coverage lives in the unit suite instead.
 */

/**
 * `<main>` appears before the lazy route chunk does — RouteFallback fills it with
 * a skeleton meanwhile, so wait for that to go too.
 *
 * Match on `.skeleton` (only RouteFallback uses it), NOT on the fallback's
 * `role="status"`: several pages carry a permanent status live region of their
 * own (`ToolsIndex`'s result count), and waiting for that to detach just burns
 * the timeout on every visit.
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

test('home renders the hero and the primary nav', async ({ page }) => {
  await gotoRoute(page, '/');
  await expect(page).toHaveTitle(/Fly GACA/);
  await expect(page.getByRole('navigation').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the library' })).toBeVisible();
});

test('a deep link resolves through the SPA fallback', async ({ page }) => {
  // Loaded cold, not navigated to — this is what breaks when the host serves
  // dist/ without a rewrite to index.html.
  await gotoRoute(page, '/library');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the crosswind calculator resolves the wind', async ({ page }) => {
  await gotoRoute(page, '/tools/crosswind');
  // NumberField renders inputMode="decimal", not type="number".
  const fields = page.locator('main input[inputmode="decimal"]');
  await fields.nth(0).fill('180');
  await fields.nth(1).fill('220');
  await fields.nth(2).fill('20');

  // 20 kt at 40° off the centreline: 20·sin40 = 12.9 across, 20·cos40 = 15.3 down.
  await expect(page.getByText('12.9')).toBeVisible();
  await expect(page.getByText('15.3')).toBeVisible();
});

test('calculator inputs survive a reload because they ride the URL', async ({ page }) => {
  await gotoRoute(page, '/tools/crosswind');
  const fields = page.locator('main input[inputmode="decimal"]');
  await fields.nth(0).fill('180');
  await fields.nth(1).fill('220');
  await fields.nth(2).fill('20');
  await expect(page).toHaveURL(/rwy=180/);

  await page.reload();
  await page.waitForSelector('main');
  await expect(page.getByText('12.9')).toBeVisible();
});

test('the Arabic tree mounts under /ar with RTL direction', async ({ page }) => {
  await gotoRoute(page, '/ar/tools');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('an unknown route renders the 404 page, not a blank shell', async ({ page }) => {
  await gotoRoute(page, '/definitely-not-a-route');
  await expect(page.getByText('404')).toBeVisible();
});

test('no console errors on the home page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await gotoRoute(page, '/');
  expect(errors).toEqual([]);
});
