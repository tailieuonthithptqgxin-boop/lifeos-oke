import React from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert, UserCheck } from 'lucide-react';
import { useAppStore } from '../lib/store';

interface PublicLandingViewProps {
  onLoginClick: () => void;
}

export function PublicLandingView({ onLoginClick }: PublicLandingViewProps) {
  
  const { setCurrentView } = useAppStore();


  
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">Life OS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Bảng giá</a>
            <a href="#about" className="hover:text-blue-600 transition-colors">Về chúng tôi</a>
          </div>
          <div className="flex items-center gap-2">
            
            <button 
              onClick={onLoginClick}
              className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors shadow-sm"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          The Operating System <br/><span className="text-blue-600">for Your Life.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-8 max-w-2xl mx-auto leading-relaxed">
          Quản lý toàn diện Công việc, Tài chính, Học tập, Mục tiêu và Admin Dashboard Quản trị SaaS. Tích hợp Decision Engine & Template Library mạnh mẽ.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onLoginClick}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-bold rounded-full hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
          >
            Đăng nhập / Đăng ký để bắt đầu
          </button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Hệ thống quản lý toàn diện</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Không cần chuyển qua lại giữa nhiều ứng dụng. Life OS kết nối mọi dữ liệu của bạn thành một bức tranh duy nhất.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Decision Engine', desc: 'Đo lường Workload, cảnh báo Overload và mô phỏng What-if các quyết định của bạn.' },
              { title: 'Unified Tracking', desc: 'Liên kết Công việc, Tài chính, Lịch trình và Thói quen lại với nhau.' },
              { title: 'Smart Analytics', desc: 'Báo cáo chi tiết hiệu suất cá nhân và sức khỏe hệ thống thời gian thực.' }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Đầu tư cho sự phát triển</h2>
            <p className="text-slate-500">Chọn gói phù hợp với nhu cầu quản lý của bạn.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Cá Nhân 1 Tháng */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Cá Nhân (1 Tháng)</h3>
                <div className="text-3xl font-extrabold text-slate-900 mb-6">15.000 ₫<span className="text-sm text-slate-500 font-medium"> / 30 ngày</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0"/> Mở khóa toàn bộ chức năng LifeOS</li>
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0"/> Quản lý Công việc, Lịch biểu & Dự án</li>
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0"/> Quản lý Tài chính, Ví & Ngân sách</li>
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0"/> Decision Engine & Tự động hóa</li>
                </ul>
              </div>
              <button onClick={onLoginClick} className="w-full py-3 rounded-xl border-2 border-blue-600 font-bold text-blue-600 hover:bg-blue-50 transition-colors">Đăng nhập để Mua</button>
            </div>
            
            {/* Cá Nhân 3 Tháng */}
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl relative scale-105 z-10 text-white flex flex-col justify-between">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Tiết kiệm nhất</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Cá Nhân (3 Tháng)</h3>
                <div className="text-3xl font-extrabold mb-6">40.000 ₫<span className="text-sm text-slate-400 font-medium"> / 90 ngày</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0"/> Mở khóa toàn bộ chức năng LifeOS</li>
                  <li className="flex gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0"/> Thời hạn sử dụng 90 ngày liên tục</li>
                  <li className="flex gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0"/> Tiết kiệm 5.000 ₫ so với gói 1 tháng</li>
                  <li className="flex gap-3 text-slate-300"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0"/> Sao lưu tự động & Hỗ trợ kỹ thuật</li>
                </ul>
              </div>
              <button onClick={onLoginClick} className="w-full py-3 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 transition-colors">Đăng nhập để Mua</button>
            </div>
            
            {/* Team 1 Tháng */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Gói Đội Ngũ (Team 1 Tháng)</h3>
                <div className="text-3xl font-extrabold text-slate-900 mb-6">50.000 ₫<span className="text-sm text-slate-500 font-medium"> / 30 ngày</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0"/> Dành cho nhóm tối đa 5 người dùng</li>
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0"/> Tất cả thành viên dùng đầy đủ mọi chức năng</li>
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0"/> Chủ team toàn quyền thêm/xóa thành viên</li>
                  <li className="flex gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0"/> Cộng tác & Không gian làm việc chung</li>
                </ul>
              </div>
              <button onClick={onLoginClick} className="w-full py-3 rounded-xl border-2 border-purple-600 font-bold text-purple-600 hover:bg-purple-50 transition-colors">Đăng nhập để Mua</button>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="bg-white border-t border-slate-200 py-12 text-center text-slate-500 text-sm">
        <p>&copy; 2026 Life OS Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
