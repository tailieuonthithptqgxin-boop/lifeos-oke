import React from 'react';
import { Shield, FileText, Cookie, RefreshCw, Phone, Mail, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { LEGAL_CONFIG } from '../../lib/legalConfig';

interface LegalFooterProps {
  onNavigateLegal?: (page: 'privacy' | 'terms' | 'cookies' | 'refund') => void;
}

export function LegalFooter({ onNavigateLegal }: LegalFooterProps) {
  const handleNav = (page: 'privacy' | 'terms' | 'cookies' | 'refund', e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateLegal) {
      onNavigateLegal(page);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/${page === 'privacy' ? 'privacy-policy' : page === 'terms' ? 'terms-of-service' : page === 'cookies' ? 'cookie-policy' : 'refund-policy'}`;
    }
  };

  return (
    <footer className="w-full bg-[#090D16] border-t border-slate-800 text-slate-300 font-sans text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Top Bento Grid: 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Col 1: Identity & Legal Entity (5 cols) */}
          <div className="md:col-span-5 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="LifeOS Official Logo" className="w-7 h-7 rounded-xl object-contain shadow-xs" />
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">{LEGAL_CONFIG.appName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-bold">
                  quanlicanhan.online
                </span>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed text-xs">
              Hệ điều hành quản trị cuộc sống toàn diện: Phương pháp P.A.R.A, Ma trận ưu tiên Rule of 3, Đồng hồ Pomodoro, Flashcard từ vựng lặp lại ngắt quãng Ebbinghaus và Trợ lý ảo Bé Lumi.
            </p>
          </div>

          {/* Col 2: Legal Policies Hub (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chính Sách & Hành Lang Pháp Lý</span>
            </h3>

            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="/privacy-policy"
                  onClick={(e) => handleNav('privacy', e)}
                  className="text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-md py-0.5"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Chính sách bảo mật (Nghị định 13)</span>
                </a>
              </li>
              <li>
                <a
                  href="/terms-of-service"
                  onClick={(e) => handleNav('terms', e)}
                  className="text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-md py-0.5"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Điều khoản dịch vụ & Miễn trừ AI</span>
                </a>
              </li>
              <li>
                <a
                  href="/cookie-policy"
                  onClick={(e) => handleNav('cookies', e)}
                  className="text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-md py-0.5"
                >
                  <Cookie className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Chính sách Cookie & Lưu trữ riêng</span>
                </a>
              </li>
              <li>
                <a
                  href="/refund-policy"
                  onClick={(e) => handleNav('refund', e)}
                  className="text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-md py-0.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>Chính sách hoàn tiền (Khi có lỗi từ web)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Support Contact (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hỗ Trợ & Khiếu Nại Dữ Liệu</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Email hỗ trợ:</span>
                <a href={`mailto:${LEGAL_CONFIG.supportEmail}`} className="text-slate-200 hover:text-emerald-400">
                  {LEGAL_CONFIG.supportEmail}
                </a>
              </div>

              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[10px] text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tuân thủ Nghị định 13/2023/NĐ-CP</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Line: Copyright & System Status */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} {LEGAL_CONFIG.appName}. Toàn bộ quyền được bảo lưu.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300">Máy chủ ổn định 99.9%</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300">HTTPS SSL/TLS 256-bit</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
