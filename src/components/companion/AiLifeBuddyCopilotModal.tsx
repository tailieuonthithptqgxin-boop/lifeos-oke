import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Send, Sparkles, Zap, Split, Wallet, 
  AlertTriangle, RefreshCw, Cloud
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { formatCurrency } from '../../lib/utils';
import { LiveMascotCharacter } from './LiveMascotCharacter';
import { companionEngine, MASCOT_PROFILES } from '../../lib/companionEngine';
import { companionBrain, CompanionUIContext } from '../../lib/companion/companionBrain';
import { getCharacterProfile } from '../../lib/companion/characterRegistry';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { callGeminiWithResilience, FRIENDLY_503_MESSAGE } from '../../lib/geminiClient';

interface AiLifeBuddyCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartZenFocus?: (taskId: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  actionType?: 'trifecta' | 'breakdown' | 'finance';
  modelBadge?: string;
  traceId?: string;
}

export function AiLifeBuddyCopilotModal({
  isOpen,
  onClose,
}: AiLifeBuddyCopilotModalProps) {
  const { 
    tasks = [], 
    addTask, 
    transactions = [], 
    financeAccounts = [], 
    currentUser 
  } = useAppStore();

  const userId = currentUser?.id;
  const mascotSettings = useMemo(() => companionEngine.getSettings(userId), [userId]);
  const mascotId = mascotSettings.mascotId || 'lumi';
  const mascotInfo = MASCOT_PROFILES[mascotId] || MASCOT_PROFILES.lumi;

  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isShaking, setIsShaking] = useState(false);

  const [inputQuery, setInputQuery] = useState('');
  const [useCloudGemini, setUseCloudGemini] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiErrorBanner, setAiErrorBanner] = useState<{
    message: string;
    traceId?: string;
    httpStatus?: number;
    retryCount?: number;
    category?: string;
  } | null>(null);

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleSafeDismiss = () => {
    if (inputQuery.trim()) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inputQuery.trim()) {
          triggerShake();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputQuery, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Yo ${currentUser?.name || 'bạn iu'}! Mình là AI Buddy của bạn đây. Hôm nay năng lượng thế nào? Cần mình tự động xếp lịch Trifecta, chia nhỏ việc khó, hay soi ví chi tiêu không? Bấm nút nhanh bên dưới là xong ngay! ⚡`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  if (!isOpen) return null;

  // 1-Click Action: Auto-Schedule Daily Trifecta
  const handleAutoSchedule = () => {
    soundEngine.playSuccess();
    triggerConfetti();

    const pending = tasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Hủy');
    if (pending.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: 'Hiện tại bạn không còn việc nào tồn đọng cả! Hãy bấm "+ Tạo mới" để thêm mục tiêu hôm nay nhé! 🌟',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    // Pick top 3 tasks based on priority
    const urgent = pending.filter(t => t.priority === 'Cao' || t.priority === 'Khẩn cấp');
    const normal = pending.filter(t => t.priority !== 'Cao' && t.priority !== 'Khẩn cấp');
    const selected = [...urgent, ...normal].slice(0, 3);
    const selectedIds = [selected[0]?.id || '', selected[1]?.id || '', selected[2]?.id || ''];

    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(selectedIds));

    setMessages(prev => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'ai',
        text: `Đã xong! Mình vừa phân tích và gắp 3 việc quan trọng nhất vào Daily Trifecta hôm nay:\n1. ⭐️⭐️⭐️ ${selected[0]?.title || 'Việc 1'}\n2. ⭐️⭐️ ${selected[1]?.title || 'Việc 2'}\n3. ⭐️ ${selected[2]?.title || 'Việc 3'}\n\nChiến lược là xử lý việc số 1 vào buổi sáng lúc não bộ sung sức nhất nhé! 🚀`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actionType: 'trifecta'
      }
    ]);
  };

  // 1-Click Action: Breakdown Overthinking Task
  const handleBreakdownTask = () => {
    soundEngine.playPop();
    const pending = tasks.filter(t => t.status !== 'Hoàn thành');
    const targetTask = pending[0]?.title || 'Dự án trọng điểm';

    const microSteps = [
      `[15p Khởi động] Lên khung dàn bài cho: ${targetTask}`,
      `[25p Deep Work] Xử lý phần cốt lõi của: ${targetTask}`,
      `[10p Hoàn thiện] Rà soát và nộp bài/báo cáo: ${targetTask}`
    ];

    microSteps.forEach(title => {
      addTask({
        title,
        status: 'Chưa làm',
        priority: 'Trung bình',
        dueDate: new Date().toISOString().split('T')[0],
        projectId: null,
        notes: `Tạo từ AI Task Breakdown cho việc "${targetTask}"`
      });
    });

    triggerConfetti();
    setMessages(prev => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'ai',
        text: `Đừng overthinking nữa! Mình đã xé nhỏ nhiệm vụ "${targetTask}" thành 3 bước cực dễ xơi:\n• 15p: Khởi động lên khung\n• 25p: Tập trung làm phần lõi\n• 10p: Rà soát & Đóng gói\n\nCả 3 bước đã được thêm vào danh sách task. Chỉ cần bắt đầu 15 phút đầu tiên thôi! ⚡`,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actionType: 'breakdown'
      }
    ]);
  };

  // 1-Click Action: Roast Spending
  const handleRoastSpending = () => {
    soundEngine.playPop();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const recentExpenses = transactions.filter(t => {
      if (t.type !== 'Chi tiêu') return false;
      const d = new Date(t.date || now);
      return d >= sevenDaysAgo;
    });

    const totalExpense = recentExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalBalance = financeAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);

    let roastComment = `Tuần này bạn đã chi tiêu ${formatCurrency(totalExpense)}. Số dư hiện tại là ${formatCurrency(totalBalance)}.`;
    if (totalExpense > 500000) {
      roastComment += ` Hơi mát tay rồi đấy nha! Từ giờ đến cuối tuần hạn chế order trà sữa hay shopping ban đêm nhé! 💸`;
    } else {
      roastComment += ` Quản lý tiền cực kỳ kỉ luật! Tiếp tục giữ phong độ này để tích lũy tài sản nhé! 🪙`;
    }

    setMessages(prev => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'ai',
        text: roastComment,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actionType: 'finance'
      }
    ]);
  };

  // Chat message submit with full HTTP 503 resilience & zero input loss
  const handleSendQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isSending) return;

    soundEngine.playPop();
    const userText = inputQuery.trim();
    setAiErrorBanner(null);

    if (useCloudGemini) {
      setIsSending(true);
      try {
        const result = await callGeminiWithResilience({
          prompt: userText,
          systemInstruction: `Bạn là ${mascotInfo.name}, trợ lý học tập và quản lý cuộc sống thông minh trên hệ điều hành LifeOS. Hãy trả lời ngắn gọn, thực tế, truyền cảm hứng bằng tiếng Việt.`,
          history: messages.slice(-6).map(m => ({
            role: m.sender === 'ai' ? 'model' : 'user',
            text: m.text,
          })),
        });

        if (!result.success) {
          // Requirement 6: Do NOT lose user input when an error occurs!
          setInputQuery(result.preservedInput || userText);
          // Requirement 5: Friendly message ("Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút.")
          // and DO NOT return fake AI content to mask the error.
          setAiErrorBanner({
            message: result.userFriendlyMessage || FRIENDLY_503_MESSAGE,
            traceId: result.traceId,
            httpStatus: result.httpStatus,
            retryCount: result.retryCount,
            category: result.errorCategory,
          });
          setIsSending(false);
          return;
        }

        // Only clear input after confirmed success
        setInputQuery('');
        const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'user',
            text: userText,
            time: nowTime,
          },
          {
            id: String(Date.now() + 1),
            sender: 'ai',
            text: result.text || '',
            time: nowTime,
            modelBadge: result.fallbackUsed ? `${result.model} (Dự phòng)` : result.model,
            traceId: result.traceId,
          },
        ]);
        soundEngine.playSuccess();
      } catch (err: any) {
        // Restore user input on unexpected exception
        setInputQuery(userText);
        setAiErrorBanner({
          message: FRIENDLY_503_MESSAGE,
          httpStatus: err?.status || 503,
        });
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Local App-Aware Companion Brain Mode
    setInputQuery('');
    const newMsg: MessageItem = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);

    const character = getCharacterProfile(mascotId);
    const uiContext: CompanionUIContext = {
      currentView: 'dashboard',
      userState: {
        role: currentUser?.role || 'USER',
        subscriptionStatus: (currentUser as any)?.plan || 'FREE'
      },
      conversationHistory: messages.map(m => ({
        sender: m.sender === 'ai' ? 'companion' : 'user',
        text: m.text,
        timestamp: Date.now()
      }))
    };

    const brainResult = companionBrain.processQuery(userText, uiContext, character);
    soundEngine.playSuccess();

    setMessages(prev => [
      ...prev,
      {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: brainResult.text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col h-[600px] max-h-[92dvh] sm:max-h-[85vh] animate-modal-enter transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center relative shadow-inner shrink-0">
              <LiveMascotCharacter mood="celebrate" mascotId={mascotId} size="compact" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{mascotInfo.name} Copilot</span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  AI Buddy
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                Trợ lý cuộc sống thông minh & thực tế của bạn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setUseCloudGemini(prev => !prev);
                setAiErrorBanner(null);
              }}
              title={useCloudGemini ? 'Đang bật Gemini Cloud API (Tự động Retry & Fallback)' : 'Chuyển sang Gemini Cloud API'}
              className={`px-2.5 py-1.5 min-h-[36px] rounded-xl text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                useCloudGemini
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{useCloudGemini ? 'Gemini Cloud' : 'Local Brain'}</span>
            </button>

            <button
              type="button"
              onClick={handleSafeDismiss}
              className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Action Superpowers Cluster */}
        <div className="p-2.5 sm:px-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={handleAutoSchedule}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Tự xếp lịch Trifecta ⚡</span>
          </button>

          <button
            type="button"
            onClick={handleBreakdownTask}
            className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Split className="w-3.5 h-3.5 text-purple-400" />
            <span>Bổ nhỏ việc khó 🧩</span>
          </button>

          <button
            type="button"
            onClick={handleRoastSpending}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>Soi chi tiêu 💸</span>
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} space-y-1 animate-in fade-in duration-150`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-xs'
                }`}
              >
                {m.text}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[9px] text-slate-500 font-mono">{m.time}</span>
                {m.modelBadge && (
                  <span className="text-[9px] text-indigo-400 font-mono">• {m.modelBadge}</span>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 px-2 py-1 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Đang kết nối Gemini AI (tự động retry & điều phối tải)...</span>
            </div>
          )}

          {aiErrorBanner && (
            <div
              role="alert"
              className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 space-y-2 animate-in fade-in duration-150"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-amber-300">{aiErrorBanner.message}</p>
                  <p className="text-[10px] text-slate-400">
                    Nội dung bạn vừa nhập vẫn được giữ nguyên bên dưới.
                    {aiErrorBanner.traceId ? ` (TraceID: ${aiErrorBanner.traceId} · Retry: ${aiErrorBanner.retryCount ?? 0})` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendQuery()}
                  disabled={isSending}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Thử gửi lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCloudGemini(false);
                    setAiErrorBanner(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-[11px] cursor-pointer"
                >
                  Dùng Local Brain ngay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendQuery} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Hỏi AI hoặc gõ việc bạn đang bế tắc..."
            className="flex-1 px-3.5 py-2.5 min-h-[44px] rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-base sm:text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isSending}
            className={`p-2.5 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              inputQuery.trim() && !isSending
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
