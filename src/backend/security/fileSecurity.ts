import crypto from 'crypto';
import path from 'path';

export interface FileValidationResult {
  valid: boolean;
  detectedMime: string;
  detectedExt: string;
  safeFileName: string;
  error?: string;
}

// Known Magic Bytes Signatures (File Headers)
const MAGIC_NUMBERS: Record<string, { bytes: number[]; ext: string; mime: string }> = {
  png: {
    bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    ext: 'png',
    mime: 'image/png'
  },
  jpeg: {
    bytes: [0xFF, 0xD8, 0xFF],
    ext: 'jpg',
    mime: 'image/jpeg'
  },
  gif: {
    bytes: [0x47, 0x49, 0x46, 0x38],
    ext: 'gif',
    mime: 'image/gif'
  },
  pdf: {
    bytes: [0x25, 0x50, 0x44, 0x46],
    ext: 'pdf',
    mime: 'application/pdf'
  },
  webp: {
    bytes: [0x52, 0x49, 0x46, 0x46], // Starts with "RIFF", byte 8-11 is "WEBP"
    ext: 'webp',
    mime: 'image/webp'
  },
  zip: {
    bytes: [0x50, 0x4B, 0x03, 0x04],
    ext: 'zip',
    mime: 'application/zip'
  }
};

/**
 * Detect actual MIME type from binary buffer using header signatures (Magic Bytes).
 */
export function detectMimeFromBuffer(buffer: Buffer): { mime: string; ext: string } | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // Check WebP specifically (RIFF....WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // Check other signatures
  for (const [key, sig] of Object.entries(MAGIC_NUMBERS)) {
    if (key === 'webp') continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { mime: sig.mime, ext: sig.ext };
    }
  }

  return null;
}

/**
 * Sanitize untrusted client file names to prevent path traversal and script execution.
 */
export function sanitizeFileName(rawFileName: string, fallbackExt: string = 'bin'): string {
  // Strip null bytes and directory traversal symbols
  const baseName = path.basename(rawFileName).replace(/\0/g, '');
  
  // Extract extension safely
  const parsedExt = path.extname(baseName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || fallbackExt;
  
  // Clean file title: allow only Vietnamese/Latin characters, numbers, dashes, underscores
  const titleWithoutExt = path.basename(baseName, path.extname(baseName))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  const randomHash = crypto.randomBytes(6).toString('hex');
  return `${titleWithoutExt || 'file'}_${randomHash}.${parsedExt}`;
}

/**
 * Deep inspection of file buffer: verifies size, magic bytes signature, and absence of malicious scripts.
 */
export function validateUploadedBuffer(
  buffer: Buffer,
  declaredFileName: string,
  declaredMimeType: string,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      detectedMime: '',
      detectedExt: '',
      safeFileName: '',
      error: 'Tập tin rỗng hoặc không có dữ liệu nhị phân.'
    };
  }

  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      detectedMime: '',
      detectedExt: '',
      safeFileName: '',
      error: `Dung lượng tập tin vượt quá giới hạn cho phép (${Math.round(maxSizeBytes / (1024 * 1024))}MB).`
    };
  }

  // Detect signature
  const detected = detectMimeFromBuffer(buffer);
  if (!detected) {
    // Check if it's an SVG or plaintext file
    const sampleStr = buffer.slice(0, 1024).toString('utf-8').toLowerCase();
    
    // Disallow SVG if it contains script or event handlers
    if (sampleStr.includes('<svg')) {
      if (
        sampleStr.includes('<script') ||
        sampleStr.includes('onload=') ||
        sampleStr.includes('onerror=') ||
        sampleStr.includes('javascript:')
      ) {
        return {
          valid: false,
          detectedMime: 'image/svg+xml',
          detectedExt: 'svg',
          safeFileName: '',
          error: 'Tập tin SVG bị từ chối do chứa mã kịch bản thực thi độc hại (XSS).'
        };
      }
      return {
        valid: true,
        detectedMime: 'image/svg+xml',
        detectedExt: 'svg',
        safeFileName: sanitizeFileName(declaredFileName, 'svg')
      };
    }

    // Reject unknown binaries pretending to be images/documents
    return {
      valid: false,
      detectedMime: 'application/octet-stream',
      detectedExt: 'bin',
      safeFileName: '',
      error: 'Định dạng tập tin không được hỗ trợ hoặc chữ ký nhị phân không hợp lệ.'
    };
  }

  // Cross-check: ensure declared MIME family matches detected MIME family
  const normalizedDeclared = declaredMimeType.toLowerCase().trim();
  const declaredFamily = normalizedDeclared.split('/')[0];
  const detectedFamily = detected.mime.split('/')[0];

  if (declaredFamily === 'image' && detectedFamily !== 'image') {
    return {
      valid: false,
      detectedMime: detected.mime,
      detectedExt: detected.ext,
      safeFileName: '',
      error: `Tập tin ngụy trang: MIME khai báo là ảnh (${declaredMimeType}) nhưng định dạng thực tế là ${detected.mime}.`
    };
  }

  const safeFileName = sanitizeFileName(declaredFileName, detected.ext);

  return {
    valid: true,
    detectedMime: detected.mime,
    detectedExt: detected.ext,
    safeFileName
  };
}
