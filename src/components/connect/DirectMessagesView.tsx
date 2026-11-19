import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Search, Check, CheckCheck, Clock, MessageSquare, 
  ArrowLeft, User, Sparkles, RefreshCw, Award 
} from 'lucide-react';
import { 
  connectApi, DirectConversation, DirectMessageItem 
} from '../../lib/connectApiClient';
import { toast } from '../../lib/toast';
import { notifyStudyCommunity } from '../../lib/unifiedNotificationEngine';

interface DirectMessagesViewProps {
  currentUserId?: string;
  initialTargetUserId?: string | null;
  onOpenProfile: (userId: string) => void;
  onClearInitialTarget?: () => void;
}

export function DirectMessagesView({ 
  currentUserId, 
  initialTargetUserId, 
  onOpenProfile,
  onClearInitialTarget 
}: DirectMessagesViewProps) {
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(null);
  const prevUnreadRef = useRef<number>(-1);

  // Keep active conversation ID ref updated for the SSE callback
  useEffect(() => {
    activeConvIdRef.current = activeConversation ? activeConversation.id : null;
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Load conversations list
  const loadConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await connectApi.listConversations();
      if (res && res.success) {
        const convList = Array.isArray(res.conversations) ? res.conversations : [];
        setConversations(convList);

        // Luồng 5 [Phòng học ảo & Cộng đồng]: Phát thông báo khi có tin nhắn mới từ bạn bè
        const totalUnread = convList.reduce((acc, c) => acc + (c?.unreadCount || 0), 0);
        if (prevUnreadRef.current !== -1 && totalUnread > prevUnreadRef.current) {
          const freshConv = convList.find(c => (c?.unreadCount || 0) > 0);
          if (freshConv) {
            notifyStudyCommunity(
              'NEW_MESSAGE',
              `${freshConv.otherUser.name || 'Một người bạn'} vừa gửi cho bạn tin nhắn mới: "${freshConv.lastMessage?.content || '...'}"`
            ).catch(() => {});
          }
        }
        prevUnreadRef.current = totalUnread;

        // If initialTargetUserId was passed, find or create conversation
        if (initialTargetUserId) {
          const existing = res.conversations.find(c => c.otherUser.id === initialTargetUserId);
          if (existing) {
            selectConversation(existing);
          } else {
            handleStartChatWithUser(initialTargetUserId);
          }
          if (onClearInitialTarget) onClearInitialTarget();
        }
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải danh sách trò chuyện', 'error');
    } finally {
      setLoadingConv(false);
    }
  };

  const handleStartChatWithUser = async (targetUserId: string) => {
    try {
      setLoadingMessages(true);
      const res = await connectApi.getOrCreateConversation(targetUserId);
      if (res.success && res.conversation) {
        await loadConversations();
        selectConversation(res.conversation);
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tạo cuộc trò chuyện', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // 2. Select conversation and load messages
  const selectConversation = async (conv: DirectConversation) => {
    setActiveConversation(conv);
    try {
      setLoadingMessages(true);
      const res = await connectApi.listMessages(conv.id);
      if (res.success) {
        setMessages(res.messages);
        setTimeout(scrollToBottom, 50);

        // Mark as read
        if (conv.unreadCount > 0) {
          connectApi.markAsRead(conv.id).catch(() => {});
          setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
        }
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tải tin nhắn', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // 3. Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversation || sending) return;

    const content = inputText.trim();
    const tempId = 'temp_' + Date.now();
    const optimisticMsg: DirectMessageItem = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: currentUserId || '',
      receiverId: activeConversation.otherUser.id,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      clientTempId: tempId
    };

    // Optimistic UI append
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setTimeout(scrollToBottom, 30);

    // Update conversation preview in sidebar
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversation.id) {
        return {
          ...c,
          lastMessageText: content,
          lastMessageAt: new Date().toISOString()
        };
      }
      return c;
    }));

    try {
      setSending(true);
      const res = await connectApi.sendMessage(activeConversation.id, content, tempId);
      if (res.success) {
        setMessages(prev => prev.map(m => m.clientTempId === tempId ? res.message : m));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi gửi tin nhắn', 'error');
      // Rollback or mark failed
      setMessages(prev => prev.filter(m => m.clientTempId !== tempId));
    } finally {
      setSending(false);
    }
  };

  // 4. Real-time SSE Stream Listener
  useEffect(() => {
    loadConversations();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/connect/messages/stream');

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_DIRECT_MESSAGE') {
            const newMsg: DirectMessageItem = payload.message;

            // If incoming message belongs to active conversation
            if (activeConvIdRef.current && activeConvIdRef.current === newMsg.conversationId) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id || (newMsg.clientTempId && m.clientTempId === newMsg.clientTempId))) {
                  return prev;
                }
                return [...prev, newMsg];
              });
              setTimeout(scrollToBottom, 50);

              // Auto mark read if recipient is looking at it
              if (newMsg.senderId !== currentUserId) {
                connectApi.markAsRead(newMsg.conversationId).catch(() => {});
              }
            }

            // Update conversations list preview & order
            setConversations(prev => {
              const target = prev.find(c => c.id === newMsg.conversationId);
              const isCurrentChat = activeConvIdRef.current === newMsg.conversationId;
              if (target) {
                const updated: DirectConversation = {
                  ...target,
                  lastMessageText: newMsg.content,
                  lastMessageAt: newMsg.createdAt,
                  unreadCount: isCurrentChat || newMsg.senderId === currentUserId ? target.unreadCount : target.unreadCount + 1
                };
                return [updated, ...prev.filter(c => c.id !== newMsg.conversationId)];
              }
              return prev;
            });
          } else if (payload.type === 'MESSAGES_READ') {
            const { conversationId } = payload;
            if (activeConvIdRef.current === conversationId) {
              setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            }
          }
        } catch {
          // ignore parse error
        }
      };

      es.onerror = () => {
        // SSE browser handles auto-reconnect
      };
    } catch {}

    return () => {
      if (es) es.close();
    };
  }, []);

  const filteredConversations = conversations.filter(c => 
    c.otherUser.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.otherUser.username && c.otherUser.username.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-14rem)] min-h-[500px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row">
      {/* Left Pane: Conversations List */}
      <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Hộp Thư Riêng</span>
            </h3>
            <button
              type="button"
              onClick={loadConversations}
              className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm bạn trò chuyện..."
              className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-base sm:text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {loadingConv ? (
            <div className="p-6 text-center text-xs text-slate-400">Đang tải cuộc trò chuyện...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p>Chưa có cuộc trò chuyện nào.</p>
              <p className="text-[11px] text-slate-500">Khám phá bạn bè và bắt đầu gửi tin nhắn trao đổi học tập ngay!</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = activeConversation?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-l-4 border-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {conv.otherUser.avatar ? (
                      <img src={conv.otherUser.avatar} alt={conv.otherUser.name} className="w-full h-full object-cover" />
                    ) : (
                      conv.otherUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {conv.otherUser.name}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pr-2">
                        {conv.lastMessageText || 'Bắt đầu cuộc trò chuyện...'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[10px] shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Room */}
      <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div 
                  onClick={() => onOpenProfile(activeConversation.otherUser.id)}
                  className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden cursor-pointer shadow-xs"
                >
                  {activeConversation.otherUser.avatar ? (
                    <img src={activeConversation.otherUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    activeConversation.otherUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 
                      onClick={() => onOpenProfile(activeConversation.otherUser.id)}
                      className="font-bold text-xs text-slate-900 dark:text-white hover:text-emerald-500 cursor-pointer"
                    >
                      {activeConversation.otherUser.name}
                    </h4>
                    {activeConversation.otherUser.championCount && activeConversation.otherUser.championCount > 0 ? (
                      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                        <Award className="w-3 h-3" /> Top 1
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ⚡ {activeConversation.otherUser.totalStudyMinutes || 0} phút tích lũy
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenProfile(activeConversation.otherUser.id)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Hồ sơ
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="py-16 text-center text-xs text-slate-400">Đang tải tin nhắn...</div>
              ) : messages.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="font-bold text-xs text-slate-700 dark:text-slate-300">Bắt đầu trò chuyện!</p>
                  <p className="text-[11px] text-slate-400">Cùng nhau trao đổi kế hoạch, giải bài tập và học tập hiệu quả.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-br-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                        <span>{new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-500 inline" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn (nhấn Enter để gửi)..."
                className="flex-1 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-base sm:text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Chọn cuộc trò chuyện</h4>
            <p className="text-xs text-slate-400 max-w-xs">
              Chọn một người bạn từ danh sách bên trái hoặc ghé thăm mục Khám Phá để bắt đầu kết nối.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
