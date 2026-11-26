import React, { useState, useEffect, useRef } from 'react';
import { Send, Flame, Sparkles, MessageSquare, Clock } from 'lucide-react';

export interface ChatMessageItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface SmartBreakChatProps {
  phase?: 'FOCUS' | 'BREAK' | 'PAUSED';
  messages: ChatMessageItem[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendKudos: (emoji: string) => void;
  isLight?: boolean;
}

export const SmartBreakChat = React.memo(function SmartBreakChat({
  messages,
  currentUserId,
  onSendMessage,
  onSendKudos,
  isLight = false,
}: SmartBreakChatProps) {
  const [inputText, setInputText] = useState('');
  const [slowModeSeconds, setSlowModeSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Local Slow Mode Countdown Timer (gentle 2s cooldown)
  useEffect(() => {
    if (slowModeSeconds <= 0) return;
    const interval = setInterval(() => {
      setSlowModeSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [slowModeSeconds]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || slowModeSeconds > 0) return;

    onSendMessage(trimmed);
    setInputText('');
    setSlowModeSeconds(2); // Gentle 2s anti-spam cooldown
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`h-full flex flex-col rounded-2xl border transition-all ${
        isLight
          ? 'bg-white border-slate-200/90 text-slate-800'
          : 'bg-[#11151f] border-white/10 text-white'
      }`}
    >
      {/* Chat Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          <span className="font-bold text-xs">Trò Chuyện Phòng Học</span>
        </div>

        {/* Live Always Open Status Pill */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Luôn Mở</span>
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
            <Sparkles className="w-6 h-6 text-emerald-500/50 mb-1" />
            <p className="font-semibold text-xs">Chưa có tin nhắn nào</p>
            <p className="text-[10px] mt-0.5 text-slate-500">
              Hãy gửi tin nhắn trao đổi bài tập hoặc lời động viên cho bạn bè!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5 pl-1">
                    {msg.userName}
                  </span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-tr-xs'
                      : isLight
                      ? 'bg-slate-100 text-slate-800 rounded-tl-xs'
                      : 'bg-white/10 text-slate-200 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area: Sleek iMessage / Instagram Live Pill Bar */}
      <div
        className={`px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] border-t shrink-0 space-y-2 ${
          isLight ? 'border-slate-200/80 bg-white' : 'border-white/10 bg-[#141720]'
        }`}
      >
        {/* 1-Tap Dopamine Quick Reactions & Cheers */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { emoji: '🔥', label: 'Cố lên!' },
            { emoji: '👏', label: 'Quá đỉnh' },
            { emoji: '💯', label: 'Tập trung' },
            { emoji: '☕', label: 'Nghỉ tí nhé' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={slowModeSeconds > 0}
              onClick={() => {
                if (slowModeSeconds > 0) return;
                onSendKudos(chip.emoji);
                onSendMessage(`${chip.emoji} ${chip.label}`);
                setSlowModeSeconds(2);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 transition active:scale-95 cursor-pointer disabled:opacity-40 ${
                isLight
                  ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-700 hover:text-emerald-700'
                  : 'bg-white/[0.05] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              {chip.emoji} {chip.label}
            </button>
          ))}
        </div>

        {/* Unified Rounded-Full Pill Input (16px on mobile prevents iOS Safari auto-zoom!) */}
        <div
          className={`flex items-center gap-1.5 pl-4 pr-1.5 py-1 rounded-full border transition-all ${
            isLight
              ? 'bg-slate-100/90 border-slate-200 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
              : 'bg-white/[0.07] border-white/12 focus-within:bg-white/[0.1] focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-500/20'
          }`}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              slowModeSeconds > 0
                ? `Đợi ${slowModeSeconds}s...`
                : 'Nhắn tin hoặc cổ vũ bạn học...'
            }
            disabled={slowModeSeconds > 0}
            className={`flex-1 min-w-0 bg-transparent py-1.5 text-base sm:text-xs focus:outline-hidden ${
              isLight
                ? 'text-slate-900 placeholder:text-slate-400 disabled:opacity-60'
                : 'text-white placeholder:text-slate-400 disabled:opacity-60'
            }`}
          />

          <button
            type="button"
            onClick={() => onSendKudos('🔥')}
            className="w-8 h-8 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0"
            title="Thả pháo lửa cổ vũ cả phòng"
          >
            <Flame className="w-4 h-4 fill-amber-400/30" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || slowModeSeconds > 0}
            aria-label="Gửi tin nhắn"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              slowModeSeconds > 0 || !inputText.trim()
                ? isLight
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 active:scale-90'
            }`}
          >
            {slowModeSeconds > 0 ? (
              <span className="text-[10px] font-black font-mono">{slowModeSeconds}s</span>
            ) : (
              <Send className="w-4 h-4 translate-x-[0.5px]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
