import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: 'user@lifeos.com',
  password: 'User@123456',
  name: 'Demo Member'
};

/**
 * Perform end-to-end UI login via the official /login form
 */
export async function loginViaUI(page: Page) {
  // Pre-seed localStorage to silence PWA prompt and cookie consent overlays during automation
  await page.addInitScript(() => {
    try {
      localStorage.setItem('lifeos_pwa_dismissed', 'true');
      sessionStorage.setItem('lifeos_pwa_dismissed', 'true');
      localStorage.setItem('lifeos_update_dismissed', 'true');
      sessionStorage.setItem('lifeos_update_dismissed', 'true');
      localStorage.setItem('lifeos_cookie_consent', 'all');
      localStorage.setItem('lifeos_cookie_consent_date', new Date().toISOString());
    } catch {}
  });

  // Navigate to application with login query
  await page.goto('/?login=true');
  await page.waitForLoadState('domcontentloaded');

  // Verify we are on the login form
  const emailInput = page.locator('input[autocomplete="username"], input[type="text"][placeholder*="admin@lifeos.com"]').first();
  await expect(emailInput).toBeVisible({ timeout: 10000 });

  // Fill credentials
  await emailInput.fill(TEST_USER.email);

  const passwordInput = page.locator('input[autocomplete="current-password"], input[type="password"]').first();
  await passwordInput.fill(TEST_USER.password);

  // Click Submit button ("Đăng nhập vào LifeOS")
  const submitButton = page.locator('button[type="submit"]:has-text("Đăng nhập vào LifeOS"), button[type="submit"]:has-text("Đăng nhập")').first();
  await submitButton.click();

  // If Onboarding survey appears, dismiss it via Skip button
  const skipOnboardingBtn = page.locator('button:has-text("Bỏ qua & dùng cấu hình mẫu"), button:has-text("Bỏ qua")').first();
  if (await skipOnboardingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipOnboardingBtn.click().catch(() => {});
  }

  // Wait for login to complete and main dashboard/navigation to appear
  await page.waitForSelector('#nav-item-tasks, #mobile-bottom-nav', { timeout: 15000 });
}
