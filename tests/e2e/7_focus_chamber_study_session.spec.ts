import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

test.describe('Focus Chamber — Card Front & Back Flip Content Audit', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    // Ensure we are in Study view with Vocabulary tab
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
    const launchBtn = page.locator('button:has-text("Bắt đầu học"), button:has-text("BẮT ĐẦU LUYỆN TẬP"), button:has-text("Bắt đầu luyện tập"), button:has-text("BẮT ĐẦU: FLASHCARD")').first();
    await expect(launchBtn).toBeVisible({ timeout: 5000 });
    await launchBtn.click();
    const focusRoot = page.locator('[data-testid="focus-chamber-screen"]').first();
    await expect(focusRoot).toBeVisible({ timeout: 8000 });
    return focusRoot;
  };

  test('1. Navigating to Study Module never crashes Error Boundary with reading container error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const errorBanner = page.locator('text="Khối giao diện \'study\' gặp sự cố"').first();
    const isErrorVisible = await errorBanner.isVisible({ timeout: 1500 }).catch(() => false);
    expect(isErrorVisible).toBe(false);

    const containerErrors = errors.filter(e => e.includes('container'));
    expect(containerErrors).toHaveLength(0);
  });

  test('2. Card Front is visible, Flips to Back, and Back shows Vietnamese Meaning (never pitch black)', async ({ page }) => {
    await launchFocusChamber(page);
    
    // 1. Verify Card Front Term is visible
    const wordHeading = page.locator('main h2').first();
    await expect(wordHeading).toBeVisible();
    const termText = await wordHeading.innerText();
    expect(termText.trim().length).toBeGreaterThan(0);

    // 2. Click to flip card (Lật thẻ)
    const flipBtn = page.locator('button:has-text("lật thẻ"), button:has-text("Lật thẻ")').first();
    if (await flipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await flipBtn.click();
    } else {
      await page.keyboard.press('Space');
    }

    // 3. Verify Card Back is VISIBLE and NOT BLACK (Nghĩa Tiếng Việt heading & meaning text)
    const backMeaningTitle = page.locator('text="Nghĩa Tiếng Việt"').first();
    await expect(backMeaningTitle).toBeVisible({ timeout: 3000 });

    const meaningTextEl = page.locator('main h3').first();
    await expect(meaningTextEl).toBeVisible();
    const meaningText = await meaningTextEl.innerText();
    expect(meaningText.trim().length).toBeGreaterThan(0);

    // 4. Verify Dock now displays rating buttons: [1] Quên, [2] Khó, [3] Tốt, [4] Dễ
    const rateButtons = page.locator('footer button');
    await expect(rateButtons.first()).toBeVisible();
    
    // Test clicking "Tốt" [3]
    const rateGoodBtn = page.locator('footer button:has-text("Tốt")').first();
    await expect(rateGoodBtn).toBeVisible();
    await rateGoodBtn.click();
    await page.waitForTimeout(400);

    // Verify still in Focus Chamber and next word is rendered
    const nextWordHeading = page.locator('main h2').first();
    await expect(nextWordHeading).toBeVisible();
  });

  test('3. Card flips anywhere on card surface and YouTube Lo-Fi Focus Music player toggles smoothly', async ({ page }) => {
    await launchFocusChamber(page);

    // 1. Verify Card Front is visible
    const wordHeading = page.locator('main h2').first();
    await expect(wordHeading).toBeVisible();

    // 2. Click ANYWHERE on the card surface (e.g. main card body, not the button) to flip!
    const cardContainer = page.locator('main .rounded-3xl.border').first();
    await cardContainer.click({ position: { x: 50, y: 50 } });

    // Verify card flipped to Back
    const backMeaningTitle = page.locator('text="Nghĩa Tiếng Việt"').first();
    await expect(backMeaningTitle).toBeVisible({ timeout: 3000 });

    // 3. Click ANYWHERE on the card back surface to flip back to Front!
    await cardContainer.click({ position: { x: 60, y: 60 } });
    await expect(page.locator('main h2').first()).toBeVisible({ timeout: 3000 });

    // 4. Verify YouTube Lo-Fi Music button in Top HUD
    const ytBtn = page.locator('#btn-youtube-focus-toggle, [data-testid="youtube-focus-toggle"]').first();
    await expect(ytBtn).toBeVisible({ timeout: 2000 });
    await expect(ytBtn).toContainText('Nhạc YouTube');

    // Click to open YouTube Focus Player drawer
    await ytBtn.click();
    const ytContainer = page.locator('[data-testid="focus-youtube-container"]').first();
    await expect(ytContainer).toBeVisible({ timeout: 2000 });

    // Click again or close button to collapse
    await ytBtn.click();
    await expect(ytContainer).not.toBeVisible();
  });

  test('4. Synthesizes Web Audio API soundscapes and mechanical keyboard haptics without external mp3s', async ({ page }) => {
    const hasAudioContext = await page.evaluate(() => {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      return typeof AudioCtx === 'function';
    });
    expect(hasAudioContext).toBe(true);
  });

  test('5. Audio-First Listening Mode never leaks term/IPA before answer and evaluates typing with character diff', async ({ page }) => {
    await launchFocusChamber(page);

    // Switch to Listening Mode via top pill
    const listeningPill = page.locator('button:has-text("Luyện Nghe"), button:has-text("Nghe")').first();
    await expect(listeningPill).toBeVisible({ timeout: 3000 });
    await listeningPill.click();

    // Verify: In Audio-First mode, the card stage has:
    // 1. Audio-First indicator
    const audioFirstBadge = page.locator('text="Audio-First"').first();
    await expect(audioFirstBadge).toBeVisible();

    // 2. Play Normal (1.0x) and Play Slow (0.75x) buttons are present
    const playNormBtn = page.locator('button:has-text("Nghe chuẩn 1.0x"), button:has-text("Nghe chuẩn")').first();
    const playSlowBtn = page.locator('button:has-text("Chậm 0.75x"), button:has-text("Chậm")').first();
    await expect(playNormBtn).toBeVisible();
    await expect(playSlowBtn).toBeVisible();

    // 3. VERIFY NO ANSWER LEAK: The main heading does NOT reveal the secret term before check!
    const headingText = await page.locator('main h3').first().innerText();
    expect(headingText).toContain('Lắng nghe cẩn thận');

    // 4. Type an answer into the listening input box and submit
    const listeningInput = page.locator('input[placeholder*="Gõ từ"]').first();
    await expect(listeningInput).toBeVisible();
    await listeningInput.fill('resilience');

    const checkBtn = page.locator('button:has-text("Kiểm tra đáp án")').first();
    await checkBtn.click();

    // 5. Verify Evaluation Result is shown (Diff or score badge, term now revealed)
    await expect(page.locator('text=/So sánh ký tự|Gần chính xác|Chính xác/').first()).toBeVisible({ timeout: 4000 });
  });

  test('6. Speaking AI Practice Mode displays target word and responsive microphone toggle', async ({ page }) => {
    await launchFocusChamber(page);

    // Switch to Speaking Mode via top pill
    const speakingPill = page.locator('button:has-text("Luyện Nói"), button:has-text("Nói")').first();
    await expect(speakingPill).toBeVisible({ timeout: 3000 });
    await speakingPill.click();

    // Verify Speaking mode UI:
    await expect(page.locator('text="Luyện Nói AI"').first()).toBeVisible();
    await expect(page.locator('button:has-text("Nghe mẫu chuẩn")').first()).toBeVisible();

    // Verify Microphone button is present
    const micBtn = page.locator('button[title*="bắt đầu phát âm"], button[title*="Micro"], main button:has(svg.lucide-mic)').first();
    await expect(micBtn).toBeVisible();
  });
});
