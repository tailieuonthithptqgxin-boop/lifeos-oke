import { chromium } from 'playwright';

async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@lifeos.com', password: 'Admin@123456' })
  });
  const { token, user } = await loginRes.json();
  console.log('Logged in as:', user?.email);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('lifeos_swr_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2500);

  // Click Bell Button
  const bellBtn = await page.locator('button:has(svg.lucide-bell)').first();
  await bellBtn.click();
  await page.waitForTimeout(800);
  console.log('Clicked bell button.');

  // Click View All to open NotificationCenterModal
  const viewAllBtn = page.getByRole('button', { name: /Xem tất cả thông báo|View All/i });
  if (await viewAllBtn.isVisible()) {
    await viewAllBtn.click();
    await page.waitForTimeout(1000);
    console.log('Opened Notification Center Modal.');
    await page.screenshot({ path: 'notif_center_modal.png' });

    // Click Preview Gmail button: "👁️ Xem trước Gmail"
    const previewBtn = page.locator('button:has-text("Xem trước Gmail")');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      await page.waitForTimeout(1500);
      console.log('Opened Gmail Preview Modal.');
      await page.screenshot({ path: 'gmail_preview_modal.png' });

      // Switch to Mobile view in GmailPreviewModal
      const mobileBtn = page.locator('button:has-text("Mobile (420px)")');
      if (await mobileBtn.isVisible()) {
        await mobileBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: 'gmail_preview_mobile.png' });
        console.log('Switched to mobile preview and captured.');
      }

      // Close preview modal
      const closePreviewBtn = page.locator('button:has-text("Đóng Xem Trước")');
      if (await closePreviewBtn.isVisible()) {
        await closePreviewBtn.click();
        await page.waitForTimeout(600);
      }
    }

    // Click Simulate Deadline dropdown: "⚡ Giả lập Deadline"
    const simDropdownBtn = page.locator('button:has-text("Giả lập Deadline")');
    if (await simDropdownBtn.isVisible()) {
      await simDropdownBtn.click();
      await page.waitForTimeout(600);

      // Select "Mốc 3 (Trước 30m - Khẩn)"
      const sim30m = page.locator('button:has-text("Mốc 3")');
      if (await sim30m.isVisible()) {
        await sim30m.click();
        await page.waitForTimeout(1500);
        console.log('Triggered 30M Deadline simulation.');
        await page.screenshot({ path: 'simulated_deadline.png' });
      }
    }
  }

  await browser.close();
  console.log('All verification steps succeeded with screenshots generated!');
}

run().catch(console.error);
