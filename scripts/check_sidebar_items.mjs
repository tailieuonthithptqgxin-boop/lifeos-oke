import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://127.0.0.1:3000/?token=' + token + '&tab=focus');
  await page.waitForSelector('#app-sidebar', { timeout: 15000 });
  await page.waitForTimeout(1000);
  
  const items = await page.$$eval('#app-sidebar button[id^="nav-item-"]', els => 
    els.map(e => ({ id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim() }))
  );
  console.log('Sidebar items:', JSON.stringify(items, null, 2));
  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/verified_live_sidebar.png' });
  await browser.close();
}

main().catch(console.error);
