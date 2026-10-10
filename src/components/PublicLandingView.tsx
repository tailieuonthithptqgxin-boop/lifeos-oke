import React from 'react';
import { 
  ArrowRight, CheckCircle2, ShieldAlert, UserCheck, Sparkles, 
  Flame, Zap, Trophy, Brain, Layers, Star, ArrowUpRight, Check 
} from 'lucide-react';
import { useAppStore } from '../lib/store';

interface PublicLandingViewProps {
  onLoginClick: () => void;
}

export function PublicLandingView({ onLoginClick }: PublicLandingViewProps) {
  const { setCurrentView } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background ambient mesh gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[800px] left-1/4 w-[600px] h-[450px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Modern Glass Navbar */}
      <nav className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-white font-black text-xl tracking-wider">L</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight text-white leading-none">Life OS</span>
              <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Pro Edition</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Tính năng Bento</a>
            <a href="#retention" className="hover:text-white transition-colors">Gamification & AI</a>
            <a href="#pricing" className="hover:text-white transition-colors">Bảng giá SaaS</a>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onLoginClick}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              Đăng nhập
            </button>
            <button 
              onClick={onLoginClick}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Bắt đầu ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-6 text-center max-w-5xl mx-auto">
        {/* Gen Z Tag pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-8 shadow-inner animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Life OS 3.0 · Gamified All-in-One Life Operating System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
          Chinh Phục Cuộc Sống <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Chuẩn Phong Cách Thế Hệ Mới
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Tối ưu hóa toàn diện Công việc, Tài chính, Thói quen kỷ luật, và Ôn tập từ vựng Spaced Repetition thông minh với trải nghiệm gamification streak & level tích hợp.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onLoginClick}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white text-sm sm:text-base font-extrabold rounded-full hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Trải nghiệm Life OS Ngay</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <a 
            href="#pricing"
            className="w-full sm:w-auto px-7 py-4 bg-white/5 hover:bg-white/10 text-slate-300 text-sm sm:text-base font-bold rounded-full border border-white/10 backdrop-blur-md transition-all flex items-center justify-center"
          >
            Xem bảng giá chỉ từ 15k
          </a>
        </div>

        {/* Social Proof Strip */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-8 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Streak Hàng Ngày Kỷ Luật</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span>Oxford 3000 + SuperMemo SM-2</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>Bento Hero & Quick Workflows</span>
          </div>
        </div>
      </section>

      {/* Bento Grid Showcase Section */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Một Nền Tảng. Kiểm Soát Mọi Lĩnh Vực.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Không cần rời rạc qua Notion, Excel hay Trello. Mọi quyết định và chỉ số sống của bạn được kết nối thời gian thực.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Bento Big */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-indigo-500/40 transition-all group relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-6">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Bento Grid Dashboard & Decision Engine</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl mb-6">
              Hiển thị tức thì Workload theo thời gian thực, đo lường công suất chịu tải (Daily Capacity), cảnh báo Overload và mô phỏng What-if kịch bản kế hoạch cá nhân.
            </p>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Daily Score · Kỷ luật & Hiệu suất</span>
              <span className="font-mono font-bold text-emerald-400">92/100 (Xuất sắc)</span>
            </div>
          </div>

          {/* Card 2: Spaced Repetition */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-purple-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-6">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Vocabulary Master</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              3000 từ vựng Oxford thông dụng, hỗ trợ thêm từ cá nhân, thuật toán SuperMemo SM-2 tự động lên lịch ngắt quãng và chấm điểm độ nhớ.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
              <span>Học thông minh không bị quên</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3: Gamification Engine */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-amber-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-6">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Gamified Retention</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Streak ngọn lửa 🔥, hệ thống cấp bậc từ Novice đến Grandmaster, huy hiệu danh dự và danh sách nhiệm vụ Daily Quests nhận thưởng XP mỗi ngày.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <span>Động lực hành động mỗi sáng</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4: Finance & Projects */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Tài Chính Đa Ví & Quản Trị Dự Án Trọng Điểm</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xl mb-6">
              Quản lý dòng tiền ròng (Net Cashflow), hạn mức ngân sách thông minh và theo dõi tiến độ sức khỏe dự án (Health check: Tốt, Cảnh báo, Rủi ro) với 1 cú nhấp chuột.
            </p>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Net Monthly Flow</span>
              <span className="font-mono font-bold text-emerald-400">+12.500.000 ₫</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span>Mở Khóa Không Giới Hạn</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Bảng Giá Đầu Tư Đơn Giản, Minh Bạch
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Trải nghiệm toàn bộ sức mạnh của Life OS không rủi ro. Kích hoạt tức thì qua chuyển khoản ngân hàng QR Code.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Gói 1 Tháng */}
          <div className="bg-slate-900/80 rounded-3xl p-8 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Cá Nhân (1 Tháng)</h3>
              <p className="text-xs text-slate-400 mb-6">Dành cho cá nhân trải nghiệm phương pháp sống mới.</p>
              <div className="text-3xl font-black text-white mb-6">
                15.000 ₫ <span className="text-xs text-slate-400 font-normal">/ 30 ngày</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Mở khóa toàn bộ chức năng LifeOS</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Quản lý Công việc, Lịch & Dự án</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Quản lý Tài chính, Ví & Ngân sách</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-indigo-400 shrink-0" /> Spaced Repetition Vocabulary 3000</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer"
            >
              Đăng ký Gói 1 Tháng
            </button>
          </div>

          {/* Gói 3 Tháng - Hot */}
          <div className="relative bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 rounded-3xl p-8 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 flex flex-col justify-between scale-105 z-10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md">
              Lựa Chọn Phổ Biến Nhất
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Cá Nhân (3 Tháng)</h3>
              <p className="text-xs text-indigo-200 mb-6">Đủ thời gian để hình thành thói quen sống vững bền.</p>
              <div className="text-3xl font-black text-white mb-6">
                40.000 ₫ <span className="text-xs text-slate-400 font-normal">/ 90 ngày</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-200 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Đầy đủ tính năng Pro Edition</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Sử dụng liên tục trong 90 ngày</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Tiết kiệm ngay so với đóng từng tháng</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Sao lưu tự động & Hỗ trợ ưu tiên</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
            >
              Chọn Gói Tiết Kiệm (40k)
            </button>
          </div>

          {/* Gói Team */}
          <div className="bg-slate-900/80 rounded-3xl p-8 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Gói Đội Ngũ (Team 5 người)</h3>
              <p className="text-xs text-slate-400 mb-6">Dành cho nhóm làm việc, học nhóm cùng tiến bộ.</p>
              <div className="text-3xl font-black text-white mb-6">
                50.000 ₫ <span className="text-xs text-slate-400 font-normal">/ 30 ngày</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Cho nhóm tối đa 5 thành viên</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Mọi thành viên sử dụng full Pro</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Chủ team quản trị cấp quyền linh hoạt</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Cộng tác & không gian dự án chung</li>
              </ul>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all cursor-pointer"
            >
              Đăng ký Gói Đội Ngũ
            </button>
          </div>
        </div>
      </section>

      {/* Modern Minimal Footer */}
      <footer className="border-t border-white/10 py-12 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">L</div>
          <span className="font-bold text-slate-400">Life OS Platform</span>
          <span>© 2026. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-slate-300 transition-colors">Tính năng</a>
          <a href="#pricing" className="hover:text-slate-300 transition-colors">Bảng giá</a>
          <button onClick={onLoginClick} className="hover:text-slate-300 transition-colors cursor-pointer">Cổng Khách Hàng</button>
        </div>
      </footer>
    </div>
  );
}
