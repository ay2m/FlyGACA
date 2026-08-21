import { expect, test } from '@playwright/test';

/**
 * The free quiz flow, end to end over the production preview build. Study is
 * local-first by design — /study/quiz reads public/data/quiz.json and keeps
 * progress in localStorage — so unlike the account flows it is FULLY exercisable
 * without a backend, which makes it the deepest real user journey the e2e layer
 * can own today (TESTING-ROADMAP Phase 8).
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

test('quiz: pick a bank, answer a question, see the explanation', async ({ page }) => {
  await gotoRoute(page, '/study/quiz');

  // The bank picker renders from the real corpus payload.
  const banks = page.locator('main ul li button');
  await expect(banks.first()).toBeVisible();
  expect(await banks.count()).toBeGreaterThan(0);

  await banks.first().click();

  // A question mounts: progress live region + the option list.
  await expect(page.getByRole('status').first()).toBeVisible();
  const question = page.locator('main h2').first();
  await expect(question).toBeVisible();

  const options = page.locator('main ul li button');
  await expect(options.first()).toBeVisible();
  await options.first().click();

  // Answering reveals the explanation block with the advance button.
  await expect(page.locator('main h2')).toBeVisible();
  await expect(page.getByRole('button', { name: /next|continue|التالي/i }).first()).toBeVisible();
});

test('quiz progress survives a reload (localStorage-backed)', async ({ page }) => {
  await gotoRoute(page, '/study/quiz');
  await page.locator('main ul li button').first().click();
  await expect(page.locator('main h2').first()).toBeVisible();

  // Opening a bank records it as the resume point.
  const lastBank = await page.evaluate(() =>
    Object.keys(localStorage).find((k) => k.includes('last') || k.includes('bank')),
  );
  expect(lastBank).toBeTruthy();

  await page.reload();
  await page.waitForSelector('main');
  const stillThere = await page.evaluate(
    (key) => (key ? localStorage.getItem(key) : null),
    lastBank,
  );
  expect(stillThere).toBeTruthy();
});
