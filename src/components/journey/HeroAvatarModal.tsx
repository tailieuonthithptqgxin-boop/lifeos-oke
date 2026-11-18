import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Upload, Check, Sparkles, Image as ImageIcon, 
  Link as LinkIcon, Loader2, RefreshCw, Zap
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { ImageUploadZone } from '../common/ImageUploadZone';

interface HeroAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  frameClass?: string;
}

// 12 High quality RPG & Gen-Z stylized avatars
export const PRESET_HERO_AVATARS = [
  {
    id: 'cyber-warrior',
    name: 'Chiến Binh Số',
    title: 'Cyber Warrior',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    tag: '⚡ Tech'
  },
  {
    id: 'arcane-mage',
    name: 'Pháp Sư Bí Thuật',
    title: 'Arcane Mage',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
    tag: '🔮 Magic'
  },
  {
    id: 'shadow-ninja',
    name: 'Nhẫn Giả Bóng Đêm',
    title: 'Shadow Shinobi',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight',
    tag: '🥷 Stealth'
  },
  {
    id: 'paladin-guardian',
    name: 'Hiệp Sĩ Hộ Thần',
    title: 'Sun Paladin',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Phoenix',
    tag: '🛡️ Defense'
  },
  {
    id: 'forest-ranger',
    name: 'Xạ Thủ Tinh Anh',
    title: 'Forest Ranger',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aiden',
    tag: '🏹 Agile'
  },
  {
    id: 'valkyrie-queen',
    name: 'Vương Giả Bất Diệt',
    title: 'Royal Valkyrie',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Valkyrie',
    tag: '👑 Crown'
  },
  {
    id: 'cyber-synth',
    name: 'Trí Tuệ Cơ Khí',
    title: 'Synth Automaton',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber',
    tag: '🤖 Mecha'
  },
  {
    id: 'kitsune-spirit',
    name: 'Hồ Ly Tiên Giới',
    title: 'Celestial Kitsune',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Fox',
    tag: '🦊 Spirit'
  },
  {
    id: 'master-ronin',
    name: 'Lãng Khách Vô Danh',
    title: 'Master Ronin',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ronin',
    tag: '⚔️ Blade'
  },
  {
    id: 'dragon-knight',
    name: 'Kỵ Sĩ Rồng Thiêng',
    title: 'Dragon Knight',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Dragon',
    tag: '🐉 Mythic'
  },
  {
    id: 'grand-scholar',
    name: 'Đại Hiền Triết',
    title: 'Grand Scholar',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sage',
    tag: '📜 Wisdom'
  },
  {
    id: 'astral-oracle',
    name: 'Nhà Chiêm Tinh Học',
    title: 'Astral Oracle',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Oracle',
    tag: '🌟 Cosmic'
  }
];

export function HeroAvatarModal({ isOpen, onClose, frameClass = 'ring-2 ring-slate-700' }: HeroAvatarModalProps) {
  const { currentUser, updateProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(currentUser?.avatar || '');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useBodyScrollLock(isOpen);

  const isDirty = customUrlInput.trim().length > 0;

  const triggerShake = () => {
    soundEngine.playPop();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSafeDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  const currentAvatar = selectedAvatarUrl || currentUser?.avatar || '';

  const handleApplyAvatar = async (avatarUrlToApply: string) => {
    if (!avatarUrlToApply) return;
    try {
      setIsSaving(true);
      setMessage(null);
      await updateProfile({ avatar: avatarUrlToApply });
      setSelectedAvatarUrl(avatarUrlToApply);
      soundEngine.playSuccess();
      triggerConfetti();
      setMessage({ text: 'Đã cập nhật ảnh đại diện anh hùng trên toàn hệ thống!', type: 'success' });
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to update avatar:', err);
      setMessage({ text: err.message || 'Không thể lưu ảnh đại diện. Vui lòng thử lại!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: 'Kích thước tệp không được vượt quá 5MB', type: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      setMessage(null);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          // Attempt Cloudflare R2 Upload
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            folder: 'avatars'
          });

          const newAvatarUrl = res.file?.url || base64Data;
          await handleApplyAvatar(newAvatarUrl);
        } catch (uploadErr) {
          // Fallback directly to base64 data URL
          await handleApplyAvatar(base64Data);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploading(false);
      setMessage({ text: err.message || 'Lỗi khi đọc file ảnh', type: 'error' });
    }
  };

  const handleApplyCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    await handleApplyAvatar(customUrlInput.trim());
    setCustomUrlInput('');
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-default"
    >
      <div 
        className={`w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Đổi Ảnh Đại Diện Anh Hùng
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                  Toàn Hệ Thống
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tùy chỉnh diện mạo hiển thị trên Hồ sơ, Topbar, Sidebar & Bảng vinh danh
              </p>
            </div>
          </div>

          <button type="button"
            onClick={handleSafeDismiss}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Strip */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center text-2xl font-black text-emerald-400 ${frameClass} shadow-lg shrink-0 relative`}>
              {currentAvatar ? (
                <img 
                  src={currentAvatar} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover rounded-2xl" 
                />
              ) : (
                <span>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '⚡'}</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{currentUser?.name || 'Anh Hùng'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  Ảnh hiện tại
                </span>
              </div>
              <span className="text-xs text-slate-400 block mt-0.5 truncate max-w-xs">
                {currentAvatar.startsWith('data:') ? 'Ảnh tải lên từ thiết bị' : currentAvatar || 'Chưa thiết lập ảnh đại diện'}
              </span>
            </div>
          </div>

          {currentAvatar && (
            <button type="button"
              onClick={() => handleApplyAvatar('')}
              className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
              title="Đặt về chữ cái mặc định"
            >
              Xóa ảnh
            </button>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-800 gap-2">
          <button type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition cursor-pointer border-b-2 ${
              activeTab === 'presets'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Anh Hùng RPG ({PRESET_HERO_AVATARS.length})</span>
          </button>

          <button type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition cursor-pointer border-b-2 ${
              activeTab === 'upload'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>📷 Tải Ảnh Cá Nhân (Nén Tự Động)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: RPG PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Chọn 1 diện mạo phong cách RPG để áp dụng ngay:</span>
                <span className="text-[11px] text-emerald-400 font-bold">1-Click Áp dụng tức thì ⚡</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {PRESET_HERO_AVATARS.map((avatar) => {
                  const isEquipped = currentAvatar === avatar.url;
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => handleApplyAvatar(avatar.url)}
                      className={`group relative p-3 rounded-2xl border text-left transition flex flex-col items-center justify-between gap-2.5 cursor-pointer ${
                        isEquipped
                          ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                          : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 group-hover:scale-105 transition-transform duration-200">
                        <img 
                          src={avatar.url} 
                          alt={avatar.name} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                        {isEquipped && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="text-center w-full">
                        <span className="text-xs font-bold text-white block truncate">{avatar.name}</span>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium truncate">{avatar.title}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-700/60 text-slate-300 font-mono">
                            {avatar.tag}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyAvatar(avatar.url);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer ${
                          isEquipped
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        }`}
                      >
                        {isEquipped ? 'Đang dùng' : 'Chọn avatar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: 1-TOUCH CLIENT-SIDE COMPRESSED UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <ImageUploadZone
                type="avatar"
                label="Tải ảnh chân dung từ điện thoại hoặc máy tính:"
                value={selectedAvatarUrl}
                onChange={(url) => {
                  if (url) {
                    handleApplyAvatar(url);
                  }
                }}
                aspectRatio="square"
                folder="avatars"
                helperText="Ảnh được tự động cắt vuông 200x200px, nén siêu nhẹ ~10KB và lưu đồng bộ tức thì trên toàn hệ thống."
              />

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block">💡 Cơ chế nén ảnh tự động ngay trên trình duyệt:</span>
                <p>Ảnh chụp điện thoại nặng 5MB–10MB sẽ được nén siêu nhẹ chỉ còn khoảng 10KB–15KB ngay trên máy của bạn, hoàn toàn không làm tốn dung lượng 4G hay làm đầy bộ nhớ.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Ảnh cập nhật sẽ tự động đồng bộ trên toàn ứng dụng.</span>
          </div>

          <button type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
