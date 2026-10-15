import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Zap, 
  Trophy, 
  Brain, 
  Layers, 
  Star, 
  Check, 
  BookOpen, 
  Wallet, 
  Clock, 
  Headphones, 
  ShieldCheck, 
  TrendingUp, 
  Bot, 
  ChevronRight, 
  Compass, 
  Target,
  Play,
  Award,
  ChevronDown,
  Activity,
  Smile,
  Shield,
  X,
  Share2
} from 'lucide-react';
import { useAppStore } from '../lib/store';

interface PublicLandingViewProps {
  onLoginClick: () => void;
}

export function PublicLandingView({ onLoginClick }: PublicLandingViewProps) {
  // Interactive Micro-Demo States
  const [demoLevel, setDemoLevel] = useState(2);
  const [demoXp, setDemoXp] = useState(80);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showStickyMobileCta, setShowStickyMobileCta] = useState(false);

  // Track scroll position for sticky mobile bottom CTA
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 450) {
        setShowStickyMobileCta(true);
      } else {
        setShowStickyMobileCta(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle task click in micro-demo
  const handleTaskToggle = (taskId: number, xpValue: number) => {
    if (completedTasks[taskId]) return; // Once completed, keep it completed

    const nextCompleted = { ...completedTasks, [taskId]: true };
    setCompletedTasks(nextCompleted);

    const newXp = Math.min(100, demoXp + xpValue);
    setDemoXp(newXp);

    if (newXp >= 100 && demoLevel === 2) {
      setTimeout(() => {
        setDemoLevel(3);
        setShowLevelUpModal(true);
      }, 400);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden w-full min-w-0 max-w-full">
      {/* Background Subtle Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] max-w-full h-[550px] bg-gradient-to-tr from-emerald-200/30 via-teal-100/20 to-transparent dark:from-emerald-950/20 dark:via-teal-950/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[1200px] -left-40 w-[600px] max-w-full h-[500px] bg-emerald-100/20 dark:bg-emerald-950/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[2400px] -right-40 w-[600px] max-w-full h-[500px] bg-amber-100/20 dark:bg-amber-950/10 blur-[140px] pointer-events-none rounded-full" />

      {/* ========================================================================= */}
      {/* TẦNG 1: FLOATING GLASSMORPHISM NAVBAR */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs shadow-emerald-500/20">
              <Zap className="w-5 h-5 fill-current stroke-[1.5]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Life<span className="text-emerald-600 dark:text-emerald-400">OS</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 uppercase tracking-wider">
                Gen-Z v2.0
              </span>
            </div>
          </div>

          {/* Nav Anchors (Laptop only) */}
          <div className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            <button 
              type="button" 
              onClick={() => scrollToSection('features')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Tính năng
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('science')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Phương pháp khoa học
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('gamification')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Gamification & Lumi</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('comparison')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Trước & Sau
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              type="button"
              onClick={onLoginClick}
              className="px-3 sm:px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
            <button 
              type="button"
              onClick={onLoginClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Bắt đầu miễn phí</span>
              <Zap className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* TẦNG 2: HERO SECTION + INTERACTIVE MICRO-DEMO */}
      {/* ========================================================================= */}
      <section className="relative pt-8 sm:pt-14 pb-14 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Cột Trái (6/12): Thông điệp & CTA */}
          <div className="lg:col-span-6 flex flex-col text-center lg:text-left items-center lg:items-start space-y-5">
            {/* Live Community Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>140+ Gen Z đang Deep Work ngay lúc này • Hệ điều hành cuộc sống v2.0</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Làm chủ cuộc sống như một tựa Game.{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Nâng cấp bản thân mỗi ngày
              </span>{' '}
              cùng LifeOS.
            </h1>

            {/* Sub-headline */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
              Tạm biệt sự trì hoãn và cảm giác quá tải. Kết hợp các phương pháp khoa học đỉnh cao (Quy tắc Tam Hợp, P.A.R.A, Pomodoro Lofi, Ebbinghaus) với hệ thống tiến cấp XP & Bé đồng hành Lumi.
            </p>

            {/* CTA Buttons Group */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
              <button
                type="button"
                onClick={onLoginClick}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-sm shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>🚀 Khởi tạo LifeOS của bạn (Miễn phí)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="w-full sm:w-auto px-5 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
                <span>Trải nghiệm thử không gian Zen</span>
              </button>
            </div>

            {/* Value Props & Trust Strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Miễn phí trải nghiệm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Đồng bộ đa thiết bị</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Thiết kế tối ưu cho Gen Z</span>
              </div>
            </div>
          </div>

          {/* Cột Phải (6/12): Khung Interactive Micro-Demo (Chạm thử lên cấp ngay trên Web) */}
          <div id="interactive-demo" className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
            <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all">
              
              {/* Header Card: Mascot Lumi & Status */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-2xl shadow-2xs">
                    ⭐
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        Bé Lumi
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                        Cấp {demoLevel} · {demoLevel === 2 ? 'Initiator' : 'Pathfinder'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      "Hãy tick thử nhiệm vụ để nạp năng lượng cho tớ nhé!"
                    </p>
                  </div>
                </div>

                {/* Streak Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold shadow-2xs">
                  <Flame className="w-4 h-4 fill-current text-amber-500" />
                  <span>7 ngày Streak</span>
                </div>
              </div>

              {/* Live XP Progress Bar */}
              <div className="my-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tiến trình lên Cấp {demoLevel + 1}</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                    {demoXp}/100 XP
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${demoXp}%` }}
                  />
                </div>
              </div>

              {/* Sample Tasks for Interactive Tick */}
              <div className="space-y-2.5 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Chạm vào nhiệm vụ để nhận XP</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">click to test</span>
                </div>

                {[
                  { id: 1, text: 'Hoàn thành 1 việc cốt lõi hôm nay', xp: 20 },
                  { id: 2, text: 'Tập trung sâu Pomodoro 25 phút', xp: 25 },
                  { id: 3, text: 'Uống đủ 2L nước & Ôn từ vựng', xp: 15 }
                ].map((task) => {
                  const isDone = Boolean(completedTasks[task.id]);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleTaskToggle(task.id, task.xp)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isDone
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50/80 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}>
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className={`text-xs sm:text-sm font-medium ${
                          isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {task.text}
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                        isDone 
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}>
                        +{task.xp} XP
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Hint footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>⚡ Cảm giác nhận thưởng tức thì (Instant Dopamine)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Live Demo</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Level Up Celebration Toast / Modal */}
      {showLevelUpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-3xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
              🎉
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                LEVEL UP! Bạn vừa lên Cấp 3!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Tuyệt vời! Bạn vừa trải nghiệm cảm giác thăng cấp thật. Đăng nhập hoặc tạo tài khoản để lưu giữ tiến trình này nhé!
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={onLoginClick}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer transition-colors"
              >
                Đăng ký & Lưu tiến trình ngay 🚀
              </button>
              <button
                type="button"
                onClick={() => setShowLevelUpModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Tiếp tục khám phá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TẦNG 3: BENTO GRID 6 VŨ KHÍ NĂNG SUẤT (FEATURE SHOWCASE) */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
            Hệ Sinh Thái Toàn Diện
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mọi công cụ bạn cần để bứt phá — Gọn trong một không gian duy nhất.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Thay thế hoàn toàn mớ hỗn độn 5-10 ứng dụng rời rạc bằng một bộ khung tinh gọn, chuẩn khoa học và tối ưu phản hồi Dopamine.
          </p>
        </div>

        {/* 12-Column Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          
          {/* Ô 1 (7/12 cột): Quy Tắc Tam Hợp & Quản lý P.A.R.A */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center">
                <Target className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Cốt Lõi Năng Suất</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Quy Tắc Tam Hợp (Rule of 3) & Cấu Trúc P.A.R.A
                </h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              Giải phóng 90% áp lực quá tải: Không cần cố làm 50 việc. Mỗi ngày chỉ chọn đúng <strong>3 việc cốt lõi</strong> có sức ảnh hưởng lớn nhất để hoàn thành trọn vẹn, kết hợp lưu trữ tài liệu theo Projects, Areas, Resources, Archives.
            </p>

            {/* Visual Mockup inside Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Tam Hợp Hôm Nay</span>
                <span className="text-emerald-600">3/3 Cốt Lõi</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold flex-1">1. Chốt bản thiết kế Sản phẩm v2</span>
                <span className="font-mono text-[10px] text-slate-400">Ưu tiên 1</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold flex-1">2. 2 Phiên Pomodoro học từ vựng IELTS</span>
                <span className="font-mono text-[10px] text-slate-400">Ưu tiên 2</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold flex-1">3. Cân đối chi tiêu và lập quỹ tuần</span>
                <span className="font-mono text-[10px] text-slate-400">Ưu tiên 3</span>
              </div>
            </div>
          </div>

          {/* Ô 2 (5/12 cột): Trạm Tập Trung Pomodoro & Lofi Chill */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center">
                  <Headphones className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Deep Work Zen</span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Pomodoro & Đài Phát Lofi
                  </h3>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Vào trạng thái tập trung sâu chỉ sau 60 giây nhờ bộ đếm chuẩn Pomodoro kết hợp âm thanh Ambient (Mưa đêm, Quán cà phê, Sóng biển Lofi).
              </p>
            </div>

            {/* Visual Timer Mockup */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl text-center space-y-2 border border-slate-800">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">TRẠM TẬP TRUNG</span>
              <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400">
                25:00
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Đang phát: Lofi Hip Hop Tokyo Night</span>
              </div>
            </div>
          </div>

          {/* Ô 3 (4/12 cột): Học tập & Spaced Repetition (Ebbinghaus) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Học Tập & Lặp Lại Ngắt Quãng
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Ứng dụng đường cong quên Ebbinghaus: Tự động nhắc ôn từ vựng ngoại ngữ và bài vở đúng lúc não bộ chuẩn bị quên để nhớ vĩnh viễn.
            </p>
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 font-mono">
              ✓ Flashcard active recall + Luyện gõ
            </div>
          </div>

          {/* Ô 4 (4/12 cột): Quản lý Tài chính & Kỷ luật Chi tiêu */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mb-4">
              <Wallet className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Quản Trị Tài Chính Gen Z
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Tạm biệt tình trạng "đầu tháng rủng rỉnh, cuối tháng ăn mì gói". Kiểm soát dòng tiền ròng, ngân sách hũ và hạn mức chi tiêu hàng tuần trong 30 giây.
            </p>
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 font-mono">
              ✓ Báo cáo thu chi tức thì, không cần Excel
            </div>
          </div>

          {/* Ô 5 (4/12 cột): Chỉ số Cân bằng Cuộc sống (5D Harmony) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Chỉ Số Cân Bằng 5D Harmony
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Đánh giá thực tế độ cân bằng cuộc sống qua 5 trục: Năng suất, Kỷ luật thói quen, Học tập phát triển, Sức khỏe tài chính và Tiến độ mục tiêu.
            </p>
            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 font-mono">
              ✓ Radar ngũ giác phản ánh trung thực
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* TẦNG 4: GAMIFICATION & BÉ ĐỒNG HÀNH LUMI (EMOTIONAL HOOK) */}
      {/* ========================================================================= */}
      <section id="gamification" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-amber-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-amber-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Cơ Chế Game Hóa Kỷ Luật Cá Nhân</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Không Còn Ép Buộc Kỷ Luật.{' '}
                <span className="text-emerald-600 dark:text-emerald-400">Biến Mỗi Ngày Thành Một Màn Chơi.</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Tâm lý học hành vi chỉ ra rằng: não bộ sẽ duy trì thói quen bền bỉ khi nhận được phản hồi tích cực ngay tức khắc. Cùng <strong>Bé Lumi</strong>, mỗi hành động nhỏ hoàn thành đều được cộng XP, tích Xu, nuôi dưỡng Chuỗi Streak và mở khóa vật phẩm thú vị.
              </p>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                  <div className="text-lg">⭐</div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bé Lumi Nhắc Nhở</h4>
                  <p className="text-[11px] text-slate-500">Người bạn nhỏ chữa lành, cổ vũ không phán xét.</p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                  <div className="text-lg">🛡️</div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Băng Bảo Vệ Streak</h4>
                  <p className="text-[11px] text-slate-500">Giữ chuỗi nguyên vẹn ngay cả ngày bận rộn.</p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                  <div className="text-lg">🏆</div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bảng Phong Thần</h4>
                  <p className="text-[11px] text-slate-500">Leo cấp cùng cộng đồng học tập & làm việc.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs sm:text-sm cursor-pointer hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Nuôi Bé Lumi & Bắt đầu Level 1 ⚡
                </button>
              </div>
            </div>

            {/* Right Mascot Showcase Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 mx-auto flex items-center justify-center text-5xl shadow-inner">
                  ⭐
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Bé Sao Nhỏ Lumi
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Cấp Bậc: Tinh Tú Kỷ Luật
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 italic">
                  "Chỉ cần bạn bước thêm một bước, Lumi sẽ thắp sáng ngôi sao cùng bạn!"
                </div>
                <div className="flex items-center justify-between text-xs font-semibold px-2">
                  <span className="text-slate-500">Tâm trạng hiện tại:</span>
                  <span className="text-amber-500 font-bold">Háo hức & Sẵn sàng 🔥</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TẦNG 5: SO SÁNH TRƯỚC & SAU KHI DÙNG LIFEOS (TRANSFORMATION) */}
      {/* ========================================================================= */}
      <section id="comparison" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
            Sự Thay Đổi Thực Tế
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sự Khác Biệt Giữa "Muốn Làm" Và "Thực Sự Làm Được"
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Nhìn lại cách bạn đang vận hành cuộc sống mỗi ngày. Đã đến lúc nâng cấp lên một hệ thống thông minh hơn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {/* Card Trái: Trước khi có LifeOS */}
          <div className="bg-slate-100/80 dark:bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Khi Chưa Dùng LifeOS (Hỗn Loạn & Quá Tải)</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Mở 10 app rời rạc: Notion ghi chép, Google Sheets chi tiêu, App bấm giờ, App thẻ từ vựng.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Danh sách to-do 50 việc dài dằng dặc, nhìn vào là thấy ngợp rồi nằm lướt TikTok.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Hừng hực khí thế được 3 ngày đầu, sau đó bỏ xó vì thiếu động lực và phản hồi vui vẻ.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Mù mờ về tài chính cá nhân, không rõ mình đang tiến bộ hay thụt lùi.</span>
              </li>
            </ul>
          </div>

          {/* Card Phải: Khi Dùng LifeOS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500 dark:border-emerald-500 shadow-xl shadow-emerald-500/10 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Khuyên Dùng Cho Gen Z
            </div>

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Khi Chuyển Sang LifeOS (Gọn Gàng & Truyền Lửa)</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>1 màn hình duy nhất — Đồng bộ từ việc học, Pomodoro, tài chính đến mục tiêu năm.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>Quy tắc Tam Hợp: Tập trung giải quyết dứt điểm 3 việc quan trọng nhất mỗi ngày.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>Bé Lumi nhắc nhở dịu dàng, nhận XP thăng hạng tức thì, duy trì chuỗi Streak cả tháng.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>Chỉ số 5D Harmony phản ánh trung thực toàn diện sức khỏe học tập và cuộc sống.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TẦNG 6: BANNER TRUYỀN LỬA CUỐI TRANG & FOOTER */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-tr from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-8 sm:p-12 lg:p-16 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Thời Khắc Để Nâng Cấp Bản Thân</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            "Hôm nay của 1 năm sau bắt đầu từ quyết định của bạn ngay lúc này."
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Tham gia cùng hàng nghìn bạn trẻ đang biến kỷ luật thành niềm vui mỗi ngày cùng LifeOS.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onLoginClick}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-sm sm:text-base cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              ⚡ Bắt đầu hành trình Level 1 ngay hôm nay — Hoàn toàn miễn phí
            </button>
          </div>

          <p className="text-[11px] text-slate-400 pt-2">
            Không cần thẻ tín dụng • Khởi tạo tài khoản trong 30 giây • Đồng bộ trên điện thoại & máy tính
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">LifeOS v2.0</span>
            <span>·</span>
            <span>Hệ Điều Hành Cuộc Sống Cho Gen Z</span>
          </div>

          <div className="flex items-center gap-6">
            <button type="button" onClick={() => scrollToSection('features')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Tính năng
            </button>
            <button type="button" onClick={() => scrollToSection('gamification')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Bé Lumi
            </button>
            <button type="button" onClick={onLoginClick} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Đăng nhập
            </button>
          </div>

          <div>
            © {new Date().getFullYear()} LifeOS Team. Thiết kế với sự tận tâm.
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM MOBILE CTA (Chỉ hiện trên điện thoại khi cuộn sâu) */}
      {/* ========================================================================= */}
      {showStickyMobileCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="text-base">⭐</span>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                Sẵn sàng nâng cấp?
              </span>
              <span className="text-[10px] text-slate-500">Miễn phí trải nghiệm</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLoginClick}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Bắt đầu ngay</span>
            <Zap className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}
