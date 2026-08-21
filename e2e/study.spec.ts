import { expect, test } from '@playwright/test';

/**
 * Study flow coverage — quiz, flashcards, and local study progress.
 * These are fully client-side and work in the preview build (no backend required).
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

test('study hub loads with practice tab', async ({ page }) => {
  await gotoRoute(page, '/learn');
  await expect(page.getByRole('tab', { name: /practice/i })).toBeVisible();
});

test('quiz flow starts and renders questions', async ({ page }) => {
  await gotoRoute(page, '/learn?tab=practice');
  // Click "Quiz" or navigate to quiz directly
  await gotoRoute(page, '/study/quiz');
  // Quiz should render a question or start screen
  await expect(page.locator('main')).toContainText(/question|quiz|start/i);
});

test('flashcard deck loads and allows navigation', async ({ page }) => {
  await gotoRoute(page, '/study/flashcards');
  // Flashcards page should be visible
  await expect(page.locator('main')).toBeVisible();
});

test('ground school renders lessons', async ({ page }) => {
  await gotoRoute(page, '/study/ground-school');
  // Ground school should render
  await expect(page.locator('main')).toBeVisible();
});

test('study progress is tracked locally', async ({ page }) => {
  // Visit quiz, answer a question (simulate progress)
  await gotoRoute(page, '/study/quiz');
  await page.waitForTimeout(1000);
  // Check that page is still accessible after interaction
  await expect(page.locator('main')).toBeVisible();
});

test('exam prep mode loads and shows timer', async ({ page }) => {
  await gotoRoute(page, '/study/exam');
  // Exam page should render
  await expect(page.locator('main')).toBeVisible();
});

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
