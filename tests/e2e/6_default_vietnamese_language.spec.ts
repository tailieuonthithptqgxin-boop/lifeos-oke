import { test, expect } from '@playwright/test';

test.describe('Default Vietnamese Language & Seamless English Switcher', () => {

  test('1. Guest / New user defaults to Vietnamese (vi) across entire app', async ({ page }) => {
    // Navigate with empty localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 1. Verify HTML lang attribute is 'vi'
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBe('vi');

    // 2. Verify landing page navbar displays Vietnamese by default
    const loginButton = page.locator('button:has-text("Đăng nhập")').first();
    await expect(loginButton).toBeVisible();

    // 3. Verify language toggle button displays Vietnamese state
    const langToggle = page.locator('#btn-landing-lang-toggle').first();
    await expect(langToggle).toBeVisible();
    await expect(langToggle).toContainText(/Tiếng Việt/i);
  });

  test('2. Landing Page can seamlessly switch to English and back to Vietnamese', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const langToggle = page.locator('#btn-landing-lang-toggle').first();
    await expect(langToggle).toBeVisible();

    // Click to switch to English
    await langToggle.click();

    // Verify localStorage has 'en'
    const savedLang = await page.evaluate(() => localStorage.getItem('lifeos_lang'));
    expect(savedLang).toBe('en');

    // Verify HTML lang attribute updated to 'en'
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Verify button text switched to Sign In
    const signInButton = page.locator('button:has-text("Sign In")').first();
    await expect(signInButton).toBeVisible();

    // Click again to switch back to Vietnamese
    await langToggle.click();
    const revertedLang = await page.evaluate(() => localStorage.getItem('lifeos_lang'));
    expect(revertedLang).toBe('vi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  });

  test('3. Login / Register screen defaults to Vietnamese with English switch option', async ({ page }) => {
    await page.goto('/?view=login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Default: Vietnamese
    await expect(page.getByText('Chào mừng trở lại!')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/i })).toBeVisible();

    // Language switcher button is visible in login header
    const loginLangBtn = page.locator('#btn-login-lang-toggle');
    await expect(loginLangBtn).toBeVisible();
    await expect(loginLangBtn).toContainText(/Tiếng Việt/i);

    // Switch to English
    await loginLangBtn.click();

    // Assert texts updated to English
    await expect(page.getByText('Welcome back!')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    const currentLang = await page.evaluate(() => localStorage.getItem('lifeos_lang'));
    expect(currentLang).toBe('en');

    // Switch back to Vietnamese
    await loginLangBtn.click();
    await expect(page.getByText('Chào mừng trở lại!')).toBeVisible();
  });
});
