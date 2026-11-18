import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://127.0.0.1:3000/?token=' + token + '&view=admin', { waitUntil: 'domcontentloaded' });
  
  // Wait for Admin page header to be visible
  await page.waitForSelector('text=Trung Tâm Quản Trị Hệ Thống', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // 1. Take screenshot of Admin main view
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/admin_main_screen.png' });
  console.log('Saved admin_main_screen.png');

  // 2. Click on "Quản Lý Cron Tự Động" tab
  const cronTab = page.locator('button:has-text("Quản Lý Cron Tự Động")').first();
  await cronTab.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/admin_cron_manager_tab.png' });
  console.log('Saved admin_cron_manager_tab.png');

  // 3. Click "Chạy thử toàn bộ Cron ngay lập tức"
  const runAllBtn = page.locator('button:has-text("Chạy thử toàn bộ Cron ngay lập tức")').first();
  await runAllBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/admin_cron_execution_result.png' });
  console.log('Saved admin_cron_execution_result.png');

  // 4. Open Cloudflare Pre-Flight modal
  const preflightBtn = page.locator('button:has-text("Kiểm Tra Độ Sẵn Sàng Cloudflare")').first();
  await preflightBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/cloudflare_preflight_modal.png' });
  console.log('Saved cloudflare_preflight_modal.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

main().catch(console.error);
