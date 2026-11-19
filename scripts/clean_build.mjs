import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const redirectsPath = path.join(distDir, '_redirects');

try {
  if (fs.existsSync(redirectsPath)) {
    fs.rmSync(redirectsPath, { force: true });
    console.log('[LifeOS Build] Cleaned dist/_redirects to prevent Cloudflare redirect loops.');
  }
} catch (err) {
  console.warn('[LifeOS Build] Notice when cleaning dist/_redirects:', err);
}
