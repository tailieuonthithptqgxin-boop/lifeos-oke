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

  // Open Bell
  const bell = page.locator('button:has(svg.lucide-bell)').first();
  await bell.click();
  await page.waitForTimeout(600);

  // Click View All
  const viewAll = page.getByRole('button', { name: /Xem tất cả thông báo|View All/i });
  await viewAll.click();
  await page.waitForTimeout(800);

  // Click Preview Gmail with force
  const preview = page.locator('button:has-text("Xem trước Gmail")');
  await preview.click({ force: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'gmail_preview_modal.png' });
  console.log('gmail_preview_modal captured!');

  await browser.close();
}

run().catch(console.error);
