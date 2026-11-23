import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Video, Link2, Sparkles, Check, HelpCircle } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface StudyCreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roomData: {
    name: string;
    topic: string;
    connectionType: 'jitsi' | 'external';
    externalUrl?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const TOPIC_PRESETS = [
  'Tập trung sâu & Kỷ luật',
  'Lập trình & Tech',
  'Ngoại ngữ & IELTS',
  'Đọc sách & Nghiên cứu',
  'Thi cử & Đại học',
  'Giao lưu & Học nhóm'
];

export function StudyCreateRoomModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}: StudyCreateRoomModalProps) {
  useBodyScrollLock(isOpen);

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('Tập trung sâu & Kỷ luật');
  const [connectionType, setConnectionType] = useState<'jitsi' | 'external'>('jitsi');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Vui lòng nhập tên phòng học.');
      return;
    }

    if (connectionType === 'external') {
      const cleanUrl = externalUrl.trim();
      if (!cleanUrl) {
        setError('Vui lòng dán link cuộc họp Google Meet hoặc Zoom.');
        return;
      }
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        setError('Đường dẫn cuộc họp phải bắt đầu bằng https://');
        return;
      }
    }

    try {
      await onSubmit({
        name: cleanName,
        topic,
        connectionType,
        externalUrl: connectionType === 'external' ? externalUrl.trim() : undefined
      });
      setName('');
      setExternalUrl('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi tạo phòng.');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 relative overflow-y-auto my-auto max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Tạo Phòng Học Tập Mới</h3>
              <p className="text-xs text-slate-500">Tối ưu hiệu năng, 0% băng thông máy chủ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Room Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tên phòng học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cùng nhau cày Toán cao cấp / Silent Pomodoro..."
              maxLength={80}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base sm:text-xs min-h-[44px] sm:min-h-0 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chủ đề học tập
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOPIC_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`px-3 py-2 min-h-[40px] sm:min-h-0 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                    topic === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Audio / Video Mode Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chế độ kết nối đàm thoại / video
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Jitsi Meet */}
              <div
                onClick={() => setConnectionType('jitsi')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                  connectionType === 'jitsi'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Google Meet Style (Webcam & Avatar)</span>
                  </div>
                  {connectionType === 'jitsi' && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Phòng học ảo Google Meet trực tiếp với Camera, Chia sẻ màn hình, Avatar Gen Z, nhạc Lofi và Pomodoro đồng bộ.
                </p>
              </div>

              {/* Option B: External Link */}
              <div
                onClick={() => setConnectionType('external')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                  connectionType === 'external'
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Google Meet / Zoom</span>
                  </div>
                  {connectionType === 'external' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">✓</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dán link cuộc họp riêng. Hỗ trợ mở cửa sổ pop-up tiện lợi ở góc màn hình.
                </p>
              </div>
            </div>

            {/* External URL Input */}
            {connectionType === 'external' && (
              <div className="mt-2 space-y-1 animate-in fade-in duration-100">
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="VD: https://meet.google.com/abc-defg-hij hoặc link Zoom"
                  required={connectionType === 'external'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base sm:text-xs min-h-[44px] sm:min-h-0 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Đang tạo phòng...' : 'Tạo phòng ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
