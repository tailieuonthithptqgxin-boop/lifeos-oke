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

      {/* Bottom Input Area: Always Open */}
      <div className="p-2.5 border-t shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              slowModeSeconds > 0
                ? `Vui lòng đợi ${slowModeSeconds}s...`
                : 'Nhập tin nhắn trao đổi bài học...'
            }
            disabled={slowModeSeconds > 0}
            className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-800 disabled:opacity-60'
                : 'bg-white/5 border-white/10 text-white disabled:opacity-60'
            }`}
          />

          <button
            type="button"
            onClick={() => onSendKudos('🔥')}
            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shrink-0"
            title="Tiếp Lửa cho phòng"
          >
            <Flame className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || slowModeSeconds > 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 ${
              slowModeSeconds > 0 || !inputText.trim()
                ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 active:scale-95'
            }`}
          >
            {slowModeSeconds > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>{slowModeSeconds}s</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Gửi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
