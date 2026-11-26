import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Users,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  ArrowDown
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { MobileBottomSheet } from '../common/MobileBottomSheet';
import { soundEngine } from '../../lib/soundEngine';

export interface GlobalChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

interface GlobalChatWidgetProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
}

export function GlobalChatWidget({
  currentUserId,
  currentUserName,
  currentUserAvatar
}: GlobalChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // 1. Initial Load of 50 latest messages when widget opens
  const loadInitialMessages = useCallback(async () => {
    try {
      const res = await apiCall<{
        success: boolean;
        messages: GlobalChatMessage[];
        hasMore: boolean;
        onlineCount: number;
      }>('/api/global-chat/messages?limit=50');

      if (res && res.success && Array.isArray(res.messages)) {
        setMessages(res.messages);
        setHasMore(Boolean(res.hasMore));
        if (res.onlineCount) setOnlineCount(res.onlineCount);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      }
    } catch (err) {
      console.warn('Failed to load initial global chat:', err);
    }
  }, []);

  // Listen to external toggle/open events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setUnreadCount(0);
      if (messages.length === 0) {
        loadInitialMessages();
      } else {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
      }
    };

    const handleClose = () => setIsOpen(false);
    const handleToggle = () => {
      setIsOpen(prev => {
        const next = !prev;
        if (next) {
          setUnreadCount(0);
          if (messages.length === 0) loadInitialMessages();
        }
        return next;
      });
    };

    window.addEventListener('lifeos:open-global-chat', handleOpen);
    window.addEventListener('lifeos:close-global-chat', handleClose);
    window.addEventListener('lifeos:toggle-global-chat', handleToggle);

    return () => {
      window.removeEventListener('lifeos:open-global-chat', handleOpen);
      window.removeEventListener('lifeos:close-global-chat', handleClose);
      window.removeEventListener('lifeos:toggle-global-chat', handleToggle);
    };
  }, [messages.length, loadInitialMessages]);

  // Broadcast status to MobileFloatingDock
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lifeos:globalchat-status', {
      detail: {
        onlineCount,
        unreadCount,
        isOpen
      }
    }));
  }, [onlineCount, unreadCount, isOpen]);

  // Open / Close trigger handler
  const handleToggle = () => {
    try { soundEngine.playPop(); } catch {}
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setUnreadCount(0);
      if (messages.length === 0) {
        loadInitialMessages();
      } else {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      }
    }
  };

  // 2. Infinite Scroll Up: Load older messages and preserve scroll position
  const handleLoadOlder = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    const oldestMsg = messages[0];
    if (!oldestMsg) return;

    const container = containerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    const prevScrollTop = container ? container.scrollTop : 0;

    setIsLoadingMore(true);
    try {
      const res = await apiCall<{
        success: boolean;
        messages: GlobalChatMessage[];
        hasMore: boolean;
      }>(`/api/global-chat/messages?beforeId=${oldestMsg.id}&limit=50`);

      if (res && res.success && Array.isArray(res.messages) && res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMore(Boolean(res.hasMore));

        // Preserve exact scroll position so screen does not jump
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Failed to load older messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages]);

  // Handle scroll event on container to trigger infinite scroll up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop <= 20 && hasMore && !isLoadingMore) {
      handleLoadOlder();
    }
  };

  // 3. Setup Realtime Server-Sent Events (SSE) Stream
  useEffect(() => {
    const sse = new EventSource('/api/global-chat/stream');
    eventSourceRef.current = sse;

    sse.addEventListener('connected', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.onlineCount) setOnlineCount(payload.onlineCount);
      } catch {}
    });

    sse.addEventListener('message', (e: MessageEvent) => {
      try {
        const newMsg: GlobalChatMessage = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        if (!isOpenRef.current) {
          setUnreadCount((c) => c + 1);
        } else {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      } catch {}
    });

    sse.addEventListener('heartbeat', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.onlineCount) setOnlineCount(data.onlineCount);
      } catch {}
    });

    return () => {
      sse.close();
      eventSourceRef.current = null;
    };
  }, []);

  // Send heartbeat every 30s to stay online
  useEffect(() => {
    const interval = setInterval(() => {
      apiCall('/api/global-chat/heartbeat', 'POST', {
        userId: currentUserId,
        userName: currentUserName
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUserId, currentUserName]);

  // Anti-spam countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 4. Send Message Handler
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || cooldown > 0) return;
    if (text.length > 300) return;

    setIsSending(true);
    try {
      const res = await apiCall<{ success: boolean; message: GlobalChatMessage }>(
        '/api/global-chat/messages',
        'POST',
        { content: text }
      );

      if (res && res.success) {
        setInputText('');
        setCooldown(2);
        try { soundEngine.playPop(); } catch {}
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    } catch (err) {
      console.warn('Send message error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Render Chat Messages List
  const renderMessageList = () => (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 min-h-0 bg-slate-50/50 dark:bg-[#0b0f19]/60"
    >
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={handleLoadOlder}
            disabled={isLoadingMore}
            className="px-3.5 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ArrowDown className="w-3 h-3 rotate-180" />
            <span>{isLoadingMore ? 'Đang tải tin cũ...' : 'Xem tin nhắn cũ hơn'}</span>
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
          <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          <p className="text-xs">Đang kết nối phòng chat cộng đồng...</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isMe = msg.userId === currentUserId;
          const isSystem = msg.userId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-600 dark:text-indigo-300 text-center max-w-[90%] leading-relaxed">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <img
                src={
                  msg.userAvatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.userName)}&background=6366F1&color=fff`
                }
                alt={msg.userName}
                className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
              />
              <div className={`max-w-[80%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {isMe ? 'Bạn' : msg.userName}
                  </span>
                  <span className="text-slate-400">{formatTime(msg.createdAt)}</span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-100 dark:border-slate-700/60'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // Render Input Footer
  const renderInputFooter = () => (
    <div className="p-3 border-t border-slate-100 dark:border-white/[0.08] bg-white dark:bg-slate-900 space-y-1.5 shrink-0 safe-area-pb">
      <div className="relative flex items-center">
        <textarea
          value={inputText}
          onChange={(e) => {
            if (e.target.value.length <= 300) {
              setInputText(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            cooldown > 0
              ? `Giãn cách chống spam: đợi ${cooldown}s...`
              : 'Trò chuyện cộng đồng (Enter để gửi)...'
          }
          disabled={isSending || cooldown > 0}
          rows={2}
          className="w-full pl-3 pr-11 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim() || isSending || cooldown > 0}
          className="absolute right-2.5 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Gửi tin nhắn"
          aria-label="Gửi tin nhắn"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
        <div>
          {cooldown > 0 ? (
            <span className="text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
              <Clock className="w-2.5 h-2.5" /> Đang chống spam ({cooldown}s)
            </span>
          ) : (
            <span>Mọi thành viên đều thấy tin nhắn trực tiếp</span>
          )}
        </div>
        <span className={inputText.length >= 280 ? 'text-amber-500 font-bold' : ''}>
          {inputText.length}/300
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. MOBILE BOTTOM SHEET (md:hidden) */}
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxHeight="92dvh"
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Phòng Chat Cộng Đồng
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{onlineCount} online</span>
                </span>
              </div>
            </div>
          </div>
        }
        subtitle="Lịch sử 1.000 tin · Cuốn chiếu tự động thời gian thực"
        className="flex flex-col"
      >
        <div className="flex flex-col h-[70dvh] max-h-[70dvh]">
          {renderMessageList()}
          {renderInputFooter()}
        </div>
      </MobileBottomSheet>

      {/* 2. DESKTOP FLOATING MODAL & TRIGGER BUTTON (hidden md:block) */}
      <div className="hidden md:block">
        {/* Desktop Floating Trigger Button (Bottom Right) */}
        {!isOpen && (
          <button
            type="button"
            onClick={handleToggle}
            className="fixed bottom-4 right-5 z-40 h-9 px-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer border border-white/20"
            title="Mở Phòng Chat Cộng Đồng"
          >
            <div className="relative">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span className="font-bold text-[11px] tracking-wide">Chat Chung</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="text-[10px] opacity-85 flex items-center gap-1 pl-1.5 border-l border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>{onlineCount}</span>
            </span>
          </button>
        )}

        {/* Desktop Floating Chat Modal */}
        {isOpen && (
          <div
            className={`fixed z-50 transition-all duration-200 ${
              isExpanded
                ? 'inset-6 lg:inset-12'
                : 'bottom-6 right-6 w-[420px] h-[580px] max-h-[85vh]'
            }`}
          >
            <div className="w-full h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3.5 bg-gradient-to-r from-indigo-900 to-slate-950 text-white flex items-center justify-between shrink-0 border-b border-indigo-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                        Phòng Chat Cộng Đồng
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>{onlineCount} online</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-200/70 truncate">
                      Lịch sử 1.000 tin · Cuốn chiếu tự động
                    </p>
                  </div>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Đóng chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Scroll View */}
              {renderMessageList()}

              {/* Input Footer */}
              {renderInputFooter()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
