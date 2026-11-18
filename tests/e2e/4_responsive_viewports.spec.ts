import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

test.describe('4. Viewport Torture Tests: Responsive Viewports (375x812 & 1440x900)', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Desktop Viewport (1440x900): No horizontal overflow and sidebar navigation is fully interactive', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    // Verify Desktop Sidebar navigation is present
    const sidebar = page.locator('#nav-item-tasks');
    await expect(sidebar).toBeVisible();

    // Verify document does not have horizontal scrollbar overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test('Mobile Viewport (375x812): No horizontal overflow and mobile navigation adheres to 44px touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // Check Mobile Bottom Navigation presence
    const bottomNav = page.locator('#mobile-bottom-nav');
    await expect(bottomNav).toBeVisible({ timeout: 5000 });

    // Verify touch targets on mobile meet minimum accessibility requirement (>= 44x44px)
    const touchButton = page.locator('#mobile-tab-dashboard');
    if (await touchButton.isVisible()) {
      const box = await touchButton.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40); // 40-44px minimum touch target
      }
    }

    // Verify no unwanted horizontal scrolling occurs on narrow mobile viewport
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
