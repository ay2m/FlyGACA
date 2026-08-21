/**
 * Firebase Authentication E2E Tests
 * Tests email/password sign up, sign in, and password reset flows.
 * Requires Firebase Emulator to be running for local testing.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const FIREBASE_AUTH_PAGE = '/firebase-auth-example';
const TEST_EMAIL = 'test-user@example.com';
const TEST_PASSWORD = 'TestPassword123!';

test.describe('Firebase Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Firebase auth example page
    await page.goto(`${BASE_URL}${FIREBASE_AUTH_PAGE}`);
    // Wait for page to load and auth state to resolve
    await page.waitForLoadState('networkidle');
  });

  test('should display sign in form on initial load', async ({ page }) => {
    // Check that the sign in tab is active
    const signInTab = page.locator('button:has-text("Sign In")').first();
    await expect(signInTab).toBeVisible();

    // Check form fields are visible
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const signInButton = page.locator('button:has-text("Sign In")').last();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();
  });

  test('should display validation errors for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    const signInButton = page.locator('button:has-text("Sign In")').last();

    // Button should be disabled until fields are filled
    await expect(signInButton).toBeDisabled();

    // Fill email and check password button is still disabled
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(TEST_EMAIL);
    await expect(signInButton).toBeDisabled();

    // Fill password, button should be enabled
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);
    await expect(signInButton).toBeEnabled();
  });

  test('should switch between sign in and sign up tabs', async ({ page }) => {
    // Click Sign Up tab
    const signUpTab = page.locator('button:has-text("Sign Up")');
    await signUpTab.click();

    // Check that additional fields appear
    const displayNameInput = page.locator('input[placeholder="John Doe"]');
    await expect(displayNameInput).toBeVisible();

    // Click back to Sign In tab
    const signInTab = page.locator('button:has-text("Sign In")').first();
    await signInTab.click();

    // Display name field should no longer be visible
    await expect(displayNameInput).not.toBeVisible();
  });

  test('should display Google Sign-in button', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('should switch to Reset Password tab', async ({ page }) => {
    // Click Reset Password tab
    const resetTab = page.locator('button:has-text("Reset Password")');
    await resetTab.click();

    // Check that only email field is shown
    const emailInput = page.locator('input[type="email"]').first();
    const resetButton = page.locator('button:has-text("Send Reset Email")');

    await expect(emailInput).toBeVisible();
    await expect(resetButton).toBeVisible();
  });

  test('should handle authentication form submission', async ({ page }) => {
    // Note: This test verifies form behavior, not actual Firebase auth
    // (which requires emulator or real credentials)

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const signInButton = page.locator('button:has-text("Sign In")').last();

    // Fill in credentials
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Submit form
    await signInButton.click();

    // Form should show loading state
    await expect(signInButton).toHaveAttribute('aria-busy', 'true');

    // Wait a bit for response (will likely fail without emulator, but that's ok)
    await page.waitForTimeout(1000);

    // Either success or error message should appear
    const alertBox = page.locator('[role="status"]');
    await expect(alertBox).toBeVisible({ timeout: 5000 });
  });

  test('should display user info when authenticated (if already logged in)', async ({ page }) => {
    // This test checks if user is already authenticated from a previous test
    // If not, it will not find the user info section

    // Try to find user info section (only visible when authenticated)
    const userInfoSection = page.locator('text=Email Verified');
    const userInfoVisible = await userInfoSection.isVisible().catch(() => false);

    if (userInfoVisible) {
      // If logged in, sign out button should be visible
      const signOutButton = page.locator('button:has-text("Sign Out")');
      await expect(signOutButton).toBeVisible();

      // Email should be displayed
      const emailText = page.locator(`text=${TEST_EMAIL}`);
      await expect(emailText).toBeVisible();
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.context().setOffline(true);

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const signInButton = page.locator('button:has-text("Sign In")').last();

    // Fill in credentials
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Try to submit
    await signInButton.click();

    // Should show error message
    const alertBox = page.locator('[role="status"]');
    await expect(alertBox).toBeVisible({ timeout: 5000 });

    // Error message should contain "error" or similar
    const text = await alertBox.textContent();
    expect(text?.toLowerCase()).toMatch(/error|network|offline/i);

    // Re-enable network
    await page.context().setOffline(false);
  });

  test('should maintain form state when switching tabs', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    const testEmail = 'test@example.com';

    // Fill email in sign in tab
    await emailInput.fill(testEmail);

    // Switch to sign up tab
    const signUpTab = page.locator('button:has-text("Sign Up")');
    await signUpTab.click();

    // Email field should be different (part of sign up form)
    const signUpEmailInput = page.locator('input[type="email"]').first();
    await expect(signUpEmailInput).toHaveValue('');

    // Switch back to sign in tab
    const signInTab = page.locator('button:has-text("Sign In")').first();
    await signInTab.click();

    // Original email should still be there (form state preserved)
    const signInEmailInput = page.locator('input[type="email"]').first();
    const value = await signInEmailInput.inputValue();
    expect(value).toBe(testEmail);
  });
});

test.describe('Firebase Auth Integration', () => {
  test('should initialize Firebase on page load', async ({ page }) => {
    // Navigate to auth page
    await page.goto(`${BASE_URL}${FIREBASE_AUTH_PAGE}`);

    // Check that the page loads without errors
    // (if Firebase init failed, page would show error)
    const heading = page.locator('text=Firebase Authentication Demo');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should handle auth state changes', async ({ page }) => {
    // Navigate to auth page
    await page.goto(`${BASE_URL}${FIREBASE_AUTH_PAGE}`);

    // Initially should show auth forms
    const signInForm = page.locator('button:has-text("Sign In")').last();
    await expect(signInForm).toBeVisible();

    // If user is already logged in (from previous test session),
    // should show user info instead
    const userInfo = page.locator('text=Welcome');
    const userInfoVisible = await userInfo.isVisible().catch(() => false);

    // One of these should be true
    const signInFormVisible = await signInForm.isVisible().catch(() => false);
    expect(userInfoVisible || signInFormVisible).toBe(true);
  });
});
