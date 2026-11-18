import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

test.describe('Smart Random Vocabulary Shuffle — E2E Acceptance Verification', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.evaluate(() => {
      localStorage.setItem('lifeos_active_module', 'study');
      localStorage.setItem('lifeos_study_active_tab', 'vocabulary');
      localStorage.setItem('lifeos_lang', 'vi');
    });
    // Navigate to Study module via sidebar
    const studyNav = page.locator('#nav-item-study').first();
    if (await studyNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await studyNav.click();
    }
    // Switch to Vocabulary tab inside Study
    const vocabTab = page.locator('button:has-text("Từ vựng"), button:has-text("Vocabulary")').first();
    if (await vocabTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vocabTab.click();
    }
  });

  const launchFocusChamber = async (page: any) => {
    // Wait for async vocab dictionary chunks to finish loading if in progress
    const loadingNotice = page.locator('text=/Đang tải kho từ vựng/').first();
    if (await loadingNotice.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(loadingNotice).not.toBeVisible({ timeout: 15000 });
    }
    const launchBtn = page.locator('button:has-text("Bắt đầu học"), button:has-text("BẮT ĐẦU LUYỆN TẬP"), button:has-text("Bắt đầu luyện tập"), button:has-text("BẮT ĐẦU: FLASHCARD")').first();
    await expect(launchBtn).toBeVisible({ timeout: 15000 });
    await launchBtn.click();
    const focusRoot = page.locator('[data-testid="focus-chamber-screen"]').first();
    await expect(focusRoot).toBeVisible({ timeout: 12000 });
    return focusRoot;
  };

  test('1. Every session has words shuffled (independent of DB/alphabetical order) with zero duplicates', async ({ page }) => {
    test.setTimeout(60000);
    await launchFocusChamber(page);

    // Verify initial word is displayed inside Focus Chamber
    const wordHeading = page.locator('[data-testid="focus-chamber-screen"] main h2').first();
    await expect(wordHeading).toBeVisible({ timeout: 5000 });
    const firstWord = (await wordHeading.innerText()).trim();
    expect(firstWord.length).toBeGreaterThan(0);

    // Collect terms across first few cards to verify ordering & anti-repetition
    const collectedTerms: string[] = [firstWord];
    
    for (let step = 0; step < 4; step++) {
      // Flip card and click "Tốt" [3] to advance
      await page.keyboard.press('Space');
      const rateGoodBtn = page.locator('[data-testid="focus-chamber-screen"] footer button:has-text("Tốt")').first();
      await expect(rateGoodBtn).toBeVisible({ timeout: 3000 });
      await rateGoodBtn.click();
      await page.waitForTimeout(400);

      const nextTerm = (await page.locator('[data-testid="focus-chamber-screen"] main h2').first().innerText()).trim();
      collectedTerms.push(nextTerm);
    }

    // Assert Anti-Repetition: No two adjacent words are identical
    for (let i = 0; i < collectedTerms.length - 1; i++) {
      expect(collectedTerms[i].toLowerCase()).not.toBe(collectedTerms[i + 1].toLowerCase());
    }

    // Assert No Duplicate terms within this pass
    const uniqueTerms = new Set(collectedTerms.map(t => t.toLowerCase()));
    expect(uniqueTerms.size).toBe(collectedTerms.length);

    // Assert that the collected terms are NOT sorted alphabetically A-Z (truly randomized)
    const sortedTerms = [...collectedTerms].sort((a, b) => a.localeCompare(b));
    const isAlphabetical = collectedTerms.every((t, i) => t === sortedTerms[i]);
    expect(isAlphabetical).toBe(false);
  });

  test('2. Smart Shuffle Menu opens and displays all 5 dedicated learning modes', async ({ page }) => {
    await launchFocusChamber(page);

    // Locate the Smart Shuffle button in the Top HUD
    const shuffleBtn = page.locator('#btn-smart-shuffle-toggle, [data-testid="smart-shuffle-toggle"]').first();
    await expect(shuffleBtn).toBeVisible({ timeout: 3000 });

    // Click to open dropdown
    await shuffleBtn.click();

    // Verify dropdown menu opens
    const menu = page.locator('#shuffle-mode-menu, [data-testid="shuffle-mode-menu"]').first();
    await expect(menu).toBeVisible({ timeout: 2000 });

    // Verify the 5 modes exist in the menu:
    await expect(menu.locator('text=/Ôn thông minh/').first()).toBeVisible();
    await expect(menu.locator('text=/Ngẫu nhiên hoàn toàn/').first()).toBeVisible();
    await expect(menu.locator('text=/Chỉ từ mới/').first()).toBeVisible();
    await expect(menu.locator('text=/Kết hợp đan xen/').first()).toBeVisible();
    await expect(menu.locator('text=/Tập trung hay sai/').first()).toBeVisible();

    // Verify "Xáo trộn lại phiên học" action button is present
    const reshuffleBtn = page.locator('#btn-reshuffle-now, [data-testid="btn-reshuffle-now"]').first();
    await expect(reshuffleBtn).toBeVisible();

    // Click re-shuffle and verify dropdown closes smoothly
    await reshuffleBtn.click();
    await expect(menu).not.toBeVisible({ timeout: 2000 });
  });

  test('3. Switching to a new shuffle mode updates HUD pill and preserves session integrity', async ({ page }) => {
    await launchFocusChamber(page);

    const shuffleBtn = page.locator('#btn-smart-shuffle-toggle, [data-testid="smart-shuffle-toggle"]').first();
    await expect(shuffleBtn).toBeVisible();
    await shuffleBtn.click();

    const menu = page.locator('#shuffle-mode-menu, [data-testid="shuffle-mode-menu"]').first();
    await expect(menu).toBeVisible();

    // Select "Ngẫu nhiên hoàn toàn"
    const randomOption = menu.locator('button:has-text("Ngẫu nhiên hoàn toàn")').first();
    await expect(randomOption).toBeVisible();
    await randomOption.click();

    // Verify the button label in the Top HUD now reflects the Random mode
    await expect(shuffleBtn).toContainText('Ngẫu nhiên');

    // Verify card is still healthy and visible inside Focus Chamber
    const wordHeading = page.locator('[data-testid="focus-chamber-screen"] main h2').first();
    await expect(wordHeading).toBeVisible();
    const term = (await wordHeading.innerText()).trim();
    expect(term.length).toBeGreaterThan(0);
  });
});
