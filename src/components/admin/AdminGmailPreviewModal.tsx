import React, { useState } from 'react';
import { X, Smartphone, Monitor, Mail, ExternalLink } from 'lucide-react';

interface AdminGmailPreviewModalProps {
  title: string;
  htmlContent: string;
  onClose: () => void;
}

export function AdminGmailPreviewModal({ title, htmlContent, onClose }: AdminGmailPreviewModalProps) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('mobile');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Xem Trước Thư Gmail Chuẩn Inline-CSS
              </h3>
              <p className="text-[11px] text-slate-400">
                Tiêu đề: {title || 'Tiêu đề thông báo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  deviceMode === 'mobile'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Di động</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                  deviceMode === 'desktop'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Máy tính</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email Client Simulated Header */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div><strong className="text-slate-700 dark:text-slate-300">Người gửi:</strong> Ban Quản Trị LifeOS &lt;notify@quanlicanhan.online&gt;</div>
          <div><strong className="text-slate-700 dark:text-slate-300">Tiêu đề:</strong> [Life OS] {title}</div>
        </div>

        {/* Preview Frame */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 overflow-y-auto flex items-center justify-center">
          <div
            className={`transition-all duration-300 h-full w-full rounded-2xl shadow-xl overflow-hidden bg-white ${
              deviceMode === 'mobile' ? 'max-w-[420px]' : 'max-w-[680px]'
            }`}
          >
            <iframe
              title="Gmail Preview"
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mẫu thư được tối ưu hóa hiển thị 100% không vỡ giao diện trên ứng dụng Gmail iOS & Android
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
