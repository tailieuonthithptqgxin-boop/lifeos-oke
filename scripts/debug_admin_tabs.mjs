import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:3000/?token=' + token + '&tab=admin');
  await page.waitForTimeout(3000);

  const buttons = await page.$$eval('button', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
  console.log('Admin Page Buttons:', JSON.stringify(buttons, null, 2));

  await page.screenshot({ path: 'C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/admin_page_overview.png' });
  await browser.close();
}

main().catch(console.error);
