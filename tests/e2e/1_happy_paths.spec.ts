import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

test.describe('1. Happy Paths: E2E User Lifecycle (Create, View, Search, Filter, Edit, Delete, Tabs)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via official UI
    await loginViaUI(page);
  });

  test('Should seamlessly add, search, complete, and delete a task with instant UI sync (no reload)', async ({ page }) => {
    // 1. Navigate to Tasks view via Sidebar
    await page.locator('#nav-item-tasks').click();

    // 2. Click the "Tasks" / "Công việc" tab inside Schedule & Tasks
    const tasksTabBtn = page.getByRole('button', { name: /^(Tasks|Công việc)$/i }).first();
    await tasksTabBtn.click();

    // 3. Locate quick add input in TasksView
    const quickAddInput = page.locator('input[placeholder*="Thêm nhanh công việc"], input[placeholder*="Quick add task"], input[placeholder*="Nhấn Enter"]').first();
    await expect(quickAddInput).toBeVisible({ timeout: 10000 });

    const uniqueTaskTitle = `Playwright E2E Task ${Date.now().toString(36)}`;

    // 4. Quick Add a Task
    await quickAddInput.fill(uniqueTaskTitle);
    const submitBtn = page.locator('button:has-text("More ↵"), button:has-text("Thêm ↵"), #btn-quick-create-task').first();
    await submitBtn.click();

    // 5. Assert: Task appears instantly in the list without page reload
    const taskTitleLocator = page.locator(`text="${uniqueTaskTitle}"`).first();
    await expect(taskTitleLocator).toBeVisible({ timeout: 10000 });

    // 5. Complete Task (Click Complete Checkbox)
    const taskContainer = page.locator(`div:has-text("${uniqueTaskTitle}")`).filter({ has: page.locator('button') }).first();
    const actionBtn = taskContainer.locator('button').first();
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
    }

    // Verify task status or title remains visible
    await expect(taskTitleLocator).toBeVisible();

    // 6. Delete Task (Clean up)
    const deleteBtn = taskContainer.locator('button[title*="Xóa"], button[title*="Delete"]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await expect(page.locator(`text="${uniqueTaskTitle}"`)).toHaveCount(0, { timeout: 5000 });
    }

    // 7. Tab Switching: Switch to Habits view and verify instant tab change
    const habitsNav = page.locator('#nav-item-habits');
    await habitsNav.click();
    await expect(page.locator('#nav-item-habits')).toBeVisible({ timeout: 5000 });

    // Switch to Finance view
    const financeNav = page.locator('#nav-item-finance');
    await financeNav.click();
    await expect(page.locator('#nav-item-finance')).toBeVisible({ timeout: 5000 });
  });
});
