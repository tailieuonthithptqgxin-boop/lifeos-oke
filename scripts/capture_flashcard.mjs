import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@lifeos.com', password: 'Admin@123456' })
  });
  const { token, user } = await loginRes.json();
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('lifeos_swr_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Navigate to study
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'study' }));
  });
  await page.waitForTimeout(2000);

  // Click on Oxford 3000 tab
  const oxfordTab = page.locator('button:has-text("Oxford 3000")').first();
  if (await oxfordTab.count() > 0) {
    await oxfordTab.click();
    await page.waitForTimeout(1500);
  }

  // Click on "Ôn tập" or "Học"
  const startBtn = page.locator('button:has-text("Luyện tập"), button:has-text("Bắt đầu"), button:has-text("Ôn tập")').first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await page.waitForTimeout(2000);
  }

  // Flip card
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/live_flashcard_study.png' });
  console.log('live_flashcard_study.png captured!');

  await browser.close();
}

run().catch(console.error);
