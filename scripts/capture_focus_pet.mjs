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

  // Navigate to Focus view
  const focusBtn = page.locator('#nav-item-focus, button:has-text("Phòng Tập Trung"), button:has-text("Phòng tập trung")').first();
  if (await focusBtn.count() > 0) {
    await focusBtn.click();
  } else {
    // try direct click or dispatch
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-view', { detail: 'focus' }));
    });
  }
  await page.waitForTimeout(2000);

  // Take screenshot of Focus page
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/focus_page_live.png' });
  console.log('Focus page captured!');

  await browser.close();
}

run().catch(console.error);
