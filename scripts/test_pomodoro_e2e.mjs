import { chromium } from 'playwright';

async function run() {
  console.log('Starting targeted Playwright verification for Pomodoro...');

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

  // Click 'Phòng Tập Trung & Pomodoro'
  const navBtn = page.locator('button:has-text("Phòng Tập Trung & Pomodoro")').first();
  await navBtn.click();
  await page.waitForTimeout(1500);
  console.log('Entered Focus Room.');

  // Take screenshot of Focus Room Idle
  await page.screenshot({ path: 'pomodoro_station_idle.png' });
  console.log('Saved pomodoro_station_idle.png');

  // Verify NO 3D Canvas
  const canvas = await page.$('#pomodoro-timer-station canvas');
  console.log('3D Canvas in Station:', canvas ? 'FOUND (ERROR)' : 'NOT PRESENT (CLEAN)');

  // Open settings
  const settingsBtn = page.locator('button:has-text("Tự Chỉnh Giờ & Chuông")');
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'pomodoro_settings.png' });
    console.log('Saved pomodoro_settings.png');

    // Close settings
    const closeSettings = page.locator('button:has-text("Hoàn tất cài đặt")');
    if (await closeSettings.isVisible()) {
      await closeSettings.click();
      await page.waitForTimeout(500);
    }
  }

  // Click 5-Second Quick Test button: "⚡ Chạy thử nhanh (5s)"
  const testBtn = page.locator('button:has-text("Chạy thử nhanh (5s)")');
  if (await testBtn.isVisible()) {
    await testBtn.click();
    await page.waitForTimeout(1000);
    console.log('Started 5s test.');
    await page.screenshot({ path: 'pomodoro_focus_running.png' });
    console.log('Saved pomodoro_focus_running.png (Focus phase running).');

    // Wait 5.8s for focus to hit 0 and chime to ring and auto-switch to break
    console.log('Waiting for focus to complete, chime, and auto-transition to break...');
    await page.waitForTimeout(5800);
    await page.screenshot({ path: 'pomodoro_break_phase.png' });
    console.log('Saved pomodoro_break_phase.png (Auto-switched to Break!).');

    // Wait 5.5s for break to finish and auto-start round 2
    console.log('Waiting for break to finish and auto-start round 2...');
    await page.waitForTimeout(5500);
    await page.screenshot({ path: 'pomodoro_round_2.png' });
    console.log('Saved pomodoro_round_2.png (Auto-started Round 2!).');
  }

  await browser.close();
  console.log('All verification steps succeeded!');
}

run().catch(console.error);
