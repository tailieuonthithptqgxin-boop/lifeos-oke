import React from 'react';
import { ArrowLeft, Shield, FileText, Cookie, RefreshCw, Printer } from 'lucide-react';
import { LEGAL_CONFIG } from '../../lib/legalConfig';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  activeTab: 'privacy' | 'terms' | 'cookies' | 'refund';
  children: React.ReactNode;
  onNavigate: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'home') => void;
}

export function LegalLayout({ title, subtitle, activeTab, children, onNavigate }: LegalLayoutProps) {
  const tabs = [
    { id: 'privacy', label: 'Chính sách bảo mật', icon: Shield, path: '/privacy-policy' },
    { id: 'terms', label: 'Điều khoản dịch vụ', icon: FileText, path: '/terms-of-service' },
    { id: 'cookies', label: 'Chính sách Cookie & Lưu trữ', icon: Cookie, path: '/cookie-policy' },
    { id: 'refund', label: 'Chính sách hoàn tiền', icon: RefreshCw, path: '/refund-policy' }
  ] as const;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Legal Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#090D16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Quay lại trang chủ"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Quay lại trang chủ</span>
            </button>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-xs font-bold tracking-tight text-white">{LEGAL_CONFIG.appName} Legal Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">In văn bản</span>
            </button>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-medium">
              Cập nhật: {LEGAL_CONFIG.lastUpdated}
            </span>
          </div>
        </div>
      </header>

      {/* Hero Banner Bento Style */}
      <div className="border-b border-slate-800/80 bg-gradient-to-b from-[#0F172A] to-[#090D16] py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trung Tâm Pháp Lý & Tuân Thủ Dữ Liệu</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">{title}</h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">{subtitle}</p>

          {/* Tab Navigation (Bento Pill Bar) */}
          <nav className="flex flex-wrap items-center gap-2 pt-4" aria-label="Điều hướng các trang pháp lý">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onNavigate(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        {children}

        {/* Applicable Frameworks Card */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hành Lang Pháp Lý Áp Dụng</h3>
          <ul className="text-xs text-slate-300 space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEGAL_CONFIG.applicableLaws.map((law, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span className="leading-relaxed">{law}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
