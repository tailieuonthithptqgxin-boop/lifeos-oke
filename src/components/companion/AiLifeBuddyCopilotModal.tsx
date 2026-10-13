import React, { useState, useMemo } from 'react';
import { 
  X, Send, Sparkles, Zap, Split, Wallet, 
  Check, ArrowRight, Bot, Clock, Heart, Plus
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { formatCurrency } from '../../lib/utils';
import { LiveMascotCharacter } from './LiveMascotCharacter';
import { companionEngine, MASCOT_PROFILES } from '../../lib/companionEngine';

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
}

export function AiLifeBuddyCopilotModal({
  isOpen,
  onClose,
  onStartZenFocus
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

  const [inputQuery, setInputQuery] = useState('');
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

  // Chat message submit
  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    soundEngine.playPop();
    const userText = inputQuery.trim();
    setInputQuery('');

    const newMsg: MessageItem = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);

    // Fast intelligent reply
    setTimeout(() => {
      soundEngine.playSuccess();
      let reply = "Hiểu luôn! Lời khuyên của mình: Hãy tập trung giải quyết 1 việc duy nhất trong 25 phút bằng Zen Focus Mode (Shift+F). Làm xong tự nhiên bạn sẽ thấy nhẹ người liền! ✨";
      if (/mệt|oải|lười/i.test(userText)) {
        reply = "Nếu thấy oải, bật ngay chế độ Rest Day 🍵 đi bạn! Không ai có thể chạy 100% tốc độ mỗi ngày được. Sạc lại năng lượng đi, mai mình lại chiến tiếp! 🌿";
      } else if (/tiền|chi|mua/i.test(userText)) {
        reply = "Quy tắc vàng 50/30/20: 50% thiết yếu, 30% sở thích, 20% tích lũy. Nếu cái bạn định mua không tăng thêm hạnh phúc sau 3 ngày nữa thì đừng quẹt thẻ nhé! 💳";
      }

      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col h-[600px] max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center relative shadow-inner">
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
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                Trợ lý cuộc sống thông minh & thực tế của bạn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
              <span className="text-[9px] text-slate-500 px-1 font-mono">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendQuery} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Hỏi AI hoặc gõ việc bạn đang bế tắc..."
            className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
              inputQuery.trim()
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
