import React, { useState, useEffect } from 'react';
import { 
  Megaphone, X, Check, ArrowRight, Sparkles, 
  AlertTriangle, ShieldAlert, Award, Calendar, ExternalLink 
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { useAppStore } from '../../lib/store';

export interface ActiveAnnouncement {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  imageUrl?: string | null;
  isPinned?: boolean;
  showLoginModal?: boolean;
  actionUrl?: string | null;
  actionLabel?: string | null;
  publishedAt?: string;
  hasRead?: boolean;
}

export function LoginAnnouncementModal() {
  const { currentUser, setCurrentView } = useAppStore();
  const [activeAnnouncement, setActiveAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    checkActiveAnnouncements();
  }, [currentUser]);

  const checkActiveAnnouncements = async () => {
    try {
      const res = await apiCall<{ success: boolean; announcements: ActiveAnnouncement[] }>('/api/announcements/active');
      if (res && res.success && Array.isArray(res.announcements) && res.announcements.length > 0) {
        // Find the first unacknowledged announcement that requires login modal
        const localReadIds: string[] = JSON.parse(localStorage.getItem('lifeos_read_announcements') || '[]');
        
        const unread = res.announcements.find(ann => {
          if (localReadIds.includes(ann.id)) return false;
          if (ann.hasRead) return false;
          return ann.showLoginModal !== false || ann.priority === 'CRITICAL' || ann.priority === 'IMPORTANT';
        });

        if (unread) {
          setActiveAnnouncement(unread);
          setIsOpen(true);
          try {
            soundEngine.playPop();
          } catch {}
        }
      }
    } catch {
      // Offline fallback: don't block user
    }
  };

  const handleAcknowledge = async () => {
    if (!activeAnnouncement) return;
    setClosing(true);
    
    // 1. Save to localStorage immediately so F5 never pops up again
    try {
      const localReadIds: string[] = JSON.parse(localStorage.getItem('lifeos_read_announcements') || '[]');
      if (!localReadIds.includes(activeAnnouncement.id)) {
        localReadIds.push(activeAnnouncement.id);
        localStorage.setItem('lifeos_read_announcements', JSON.stringify(localReadIds));
      }
    } catch {}

    // 2. Notify backend
    try {
      await apiCall(`/api/announcements/${activeAnnouncement.id}/acknowledge`, {
        method: 'POST'
      });
    } catch {}

    setTimeout(() => {
      setIsOpen(false);
      setClosing(false);
      setActiveAnnouncement(null);
    }, 200);
  };

  const handleActionClick = async () => {
    if (!activeAnnouncement) return;

    // Track click
    try {
      await apiCall(`/api/announcements/${activeAnnouncement.id}/click`, {
        method: 'POST'
      });
    } catch {}

    const url = activeAnnouncement.actionUrl?.trim() || '';
    handleAcknowledge();

    if (!url) return;

    // Internal app view navigation or external URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      const viewKey = url.replace(/^[/?#]+/, '').replace(/^tab=/, '') as any;
      if (viewKey) {
        setCurrentView(viewKey);
      }
    }
  };

  if (!isOpen || !activeAnnouncement) return null;

  // Determine Category Style
  const type = (activeAnnouncement.type || '').toUpperCase();
  const isEmergency = type === 'SECURITY' || type === 'CRITICAL' || type === 'EMERGENCY' || type === 'MAINTENANCE';
  const isFeature = type === 'FEATURE' || type === 'EVENT';
  const isAffiliate = type === 'AFFILIATE' || type === 'REFERRAL';
  const isStudy = type === 'STUDY' || type === 'MOTIVATION';

  let badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  let badgeLabel = '📢 THÔNG BÁO TỪ QUẢN TRỊ VIÊN';
  let gradientBanner = 'from-emerald-600 via-teal-600 to-indigo-700';

  if (isEmergency) {
    badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    badgeLabel = '🚨 THÔNG BÁO KHẨN CẤP';
    gradientBanner = 'from-rose-600 via-red-600 to-amber-700';
  } else if (isFeature) {
    badgeColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    badgeLabel = '🎉 TÍNH NĂNG MỚI & SỰ KIỆN';
    gradientBanner = 'from-purple-600 via-indigo-600 to-violet-700';
  } else if (isAffiliate) {
    badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    badgeLabel = '💸 DÀNH CHO CỘNG TÁC VIÊN (AFFILIATE)';
    gradientBanner = 'from-amber-600 via-yellow-600 to-orange-700';
  } else if (isStudy) {
    badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    badgeLabel = '📚 NHẮC NHỞ HỌC TẬP & KỶ LUẬT';
    gradientBanner = 'from-emerald-600 via-teal-600 to-cyan-700';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md transition-opacity">
      <div 
        className={`w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200/80 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transition-all transform ${
          closing ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Top Header Gradient */}
        <div className={`p-6 sm:p-7 bg-gradient-to-r ${gradientBanner} text-white relative overflow-hidden`}>
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10 mb-3">
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5 shadow-xs">
              {badgeLabel}
            </span>
            <button
              type="button"
              onClick={handleAcknowledge}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug relative z-10">
            {activeAnnouncement.title}
          </h2>

          <div className="text-xs text-white/80 mt-1 relative z-10 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {activeAnnouncement.publishedAt
                ? new Date(activeAnnouncement.publishedAt).toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Thông báo chính thức'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Attached Image */}
          {activeAnnouncement.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <img
                src={activeAnnouncement.imageUrl}
                alt="Announcement attachment"
                className="w-full max-h-56 object-cover"
              />
            </div>
          )}

          {/* Message Content */}
          <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-normal">
            {activeAnnouncement.message}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:justify-end">
          <button
            type="button"
            onClick={handleAcknowledge}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>

          {activeAnnouncement.actionUrl && (
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <span>{activeAnnouncement.actionLabel || 'Khám phá ngay'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
