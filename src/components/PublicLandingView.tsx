import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, CheckCircle2, Sparkles, Flame, Zap, Trophy, Brain, Layers, 
  Star, Check, BookOpen, Wallet, Clock, Gamepad2, Headphones, ShieldCheck, 
  TrendingUp, Bot, ChevronRight, Award, Compass, RefreshCw, BarChart3, Terminal
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden w-full min-w-0 max-w-full">
      {/* Background ambient lighting - Modern Cyber/Indigo/Cyan glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] max-w-full h-[650px] bg-gradient-to-tr from-indigo-600/20 via-blue-600/15 to-cyan-400/10 blur-[140px] pointer-events-none rounded-full overflow-hidden" />
      <div className="absolute top-[850px] -left-40 w-[650px] max-w-full h-[500px] bg-blue-600/10 blur-[150px] pointer-events-none rounded-full overflow-hidden" />
      <div className="absolute top-[1500px] -right-40 w-[600px] max-w-full h-[550px] bg-cyan-500/10 blur-[160px] pointer-events-none rounded-full overflow-hidden" />

      {/* Modern High-Tech Glass Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white leading-none">
                  Life<span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">OS</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  PRO · GEN Z
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">High-Performance OS</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <span>Hệ sinh thái Bento</span>
              <span className="text-[10px] bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">5-in-1</span>
            </a>
            <a href="#preview" className="hover:text-cyan-400 transition-colors">Xem trước Workspace</a>
            <a href="#companion" className="hover:text-cyan-400 transition-colors">AI Copilot</a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors">Bảng giá 29k</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onLoginClick}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold border border-slate-800 transition-all cursor-pointer"
            >
              Đăng nhập
            </button>
            <button 
              onClick={onLoginClick}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Trải nghiệm ngay</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 text-center max-w-5xl mx-auto">
        {/* Dynamic Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hệ Thống Quản Trị Mục Tiêu & Kỷ Luật Số Cho Gen Z</span>
        </div>

        {/* Sharp, High-Performance Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] mb-5">
          Làm Chủ Cuộc Sống · Bứt Phá Kỷ Luật <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Gamify Hiệu Suất & Tối Ưu Tương Lai
          </span>
        </h1>

        {/* Professional & Inspiring Subtext */}
        <p className="text-sm sm:text-base md:text-lg text-slate-300/90 mb-8 max-w-2xl mx-auto leading-relaxed font-normal">
          Tạm biệt các ứng dụng ghi chú rời rạc hay bảng tính phức tạp! LifeOS hợp nhất <span className="text-cyan-300 font-semibold">Học tập & Ngoại ngữ (SRS)</span>, <span className="text-emerald-300 font-semibold">Tài chính 50/30/20</span>, <span className="text-amber-300 font-semibold">Rèn Thói quen Kỷ luật</span> và <span className="text-indigo-300 font-semibold">Trợ lý AI Copilot</span> vào một nền tảng thống nhất, sắc bén và tối ưu hóa cao độ.
        </p>

        {/* Primary Call-to-Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md sm:max-w-none mx-auto mb-10">
          <button 
            onClick={onLoginClick}
            className="w-full sm:w-auto px-7 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm sm:text-base font-bold rounded-xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Bắt đầu trải nghiệm Miễn phí</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <a 
            href="#pricing"
            className="w-full sm:w-auto px-6 py-3.5 sm:px-7 sm:py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-sm sm:text-base font-semibold rounded-xl border border-slate-700/80 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Bảng giá chỉ từ 29k / tháng</span>
          </a>
        </div>

        {/* Core Value Pillars */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Thiết lập hoàn tất trong 30 giây</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Không gian tập trung (Zero Distraction)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Đồng bộ Cloud Realtime tốc độ cao</span>
          </div>
        </div>
      </section>

      {/* LIVE INTERACTIVE APP PREVIEW (Modern Workspace Dashboard) */}
      <section id="preview" className="px-4 sm:px-6 max-w-6xl mx-auto pb-20">
        <div className="relative rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-indigo-950/40 p-4 sm:p-7 backdrop-blur-xl">
          {/* Top Mockup Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
              <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
              <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
              <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">lifeos-workspace://command-center.local</span>
            </div>

            {/* Interactive Preview Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
              {[
                { id: 'overview', label: '⚡ Tổng quan', icon: Layers },
                { id: 'companion', label: '🤖 AI Copilot', icon: Bot },
                { id: 'study', label: '📚 Học tập & Thi', icon: Brain },
                { id: 'finance', label: '💰 Tài chính 50/30/20', icon: Wallet },
                { id: 'focus', label: '🎧 Deep Work Pomodoro', icon: Headphones },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activePreviewTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
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
                {/* Left Card: AI Copilot & Daily Quests */}
                <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-md">
                          <div className="w-full h-full bg-slate-900 rounded-[8px] flex items-center justify-center">
                            <Bot className="w-5 h-5 text-cyan-300" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">AI Copilot</span>
                            <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded">Lv. 14</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">Trợ lý Tối ưu Hiệu suất</span>
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-medium">
                        Active ⚡
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-4 leading-relaxed font-mono">
                      "Hôm nay bạn đã hoàn thành 80% chỉ tiêu. Còn 1 tác vụ trọng tâm để duy trì chuỗi Streak kỷ luật."
                    </div>

                    {/* Interactive Task */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhiệm vụ trọng tâm hôm nay</div>
                      <div 
                        onClick={() => {
                          setCompletedDemoTask(!completedDemoTask);
                          if (!completedDemoTask) setDemoStreak(demoStreak + 1);
                          else setDemoStreak(demoStreak - 1);
                        }}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          completedDemoTask 
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' 
                            : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            completedDemoTask ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'
                          }`}>
                            {completedDemoTask && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </div>
                          <span className={`text-xs ${completedDemoTask ? 'line-through text-slate-500' : 'font-medium'}`}>
                            Ôn 20 từ vựng Spaced Repetition (SRS)
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-400">+50 XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tiến trình Level:</span>
                    <span className="font-mono font-bold text-cyan-400">750 / 1000 XP</span>
                  </div>
                </div>

                {/* Center Card: Performance Radar / Index */}
                <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-sm text-white">Chỉ Số Cân Bằng Cuộc Sống</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        94 / 100
                      </span>
                    </div>

                    <div className="space-y-3 my-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Công việc & Học tập</span>
                          <span className="text-indigo-400 font-mono">92%</span>
                        </div>
                        <div className="h-2 rounded bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded w-[92%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Tài chính kỷ luật (50/30/20)</span>
                          <span className="text-emerald-400 font-mono">88%</span>
                        </div>
                        <div className="h-2 rounded bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded w-[88%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-300">Thói quen & Sức khỏe</span>
                          <span className="text-cyan-400 font-mono">96%</span>
                        </div>
                        <div className="h-2 rounded bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded w-[96%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium text-slate-400">Trạng thái:</span>
                    <span className="font-bold text-emerald-400">Peak Performance (Flow State) ⚡</span>
                  </div>
                </div>

                {/* Right Card: Discipline Streak & Savings */}
                <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-sm text-white">Chuỗi Kỷ Luật (Streak)</span>
                      </div>
                      <span className="text-xs bg-amber-500/15 text-amber-300 font-bold px-2.5 py-0.5 rounded border border-amber-500/30 font-mono">
                        {demoStreak} Ngày Liên Tục 🔥
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Giữ vững thói quen dậy sớm, luyện tập tư duy và học ngoại ngữ liên tục để xây dựng phản xạ kỷ luật thép.
                    </p>

                    <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2 mb-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Mục tiêu Quỹ Laptop:</span>
                        <span className="font-mono font-bold text-emerald-400">12.500.000 ₫</span>
                      </div>
                      <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded w-[83%]" />
                      </div>
                      <div className="text-[10px] text-right text-emerald-400 font-mono font-semibold">Đạt 83% ngân sách</div>
                    </div>
                  </div>

                  <button 
                    onClick={onLoginClick}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Khám phá toàn bộ tính năng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activePreviewTab === 'companion' && (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shrink-0 shadow-lg shadow-indigo-500/20">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <Bot className="w-12 h-12 text-cyan-300" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[11px] font-mono font-bold mb-2 border border-indigo-500/30">
                    AI Copilot Engine · 24/7 Productivity Partner
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Trợ Lý AI Phân Tích Hiệu Suất & Động Viên Kỷ Luật</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Chấm dứt sự trì hoãn và overthinking. AI Copilot liên tục theo dõi tiến độ công việc, cảnh báo khi bạn lệch khỏi mục tiêu hàng tuần, và đưa ra gợi ý hành động cụ thể để bứt phá hiệu suất.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">⚡ Gợi ý tối ưu lịch trình thông minh</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">🛡️ Cắt giảm Overthinking & Áp lực ngầm</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">📈 Báo cáo hiệu suất theo chu kỳ</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'study' && (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 shrink-0 flex items-center justify-center shadow-lg">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <Brain className="w-12 h-12 text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[11px] font-mono font-bold mb-2 border border-blue-500/30">
                    Spaced Repetition SM-2 & Quản Trị Học Tập
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Luyện Thi GPA, JLPT, HSK & 3000 Từ Vựng Oxford</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Ứng dụng thuật toán ghi nhớ SuperMemo SM-2 tự động tính toán khoảng cách ngắt quãng, đưa kiến thức xuất hiện lại ngay trước ngưỡng quên của não bộ, giúp tăng x3 tốc độ nạp ngoại ngữ.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">📚 3000 Oxford Cốt Lõi</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">🇯🇵 JLPT N5 - N1</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">🇨🇳 HSK 1 - 6</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">🎓 Đếm ngược kỳ thi & GPA</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'finance' && (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shrink-0 flex items-center justify-center shadow-lg">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <Wallet className="w-12 h-12 text-emerald-400" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[11px] font-mono font-bold mb-2 border border-emerald-500/30">
                    Quy Tắc Tài Chính 50/30/20
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Quản Trị Dòng Tiền & Hũ Tiết Kiệm Tự Động</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Kiểm soát chính xác dòng tiền ròng (Net Cashflow), hạn mức ngân sách theo danh mục, thiết lập quy tắc 72h kiềm chế mua sắm bốc đồng và quét mã VietQR tự động hóa sổ thu chi.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">🏦 Đa tài khoản (Ngân hàng, Ví điện tử, Tiền mặt)</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">📊 Biểu đồ phân tích trực quan</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'focus' && (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 p-0.5 shrink-0 flex items-center justify-center shadow-lg">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                    <Headphones className="w-12 h-12 text-indigo-400" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[11px] font-mono font-bold mb-2 border border-indigo-500/30">
                    Deep Work Engine · Pomodoro Zen Mode
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">Tập Trung Tuyệt Đối Với Không Gian Âm Thanh Lofi</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 max-w-2xl">
                    Loại bỏ mọi yếu tố gây xao nhãng. Chế độ Zen Mode kích hoạt đồng hồ Pomodoro chuẩn 25/5 hoặc 50/10 kết hợp dải âm thanh Lofi & tiếng mưa trắng, giữ vững trạng thái tập trung sâu.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">🎵 Âm thanh Lofi & White Noise</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-medium text-slate-300">⚡ Đo lường tổng số giờ Deep Work</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Showcase */}
      <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kiến Trúc Năng Suất Toàn Diện</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            5 Phân Hệ Khép Kín · Tinh Gọn, Mạnh Mẽ & Thực Chiến
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
            Thiết kế theo chuẩn mực UI hiện đại: Tối ưu tương tác, bố cục khoa học, giúp bạn làm chủ từng khía cạnh cuộc sống mà không bị quá tải.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Study & Vocab */}
          <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-5">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Học Ngoại Ngữ & Thi Cử</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
              Kho 3000 từ vựng Oxford, bộ đề JLPT tiếng Nhật, HSK tiếng Trung kèm thuật toán ngắt quãng Spaced Repetition và công cụ tính điểm tín chỉ GPA.
            </p>
            <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
              <span>Ghi nhớ dài hạn theo chu kỳ não bộ</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: Finance 50/30/20 */}
          <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-5">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tài Chính Kỷ Luật 50/30/20</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
              Tự động phân bổ theo quy tắc 50/30/20, cảnh báo vượt ngưỡng ngân sách hàng tháng, theo dõi dòng tiền ròng và kiểm soát chi tiêu chặt chẽ.
            </p>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span>Minh bạch ngân sách & dòng tiền</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Gamification & RPG */}
          <div className="p-7 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-5">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Gamification & Kỷ Luật Thép</h3>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-5">
              Mỗi thói quen hoàn thành tích lũy điểm XP, thăng hạng danh hiệu, duy trì chuỗi ngọn lửa Streak liên tục và biến kỷ luật thành niềm hứng khởi.
            </p>
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <span>Kỷ luật hóa cuộc sống mỗi ngày</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 text-cyan-400" />
            <span>Bảng Giá Minh Bạch · Siêu Tiết Kiệm</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Đầu Tư Cho Tương Lai Với Chi Phí Cực Thấp
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm">
            Kích hoạt tức thì qua chuyển khoản mã VietQR tự động. Tuyệt đối không tự động trừ tiền âm thầm, kiểm soát chi phí hoàn toàn.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto items-stretch w-full min-w-0">
          {/* Gói 1 Tháng */}
          <div className="bg-slate-900/70 rounded-2xl p-7 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Gói Cá Nhân (1 Tháng)</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Starter</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">Thử nghiệm phương pháp quản trị cuộc sống mới.</p>
              <div className="text-3xl font-black text-white mb-6">
                {p1m?.pricing?.monthly?.displayPrice || `${(p1m?.price || 29000).toLocaleString('vi-VN')} ₫`} <span className="text-xs text-slate-400 font-normal">/ {p1m?.billingCycle || '30 ngày'}</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Mở khóa toàn bộ phân hệ LifeOS</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> AI Copilot hỗ trợ mục tiêu</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> Quản lý Công việc & Dự án</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-cyan-400 shrink-0" /> 3000 Từ vựng Oxford & Ngoại ngữ</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Đăng ký Gói 1 Tháng (29k)
            </button>
          </div>

          {/* Gói 3 Tháng - Hot */}
          <div className="relative bg-gradient-to-b from-indigo-950/60 via-slate-900 to-slate-950 rounded-2xl p-7 border-2 border-indigo-500 shadow-2xl shadow-indigo-950/60 flex flex-col justify-between scale-100 md:scale-105 z-10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{p3m?.badge || 'Khuyên Dùng · Kỷ Luật 90 Ngày'}</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{p3m?.name || 'Cá Nhân (3 Tháng)'}</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Tiết kiệm 8.000 ₫</span>
              </div>
              <p className="text-xs text-slate-300 mb-6">{p3m?.description || 'Thời lượng chuẩn 90 ngày để biến kỷ luật thành bản năng vĩnh viễn.'}</p>
              <div className="text-3xl font-black text-white mb-6">
                {p3m?.pricing?.monthly?.displayPrice || `${(p3m?.price || 79000).toLocaleString('vi-VN')} ₫`} <span className="text-xs text-slate-400 font-normal">/ {p3m?.billingCycle || '90 ngày'}</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-200 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Toàn bộ quyền lợi gói Pro Edition</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Sử dụng trọn vẹn trong suốt 90 ngày</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Mở khóa AI Copilot cao cấp</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Sao lưu tự động & Hỗ trợ ưu tiên 24/7</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
            >
              Chọn Gói Tiết Kiệm ({((p3m?.price || 79000) / 1000)}k / 3 Tháng)
            </button>
          </div>

          {/* Gói Team */}
          <div className="bg-slate-900/70 rounded-2xl p-7 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{pTeam?.name || 'Gói Team (5 Người)'}</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Squad</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">{pTeam?.description || 'Dành cho nhóm bạn cùng học tập, thi đua giữ vững Streak.'}</p>
              <div className="text-3xl font-black text-white mb-6">
                {pTeam?.pricing?.monthly?.displayPrice || `${(pTeam?.price || 99000).toLocaleString('vi-VN')} ₫`} <span className="text-xs text-slate-400 font-normal">/ {pTeam?.billingCycle || '30 ngày'}</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Cho nhóm tối đa 5 thành viên</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Mỗi người sở hữu tài khoản Pro riêng biệt</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Bảng xếp hạng XP thi đua nội bộ</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Không gian ghi chú dự án nhóm chung</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Đăng ký Gói Nhóm (99k)
            </button>
          </div>
        </div>
      </section>

      {/* Modern Minimal Tech Footer */}
      <footer className="border-t border-slate-800/80 py-10 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-black text-xs">
            L
          </div>
          <span className="font-semibold text-slate-300">LifeOS Platform · High-Performance Productivity</span>
          <span>© 2026. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-cyan-400 transition-colors">Tính năng</a>
          <a href="#preview" className="hover:text-cyan-400 transition-colors">Workspace</a>
          <a href="#pricing" className="hover:text-cyan-400 transition-colors">Bảng giá</a>
          <button onClick={onLoginClick} className="hover:text-cyan-400 font-semibold transition-colors cursor-pointer">Đăng nhập</button>
        </div>
      </footer>
    </div>
  );
}
