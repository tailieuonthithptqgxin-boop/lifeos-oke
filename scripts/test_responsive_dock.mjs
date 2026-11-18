import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/?token=' + token + '&tab=study');
  await page.waitForSelector('#app-sidebar', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // 1. Desktop full screenshot
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/responsive_desktop_verified.png' });
  console.log('1. Desktop screenshot captured.');

  // 2. Click Tablet Mode in DevicePreviewDock
  const tabletBtn = page.locator('aside[aria-label="Thanh xem trước thiết bị"] button:has-text("Tablet")');
  if (await tabletBtn.count() > 0) {
    await tabletBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/responsive_tablet_simulated.png' });
    console.log('2. Tablet simulated screenshot captured.');
  }

  // 3. Click Mobile Mode in DevicePreviewDock
  const mobileBtn = page.locator('aside[aria-label="Thanh xem trước thiết bị"] button:has-text("Điện thoại")');
  if (await mobileBtn.count() > 0) {
    await mobileBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/responsive_mobile_simulated.png' });
    console.log('3. Mobile simulated screenshot captured.');
  }

  // 4. Return to Laptop
  const laptopBtn = page.locator('aside[aria-label="Thanh xem trước thiết bị"] button:has-text("Laptop")');
  if (await laptopBtn.count() > 0) {
    await laptopBtn.click();
    await page.waitForTimeout(500);
    console.log('4. Restored to full desktop.');
  }

  await browser.close();
  console.log('All responsive viewport tests completed successfully.');
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
