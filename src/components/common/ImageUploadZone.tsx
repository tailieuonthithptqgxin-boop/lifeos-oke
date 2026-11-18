import React, { useRef, useState } from 'react';
import { Camera, UploadCloud, X, CheckCircle2, RefreshCw, Eye } from 'lucide-react';
import { compressAndUploadImage, formatBytes, ImageCompressType, validateImageFile } from '../../lib/imageCompressor';
import { toast } from '../../lib/toast';

interface ImageUploadZoneProps {
  value?: string;
  onChange: (url: string) => void;
  type?: ImageCompressType;
  label?: string;
  folder?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  helperText?: string;
}

export function ImageUploadZone({
  value,
  onChange,
  type = 'post',
  label,
  folder = 'uploads',
  className = '',
  aspectRatio = 'auto',
  helperText
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    reductionPercent: number;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Ảnh không hợp lệ');
      return;
    }

    try {
      setIsProcessing(true);
      setCompressionStats(null);

      const result = await compressAndUploadImage(file, type, folder);
      
      setCompressionStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reductionPercent: result.reductionPercent
      });

      onChange(result.url);
      toast.success(
        `Đã tối ưu ảnh nhẹ thành công: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)}`
      );
    } catch (err: any) {
      console.error('[ImageUploadZone] Upload error:', err);
      toast.error(err.message || 'Không thể xử lý ảnh. Vui lòng thử lại!');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setCompressionStats(null);
  };

  // Determine aspect ratio class
  const aspectClass = 
    aspectRatio === 'square' 
      ? 'aspect-square max-w-[200px]' 
      : aspectRatio === 'video' 
      ? 'aspect-video max-w-md' 
      : 'max-h-64 max-w-sm';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
          {label}
        </label>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        /* Image Preview Box with Replace/Clear options */
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className={`relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm ${aspectClass}`}>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
            
            {/* Top Action Overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-xs shadow-md transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                title="Đổi ảnh khác"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Đổi ảnh</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={isProcessing}
                className="p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs backdrop-blur-xs shadow-md transition-all cursor-pointer active:scale-95"
                title="Xóa ảnh"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom info pill */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Đang tối ưu ảnh siêu nhẹ...</span>
              </div>
            )}
          </div>

          {/* Compression Badge */}
          {compressionStats && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 max-w-fit">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                ✅ Đã tối ưu nhẹ ảnh: {formatBytes(compressionStats.originalSize)} ➔ {formatBytes(compressionStats.compressedSize)} (-{compressionStats.reductionPercent}%)
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Empty State Upload Button (100% Touch-Friendly >= 44px) */
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500/80 bg-slate-50/70 hover:bg-emerald-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 flex items-center justify-center gap-2.5 text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-98 group disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Đang tối ưu & nén ảnh siêu nhẹ...
                </span>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold">
                  📷 Tải ảnh trực tiếp từ máy / điện thoại
                </span>
              </>
            )}
          </button>

          {helperText && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
