import React, { useState, useEffect } from 'react';
import { Megaphone, X, ArrowRight, Sparkles, Pin } from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { useAppStore } from '../../lib/store';
import { ActiveAnnouncement } from '../notifications/LoginAnnouncementModal';

export function StickyTopBanner() {
  const { currentUser, setCurrentView } = useAppStore();
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    apiCall<{ success: boolean; announcements: ActiveAnnouncement[] }>('/api/announcements/active')
      .then(res => {
        if (res && res.success && Array.isArray(res.announcements)) {
          const pinned = res.announcements.find(a => a.isPinned);
          if (pinned) {
            const dismissed = sessionStorage.getItem(`lifeos_dismiss_pin_${pinned.id}`) === 'true';
            if (!dismissed) {
              setPinnedAnnouncement(pinned);
            }
          }
        }
      })
      .catch(() => {});
  }, [currentUser]);

  if (!pinnedAnnouncement || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(`lifeos_dismiss_pin_${pinnedAnnouncement.id}`, 'true');
  };

  const handleAction = () => {
    // Track click
    apiCall(`/api/announcements/${pinnedAnnouncement.id}/click`, { method: 'POST' }).catch(() => {});
    
    const url = pinnedAnnouncement.actionUrl?.trim() || '';
    if (!url) return;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      const viewKey = url.replace(/^[/?#]+/, '').replace(/^tab=/, '') as any;
      if (viewKey) setCurrentView(viewKey);
    }
  };

  return (
    <aside 
      aria-label="Thông báo ghim từ quản trị viên"
      className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-3 py-2 text-xs font-medium flex items-center justify-between gap-3 shadow-md relative z-30 select-none animate-in fade-in duration-300"
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1 max-w-4xl mx-auto">
        <span className="p-1 rounded-lg bg-white/20 shrink-0">
          <Pin className="w-3 h-3 text-amber-300 fill-amber-300" />
        </span>
        <span className="font-bold truncate">
          {pinnedAnnouncement.title}:
        </span>
        <span className="text-white/90 truncate hidden sm:inline">
          {pinnedAnnouncement.message}
        </span>

        {pinnedAnnouncement.actionUrl && (
          <button
            type="button"
            onClick={handleAction}
            className="ml-2 px-2.5 py-0.5 rounded-full bg-white text-emerald-800 hover:bg-emerald-50 text-[11px] font-black shrink-0 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>{pinnedAnnouncement.actionLabel || 'Xem ngay'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
        title="Đóng dải băng"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
}
