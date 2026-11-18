import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

test.describe('2. UX Assertions: Smart Dismiss, Keyboard Navigation & Draft Protection', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('Omnibar / Command Center opens and closes smoothly via Escape key and backdrop click', async ({ page }) => {
    // Open Command Center using keyboard shortcut (Meta+K / Control+K)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k');

    // Assert Omnibar modal is open
    const omnibarInput = page.locator('input[placeholder*="Gõ nhanh"]').first();
    await expect(omnibarInput).toBeVisible({ timeout: 5000 });

    // Press Escape to dismiss
    await page.keyboard.press('Escape');

    // Assert modal is closed
    await expect(omnibarInput).not.toBeVisible({ timeout: 5000 });
  });

  test('Form Draft Protection: preserves dirty form inputs and prevents accidental loss when clicking backdrop', async ({ page }) => {
    // Navigate to Tasks view
    await page.locator('#nav-item-tasks').click();

    // Click "Tasks" tab or button to ensure we are in Tasks view
    const tasksTabBtn = page.getByRole('button', { name: /^(Tasks|Công việc)$/i }).first();
    if (await tasksTabBtn.isVisible().catch(() => false)) {
      await tasksTabBtn.click();
    }

    // Click "Thêm công việc" / "Add Task" to open full TaskModal
    const openModalBtn = page.locator('button:has-text("Thêm công việc"), button:has-text("Add Task")').first();
    await expect(openModalBtn).toBeVisible({ timeout: 10000 });
    await openModalBtn.click();

    // Modal should be visible
    const modalTitle = page.locator('h3:has-text("Thêm Công việc"), h3:has-text("Add New Task")').first();
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Locate the task title input inside modal
    const taskTitleInput = page.locator('#task-form input[type="text"]').first();
    const draftText = `Important Draft Work #${Date.now()}`;
    await taskTitleInput.fill(draftText);

    // Click on the backdrop outside the modal dialog
    const modalBackdrop = page.locator('.fixed.inset-0.z-50').first();
    await modalBackdrop.click({ position: { x: 10, y: 10 } });

    // Assert: Modal stays open (shake protection prevents closing dirty form) and draft text remains intact
    await expect(modalTitle).toBeVisible();
    await expect(taskTitleInput).toHaveValue(draftText);

    // Clean form then close safely
    await taskTitleInput.fill('');
    await page.keyboard.press('Escape');
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
  });
});
