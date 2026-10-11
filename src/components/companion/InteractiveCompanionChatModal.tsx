import React, { useState, useEffect, useRef } from 'react';
import { 
  CompanionCharacterProfile, 
  getCharacterProfile 
} from '../../lib/companion/characterRegistry';
import { companionContextEngine } from '../../lib/companion/companionContextEngine';
import { companionBrain, CompanionRole, CompanionUIContext } from '../../lib/companion/companionBrain';
import { companionTelemetry } from '../../lib/companion/companionTelemetry';
import { CompanionMood, CompanionSettings } from '../../lib/companionEngine';
import { LiveMascotCharacter } from './LiveMascotCharacter';
import { 
  X, 
  Send, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  RotateCcw, 
  Settings2, 
  Bot, 
  ArrowRight,
  Flame,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  timestamp: number;
  role?: CompanionRole;
  actionView?: string;
  actionLabel?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  feedback?: 'up' | 'down';
  userQuery?: string;
}

export interface InteractiveCompanionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  activeTab?: string;
  currentUser?: any;
  settings: CompanionSettings;
  onNavigateView?: (view: string) => void;
  onOpenSettings?: () => void;
  onMoodChange?: (mood: CompanionMood) => void;
}

export const InteractiveCompanionChatModal: React.FC<InteractiveCompanionChatModalProps> = ({
  isOpen,
  onClose,
  currentView,
  activeTab,
  currentUser,
  settings,
  onNavigateView,
  onOpenSettings,
  onMoodChange
}) => {
  const character: CompanionCharacterProfile = getCharacterProfile(settings.mascotId);
  const screenContext = companionContextEngine.getScreenContext(currentView);

  const [activeRole, setActiveRole] = useState<CompanionRole>(screenContext.defaultRole);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg_init',
        sender: 'companion',
        text: `${character.greeting}\n\nBạn đang ở **${screenContext.featureName}**. Bạn cần mình hỗ trợ ôn tập, tạo động lực hay giải đáp thắc mắc về tính năng nào trong app?`,
        timestamp: Date.now(),
        role: screenContext.defaultRole
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Update default role when screen changes
  useEffect(() => {
    setActiveRole(screenContext.defaultRole);
  }, [currentView]);

  if (!isOpen) return null;

  const handleFeedback = (messageId: string, rating: 'up' | 'down') => {
    const msg = messages.find(m => m.id === messageId);
    companionTelemetry.recordFeedback({
      messageId,
      rating,
      userQuery: msg?.userQuery,
      assistantResponse: msg?.text,
      viewId: currentView
    });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    if (onMoodChange) {
      onMoodChange('thinking');
    }

    // Process through App-Aware Companion Brain Pipeline
    setTimeout(() => {
      const liveContext = companionContextEngine.getLiveContext();
      const uiContext: CompanionUIContext = {
        currentView,
        activeTab: activeTab || (liveContext.viewId === currentView ? liveContext.activeTab : undefined),
        clickedElement: liveContext.clickedElement,
        userState: {
          role: currentUser?.role || 'USER',
          subscriptionStatus: currentUser?.subscriptionTier || 'FREE'
        },
        conversationHistory: messages.map(m => ({
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp
        }))
      };

      const result = companionBrain.processQuery(text, uiContext, character);

      setActiveRole(result.role);

      const companionMsg: ChatMessage = {
        id: `comp_${Date.now()}`,
        sender: 'companion',
        text: result.text,
        timestamp: Date.now(),
        role: result.role,
        actionView: result.actionView,
        actionLabel: result.actionLabel,
        confidence: result.confidence,
        userQuery: text
      };

      setMessages(prev => [...prev, companionMsg]);
      setIsTyping(false);

      if (onMoodChange) {
        onMoodChange(result.isAllowed ? 'celebrate' : 'idle');
      }
    }, 400);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `msg_clear_${Date.now()}`,
        sender: 'companion',
        text: `Đoạn chat đã được làm mới. ${character.greeting}`,
        timestamp: Date.now(),
        role: screenContext.defaultRole
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] sm:max-h-[620px] transition-all"
        style={{ borderColor: `${character.themeColor}33` }}
      >
        {/* Header */}
        <div 
          className="relative px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/80"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center relative">
              <LiveMascotCharacter 
                mood={isTyping ? 'thinking' : 'idle'}
                mascotId={character.id}
                size="compact"
                showAura={false}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                  <span>{character.name}</span>
                  <span className="text-xs font-normal text-slate-400">({character.vietnameseName})</span>
                </h3>

                {/* Role Badge */}
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs"
                  style={{
                    backgroundColor: activeRole === 'STUDY_COMPANION' ? '#FEF3C7' : '#EFF6FF',
                    color: activeRole === 'STUDY_COMPANION' ? '#B45309' : '#1D4ED8'
                  }}
                >
                  {activeRole === 'STUDY_COMPANION' ? (
                    <>
                      <BookOpen className="w-2.5 h-2.5" />
                      <span>Bạn Học Cùng</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-2.5 h-2.5" />
                      <span>Trợ Lý LifeOS</span>
                    </>
                  )}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-xs">
                {screenContext.featureName} • {character.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tùy chỉnh nhân vật & Chế độ"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Xóa lịch sử chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-purple-50/20 dark:bg-slate-950/40">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';

            return (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base shadow-sm border border-purple-100 dark:border-purple-800 bg-white dark:bg-slate-800 animate-wiggle">
                    {character.avatarIcon}
                  </div>
                )}

                <div 
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white rounded-br-xs font-semibold shadow-md shadow-purple-500/20'
                      : 'bg-white/95 dark:bg-slate-800 border border-purple-100/80 dark:border-purple-900/40 text-slate-800 dark:text-slate-100 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {msg.text}
                  </div>

                  {/* Message Footer: Feedback & Action Pill */}
                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-purple-100/50 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'up')}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            msg.feedback === 'up' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Hữu ích"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'down')}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            msg.feedback === 'down' ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 font-bold' : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Chưa hài lòng"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {msg.actionView && onNavigateView && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateView(msg.actionView!);
                            onClose();
                          }}
                          className="btn-squishy inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-300 font-extrabold text-xs transition-colors cursor-pointer shadow-xs border border-purple-200/50"
                        >
                          <span>{msg.actionLabel || 'Xem ngay ✨'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {character.avatarIcon}
              </div>
              <div className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-1 text-[11px]">{character.name} đang suy nghĩ...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Contextual Question Pills */}
        <div className="px-3.5 py-2.5 border-t border-purple-100/60 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 overflow-x-auto no-scrollbar flex gap-1.5 items-center">
          <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-wiggle" />
            Gợi ý:
          </span>
          {screenContext.suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="btn-squishy text-[11px] px-3 py-1.5 rounded-2xl bg-purple-50/70 dark:bg-slate-800 hover:bg-purple-100/80 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/70 whitespace-nowrap transition-all cursor-pointer font-bold shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 border-t border-purple-100/60 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Hỏi ${character.name} về tính năng app hoặc bài học chill chill ✨...`}
            className="flex-1 px-4 py-2.5 bg-purple-50/30 dark:bg-slate-800 border border-purple-100 dark:border-purple-800/60 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-medium"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="btn-squishy p-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 hover:opacity-95 text-white font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-500/25 cursor-pointer shrink-0"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
