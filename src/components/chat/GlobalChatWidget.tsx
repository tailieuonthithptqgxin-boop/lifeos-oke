import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Users,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ArrowDown
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';

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

        // Scroll to bottom on initial load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      }
    } catch (err) {
      console.warn('Failed to load initial global chat:', err);
    }
  }, []);

  // Open / Close trigger handler
  const handleToggle = () => {
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

        // CRITICAL: Preserve exact scroll position so screen does not jump!
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
        if (payload?.onlineCount) {
          setOnlineCount(payload.onlineCount);
        }
      } catch {}
    });

    sse.addEventListener('online_count', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (typeof payload?.count === 'number') {
          setOnlineCount(payload.count);
        }
      } catch {}
    });

    sse.addEventListener('new_message', (e: MessageEvent) => {
      try {
        const newMsg: GlobalChatMessage = JSON.parse(e.data);
        setMessages((prev) => {
          // If already exists, ignore duplicate
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          const next = [...prev, newMsg];
          if (next.length > 1000) next.shift();
          return next;
        });

        if (!isOpenRef.current) {
          setUnreadCount((c) => c + 1);
        } else {
          // If user is scrolled near bottom, keep auto-scrolling
          const container = containerRef.current;
          if (container) {
            const isNearBottom =
              container.scrollHeight - container.scrollTop - container.clientHeight < 120;
            if (isNearBottom || newMsg.userId === currentUserId) {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            }
          }
        }
      } catch (err) {
        console.warn('SSE new_message parse error:', err);
      }
    });

    return () => {
      sse.close();
      eventSourceRef.current = null;
    };
  }, [currentUserId]);

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
        setCooldown(2); // 2-second rate limit cooldown
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

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleToggle}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white shadow-xl shadow-indigo-500/30 flex items-center gap-2.5 transition-all duration-200 cursor-pointer border border-white/20"
          title="Mở Phòng Chat Cộng Đồng"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="font-bold text-xs tracking-wide">Chat Cộng Đồng</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="text-[11px] opacity-80 flex items-center gap-1 pl-1 border-l border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{onlineCount}</span>
          </span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 ${
            isExpanded
              ? 'inset-3 sm:inset-6 md:inset-12'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          <div className="w-full h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3.5 bg-linear-to-r from-indigo-900 to-slate-950 text-white flex items-center justify-between shrink-0 border-b border-indigo-800/40">
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
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleToggle}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Đóng chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0 bg-slate-50/40 dark:bg-slate-950/40"
            >
              {/* Load older button / Indicator */}
              {hasMore && (
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={handleLoadOlder}
                    disabled={isLoadingMore}
                    className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowDown className="w-3 h-3 rotate-180" />
                    <span>{isLoadingMore ? 'Đang tải tin cũ...' : 'Xem tin nhắn cũ hơn'}</span>
                  </button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 text-indigo-400" />
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
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700"
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

            {/* Input Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shrink-0">
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
                      : 'Trò chuyện cộng đồng (Enter để gửi, tối đa 300 ký tự)...'
                  }
                  disabled={isSending || cooldown > 0}
                  rows={2}
                  className="w-full pl-3 pr-11 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSending || cooldown > 0}
                  className="absolute right-2.5 p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status and Character counter */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <div>
                  {cooldown > 0 ? (
                    <span className="text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
                      <Clock className="w-2.5 h-2.5" /> Đang chống spam ({cooldown}s)
                    </span>
                  ) : (
                    <span>Mọi người đều thấy tin nhắn của bạn</span>
                  )}
                </div>
                <span className={inputText.length >= 280 ? 'text-amber-500 font-bold' : ''}>
                  {inputText.length}/300
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
