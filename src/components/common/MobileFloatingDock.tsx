import React, { useState, useEffect } from 'react';
import { FileEdit, MessageSquare, Sparkles, ChevronRight, X } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';

interface MobileFloatingDockProps {
  className?: string;
}

export function MobileFloatingDock({ className = '' }: MobileFloatingDockProps) {
  const [scratchpadTimeLeft, setScratchpadTimeLeft] = useState('24:00');
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [hasScratchpadContent, setHasScratchpadContent] = useState(false);

  const [onlineCount, setOnlineCount] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('lifeos_mobile_dock_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Listen to live status updates from ScratchpadWidget
  useEffect(() => {
    const handleScratchpadStatus = (e: CustomEvent) => {
      if (e.detail) {
        if (e.detail.timeLeft) setScratchpadTimeLeft(e.detail.timeLeft);
        if (typeof e.detail.isOpen === 'boolean') setIsScratchpadOpen(e.detail.isOpen);
        if (typeof e.detail.hasContent === 'boolean') setHasScratchpadContent(e.detail.hasContent);
      }
    };

    const handleChatStatus = (e: CustomEvent) => {
      if (e.detail) {
        if (typeof e.detail.onlineCount === 'number') setOnlineCount(e.detail.onlineCount);
        if (typeof e.detail.unreadCount === 'number') setUnreadCount(e.detail.unreadCount);
        if (typeof e.detail.isOpen === 'boolean') setIsChatOpen(e.detail.isOpen);
      }
    };

    window.addEventListener('lifeos:scratchpad-status', handleScratchpadStatus as EventListener);
    window.addEventListener('lifeos:globalchat-status', handleChatStatus as EventListener);

    return () => {
      window.removeEventListener('lifeos:scratchpad-status', handleScratchpadStatus as EventListener);
      window.removeEventListener('lifeos:globalchat-status', handleChatStatus as EventListener);
    };
  }, []);

  const toggleCollapse = () => {
    try { soundEngine.playPop(); } catch {}
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('lifeos_mobile_dock_collapsed', String(next)); } catch {}
      return next;
    });
  };

  const openScratchpad = () => {
    try { soundEngine.playPop(); } catch {}
    window.dispatchEvent(new CustomEvent('lifeos:open-scratchpad'));
  };

  const openChat = () => {
    try { soundEngine.playPop(); } catch {}
    window.dispatchEvent(new CustomEvent('lifeos:open-global-chat'));
  };

  // If either sheet is open, hide the dock completely to avoid any visual collision
  if (isScratchpadOpen || isChatOpen) {
    return null;
  }

  return (
    <div
      id="mobile-floating-dock"
      aria-label="Phím tắt nhanh di động"
      className={`md:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-30 transition-all duration-300 ease-out select-none ${className}`}
    >
      {isCollapsed ? (
        /* Collapsed Mini Bubble */
        <button
          type="button"
          onClick={toggleCollapse}
          className="w-10 h-10 rounded-full bg-slate-900/90 dark:bg-[#111827]/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
          title="Mở thanh công cụ nhanh"
          aria-label="Mở thanh công cụ nhanh"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-slate-900" />
          )}
        </button>
      ) : (
        /* Expanded Unified Frosted Capsule */
        <div className="flex items-center bg-slate-950/85 dark:bg-[#0c101a]/90 text-white backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_30px_rgba(0,0,0,0.35)] rounded-full p-1 pl-1.5 pr-1 gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* 1. Giấy Nháp 24h Trigger */}
          <button
            type="button"
            onClick={openScratchpad}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer group"
            title="Mở Giấy nháp 24h tự hủy"
          >
            <div className="relative">
              <FileEdit className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              {hasScratchpadContent && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </div>
            <span className="text-xs font-bold tracking-tight text-slate-100">Nháp</span>
            {hasScratchpadContent && (
              <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                {scratchpadTimeLeft.slice(0, 5)}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-white/20 shrink-0" />

          {/* 2. Chat Cộng Đồng Trigger */}
          <button
            type="button"
            onClick={openChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer group"
            title="Mở Chat Cộng Đồng"
          >
            <div className="relative">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span className="text-xs font-bold tracking-tight text-slate-100">Chat</span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>{onlineCount}</span>
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* 3. Collapse Icon */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5 cursor-pointer"
            title="Thu nhỏ thanh phím tắt"
            aria-label="Thu nhỏ thanh phím tắt"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
