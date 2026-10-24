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
  Pause,
  Award,
  ChevronDown,
  Activity,
  Smile,
  Shield,
  X,
  Share2,
  Menu,
  Smartphone,
  Laptop,
  Lock,
  HelpCircle,
  Users,
  BarChart3,
  Bell,
  Eye,
  Volume2,
  Music,
  Calendar as CalendarIcon,
  CheckSquare,
  BookmarkCheck,
  FolderKanban,
  FileText,
  BadgePercent,
  RefreshCw,
  Gift
} from 'lucide-react';
import { LiveMascotCharacter } from './companion/LiveMascotCharacter';

interface PublicLandingViewProps {
  onLoginClick: (initialMode?: 'login' | 'register') => void;
}

export function PublicLandingView({ onLoginClick }: PublicLandingViewProps) {
  // Mobile Navigation Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Micro-Demo States
  const [demoLevel, setDemoLevel] = useState(2);
  const [demoFocusPlaying, setDemoFocusPlaying] = useState(false);
  const [demoFocusSeconds, setDemoFocusSeconds] = useState(25 * 60);
  const [demoXp, setDemoXp] = useState(80);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [mascotMood, setMascotMood] = useState<'idle' | 'happy' | 'celebrate' | 'excited'>('happy');

  // Sticky Mobile Bottom CTA
  const [showStickyMobileCta, setShowStickyMobileCta] = useState(false);

  // Interactive Product Showcase Active Tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'tasks' | 'study' | 'focus' | 'finance' | 'goals'>('tasks');

  // FAQ Accordion State (index of open question)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Listen to scroll to show sticky mobile CTA
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 480) {
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
    if (completedTasks[taskId]) return;

    const nextCompleted = { ...completedTasks, [taskId]: true };
    setCompletedTasks(nextCompleted);

    const newXp = Math.min(100, demoXp + xpValue);
    setDemoXp(newXp);
    setMascotMood('excited');

    if (newXp >= 100 && demoLevel === 2) {
      setTimeout(() => {
        setDemoLevel(3);
        setMascotMood('celebrate');
        setShowLevelUpModal(true);
      }, 350);
    } else {
      setTimeout(() => {
        setMascotMood('happy');
      }, 1200);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden w-full min-w-0 max-w-full">
      {/* Background Subtle Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] sm:w-[1100px] max-w-full h-[450px] sm:h-[600px] bg-gradient-to-tr from-emerald-200/25 via-teal-100/15 to-transparent dark:from-emerald-950/20 dark:via-teal-950/15 blur-[100px] sm:blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[1300px] -left-32 w-[500px] max-w-full h-[500px] bg-emerald-100/20 dark:bg-emerald-950/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[2800px] -right-32 w-[500px] max-w-full h-[500px] bg-amber-100/15 dark:bg-amber-950/10 blur-[130px] pointer-events-none rounded-full" />

      {/* ========================================================================= */}
      {/* 01. MODERN STICKY NAVBAR (MOBILE-FIRST) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Trial Badge */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none py-1 group" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img 
              src="/logo.png" 
              alt="LifeOS Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform" 
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                Life<span className="text-emerald-600 dark:text-emerald-400">OS</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 uppercase tracking-wide">
                <Gift className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                <span>Trial 7 Ngày</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button 
              type="button" 
              onClick={() => scrollToSection('features')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
            >
              Tính năng
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('showcase')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
            >
              Giao diện thật
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('science')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
            >
              Phương pháp khoa học
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('gamification')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1 flex items-center gap-1.5"
            >
              <span>Bé Lumi & Game hóa</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('pricing')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
            >
              Bảng giá
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection('faq')} 
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
            >
              FAQ
            </button>
          </nav>

          {/* Right Action Group */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Login button */}
            <button 
              type="button"
              onClick={() => onLoginClick('login')}
              className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>

            {/* Primary CTA button (starts 7-day free trial directly in register mode) */}
            <button 
              type="button"
              onClick={() => onLoginClick('register')}
              className="min-h-[36px] sm:min-h-[40px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold shadow-xs shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Dùng thử 7 ngày</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800 shrink-0"
              aria-label="Mở menu điều hướng"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation Sheet */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-3 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 pt-1">
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 text-left cursor-pointer"
              >
                <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Tính năng</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('showcase')}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 text-left cursor-pointer"
              >
                <Eye className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Giao diện thật</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('science')}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 text-left cursor-pointer"
              >
                <Brain className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Khoa học & PARA</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('gamification')}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 text-left cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Bé Lumi & XP</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 text-left cursor-pointer"
              >
                <BadgePercent className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bảng giá</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 text-left cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Câu hỏi (FAQ)</span>
              </button>
            </div>

            {/* Mobile direct CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick('register');
                }}
                className="w-full min-h-[48px] py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30"
              >
                <span>Bắt đầu dùng thử 7 ngày miễn phí</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 02. HERO SECTION — THUYẾT PHỤC TRONG 3-5 GIÂY ĐẦU (MOBILE-FIRST) */}
      {/* ========================================================================= */}
      <section className="relative pt-6 sm:pt-12 lg:pt-16 pb-12 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Cột Trái: Value Proposition & Dual CTAs */}
          <div className="lg:col-span-6 flex flex-col text-center lg:text-left items-center lg:items-start space-y-4 sm:space-y-6">
            
            {/* Live Trust & 7-Day Trial Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Hệ điều hành cuộc sống Gen Z • Zero-Setup Engine v2.4</span>
            </div>

            {/* Main Headline (Clean, Punchy, High Impact) */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.18]">
              Làm chủ ngày dài.{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                Thăng hạng cuộc sống
              </span>{' '}
              như một tựa Game.
            </h1>

            {/* Subheadline (Resolves Pain Point) */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
              Gom trọn Quản lý nhiệm vụ, Lịch biểu, Pomodoro Lofi và Học từ vựng FSRS vào một không gian 0ms duy nhất cùng Bé Lumi đồng hành truyền cảm hứng.
            </p>

            {/* CTA Buttons Group (Mobile touch target >= 48px) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => onLoginClick('register')}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>⚡ Bắt đầu trải nghiệm ngay</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('showcase')}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Xem giao diện thật</span>
              </button>
            </div>

            {/* 4 Trust Pillars (Zero Mock, 100% Truthful) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2.5 pt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Khởi động trong 5 giây</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Không cần thẻ ngân hàng</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Bảo mật & Mã hóa dữ liệu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Đồng bộ Điện thoại & PC</span>
              </div>
            </div>
          </div>

          {/* Cột Phải: Interactive Micro-Demo (Bento Grid Architecture) */}
          <div className="lg:col-span-6 w-full max-w-lg mx-auto lg:max-w-none">
            <div className="relative bg-white/95 dark:bg-[#141E30]/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-white/[0.08] p-5 sm:p-6 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-4">
              
              {/* BENTO CARD 1: MASCOT STATUS & STREAK */}
              <div className="bg-slate-50/90 dark:bg-[#0B1120]/70 border border-slate-200/70 dark:border-white/[0.06] rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center shrink-0">
                    <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                      <LiveMascotCharacter mood={mascotMood} size="compact" showAura={false} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        Bé Lumi
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        CẤP {demoLevel} · {demoLevel === 2 ? 'Initiator' : 'Champion'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {demoLevel === 2 ? '"Chạm thử nhiệm vụ để nạp XP cho tớ nhé!"' : '"Hoan hô! Bạn vừa thăng cấp thật rồi!"'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold shrink-0">
                  <Flame className="w-4 h-4 fill-current text-amber-500" />
                  <span>7 Ngày</span>
                </div>
              </div>

              {/* LIVE XP PROGRESS BAR */}
              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tiến trình thăng Cấp {demoLevel + 1}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {demoXp} / 100 XP
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200/70 dark:bg-white/[0.08] rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${demoXp}%` }}
                  />
                </div>
              </div>

              {/* BENTO CARD 2: FOCUS ROOM & SYNERGY MINI-STATION */}
              <div className="bg-slate-50/90 dark:bg-[#0B1120]/70 border border-slate-200/70 dark:border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Focus Room • 25:00
                      </span>
                      {demoFocusPlaying && (
                        <span className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 h-2 bg-emerald-500 animate-pulse" />
                          <span className="w-0.5 h-3 bg-emerald-500 animate-pulse delay-75" />
                          <span className="w-0.5 h-1.5 bg-emerald-500 animate-pulse delay-150" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lofi Beats • Nghỉ 5p tự động ôn 3 từ vựng FSRS
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDemoFocusPlaying(!demoFocusPlaying)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                  aria-label="Phát nhạc Lofi Focus"
                >
                  {demoFocusPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
              </div>

              {/* BENTO CARD 3: INTERACTIVE DOPAMINE TASK LIST */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between px-1">
                  <span>Chạm để hoàn thành nhiệm vụ</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">nhận phản hồi tức thì</span>
                </div>

                {[
                  { id: 1, text: 'Chốt 1 việc cốt lõi Tam Hợp hôm nay', xp: 20 },
                  { id: 2, text: 'Tập trung sâu Pomodoro 25 phút', xp: 25 },
                  { id: 3, text: 'Ghi chép chi tiêu & Ôn từ vựng', xp: 15 }
                ].map((task) => {
                  const isDone = Boolean(completedTasks[task.id]);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => handleTaskToggle(task.id, task.xp)}
                      className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/30'
                          : 'bg-white dark:bg-[#1A2540]/60 hover:bg-slate-50 dark:hover:bg-[#1A2540] border-slate-200/80 dark:border-white/[0.06] hover:border-emerald-500/40 hover:-translate-y-0.5 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 transition-all ${
                          isDone 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                        }`}>
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className={`text-xs sm:text-sm font-medium truncate ${
                          isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {task.text}
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                        isDone 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        +{task.xp} XP
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* HINT FOOTER */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
                <span>⚡ Phản hồi dopamine kích thích hành động</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Interactive Simulation</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Level Up Celebration Modal */}
      {showLevelUpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-3xl flex items-center justify-center mx-auto shadow-sm">
              <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Thăng Hạng Thành Công</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                Chúc mừng! Bạn đã lên Cấp 3!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Bạn vừa trải nghiệm cơ chế thăng cấp game hóa thật sự. Đăng ký ngay để nhận <strong>7 ngày dùng thử miễn phí</strong> và bắt đầu tích lũy tiến trình của chính mình!
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLevelUpModal(false);
                  onLoginClick('register');
                }}
                className="w-full min-h-[44px] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-sm cursor-pointer transition-colors"
              >
                Nhận 7 ngày dùng thử & Lưu tiến trình 🚀
              </button>
              <button
                type="button"
                onClick={() => setShowLevelUpModal(false)}
                className="w-full min-h-[36px] py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Tiếp tục xem trang chủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 03. INTERACTIVE PRODUCT SHOWCASE (SHOWCASE SẢN PHẨM THẬT) */}
      {/* ========================================================================= */}
      <section id="showcase" className="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
            Trực Quan Hóa 100%
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Khám phá giao diện thực tế của LifeOS
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Chạm vào từng phân hệ bên dưới để xem thiết kế tối giản, hiện đại và chuẩn mực công thái học trên thực tế.
          </p>
        </div>

        {/* Tab switcher (Scrollable on small mobile) */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {[
            { id: 'tasks', label: 'Công Việc & Tam Hợp', icon: Target },
            { id: 'study', label: 'Study OS & Từ Vựng', icon: BookOpen },
            { id: 'focus', label: 'Pomodoro & Lofi Zen', icon: Headphones },
            { id: 'finance', label: 'Tài Chính 6 Hũ', icon: Wallet },
            { id: 'goals', label: 'Mục Tiêu & Chỉ Số 5D', icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeShowcaseTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveShowcaseTab(tab.id as any)}
                className={`min-h-[42px] px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400 dark:text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Showcase Mockup Window */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden max-w-5xl mx-auto">
          {/* Top Window Bar */}
          <div className="bg-slate-100/80 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-500">
              <Lock className="w-3 h-3 text-emerald-500" />
              <span>app.lifeos.vn/{activeShowcaseTab}</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hidden sm:block">
              ● Live Preview
            </div>
          </div>

          {/* Tab 1: Công việc & Tam Hợp */}
          {activeShowcaseTab === 'tasks' && (
            <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Tam Hợp Cốt Lõi Hôm Nay (Rule of 3)
                  </h3>
                  <p className="text-xs text-slate-500">Tập trung 100% năng lượng vào 3 việc tạo đột phá lớn nhất.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>2/3 việc đã hoàn thành</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span>Ưu tiên 1 · Dự án</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-[10px]">ĐÃ XONG</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-through">
                    Hoàn tất báo cáo tài chính tháng
                  </h4>
                  <p className="text-[11px] text-slate-500">Dự án: Tự chủ tài chính 2026</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <span>Ưu tiên 2 · Học tập</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-[10px]">ĐÃ XONG</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-through">
                    Học 20 từ vựng IELTS chủ đề Environment
                  </h4>
                  <p className="text-[11px] text-slate-500">Khu vực: Ngoại ngữ Spaced Repetition</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                    <span>Ưu tiên 3 · Sức khỏe</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-[10px]">ĐANG LÀM</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chạy bộ 3km & Uống 2L nước
                  </h4>
                  <p className="text-[11px] text-slate-500">Kỷ luật thói quen: Chuỗi 14 ngày</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Study OS */}
          {activeShowcaseTab === 'study' && (
            <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Spaced Repetition & Đường Cong Quên Ebbinghaus
                  </h3>
                  <p className="text-xs text-slate-500">Tự động tính toán ngày ôn tập khoa học để kiến thức lưu vĩnh viễn.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Oxford 3000 & IELTS Core
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Thẻ Ôn Tập Hôm Nay</span>
                    <span className="text-emerald-600 font-bold">15 từ đến hạn</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg font-black text-slate-900 dark:text-white tracking-wide">Resilience</span>
                    <p className="text-xs font-mono text-slate-400">/rɪˈzɪl.jəns/ (noun)</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Khả năng kiên cường, phục hồi sau khó khăn</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-center">
                    <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">Quên (1 ngày)</span>
                    <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">Khó (3 ngày)</span>
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">Nhớ rõ (7 ngày)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Tiến Độ Ghi Nhớ Dài Hạn</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Đã lưu vào trí nhớ vĩnh viễn</span>
                        <span className="font-mono text-emerald-600">420 từ (72%)</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '72%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Đang củng cố theo chu kỳ</span>
                        <span className="font-mono text-blue-600">160 từ (28%)</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '28%' }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic pt-1">
                    ✓ Thuật toán phân bổ ngày ôn tự động, không còn học trước quên sau.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Pomodoro & Lofi */}
          {activeShowcaseTab === 'focus' && (
            <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Trạm Tập Trung Sâu Pomodoro & Âm Thanh Ambient Zen
                  </h3>
                  <p className="text-xs text-slate-500">Thiết kế tối giản giúp rơi vào trạng thái Flow State chỉ sau 60 giây.</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold w-fit">
                  Flow State Mode
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-6 text-center text-white space-y-3 border border-slate-800">
                  <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">PHIÊN TẬP TRUNG SÂU</span>
                  <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-wider">
                    25:00
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Lofi Hip Hop Chill Beats • Tokyo Midnight</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bộ Âm Thanh Thư Thái</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold">
                      <Headphones className="w-4 h-4 text-emerald-500" />
                      <span>Mưa Đêm Êm Dịu</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold">
                      <Music className="w-4 h-4 text-purple-500" />
                      <span>Quán Cà Phê Paris</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold">
                      <Volume2 className="w-4 h-4 text-blue-500" />
                      <span>Sóng Biển Trầm Ấm</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Tiếng Lửa Trại Ấm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Tài chính 6 hũ */}
          {activeShowcaseTab === 'finance' && (
            <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Quản Trị Tài Chính Gen Z & Ngân Sách 6 Hũ
                  </h3>
                  <p className="text-xs text-slate-500">Kiểm soát dòng tiền, chấm dứt nỗi lo cháy túi cuối tháng.</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold w-fit">
                  Dòng Tiền Dương +3.2M
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-400">Nhu Cầu Thiết Yếu (55%)</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">4.250.000 đ</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Trong ngân sách ✓</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-400">Tiết Kiệm Dài Hạn (10%)</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">1.000.000 đ</div>
                  <span className="text-[10px] text-blue-600 font-semibold">Đã chuyển quỹ ✓</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-400">Giáo Dục & Sách (10%)</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">800.000 đ</div>
                  <span className="text-[10px] text-purple-600 font-semibold">Đầu tư bản thân ✓</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-400">Hưởng Thụ Giải Trí (10%)</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">650.000 đ</div>
                  <span className="text-[10px] text-amber-600 font-semibold">Còn lại 350.000 đ</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-400">Đầu Tư Sinh Lời (10%)</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">1.200.000 đ</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Tích sản đều đặn ✓</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-400">Cho Đi & Giúp Đỡ (5%)</span>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1">400.000 đ</div>
                  <span className="text-[10px] text-rose-600 font-semibold">Ý nghĩa cuộc sống ✓</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Mục tiêu & 5D Harmony */}
          {activeShowcaseTab === 'goals' && (
            <div className="p-4 sm:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Bản Đồ Mục Tiêu & Chỉ Số Cân Bằng 5D Harmony
                  </h3>
                  <p className="text-xs text-slate-500">Đo lường sự cân đối giữa Công việc, Học tập, Tài chính, Kỷ luật và Tinh thần.</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold w-fit">
                  Harmony Score: 88/100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">5 Trục Đánh Giá Đa Chiều</span>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">⚡ Năng suất công việc:</span>
                      <span className="font-bold text-emerald-600">92%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">📚 Học tập & Ngoại ngữ:</span>
                      <span className="font-bold text-blue-600">85%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">💰 Kỷ luật tài chính:</span>
                      <span className="font-bold text-amber-600">88%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">🔥 Duy trì chuỗi thói quen:</span>
                      <span className="font-bold text-purple-600">90%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">🌱 Cân bằng tinh thần & Zen:</span>
                      <span className="font-bold text-rose-600">84%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mục Tiêu Trọng Tâm Quý</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      Đạt chứng chỉ IELTS 7.0 & Tích lũy quỹ khẩn cấp 15 triệu
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Tiến độ tổng thể: 68% hoàn thành · Còn 34 ngày trong chu kỳ.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Trạng thái:</span>
                    <span className="text-emerald-600 font-bold">Đang đúng tiến độ ✓</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Card Footer with quick action */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500">
              💡 Đây là dữ liệu mô phỏng theo cấu trúc thật. Bạn có thể bắt đầu nhập dữ liệu của riêng mình ngay!
            </span>
            <button
              type="button"
              onClick={() => onLoginClick('register')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>Trải nghiệm 7 ngày miễn phí</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 04. CORE SCIENTIFIC METHODOLOGY (PHƯƠNG PHÁP KHOA HỌC) */}
      {/* ========================================================================= */}
      <section id="science" className="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
            Nền Tảng Vững Chắc
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Được xây dựng trên 4 phương pháp khoa học đã được kiểm chứng
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Không dựa vào sự ngẫu hứng hay ý chí đơn thuần. LifeOS áp dụng các nguyên lý tâm lý học hành vi và khoa học nhận thức để duy trì năng suất bền vững.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <Target className="w-6 h-6 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">01 · Trọng Tâm</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quy Tắc Tam Hợp (Rule of 3)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nghiên cứu chỉ ra rằng danh sách 50 việc gây tê liệt phân tích (Analysis Paralysis). Mỗi ngày chỉ chọn đúng <strong>3 việc cốt lõi</strong> có sức tác động 80% kết quả.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              → Loại bỏ 90% áp lực quá tải
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                <Brain className="w-6 h-6 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">02 · Trí Nhớ</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Đường Cong Quên Ebbinghaus
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Não bộ quên 70% thông tin sau 24h nếu không ôn tập. Thuật toán Spaced Repetition tự động nhắc bạn ôn đúng lúc não sắp quên để chuyển thành <strong>trí nhớ vĩnh viễn</strong>.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              → Nhớ từ vựng gấp 3 lần bình thường
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                <Headphones className="w-6 h-6 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">03 · Dòng Chảy</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pomodoro & Deep Work Flow
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Chia nhỏ chu kỳ làm việc thành từng chặng 25 phút kết hợp giải lao ngắn 5 phút, giữ nhịp năng lượng luôn ở đỉnh cao và ngăn chặn hội chứng kiệt sức (burnout).
              </p>
            </div>
            <div className="pt-2 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
              → Vào trạng thái tập trung sau 60s
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">04 · Tổ Chức</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hệ Thống P.A.R.A (Tiago Forte)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Phương pháp tổ chức "Bộ Não Thứ Hai" (Second Brain) chuẩn mực: Projects (Dự án), Areas (Trách nhiệm), Resources (Tài nguyên), Archives (Lưu trữ) giúp mọi thứ luôn ngăn nắp.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              → Tìm kiếm thông tin trong 5 giây
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 05. GAMIFICATION & BÉ ĐỒNG HÀNH LUMI */}
      {/* ========================================================================= */}
      <section id="gamification" className="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/40 to-amber-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-amber-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Tâm Lý Học Hành Vi & Dopamine Vui Vẻ</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Kỷ luật không cần gượng ép.{' '}
                <span className="text-emerald-600 dark:text-emerald-400">Biến mỗi ngày thành một màn chơi.</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Lý do game khiến chúng ta say mê là nhờ chu kỳ phản hồi tức thời. LifeOS mang cơ chế đó vào đời thực: mỗi việc bạn hoàn thành đều được cộng XP, nuôi dưỡng Chuỗi Streak và tiếp thêm động lực từ <strong>Bé Lumi</strong>.
              </p>

              {/* 3 Game Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                  <span className="text-lg">⭐</span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bé Lumi Đồng Hành</h4>
                  <p className="text-[11px] text-slate-500">Động viên dịu dàng, tiếp năng lượng mà không phán xét.</p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                  <span className="text-lg">🛡️</span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Băng Bảo Vệ Streak</h4>
                  <p className="text-[11px] text-slate-500">Bảo toàn chuỗi ngày kỷ luật ngay cả những hôm đột xuất bận rộn.</p>
                </div>

                <div className="bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-1">
                  <span className="text-lg">🏆</span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bảng Phong Thần</h4>
                  <p className="text-[11px] text-slate-500">Thăng tiến cấp bậc và mở khóa danh hiệu độc quyền.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onLoginClick('register')}
                  className="min-h-[44px] px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs sm:text-sm cursor-pointer hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Bắt đầu Level 1 cùng Bé Lumi (Dùng thử 7 ngày) ⚡
                </button>
              </div>
            </div>

            {/* Right Mascot Showcase Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
                <div className="w-28 h-28 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 mx-auto flex items-center justify-center shadow-inner overflow-hidden">
                  <LiveMascotCharacter mood="happy" size="normal" showAura={true} />
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
                  "Chỉ cần bạn bước thêm một bước nhỏ hôm nay, Lumi sẽ thắp sáng ngôi sao cùng bạn!"
                </div>
                <div className="flex items-center justify-between text-xs font-semibold px-2">
                  <span className="text-slate-500">Tâm trạng hiện tại:</span>
                  <span className="text-amber-500 font-bold">Háo hức & Tràn trề năng lượng 🔥</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 06. BEFORE VS AFTER (CHUYỂN HÓA THỰC TẾ) */}
      {/* ========================================================================= */}
      <section id="comparison" className="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
            Sự Thay Đổi Thực Tế
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sự khác biệt giữa "Muốn làm" và "Thực sự làm được"
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Nhìn lại cách bạn đang sắp xếp cuộc sống mỗi ngày. Đã đến lúc chuyển sang một hệ điều hành thông minh hơn.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Card Trái: Trước khi có LifeOS */}
          <div className="bg-slate-100/90 dark:bg-slate-900/60 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Khi Chưa Dùng LifeOS (Hỗn Loạn & Áp Lực)</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Mở 8-10 app rời rạc: Notion ghi chép, Google Sheets chi tiêu, App bấm giờ, App từ vựng... khiến điện thoại rối rắm.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Danh sách việc cần làm 50 đầu mục dài ngoằng, mở ra là thấy ngợp rồi lướt mạng xã hội quên hết ngày.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Hừng hực khí thế được 3 ngày đầu, sau đó bỏ xó vì thiếu cơ chế phản hồi động viên và theo dõi tiến trình.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                <span>Không biết tiền đi đâu về đâu, cuối tháng hoang mang tự hỏi sao mình lại hết tiền.</span>
              </li>
            </ul>
          </div>

          {/* Card Phải: Khi Dùng LifeOS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Khuyên Dùng Cho Gen Z
            </div>

            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Khi Chuyển Sang LifeOS (Gọn Gàng & Bứt Phá)</span>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>1 màn hình duy nhất — Đồng bộ từ việc học, Pomodoro Lofi, tài chính 6 hũ đến mục tiêu quý.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>Quy tắc Tam Hợp: Tập trung giải quyết dứt điểm đúng 3 việc quan trọng nhất mỗi ngày.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>Bé Lumi nhắc nhở dịu dàng, nhận XP thăng hạng tức thì, duy trì chuỗi Streak cả tháng.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                <span>Chỉ số 5D Harmony phản ánh trung thực toàn diện sức khỏe công việc và cân bằng cuộc sống.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 07. TRANSPARENT PRICING & 7-DAY FREE TRIAL (BẢNG GIÁ MINH BẠCH) */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
            Minh Bạch 100%
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gói dịch vụ đơn giản, chi phí chỉ bằng một cốc trà đá
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Mọi tài khoản mới đăng ký đều được <strong>tự động cấp 7 ngày dùng thử miễn phí</strong> để trải nghiệm toàn bộ tính năng cao cấp trước khi đưa ra quyết định.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-stretch">
          
          {/* Card 0: 7-DAY FREE TRIAL */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 rounded-3xl p-6 border-2 border-dashed border-emerald-400 dark:border-emerald-700 flex flex-col justify-between space-y-4 relative">
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider mb-2">
                Dành cho bạn mới
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Dùng Thử 7 Ngày</h3>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">0 đ</span>
                <span className="text-xs text-slate-500"> / 7 ngày trọn vẹn</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tự động kích hoạt ngay khi bạn tạo tài khoản. Không cần thẻ tín dụng, không trừ tiền âm thầm.
              </p>
              
              <div className="pt-4 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Toàn bộ phân hệ công việc, học tập, tài chính</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Trạm Pomodoro Lofi không giới hạn</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Đồng hành và tích XP cùng Bé Lumi</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Bảo toàn 100% dữ liệu sau khi hết hạn</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLoginClick('register')}
              className="w-full min-h-[44px] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              Bắt đầu 7 ngày miễn phí 🚀
            </button>
          </div>

          {/* Card 1: Gói Cá Nhân 1 Tháng */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Linh hoạt
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Cá Nhân 1 Tháng</h3>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-black text-slate-900 dark:text-white">29.000 đ</span>
                <span className="text-xs text-slate-500"> / 30 ngày (~960đ/ngày)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Chi phí chỉ bằng một cốc trà đá mỗi ngày để sở hữu trọn vẹn bộ công cụ nâng cấp bản thân.
              </p>

              <div className="pt-4 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Mở khóa 100% tính năng nâng cao</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Spaced Repetition & Decision Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Đồng bộ đa thiết bị tức thời</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Hỗ trợ kỹ thuật 24/7</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLoginClick('login')}
              className="w-full min-h-[44px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Chọn gói 1 tháng
            </button>
          </div>

          {/* Card 2: Gói Cá Nhân 3 Tháng (POPULAR) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 flex flex-col justify-between space-y-4 relative">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Phổ Biến Nhất
            </div>
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2">
                Tiết kiệm thêm
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Cá Nhân 3 Tháng</h3>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">79.000 đ</span>
                <span className="text-xs text-slate-500"> / 90 ngày</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Được 80% bạn trẻ lựa chọn để hình thành thói quen kỷ luật dài hạn và bền vững.
              </p>

              <div className="pt-4 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Bao gồm tất cả quyền lợi Gói 1 Tháng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Thời hạn sử dụng 90 ngày liên tục</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tiết kiệm 8.000đ so với gia hạn lẻ</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Ưu tiên đồng bộ & sao lưu định kỳ</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLoginClick('login')}
              className="w-full min-h-[44px] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
            >
              Chọn gói 3 tháng (Tiết kiệm)
            </button>
          </div>

          {/* Card 3: Gói Team Đội Ngũ */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-2">
                Học nhóm / Team
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Gói Đội Ngũ (Team)</h3>
              <div className="mt-2 mb-3">
                <span className="text-3xl font-black text-slate-900 dark:text-white">99.000 đ</span>
                <span className="text-xs text-slate-500"> / 30 ngày (Tối đa 5 người)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Dành cho nhóm bạn học tập hoặc startup nhỏ. Chia đều chỉ ~20.000đ/người/tháng.
              </p>

              <div className="pt-4 space-y-2 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Chủ team + Tối đa 5 thành viên</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Mọi thành viên đều được mở khóa 100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Quản lý thành viên linh hoạt</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Bảng phong thần thi đua nhóm</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLoginClick('login')}
              className="w-full min-h-[44px] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Chọn gói Đội ngũ
            </button>
          </div>

        </div>

        {/* Payment Methods Trust Bar */}
        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Hỗ trợ chuyển khoản ngân hàng quét mã QR tự động VietQR (MB, Vietcombank, Techcombank, Momo...)
          </p>
          <p>
            Kích hoạt tự động sau khi giao dịch thành công. Cam kết hoàn tiền nếu hệ thống gặp sự cố.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 08. FAQ ACCORDION (GIẢI ĐÁP THẮC MẮC & XÂY DỰNG NIỀM TIN) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-14 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto border-t border-slate-200/70 dark:border-slate-800">
        <div className="text-center mb-10 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
            Hỏi Đáp Nhanh
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Những câu hỏi thường gặp trước khi bắt đầu
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Mọi điều bạn cần biết về chính sách dùng thử 7 ngày và cách vận hành của LifeOS.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Dùng thử 7 ngày có bị tự động trừ tiền trong tài khoản không?',
              a: 'Hoàn toàn KHÔNG. Bạn không cần nhập bất kỳ thông tin thẻ tín dụng hay tài khoản ngân hàng nào khi đăng ký. Khi hết 7 ngày, quyền dùng thử tự động kết thúc an toàn và bạn tự do quyết định có nâng cấp hay không.'
            },
            {
              q: 'Dữ liệu của tôi sau 7 ngày dùng thử có bị xóa không?',
              a: 'Dữ liệu của bạn được lưu trữ an toàn 100% trên máy chủ đám mây có mã hóa. Sau khi hết 7 ngày, màn hình sẽ tạm thời khóa khu vực làm việc cho đến khi bạn kích hoạt gói đăng ký, toàn bộ ghi chú, nhiệm vụ và tiến trình từ vựng của bạn vẫn giữ nguyên vẹn.'
            },
            {
              q: 'Tôi có thể dùng LifeOS trên cả iPhone, Android và Máy tính cùng lúc không?',
              a: 'Có. LifeOS là ứng dụng Progressive Web App (PWA) hiện đại, hoạt động mượt mà trên mọi trình duyệt web (Safari, Chrome, Edge) và tự động đồng bộ thời gian thực giữa điện thoại, máy tính bảng và laptop của bạn.'
            },
            {
              q: 'LifeOS khác gì so với Notion hay Todoist thông thường?',
              a: 'Notion đòi hỏi bạn phải tốn hàng chục giờ tự tạo template phức tạp mà vẫn thiếu các cơ chế Spaced Repetition hay Lofi Pomodoro tích hợp. LifeOS đã đóng gói sẵn toàn bộ phương pháp khoa học chuẩn mực (Tam Hợp, P.A.R.A, Ebbinghaus, 6 Hũ Tài Chính) và kết hợp Bé Lumi game hóa để bạn dùng được ngay mà không cần cấu hình.'
            },
            {
              q: 'Dữ liệu cá nhân và tài chính của tôi có được bảo mật không?',
              a: 'LifeOS tuân thủ các tiêu chuẩn bảo mật khắt khe: mật khẩu được mã hóa băm một chiều (bcrypt), kết nối SSL/TLS mã hóa đầu cuối và dữ liệu của bạn hoàn toàn riêng tư, tuyệt đối không bao giờ chia sẻ cho bất kỳ bên thứ ba nào.'
            },
            {
              q: 'Tôi có thể nâng cấp hoặc thanh toán bằng cách nào?',
              a: 'Bạn có thể thanh toán dễ dàng qua quét mã VietQR tự động từ bất kỳ ứng dụng ngân hàng nào tại Việt Nam (Vietcombank, MB Bank, Techcombank, TPBank, Momo...). Hệ thống kiểm duyệt và kích hoạt tài khoản chỉ trong vài phút.'
            }
          ].map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full min-h-[52px] p-4 sm:p-5 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3 animate-in fade-in duration-200">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 09. FINAL HIGH-CONVERSION CTA BANNER */}
      {/* ========================================================================= */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-12 lg:p-16 text-center space-y-6 shadow-2xl relative overflow-hidden border border-emerald-900/40">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Cột Mốc Để Bứt Phá Bản Thân</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            "Hôm nay của 1 năm sau bắt đầu từ quyết định của bạn ngay lúc này."
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Tham gia cùng hàng nghìn bạn trẻ Gen Z đang biến kỷ luật thành niềm vui mỗi ngày cùng LifeOS.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onLoginClick('register')}
              className="w-full sm:w-auto min-h-[48px] px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all text-sm sm:text-base cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              ⚡ Bắt đầu dùng thử 7 ngày miễn phí — Khởi tạo trong 30 giây
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
            <span>✓ 0đ Không cần thẻ</span>
            <span>✓ Hủy bất kỳ lúc nào</span>
            <span>✓ Bảo toàn dữ liệu 100%</span>
            <span>✓ Đồng bộ thời gian thực</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. PROFESSIONAL PUBLIC FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          
          {/* Logo & Tagline */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="LifeOS Logo" className="w-7 h-7 rounded-lg object-contain" />
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">LifeOS v2.0</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span>Hệ Điều Hành Cuộc Sống Toàn Diện Cho Thế Hệ Gen Z</span>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <button type="button" onClick={() => scrollToSection('features')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Tính năng
            </button>
            <button type="button" onClick={() => scrollToSection('showcase')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Giao diện thật
            </button>
            <button type="button" onClick={() => scrollToSection('science')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Khoa học
            </button>
            <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Bảng giá
            </button>
            <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              FAQ
            </button>
            <button type="button" onClick={() => onLoginClick('login')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              Đăng nhập
            </button>
          </div>

          {/* System Status & Copyright */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>99.9% Uptime</span>
            </span>
            <span>© {new Date().getFullYear()} LifeOS Team</span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 11. STICKY BOTTOM MOBILE CTA BAR (CHỈ HIỆN TRÊN ĐIỆN THOẠI KHI SCROLL) */}
      {/* ========================================================================= */}
      {showStickyMobileCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🎁</span>
            <div className="text-left truncate">
              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight truncate">
                Dùng thử 7 ngày miễn phí
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Không cần thẻ tín dụng
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onLoginClick('register')}
            className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Bắt đầu ngay</span>
            <Zap className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}
