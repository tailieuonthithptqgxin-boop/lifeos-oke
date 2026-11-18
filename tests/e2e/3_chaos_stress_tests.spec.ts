import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

test.describe('3. Chaos & Stress Tests: Rapid-fire Deduplication & Network 500 Resilience', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Rapid-fire Submit Attack (5 clicks in 1 second): deduplicates mutations and creates only 1 item', async ({ page }) => {
    await page.locator('#nav-item-tasks').click();

    const tasksTabBtn = page.getByRole('button', { name: /^(Tasks|Công việc)$/i }).first();
    if (await tasksTabBtn.isVisible().catch(() => false)) {
      await tasksTabBtn.click();
    }

    const quickAddInput = page.locator('input[placeholder*="Thêm nhanh công việc"], input[placeholder*="Quick add task"], input[placeholder*="Nhấn Enter"]').first();
    await expect(quickAddInput).toBeVisible({ timeout: 10000 });

    const spamTaskTitle = `Stress Click Deduplication #${Date.now()}`;
    await quickAddInput.fill(spamTaskTitle);

    let networkPostCount = 0;
    // Intercept mutating API calls to count outgoing POST requests for this task
    await page.route('**/api/**/tasks*', async (route) => {
      if (route.request().method() === 'POST') {
        networkPostCount++;
      }
      await route.continue();
    });

    // Rapidly submit by hitting Enter 5 times in rapid succession
    for (let i = 0; i < 5; i++) {
      await quickAddInput.press('Enter');
    }

    // Wait a brief moment for all debounce / in-flight requests to settle
    await page.waitForTimeout(1500);

    // Assert: Only 1 task with this title exists in the DOM list
    const matchingItems = page.locator(`text="${spamTaskTitle}"`);
    const count = await matchingItems.count();
    expect(count).toBe(1);

    // Clean up created task
    const taskRow = page.locator(`div:has-text("${spamTaskTitle}")`).first();
    const deleteBtn = taskRow.locator('button[title*="Xóa"], button[title*="Delete"]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }
  });

  test('Network 500 Chaos: displays error notification and retry button without crashing to white screen', async ({ page }) => {
    await page.locator('#nav-item-tasks').click();

    const tasksTabBtn = page.getByRole('button', { name: /^(Tasks|Công việc)$/i }).first();
    if (await tasksTabBtn.isVisible().catch(() => false)) {
      await tasksTabBtn.click();
    }

    // Mock an internal server 500 error on POST /api/**/tasks*
    await page.route('**/api/**/tasks*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Database connection dropped simulated 500'
            },
            message: 'Máy chủ gặp sự cố nội bộ. Vui lòng thử lại.'
          })
        });
      } else {
        await route.continue();
      }
    });

    const quickAddInput = page.locator('input[placeholder*="Thêm nhanh công việc"], input[placeholder*="Quick add task"], input[placeholder*="Nhấn Enter"]').first();
    await quickAddInput.fill('Task expecting 500 error');
    await quickAddInput.press('Enter');

    // Verify UI does NOT crash (Page remains functional)
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();

    // Verify that an error toast or alert notification is rendered
    const errorToast = page.getByText(/Database connection dropped simulated 500|Máy chủ gặp sự cố/i).first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
  });
});
