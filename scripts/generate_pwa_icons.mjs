import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Creates an uncompressed/deflated RGBA PNG file directly using pure Node.js
 */
function createPngBuffer(width, height, getRgba) {
  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type (6)
  ihdrData.writeUInt8(0, 10); // Compression method (0)
  ihdrData.writeUInt8(0, 11); // Filter method (0)
  ihdrData.writeUInt8(0, 12); // Interlace method (0)
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // 3. IDAT Raw scanlines (each row starts with filter byte 0)
  const rawScanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rawScanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawScanlineLength;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getRgba(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);

  // 4. IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// CRC32 table & calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Icon design: Gradient Indigo-to-Blue with rounded corner feel and a clean white geometric check & shield emblem
function drawAppIconPixel(x, y, size, isMaskable = false) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Radius for rounded squircle
  const cornerRadius = size * 0.22;
  const margin = isMaskable ? 0 : size * 0.04;
  const innerW = size / 2 - margin;
  const innerH = size / 2 - margin;

  // Squircle distance check
  const clampedX = Math.max(0, Math.abs(dx) - (innerW - cornerRadius));
  const clampedY = Math.max(0, Math.abs(dy) - (innerH - cornerRadius));
  const cornerDist = Math.sqrt(clampedX * clampedX + clampedY * clampedY);

  if (!isMaskable && cornerDist > cornerRadius) {
    // Outside squircle: transparent
    return [0, 0, 0, 0];
  }

  // Smooth Anti-aliasing border
  let alpha = 255;
  if (!isMaskable && cornerDist > cornerRadius - 1.5) {
    alpha = Math.max(0, Math.min(255, Math.round((cornerRadius - cornerDist + 1.5) / 1.5 * 255)));
  }

  // Gradient Background: #3b82f6 (blue-500) to #1d4ed8 (blue-700) / #0f172a
  const t = (x + y) / (size * 2);
  const bgR = Math.round(30 + t * (59 - 30));
  const bgG = Math.round(58 + t * (130 - 58));
  const bgB = Math.round(138 + t * (246 - 138));

  // Foreground Emblem: Central Check & Hexagon Badge
  // Scale factor: inside safe zone (size * 0.5 radius)
  const normX = dx / (size * 0.35);
  const normY = dy / (size * 0.35);

  // Outer Hexagon ring
  const qx = Math.abs(normX);
  const qy = Math.abs(normY);
  const hexDist = Math.max(qx * 0.866025 + qy * 0.5, qy);

  const inRing = hexDist >= 0.72 && hexDist <= 0.95;
  
  // Checkmark logic inside emblem
  // Segment 1: from (-0.45, -0.05) to (-0.15, 0.35)
  // Segment 2: from (-0.15, 0.35) to (0.45, -0.35)
  const distToCheck = pointDistanceToCheck(normX, normY);
  const inCheck = distToCheck < 0.12;

  // Small sparkles or stars in top-right
  const sparkX = normX - 0.55;
  const sparkY = normY + 0.55;
  const inSpark = (Math.abs(sparkX) + Math.abs(sparkY)) < 0.18;

  if (inCheck || inRing || inSpark) {
    // Pure White Emblem (#FFFFFF)
    return [255, 255, 255, alpha];
  }

  // Gradient background
  return [bgR, bgG, bgB, alpha];
}

function pointDistanceToCheck(px, py) {
  // Segment 1: p1(-0.35, 0.0) -> p2(-0.08, 0.32)
  const d1 = distToSegment(px, py, -0.35, 0.02, -0.08, 0.32);
  // Segment 2: p2(-0.08, 0.32) -> p3(0.40, -0.28)
  const d2 = distToSegment(px, py, -0.08, 0.32, 0.40, -0.28);
  return Math.min(d1, d2);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Generate Icons
const publicDir = path.resolve('public');
const iconsDir = path.join(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [
  { file: 'icon-192x192.png', size: 192, maskable: false },
  { file: 'icon-512x512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'favicon-32x32.png', size: 32, maskable: false }
];

for (const { file, size, maskable } of sizes) {
  const targetPath = path.join(iconsDir, file);
  console.log(`Generating ${file} (${size}x${size})...`);
  const buf = createPngBuffer(size, size, (x, y, w, h) => drawAppIconPixel(x, y, size, maskable));
  fs.writeFileSync(targetPath, buf);
}

console.log('✅ All PWA Icons generated successfully!');
