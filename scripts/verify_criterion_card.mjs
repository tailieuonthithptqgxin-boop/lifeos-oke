import { chromium } from 'playwright';
import 'dotenv/config';
import jwt from 'jsonwebtoken';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  const adminId = '6e45291f-b9a3-4811-8528-1e7e755a463a';
  const token = jwt.sign(
    { userId: adminId, id: adminId, role: 'SUPERADMIN', email: 'admin@lifeos.com' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  await context.addCookies([
    { name: 'token', value: token, domain: 'localhost', path: '/' }
  ]);

  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  await page.evaluate(({ t, u }) => {
    localStorage.setItem('token', t);
    localStorage.setItem('auth_token', t);
    localStorage.setItem('lifeos_swr_user', JSON.stringify(u));
    localStorage.setItem('lifeos_current_view', 'vocab');
  }, {
    t: token,
    u: {
      id: adminId,
      email: 'admin@lifeos.com',
      name: 'LifeOS SuperAdmin',
      role: 'SUPERADMIN',
      plan: 'TEAM',
      status: 'ACTIVE'
    }
  });

  await page.goto('http://localhost:3000/?tab=vocab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Click on Oxford 3000 tab
  const oxfordTab = await page.$('button:has-text("Oxford 3000"), button:has-text("3000 Từ"), button:has-text("3000")');
  if (oxfordTab) {
    await oxfordTab.click();
    await page.waitForTimeout(1500);
  }

  // Type criterion in search
  const searchInput = await page.$('input[placeholder*="Tìm"], input[placeholder*="từ"], input[type="text"]');
  if (searchInput) {
    await searchInput.fill('criterion');
    await page.waitForTimeout(1500);
  }

  const screenshotPath = 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/vocab_criterion_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('SUCCESS: Vocab screenshot saved to:', screenshotPath);

  await browser.close();
}

main().catch(console.error);
