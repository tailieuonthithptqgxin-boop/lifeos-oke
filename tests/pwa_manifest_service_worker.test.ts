import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PWA Manifest Verification Suite', async (t) => {
  const manifestPath = path.resolve('public/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public directory');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  await t.test('1. App Name & Short Name requirements', () => {
    assert.equal(manifest.name, 'QUẢN LÍ CÁ NHÂN', 'name must be QUẢN LÍ CÁ NHÂN');
    assert.equal(manifest.short_name, 'QUẢN LÍ', 'short_name must be QUẢN LÍ');
    assert.equal(manifest.display, 'standalone', 'display mode must be standalone');
    assert.equal(manifest.start_url, '/', 'start_url must be /');
  });

  await t.test('2. Color themes match application styling', () => {
    assert.equal(manifest.theme_color, '#2563eb', 'theme_color must be blue-600');
    assert.equal(manifest.background_color, '#0f172a', 'background_color must be slate-900');
  });

  await t.test('3. Icons configuration completeness (192, 512, maskable)', () => {
    assert.ok(Array.isArray(manifest.icons), 'icons array must exist');
    const has192 = manifest.icons.some((i: any) => i.sizes === '192x192' && i.purpose === 'any');
    const has512 = manifest.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'any');
    const hasMaskable192 = manifest.icons.some((i: any) => i.sizes === '192x192' && i.purpose === 'maskable');
    const hasMaskable512 = manifest.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'maskable');

    assert.ok(has192, 'Must have 192x192 standard icon');
    assert.ok(has512, 'Must have 512x512 standard icon');
    assert.ok(hasMaskable192, 'Must have 192x192 maskable icon');
    assert.ok(hasMaskable512, 'Must have 512x512 maskable icon');

    // Verify all icon files physically exist on disk
    for (const icon of manifest.icons) {
      const iconPath = path.resolve('public', icon.src.replace(/^\//, ''));
      assert.ok(fs.existsSync(iconPath), `Physical icon file must exist: ${icon.src}`);
    }
  });
});

test('PWA Service Worker & Security Isolation Suite', async (t) => {
  const swPath = path.resolve('public/sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist in public directory');
  const swCode = fs.readFileSync(swPath, 'utf8');

  await t.test('1. Security: Sensitive endpoints must NEVER be cached', () => {
    assert.ok(swCode.includes('/api/'), 'Must explicitly guard against /api/ caching');
    assert.ok(swCode.includes('/auth/'), 'Must explicitly guard against /auth/ caching');
    assert.ok(swCode.includes('/api/finance'), 'Must explicitly guard against finance caching');
    assert.ok(swCode.includes('request.method !== \'GET\''), 'Only GET requests can be considered for cache');
  });

  await t.test('2. Lifecycle: Has cache versioning and old cache cleanup', () => {
    assert.ok(swCode.includes('CACHE_VERSION'), 'Must define CACHE_VERSION');
    assert.ok(swCode.includes('caches.delete'), 'Must purge outdated cache keys on activate');
    assert.ok(swCode.includes('self.clients.claim()'), 'Must claim clients on activate');
    assert.ok(swCode.includes('self.skipWaiting()'), 'Must support immediate activation via skipWaiting');
  });

  await t.test('3. HTML index.html includes correct PWA meta tags and manifest link', () => {
    const indexPath = path.resolve('index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    assert.ok(indexHtml.includes('<link rel="manifest" href="/manifest.json" />'), 'Must link manifest.json');
    assert.ok(indexHtml.includes('name="theme-color" content="#2563eb"'), 'Must define theme-color');
    assert.ok(indexHtml.includes('name="mobile-web-app-capable" content="yes"'), 'Must define mobile-web-app-capable');
    assert.ok(indexHtml.includes('name="apple-mobile-web-app-title" content="QUẢN LÍ CÁ NHÂN"'), 'Must define apple app title');
  });
});
