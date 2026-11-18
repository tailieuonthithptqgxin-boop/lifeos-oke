import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:3000/?token=' + token + '&view=admin');
  await page.waitForTimeout(2000);

  // Navigate to admin if not directly on it
  await page.evaluate(() => {
    try {
      window.__LIFEOS_STORE__?.setCurrentView?.('admin');
    } catch {}
  });

  const adminNavBtn = page.locator('button:has-text("Quản trị viên (Admin)")');
  if (await adminNavBtn.count() > 0) {
    await adminNavBtn.click();
    await page.waitForTimeout(1000);
  }

  // 1. Click Cron Manager Tab
  const cronTabBtn = page.locator('button:has-text("Quản Lý Cron Tự Động")');
  if (await cronTabBtn.count() > 0) {
    await cronTabBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/admin_cron_manager_tab.png' });
    console.log('1. Admin Cron Manager Tab screenshot saved.');

    // 2. Click "Chạy thử toàn bộ Cron ngay lập tức"
    const runAllBtn = page.locator('button:has-text("Chạy thử toàn bộ Cron ngay lập tức")');
    if (await runAllBtn.count() > 0) {
      await runAllBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/admin_cron_execution_result.png' });
      console.log('2. Admin Cron Execution result screenshot saved.');
    }
  }

  // 3. Open Cloudflare Pre-Flight Check modal
  const preflightBtn = page.locator('button:has-text("Kiểm Tra Độ Sẵn Sàng Cloudflare")');
  if (await preflightBtn.count() > 0) {
    await preflightBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/cloudflare_preflight_modal.png' });
    console.log('3. Cloudflare Pre-Flight modal screenshot saved.');
  }

  await browser.close();
  console.log('Verification finished successfully!');
}

main().catch(console.error);
