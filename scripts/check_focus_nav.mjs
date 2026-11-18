import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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

  // Click on Sidebar / Nav item for Focus
  const navItem = page.locator('nav button, aside button, nav a, aside a').filter({ hasText: /Tập trung|Focus/i }).first();
  console.log('Nav item found:', await navItem.count());
  if (await navItem.count() > 0) {
    await navItem.click();
    await page.waitForTimeout(1500);
  }

  const buttons = await page.$$eval('button', els => els.map(e => e.textContent.trim()).filter(Boolean));
  console.log('All buttons found:', buttons.slice(0, 30));

  await browser.close();
}

run().catch(console.error);
