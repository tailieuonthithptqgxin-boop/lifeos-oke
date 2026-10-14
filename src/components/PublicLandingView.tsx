import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, CheckCircle2, Sparkles, Flame, Zap, Trophy, Brain, Layers, 
  Star, Check, BookOpen, Wallet, Clock, Gamepad2, Headphones, ShieldCheck, 
  TrendingUp, Heart, ChevronRight, Award, Compass, RefreshCw
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';

interface PublicLandingViewProps {
  onLoginClick: () => void;
}

export function PublicLandingView({ onLoginClick }: PublicLandingViewProps) {
  const { setCurrentView } = useAppStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<'overview' | 'companion' | 'study' | 'finance' | 'focus'>('overview');
  const [completedDemoTask, setCompletedDemoTask] = useState(false);
  const [demoStreak, setDemoStreak] = useState(14);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiCall('/api/payments/plans');
        if (res && res.success && Array.isArray(res.plans)) {
          setPlans(res.plans);
        }
      } catch (e) {}
    };
    fetchPlans();
  }, []);

  const p1m = plans.find(p => p.id === 'PERSONAL_1M');
  const p3m = plans.find(p => p.id === 'PERSONAL_3M');
  const pTeam = plans.find(p => p.id === 'TEAM_1M' || p.id === 'TEAM');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-pink-500 selection:text-white relative overflow-hidden">
      {/* Background ambient mesh gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[650px] bg-gradient-to-tr from-violet-600/25 via-pink-600/20 to-amber-400/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[850px] -left-40 w-[650px] h-[500px] bg-indigo-600/15 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-[1500px] -right-40 w-[600px] h-[550px] bg-pink-500/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Modern Glass Navbar */}
      <nav className="border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-300 p-0.5 shadow-lg shadow-pink-500/25 animate-pulse-soft">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-white leading-none">
                  Life<span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">OS</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-xs">
                  Cute ✨
                </span>
              </div>
              <span className="text-[10px] font-bold text-violet-400 tracking-wider uppercase">Gen Z Edition</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-300">
            <a href="#features" className="hover:text-pink-300 transition-colors flex items-center gap-1.5">
              <span>Tính năng Bento</span>
              <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-md font-mono">5-in-1</span>
            </a>
            <a href="#companion" className="hover:text-purple-300 transition-colors">Linh thú AI 🐾</a>
            <a href="#preview" className="hover:text-amber-300 transition-colors">Xem trước App 📱</a>
            <a href="#pricing" className="hover:text-rose-300 transition-colors">Bảng giá chỉ 15k 🎟️</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onLoginClick}
              className="px-4 sm:px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold border border-white/15 backdrop-blur-md transition-all btn-squishy cursor-pointer"
            >
              Đăng nhập
            </button>
            <button 
              onClick={onLoginClick}
              className="px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-pink-500/30 transition-all btn-squishy flex items-center gap-1.5 cursor-pointer"
            >
              <span>Trải nghiệm</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 text-center max-w-5xl mx-auto">
        {/* Live Social Proof Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-violet-500/15 border border-pink-400/30 text-pink-300 text-xs font-black mb-6 shadow-inner animate-pulse-soft">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Hệ Điều Hành Cuộc Sống Cute & Thông Minh Cho Gen Z</span>
        </div>

        {/* Catchy & Emotional Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] mb-5">
          Biến Cuộc Sống Thành <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            Game RPG Cực Cuốn & Kỷ Luật ✨
          </span>
        </h1>

        {/* Engaging Subtext targeting pain points */}
        <p className="text-sm sm:text-base md:text-lg text-slate-300/90 mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
          Tạm biệt Notion phức tạp hay ghi chú rời rạc! LifeOS gom trọn <span className="text-pink-300 font-bold">Học tập & Thi cử</span>, <span className="text-emerald-300 font-bold">Quản lý Chi tiêu</span>, <span className="text-amber-300 font-bold">Rèn Thói quen</span> và <span className="text-violet-300 font-bold">Học Từ vựng Spaced Repetition</span> vào một nơi siêu đáng yêu cùng <span className="text-white font-bold underline decoration-pink-400 decoration-wavy">Linh thú AI đồng hành</span>.
        </p>

        {/* Dual Primary Call-to-Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md sm:max-w-none mx-auto mb-10">
          <button 
            onClick={onLoginClick}
            className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white text-sm sm:text-base font-black rounded-full shadow-xl shadow-pink-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer btn-squishy"
          >
            <span>Bắt đầu trải nghiệm Miễn phí ✨</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <a 
            href="#pricing"
            className="w-full sm:w-auto px-6 py-3.5 sm:px-7 sm:py-4 bg-white/10 hover:bg-white/15 text-pink-200 hover:text-white text-sm sm:text-base font-bold rounded-full border border-pink-400/30 backdrop-blur-md transition-all flex items-center justify-center gap-2 btn-squishy cursor-pointer"
          >
            <span>Bảng giá siêu hạt dẻ chỉ 15k 🎟️</span>
          </a>
        </div>

        {/* Quick Trust Highlights */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Không cần cài đặt rườm rà</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
            <span>Giao diện Cute chữa lành áp lực</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Đồng bộ Cloud Realtime</span>
          </div>
        </div>
      </section>

      {/* LIVE INTERACTIVE APP PREVIEW (Đồng bộ 100% với giao diện bên trong) */}
      <section id="preview" className="px-4 sm:px-6 max-w-6xl mx-auto pb-20">
        <div className="relative rounded-3xl sm:rounded-[36px] bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950 border border-purple-500/30 shadow-2xl shadow-purple-950/60 p-4 sm:p-7 backdrop-blur-xl">
          {/* Top Mockup Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-bold text-slate-400 ml-2 hidden sm:inline">LifeOS Workspace · Không gian sống & học tập</span>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-950/80 border border-white/10 rounded-2xl overflow-x-auto max-w-full">
              {[
                { id: 'overview', label: '📊 Tổng quan', icon: Layers },
                { id: 'companion', label: '🐾 Linh thú Mochi', icon: Heart },
                { id: 'study', label: '📚 Học tập & Thi', icon: Brain },
                { id: 'finance', label: '💰 Ví 50/30/20', icon: Wallet },
                { id: 'focus', label: '⏳ Pomodoro Lofi', icon: Headphones },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    activePreviewTab === tab.id
                      ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-md shadow-pink-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="pt-6">
            {activePreviewTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Left Card: Linh thú Dopamine & Quests */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-950/40 to-slate-900 border border-violet-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-400 to-amber-300 p-0.5 shadow-md">
                          <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-xl">
                            🐱
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">Mèo Mochi</span>
                            <span className="text-[10px] bg-pink-500/30 text-pink-300 font-extrabold px-1.5 py-0.2 rounded-full">Lv. 14</span>
                          </div>
                          <span className="text-xs text-violet-300 font-medium">Linh thú Trợ lý AI</span>
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        Vui vẻ 💕
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-violet-900/30 border border-violet-500/20 text-xs text-violet-200 mb-4 leading-relaxed">
                      "Hôm nay cậu làm việc năng suất lắm nè! Hãy uống một ngụm nước và làm bài tập nốt nhé ✨"
                    </div>

                    {/* Interactive Task */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhiệm vụ hôm nay (Daily Quest)</div>
                      <div 
                        onClick={() => {
                          setCompletedDemoTask(!completedDemoTask);
                          if (!completedDemoTask) setDemoStreak(demoStreak + 1);
                          else setDemoStreak(demoStreak - 1);
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          completedDemoTask 
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                            : 'bg-slate-950/60 border-white/10 hover:border-pink-500/40 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            completedDemoTask ? 'bg-emerald-500 border-emerald-400' : 'border-slate-500'
                          }`}>
                            {completedDemoTask && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                          <span className={`text-xs ${completedDemoTask ? 'line-through text-slate-400' : 'font-medium'}`}>
                            Ôn 20 từ vựng Oxford 3000
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-amber-400">+50 XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tiến trình Level:</span>
                    <span className="font-mono font-bold text-pink-400">750 / 1000 XP</span>
                  </div>
                </div>

                {/* Center Card: Ngũ giác Cân bằng Cuộc sống */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-sm text-white">Chỉ Số Sống Cân Bằng</span>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                        94 / 100
                      </span>
                    </div>

                    <div className="space-y-3 my-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Công việc & Học tập</span>
                          <span className="text-violet-400 font-mono">92%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full w-[92%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Tài chính kỷ luật (50/30/20)</span>
                          <span className="text-emerald-400 font-mono">88%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[88%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Thói quen & Sức khỏe</span>
                          <span className="text-pink-400 font-mono">96%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full w-[96%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium">Trạng thái:</span>
                    <span className="font-bold text-emerald-400">Đạt trạng thái Flow cực Chill 🌿</span>
                  </div>
                </div>

                {/* Right Card: Streak Kỷ Luật & Quỹ Tài Chính */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
                        <span className="font-bold text-sm text-white">Chuỗi Streak Kỷ Luật</span>
                      </div>
                      <span className="text-xs bg-amber-500/20 text-amber-300 font-black px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        {demoStreak} Ngày Liên Tục 🔥
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Rèn luyện thói quen dậy sớm, đọc sách và học ngoại ngữ liên tục để không bị reset chuỗi ngọn lửa.
                    </p>

                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-2 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Hũ tích lũy Mua Laptop:</span>
                        <span className="font-mono font-bold text-emerald-400">12.500.000 ₫</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[83%]" />
                      </div>
                      <div className="text-[10px] text-right text-emerald-300 font-semibold">Đạt 83% mục tiêu</div>
                    </div>
                  </div>

                  <button 
                    onClick={onLoginClick}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Khám phá toàn bộ tính năng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activePreviewTab === 'companion' && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-950/40 via-pink-950/30 to-slate-900 border border-pink-500/30 flex flex-col md:flex-row items-center gap-6">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-pink-500 to-amber-300 p-1 shrink-0 shadow-xl shadow-pink-500/20">
                  <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-5xl">
                    🐱
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[11px] font-black mb-2">
                    Dopamine Pet · Độc quyền LifeOS
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Linh Thú AI Đồng Hành Cùng Bạn 24/7</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Không còn cảm giác cô đơn khi tự học hay làm việc một mình. Linh thú AI sẽ tự nhắc nhở khi bạn quá giờ làm việc, động viên khi bạn buồn chán, và chúc mừng bạn nhảy cấp XP mỗi khi hoàn thành mục tiêu.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🐾 Chọn Mèo Mochi, Cún Shiba, Cáo Lửa...</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">💬 Tương tác giọng điệu Gen Z</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🛡️ Chống ngợp Overthinking</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'study' && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-400 p-1 shrink-0 flex items-center justify-center text-4xl shadow-lg">
                  📖
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-black mb-2">
                    SuperMemo SM-2 & Học Ngoại Ngữ
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Ôn Thi GPA, JLPT, HSK & 3000 Từ Vựng Oxford</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Hệ thống Flashcards Spaced Repetition tự động tính toán chu kỳ quên và đưa từ vựng ra đúng thời điểm vàng để bạn ghi nhớ vĩnh viễn vào não bộ mà không tốn công học vẹt.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">📚 3000 Oxford Cốt Lõi</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🇯🇵 JLPT N5 đến N1</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🇨🇳 HSK 1 đến 6</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🎓 Đếm ngược ngày thi & GPA</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'finance' && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 shrink-0 flex items-center justify-center text-4xl shadow-lg">
                  💳
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black mb-2">
                    Tài Chính Cá Nhân 50/30/20
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Quản Lý Đa Ví & Hũ Tiết Kiệm Tự Động</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Dễ dàng theo dõi Dòng tiền ròng (Net Cashflow), hạn mức chi tiêu hàng tháng, luật 72h kiềm chế mua sắm bốc đồng và quét mã VietQR tự động ghi sổ trong tích tắc.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🏦 Hỗ trợ đa tài khoản (MoMo, Ngân hàng, Tiền mặt)</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">📊 Báo cáo biểu đồ chi tiết</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'focus' && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-pink-950/40 via-rose-950/30 to-slate-900 border border-pink-500/30 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-400 p-1 shrink-0 flex items-center justify-center text-4xl shadow-lg">
                  🎧
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[11px] font-black mb-2">
                    Zen Focus Room · Pomodoro Chill
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Deep Work Cực Đã Cùng Âm Nhạc Lofi</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Chế độ tập trung Zen Mode loại bỏ 100% sao nhãng, tích hợp bộ đếm Pomodoro 25/5 hoặc 50/10 cùng danh sách phát nhạc Lofi mượt mà giúp bạn học và làm việc bền bỉ suốt hàng giờ.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">🎵 Nhạc Lofi & Tiếng mưa/sóng biển</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-medium">⚡ Ghi nhận số phút Deep Work</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Showcase */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Mọi Thứ Bạn Cần Trong Một Ứng Dụng</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            5 Phân Hệ Sống Khép Kín · Không Thừa, Không Thiếu
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
            Được thiết kế tinh gọn theo tâm lý Gen Z: Giao diện trực quan, màu sắc pastel thư giãn, không làm bạn ngợp hay kiệt sức.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Study & Vocab */}
          <div className="p-7 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-pink-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center mb-5">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Học Ngoại Ngữ & Thi Cử</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
              Kho 3000 từ vựng Oxford, bộ đề JLPT tiếng Nhật, HSK tiếng Trung kèm thuật toán ngắt quãng Spaced Repetition và công cụ tính điểm tín chỉ GPA.
            </p>
            <div className="text-xs font-bold text-pink-400 flex items-center gap-1">
              <span>Học nhớ sâu, không quên kiến thức</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Finance 50/30/20 */}
          <div className="p-7 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-5">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tài Chính & Hũ Tiết Kiệm</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
              Chia tự động theo quy tắc 50/30/20, cài đặt hạn mức chi tiêu, theo dõi dòng tiền ròng và kiểm soát mua sắm tránh viêm màng túi cuối tháng.
            </p>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span>Kiểm soát tài chính rõ ràng</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Gamification & RPG */}
          <div className="p-7 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-5">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Game Hóa Cuộc Sống (RPG)</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
              Mỗi thói quen tốt hoàn thành là một lần nhận điểm XP, thăng cấp từ Tân thủ đến Đại hiệp, sưu tầm danh hiệu và giữ chuỗi Streak ngọn lửa bất bại.
            </p>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <span>Biến kỷ luật thành niềm vui</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span>Đầu Tư Cho Bản Thân Với Giá Siêu Hạt Dẻ</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Chỉ Bằng Một Cốc Trà Đá Mỗi Ngày ☕
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm">
            Kích hoạt tức thì qua chuyển khoản mã VietQR tự động. Không tự động trừ tiền âm thầm, kiểm soát tuyệt đối.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Gói 1 Tháng */}
          <div className="bg-slate-900/80 rounded-3xl p-7 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Gói Cá Nhân (1 Tháng)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">Cơ bản</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Dành cho bạn muốn trải nghiệm phương pháp sống mới.</p>
              <div className="text-3xl font-black text-white mb-6">
                {p1m?.pricing?.monthly?.displayPrice || `${(p1m?.price || 15000).toLocaleString('vi-VN')} ₫`} <span className="text-xs text-slate-400 font-normal">/ {p1m?.billingCycle || '30 ngày'}</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-pink-400 shrink-0" /> Mở khóa toàn bộ tính năng LifeOS</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-pink-400 shrink-0" /> Linh thú AI đồng hành (Mèo Mochi)</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-pink-400 shrink-0" /> Quản lý Công việc, Lịch & Dự án</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-pink-400 shrink-0" /> 3000 Từ vựng Oxford & Ngoại ngữ</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer btn-squishy"
            >
              Đăng ký Gói 1 Tháng (15k)
            </button>
          </div>

          {/* Gói 3 Tháng - Hot */}
          <div className="relative bg-gradient-to-b from-violet-950/70 via-slate-900 to-slate-950 rounded-3xl p-7 border-2 border-pink-500 shadow-2xl shadow-pink-500/25 flex flex-col justify-between scale-100 md:scale-105 z-10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 text-white font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{p3m?.badge || 'Phổ Biến Nhất · Khuyên Dùng'}</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{p3m?.name || 'Cá Nhân (3 Tháng)'}</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-300">Tiết kiệm 20%</span>
              </div>
              <p className="text-xs text-purple-200 mb-6">{p3m?.description || 'Đủ 90 ngày để biến kỷ luật thành bản năng vĩnh viễn.'}</p>
              <div className="text-3xl font-black text-white mb-6">
                {p3m?.pricing?.monthly?.displayPrice || `${(p3m?.price || 40000).toLocaleString('vi-VN')} ₫`} <span className="text-xs text-slate-400 font-normal">/ {p3m?.billingCycle || '90 ngày'}</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-200 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Toàn bộ quyền lợi gói Pro Edition</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Sử dụng trọn vẹn trong suốt 90 ngày</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Mở khóa tất cả Linh thú AI cao cấp</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Sao lưu tự động & Hỗ trợ ưu tiên 24/7</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 text-white font-black text-xs shadow-lg shadow-pink-500/30 transition-all cursor-pointer btn-squishy"
            >
              Chọn Gói Tiết Kiệm ({((p3m?.price || 40000) / 1000)}k / 3 Tháng)
            </button>
          </div>

          {/* Gói Team */}
          <div className="bg-slate-900/80 rounded-3xl p-7 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{pTeam?.name || 'Gói Team (5 Người)'}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">Nhóm học</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">{pTeam?.description || 'Dành cho nhóm bạn cùng học tập, giữ streak thi đua.'}</p>
              <div className="text-3xl font-black text-white mb-6">
                {pTeam?.pricing?.monthly?.displayPrice || `${(pTeam?.price || 50000).toLocaleString('vi-VN')} ₫`} <span className="text-xs text-slate-400 font-normal">/ {pTeam?.billingCycle || '30 ngày'}</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-violet-400 shrink-0" /> Cho nhóm tối đa 5 thành viên</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-violet-400 shrink-0" /> Mỗi người sở hữu tài khoản Pro riêng</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-violet-400 shrink-0" /> Bảng xếp hạng XP nội bộ nhóm</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-violet-400 shrink-0" /> Không gian ghi chú dự án chung</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer btn-squishy"
            >
              Đăng ký Gói Nhóm (50k)
            </button>
          </div>
        </div>
      </section>

      {/* Modern Minimal Footer */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-xs">
            L
          </div>
          <span className="font-bold text-slate-400">LifeOS Platform · Cute Gen Z Edition</span>
          <span>© 2026. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-slate-300 transition-colors">Tính năng</a>
          <a href="#preview" className="hover:text-slate-300 transition-colors">Xem trước</a>
          <a href="#pricing" className="hover:text-slate-300 transition-colors">Bảng giá</a>
          <button onClick={onLoginClick} className="hover:text-pink-300 font-bold transition-colors cursor-pointer">Đăng nhập</button>
        </div>
      </footer>
    </div>
  );
}
