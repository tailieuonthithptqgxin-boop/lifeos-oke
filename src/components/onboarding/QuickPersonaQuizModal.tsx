import React, { useState } from 'react';
import { 
  X, Sparkles, Check, ArrowRight, ArrowLeft, Target, 
  Palette, Heart, Trophy, BookOpen, Briefcase, Wallet, Shield
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { vibeThemeEngine, VibeThemeId, VIBE_THEMES } from '../../lib/vibeThemeEngine';
import { companionEngine, CompanionMascotId, MASCOT_PROFILES } from '../../lib/companionEngine';

interface QuickPersonaQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickPersonaQuizModal({ isOpen, onClose }: QuickPersonaQuizModalProps) {
  const { addTask, currentUser } = useAppStore();
  const userId = currentUser?.id;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedGoal, setSelectedGoal] = useState<'study' | 'work' | 'finance' | 'discipline'>('study');
  const [selectedTheme, setSelectedTheme] = useState<VibeThemeId>('cyber_emerald');
  const [selectedMascot, setSelectedMascot] = useState<CompanionMascotId>('lumi');

  if (!isOpen) return null;

  const handleFinishQuiz = () => {
    soundEngine.playSuccess();
    triggerConfetti();

    // 1. Apply chosen Vibe Theme
    vibeThemeEngine.setTheme(selectedTheme);

    // 2. Apply chosen Mascot Companion
    companionEngine.saveSettings({ mascotId: selectedMascot }, userId);

    // 3. Auto-seed 3 beginner tasks according to goal
    const goalSeedMap: Record<string, string[]> = {
      study: [
        'Học 10 từ vựng Spaced Repetition hôm nay',
        '25 phút Zen Focus cho bài giảng trọng tâm',
        'Tổng kết 3 ý chính cần nhớ vào sổ tay'
      ],
      work: [
        'Xử lý dứt điểm email & nhiệm vụ khẩn cấp nhất',
        'Lên khung kế hoạch cho dự án tuần',
        'Đánh dấu hoàn thành 3 việc trong Daily Trifecta'
      ],
      finance: [
        'Ghi nhận chi tiêu các bữa ăn hôm nay',
        'Kiểm tra lại số dư các tài khoản ví',
        'Tránh order đồ ăn/shopping ban đêm'
      ],
      discipline: [
        'Duy trì uống đủ 2L nước hôm nay',
        'Bật Zen Focus 20 phút không chạm điện thoại',
        'Đi ngủ trước 23h30 để tái tạo năng lượng'
      ]
    };

    const seeds = goalSeedMap[selectedGoal] || goalSeedMap.study;
    const taskIds: string[] = [];

    seeds.forEach(title => {
      try {
        const id = 'task_' + Math.random().toString(36).substring(2, 9);
        addTask({
          id,
          title,
          status: 'Chưa làm',
          priority: 'Cao',
          dueDate: new Date().toISOString().split('T')[0],
          projectId: null,
          notes: 'Nhiệm vụ khởi động từ Persona Quiz'
        });
        taskIds.push(id);
      } catch {}
    });

    // Populate Daily Trifecta
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`lifeos_trifecta_${todayStr}`, JSON.stringify(taskIds.slice(0, 3)));
    localStorage.setItem(`lifeos_persona_quiz_${userId}`, 'true');

    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col my-auto">
        {/* Top Progress bar */}
        <div className="w-full h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Onboarding 15 Giây · Bước {step}/3
            </span>
            <h2 className="text-base sm:text-lg font-black text-white">
              Định Hình Persona Của Bạn 🎯
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 min-h-[320px] flex flex-col justify-center">
          {/* STEP 1: Main Goal */}
          {step === 1 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
              <p className="text-xs text-slate-300 font-medium">
                Mục tiêu sống còn lúc này của bạn là gì?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'study', label: 'Cày Thi & Ngoại Ngữ', desc: 'JLPT, HSK, Đại học, Flashcard', icon: BookOpen },
                  { id: 'work', label: 'Năng Suất & Công Việc', desc: 'Dự án, Deadline, Task quản trị', icon: Briefcase },
                  { id: 'finance', label: 'Tài Chính & Tích Lũy', desc: 'Quản lý ví, Tiết kiệm, Ngân sách', icon: Wallet },
                  { id: 'discipline', label: 'Kỷ Luật & Chữa Lành', desc: 'Habits, Deep Work, Chống trì hoãn', icon: Shield }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = selectedGoal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setSelectedGoal(item.id as any);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSel
                          ? 'bg-emerald-500/20 border-emerald-500 text-white font-black ring-1 ring-emerald-500/40'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${isSel ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{item.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Vibe Theme */}
          {step === 2 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
              <p className="text-xs text-slate-300 font-medium">
                Chọn Vibe phong cách mà bạn cảm thấy kết nối nhất:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(VIBE_THEMES) as VibeThemeId[]).map((tId) => {
                  const theme = VIBE_THEMES[tId];
                  const isSel = selectedTheme === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setSelectedTheme(tId);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSel
                          ? `${theme.cardBorder} bg-slate-800 text-white font-black ring-2 ring-emerald-400/50`
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{theme.emoji}</span>
                        <div>
                          <span className="text-xs font-bold block">{theme.name}</span>
                          <span className="text-[10px] text-slate-400 block">{theme.vibe}</span>
                        </div>
                      </div>
                      <div 
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Starter Mascot */}
          {step === 3 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
              <p className="text-xs text-slate-300 font-medium">
                Chọn Linh Thú đầu tiên đồng hành cùng bạn:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['lumi', 'bunny', 'kitsu', 'nova'] as CompanionMascotId[]).map((mId) => {
                  const m = MASCOT_PROFILES[mId];
                  const isSel = selectedMascot === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setSelectedMascot(mId);
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSel
                          ? 'bg-emerald-500/20 border-emerald-500 text-white font-black ring-1 ring-emerald-500/40'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-3xl">{m.avatar}</span>
                      <span className="text-xs font-bold truncate w-full">{m.name}</span>
                      <span className="text-[9px] text-slate-400 truncate w-full">{m.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Success Result */}
          {step === 4 && (
            <div className="text-center py-4 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">
                Persona Của Bạn Đã Sẵn Sàng! 🚀
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Theme Vibe đã được áp dụng, Linh thú đã thức tỉnh, và 3 nhiệm vụ khởi động đã nằm gọn trong Daily Trifecta.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  Bắt đầu ngay hôm nay ✨
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step < 4 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => {
                soundEngine.playPop();
                setStep(s => Math.max(1, s - 1) as any);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                step === 1 ? 'opacity-20 cursor-not-allowed text-slate-600' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setStep(s => Math.min(3, s + 1) as any);
                }}
                className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishQuiz}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Hoàn Tất & Khởi Động 🎯</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
