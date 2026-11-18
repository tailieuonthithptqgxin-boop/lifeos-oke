import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lifeos.com', password: 'Admin@123456' })
  });
  const authData = await loginRes.json();

  await page.goto('http://127.0.0.1:3000/favicon.ico');
  await page.evaluate((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('lifeos_swr_user', JSON.stringify(data.user));
    localStorage.setItem('lifeos_user', JSON.stringify(data.user));
    localStorage.setItem('lifeos_swr_sub', JSON.stringify({ hasAccess: true, planType: 'TEAM', role: 'SUPERADMIN' }));
    localStorage.setItem('lifeos_current_view', 'admin');
    localStorage.setItem('lifeos_cookie_consent', 'true');
    localStorage.setItem('lifeos_consent_state', 'all');
  }, authData);

  await page.goto('http://127.0.0.1:3000/?tab=admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Click on Live Test Lab button in admin tabs
  const labBtn = page.getByRole('button', { name: /Live Test Lab/i });
  if (await labBtn.count() > 0) {
    await labBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // Click run button
  const runBtn = page.locator('button').filter({ hasText: /Kích Hoạt 1000 Agent/i });
  if (await runBtn.count() > 0) {
    await runBtn.first().click();
    console.log('Running 100 tests...');
    await page.waitForTimeout(6000);
  }

  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/e2e_100_tests_full_verified.png' });
  console.log('Saved screenshot successfully!');
  await browser.close();
}

main().catch(console.error);
