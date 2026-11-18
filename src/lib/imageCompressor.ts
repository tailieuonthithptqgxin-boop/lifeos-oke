/**
 * Universal Client-Side Image Compressor & Storage Optimizer
 * LifeOS Platform - Free Tier 10,000 Users Scale
 * 
 * Compresses images directly inside browser canvas before network/storage,
 * preventing server strain, eliminating memory quotas and optimizing mobile bandwidth.
 */

import { apiCall } from './apiClient';
import { toast } from './toast';

export type ImageCompressType = 'avatar' | 'qr' | 'post' | 'banner';

export interface CompressResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  width: number;
  height: number;
  mimeType: string;
}

export interface UploadResult extends CompressResult {
  url: string;
}

/**
 * Format bytes to readable string (e.g. 4.2 MB, 38 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Validate image file size and MIME type
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Không tìm thấy tệp được chọn.' };
  }

  // Validate MIME type
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|bmp|svg)$/i.test(file.name);
  if (!isImage) {
    return { 
      valid: false, 
      error: 'Tệp được chọn không phải định dạng hình ảnh hợp lệ (chỉ hỗ trợ JPG, PNG, WebP, HEIC).' 
    };
  }

  // Validate Max 15MB limit
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { 
      valid: false, 
      error: `Ảnh quá nặng (${formatBytes(file.size)}). Vui lòng chọn ảnh dưới 15MB để hệ thống tối ưu.` 
    };
  }

  return { valid: true };
}

/**
 * Universal Client-Side Canvas Image Compressor
 * - 'avatar': square crop, max 200x200px, WebP/JPEG 0.70 (~10-15KB)
 * - 'qr': keep aspect, max 400x400px, high sharpness WebP/PNG 0.85 (<40KB)
 * - 'post': keep aspect, max width 720px, WebP/JPEG 0.75 (~45-65KB)
 * - 'banner': keep aspect, max 960x400px, WebP/JPEG 0.75
 */
export async function compressImage(file: File, type: ImageCompressType): Promise<CompressResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Ảnh không hợp lệ');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh từ thiết bị.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể giải mã dữ liệu ảnh.'));

      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          let targetWidth = originalWidth;
          let targetHeight = originalHeight;
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = originalWidth;
          let sourceHeight = originalHeight;

          let mimeType = 'image/webp';
          let quality = 0.75;

          // Check if browser supports WebP canvas export
          const testCanvas = document.createElement('canvas');
          const isWebpSupported = testCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
          if (!isWebpSupported) {
            mimeType = 'image/jpeg';
          }

          if (type === 'avatar') {
            // Square crop to 200x200 max
            const minDim = Math.min(originalWidth, originalHeight);
            sourceX = (originalWidth - minDim) / 2;
            sourceY = (originalHeight - minDim) / 2;
            sourceWidth = minDim;
            sourceHeight = minDim;

            const maxDim = 200;
            targetWidth = Math.min(minDim, maxDim);
            targetHeight = targetWidth;
            quality = 0.70;
          } else if (type === 'qr') {
            // Keep aspect, max 400x400, high contrast
            const maxDim = 400;
            if (originalWidth > maxDim || originalHeight > maxDim) {
              if (originalWidth >= originalHeight) {
                targetWidth = maxDim;
                targetHeight = Math.round((originalHeight * maxDim) / originalWidth);
              } else {
                targetHeight = maxDim;
                targetWidth = Math.round((originalWidth * maxDim) / originalHeight);
              }
            }
            quality = 0.85;
            mimeType = 'image/png'; // PNG gives crisp edges for QR code scanners
          } else if (type === 'post') {
            // Max width 720px, keep aspect ratio
            const maxWidth = 720;
            if (originalWidth > maxWidth) {
              targetWidth = maxWidth;
              targetHeight = Math.round((originalHeight * maxWidth) / originalWidth);
            }
            quality = 0.75;
          } else if (type === 'banner') {
            // Max width 960px, max height 400px
            const maxWidth = 960;
            const maxHeight = 400;
            let ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
            if (ratio < 1) {
              targetWidth = Math.round(originalWidth * ratio);
              targetHeight = Math.round(originalHeight * ratio);
            }
            quality = 0.75;
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Trình duyệt không hỗ trợ xử lý đồ họa Canvas.');
          }

          // Antialiasing / Image Smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background for transparent PNG converted to JPEG/WebP
          if (mimeType !== 'image/png') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            targetWidth,
            targetHeight
          );

          const dataUrl = canvas.toDataURL(mimeType, quality);

          // Calculate compressed size in bytes from base64 string
          const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
          const compressedSize = Math.round((base64Length * 3) / 4);
          const originalSize = file.size;
          const reductionPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

          resolve({
            dataUrl,
            originalSize,
            compressedSize,
            reductionPercent,
            width: targetWidth,
            height: targetHeight,
            mimeType
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * IndexedDB Permanent Image Cache
 * Protects localStorage from quota overflow while retaining images across F5 reload
 */
class IndexedDbImageStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB không được hỗ trợ trên môi trường này'));
        return;
      }

      const request = window.indexedDB.open('lifeos_image_store_v1', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async set(key: string, dataUrl: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      store.put({ key, dataUrl, updatedAt: Date.now() });
    } catch (err) {
      console.warn('[IndexedDbImageStore] Could not persist image cache:', err);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').delete(key);
    } catch {}
  }
}

export const imageStore = new IndexedDbImageStore();

/**
 * Universal Image Compression & Upload Processor
 * 1. Compresses image on browser canvas
 * 2. Attempts upload to Cloudflare R2 bucket
 * 3. Falls back smoothly to compressed base64 data URL
 * 4. Caches in IndexedDB to avoid QuotaExceededError and maintain persistence across F5
 */
export async function compressAndUploadImage(
  file: File,
  type: ImageCompressType,
  folder = 'uploads'
): Promise<UploadResult> {
  const compressed = await compressImage(file, type);

  let finalUrl = compressed.dataUrl;

  try {
    // Attempt upload to Cloudflare R2 if available
    const safeFileName = `${type}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const res = await apiCall('/api/r2/upload-base64', 'POST', {
      base64Data: compressed.dataUrl,
      fileName: safeFileName,
      mimeType: compressed.mimeType,
      folder
    });

    if (res?.file?.url) {
      finalUrl = res.file.url;
    }
  } catch (err: any) {
    // Graceful fallback: compressed base64 is already ultra-lightweight (<50KB)
    console.info('[compressAndUploadImage] Using lightweight compressed dataUrl directly:', formatBytes(compressed.compressedSize));
  }

  // Cache in IndexedDB by URL or folder key
  await imageStore.set(`img_${type}_${Date.now()}`, finalUrl);

  return {
    ...compressed,
    url: finalUrl
  };
}
