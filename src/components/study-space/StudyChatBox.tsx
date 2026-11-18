import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Sparkles, MessageSquare } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { ChampionBadge } from './ChampionBadge';

export interface StudyChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  championCount?: number;
  text: string;
  createdAt: string;
}

interface StudyChatBoxProps {
  messages: StudyChatMessage[];
  onSendMessage: (text: string) => Promise<boolean>;
  currentUserId: string;
  isSending?: boolean;
}

export function StudyChatBox({
  messages,
  onSendMessage,
  currentUserId,
  isSending = false
}: StudyChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Anti-spam cooldown timer countdown (2 seconds)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || cooldown > 0) return;

    if (text.length > 300) {
      return;
    }

    const success = await onSendMessage(text);
    if (success) {
      setInputText('');
      setCooldown(2); // 2-second anti-spam cooldown
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Trò Chuyện Trực Tuyến</h4>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {messages.length}/100
          </span>
        </div>
        <span className="text-[10px] text-slate-400">Cuốn chiếu 100 tin</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[220px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-xs">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            const isSystem = msg.userId === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 text-[11px] text-slate-500 dark:text-slate-400 text-center max-w-[90%] leading-relaxed">
                    {msg.text}
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
                <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {isMe ? 'Bạn' : msg.userName}
                    </span>
                    <ChampionBadge count={msg.championCount} size="xs" />
                    <span className="text-slate-400">{formatMessageTime(msg.createdAt)}</span>
                  </div>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5 shrink-0">
        <div className="relative flex items-center">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => {
              if (e.target.value.length <= 300) {
                setInputText(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              cooldown > 0
                ? `Vui lòng đợi ${cooldown}s (chống spam)...`
                : 'Nhập tin nhắn (Enter để gửi, tối đa 300 ký tự)...'
            }
            disabled={isSending || cooldown > 0}
            rows={2}
            className="w-full pl-3 pr-11 py-2 text-xs rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
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

        {/* Counter and Anti-spam Status */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <div className="flex items-center gap-1">
            {cooldown > 0 && (
              <span className="text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
                <Clock className="w-2.5 h-2.5" /> Giãn cách 2s ({cooldown}s)
              </span>
            )}
          </div>
          <span className={inputText.length >= 280 ? 'text-amber-500 font-bold' : ''}>
            {inputText.length}/300 ký tự
          </span>
        </div>
      </div>
    </div>
  );
}
