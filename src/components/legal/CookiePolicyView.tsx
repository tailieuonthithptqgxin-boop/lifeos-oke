import React from 'react';
import { LegalLayout } from './LegalLayout';
import { Cookie, Database, HardDrive, Shield, CheckCircle2, Settings, Lock } from 'lucide-react';
import { LEGAL_CONFIG } from '../../lib/legalConfig';

interface CookiePolicyViewProps {
  onNavigate: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'home') => void;
}

export function CookiePolicyView({ onNavigate }: CookiePolicyViewProps) {
  return (
    <LegalLayout
      title="Chính Sách Cookie & Công Nghệ Lưu Trữ Trình Duyệt"
      subtitle={`Báo cáo minh bạch về các loại Cookie, localStorage, IndexedDB và Service Worker Cache được sử dụng trên ${LEGAL_CONFIG.appDomain} để đảm bảo ứng dụng hoạt động ổn định và an toàn.`}
      activeTab="cookies"
      onNavigate={onNavigate}
    >
      {/* Box 1: Khái quát công nghệ lưu trữ */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">1. Tổng Quan Về Công Nghệ Lưu Trữ Tại Thiết Bị Người Dùng</h2>
            <p className="text-xs text-slate-300">Minh bạch 100% - Không sử dụng cookie theo dõi chéo trái phép</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Để cung cấp trải nghiệm ứng dụng web lũy tiến (Progressive Web App - PWA) mượt mà như một phần mềm máy tính và bảo vệ an toàn cho phiên làm việc của bạn, {LEGAL_CONFIG.appName} sử dụng 4 công nghệ lưu trữ chính ngay tại trình duyệt của bạn:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>1. HttpOnly Cookies (An toàn bảo mật)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lưu trữ JWT Token đăng nhập và State chống tấn công giả mạo (CSRF). Cờ <code>HttpOnly</code> và <code>SameSite=Lax</code> ngăn chặn hoàn toàn mã độc JavaScript (XSS) đọc trộm token.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <HardDrive className="w-4 h-4" />
              <span>2. LocalStorage (Cấu hình giao diện)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lưu trữ các tùy chọn cá nhân: Giao diện Sáng/Tối (Theme), tab đang mở gần nhất, âm lượng nhạc tập trung Lo-Fi, và trạng thái chấp thuận Cookie của bạn.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Database className="w-4 h-4" />
              <span>3. IndexedDB (Bộ đệm dữ liệu Offline)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lưu trữ tạm thời danh sách từ vựng Ebbinghaus và tiến độ ôn tập flashcard để bạn có thể tiếp tục học tập ngay cả khi mất kết nối mạng Internet.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Shield className="w-4 h-4" />
              <span>4. Service Worker Cache (Tải nhanh 0 giây)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lưu bộ nhớ đệm các tệp tĩnh (CSS, biểu tượng icon, font chữ) để giúp trang web khởi động tức thì và gửi thẻ thời gian biểu ra màn hình khóa điện thoại.
            </p>
          </div>
        </div>
      </section>

      {/* Box 2: Bảng chi tiết các Cookie được sử dụng */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>2. Danh Sách Chi Tiết Các Tên Khóa Lưu Trữ & Thời Hạn</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Tên Cookie / Khóa</th>
                <th className="py-2.5 px-3 font-semibold">Phân loại</th>
                <th className="py-2.5 px-3 font-semibold">Thời hạn</th>
                <th className="py-2.5 px-3 font-semibold">Mục đích sử dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-mono text-emerald-300 font-bold">token</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-medium">Bắt buộc</span></td>
                <td className="py-2.5 px-3">14 ngày</td>
                <td className="py-2.5 px-3">Duy trì phiên đăng nhập an toàn (HttpOnly Cookie)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-emerald-300 font-bold">google_oauth_state</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-medium">Bắt buộc</span></td>
                <td className="py-2.5 px-3">10 phút</td>
                <td className="py-2.5 px-3">Bảo vệ quy trình đăng nhập Google OAuth chống giả mạo</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-300 font-bold">lifeos_cookie_consent</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Tùy chọn</span></td>
                <td className="py-2.5 px-3">12 tháng</td>
                <td className="py-2.5 px-3">Ghi nhớ quyết định chấp thuận/từ chối Cookie của người dùng</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-300 font-bold">lifeos_theme</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Cá nhân hóa</span></td>
                <td className="py-2.5 px-3">Vĩnh viễn</td>
                <td className="py-2.5 px-3">Lưu trạng thái giao diện Dark Mode Obsidian hoặc Light Mode</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-slate-300 font-bold">lifeos_pomodoro_state</td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Cá nhân hóa</span></td>
                <td className="py-2.5 px-3">24 giờ</td>
                <td className="py-2.5 px-3">Lưu số phút còn lại của đồng hồ Pomodoro khi đổi tab</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Box 3: Hướng dẫn người dùng xóa và kiểm soát cookie */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" />
          <span>3. Cách Kiểm Soát & Xóa Cookie Trên Thiết Bị Của Bạn</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Bạn hoàn toàn có thể kiểm soát, vô hiệu hóa hoặc xóa dữ liệu cookie bất kỳ lúc nào thông qua phần Cài đặt của trình duyệt:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-white">Google Chrome / Cốc Cốc:</span>
            <p className="text-slate-300">Vào Cài đặt $\rightarrow$ Quyền riêng tư và bảo mật $\rightarrow$ Cookie của bên thứ ba $\rightarrow$ Xóa dữ liệu duyệt web.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-white">Apple Safari (iOS / macOS):</span>
            <p className="text-slate-300">Vào Cài đặt $\rightarrow$ Safari $\rightarrow$ Nâng cao $\rightarrow$ Dữ liệu trang web $\rightarrow$ Xóa tất cả dữ liệu trang web.</p>
          </div>
        </div>
        <p className="text-[11px] text-amber-300 leading-relaxed">
          * Lưu ý: Nếu bạn vô hiệu hóa toàn bộ Cookie thiết yếu, bạn sẽ không thể duy trì phiên đăng nhập vào LifeOS và một số tính năng đồng bộ offline có thể không hoạt động chính xác.
        </p>
      </section>
    </LegalLayout>
  );
}
