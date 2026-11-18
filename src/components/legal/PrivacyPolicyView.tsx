import React from 'react';
import { LegalLayout } from './LegalLayout';
import { Shield, Lock, Eye, Trash2, Download, AlertCircle, Cpu, Bell } from 'lucide-react';
import { LEGAL_CONFIG } from '../../lib/legalConfig';

interface PrivacyPolicyViewProps {
  onNavigate: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'home') => void;
}

export function PrivacyPolicyView({ onNavigate }: PrivacyPolicyViewProps) {
  return (
    <LegalLayout
      title="Chính Sách Bảo Mật & Xử Lý Dữ Liệu Cá Nhân"
      subtitle={`Quy định chi tiết về cách ${LEGAL_CONFIG.appName} (${LEGAL_CONFIG.appDomain}) thu thập, lưu trữ, mã hóa và bảo vệ dữ liệu cá nhân theo Nghị định số 13/2023/NĐ-CP và tiêu chuẩn bảo mật quốc tế.`}
      activeTab="privacy"
      onNavigate={onNavigate}
    >
      {/* Box 1: Tuyên bố tuân thủ Nghị định 13 */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">1. Cam Kết Tuân Thủ Nghị Định 13/2023/NĐ-CP</h2>
            <p className="text-xs text-slate-300">Hiệu lực từ ngày 01/07/2023 đối với toàn bộ người dùng tại Việt Nam</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {LEGAL_CONFIG.ownerName} (gọi tắt là <strong>"{LEGAL_CONFIG.appName}"</strong>) cam kết thực hiện nghiêm ngặt trách nhiệm của Bên Kiểm Soát và Xử Lý Dữ Liệu Cá Nhân theo quy định của pháp luật Việt Nam. Chúng tôi cam kết tuyệt đối:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
            <span className="font-bold text-emerald-400">🛡️ Tối thiểu hóa dữ liệu:</span>
            <p className="text-slate-300">Chỉ thu thập các trường thông tin thật sự cần thiết để vận hành các tính năng bạn lựa chọn.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
            <span className="font-bold text-emerald-400">🔒 Mã hóa đầu cuối & một chiều:</span>
            <p className="text-slate-300">Mật khẩu được băm (hash) bằng thuật toán bcrypt. Dữ liệu truyền tải qua kết nối HTTPS/TLS 1.3 bảo mật cao.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
            <span className="font-bold text-emerald-400">🚫 Không bán hoặc chia sẻ:</span>
            <p className="text-slate-300">Không cung cấp, cho thuê hay thương mại hóa dữ liệu ghi chép cá nhân cho bất kỳ công ty quảng cáo nào.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
            <span className="font-bold text-emerald-400">⚡ Quyền xóa vĩnh viễn (Erasure):</span>
            <p className="text-slate-300">Người dùng có toàn quyền xóa vĩnh viễn tài khoản và mọi bản ghi liên quan chỉ bằng một cú nhấp chuột.</p>
          </div>
        </div>
      </section>

      {/* Box 2: Danh mục dữ liệu thu thập theo phân hệ */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">2. Danh Mục Dữ Liệu Thu Thập & Mục Đích Cụ Thể</h2>
            <p className="text-xs text-slate-300">Nguyên tắc: Thu thập đúng mục đích đã công bố trước với người dùng</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">A. Dữ liệu Đăng nhập & Định danh (Google OAuth 2.0 / Email)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 font-medium border border-emerald-800/40">Thiết yếu</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bao gồm: Email, Họ tên, Ảnh đại diện (avatar) và Google Subject ID. Khi đăng nhập bằng Google OAuth 2.0, hệ thống chỉ xin quyền tối thiểu <code>openid, email, profile</code>. Hệ thống <strong>không</strong> yêu cầu quyền truy cập Google Drive, Google Danh bạ hay bất kỳ dịch vụ riêng tư nào khác của Google.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">B. Dữ liệu Ghi Chép Tài Chính Cá Nhân</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 font-medium border border-indigo-800/40">Dữ liệu nhạy cảm</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bao gồm: Nhật ký thu chi, số tiền, danh mục chi tiêu, tài khoản ví và mục tiêu tiết kiệm. <strong>Mục đích duy nhất:</strong> Tính toán báo cáo dòng tiền, vẽ biểu đồ cơ cấu chi tiêu phục vụ riêng cho chủ tài khoản. Dữ liệu này được cô lập ở cấp cơ sở dữ liệu (Row-level Isolation theo <code>userId</code>) và tuyệt đối không bao giờ được cung cấp cho ngân hàng, tổ chức tín dụng hay bên thứ ba.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">C. Dữ liệu Năng Suất (P.A.R.A, Rule of 3, Pomodoro)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">Nội dung cá nhân</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bao gồm: Tên nhiệm vụ, dự án, mục tiêu cá nhân, ghi chú, và thời lượng các phiên tập trung Pomodoro. Dữ liệu này dùng để đồng bộ trên các thiết bị của bạn và tổng hợp chỉ số phát triển cá nhân (Level/Streak/XP).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">D. Dữ liệu Tương tác Trí Tuệ Nhân Tạo (Gemini AI API)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 font-medium border border-amber-800/40">Xử lý AI</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Khi bạn chủ động kích hoạt tính năng Copilot hoặc Trợ lý ảo Lumi, prompt bạn gửi sẽ được gửi qua Google Gemini API để tạo gợi ý. Chúng tôi không sử dụng các ghi chép cá nhân của bạn để huấn luyện (train) mô hình AI công khai.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">E. Thông báo Đẩy PWA (Web Push Notification)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">Tự nguyện</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bao gồm VAPID Push Subscription Endpoint của trình duyệt. Chỉ được kích hoạt khi bạn chủ động nhấn "Cho phép thông báo" trên trình duyệt để nhận thẻ lịch trình ngoài màn hình khóa (Lock Screen Schedule Card) và chuông nhắc Pomodoro.
            </p>
          </div>
        </div>
      </section>

      {/* Box 3: Danh sách bên thứ 3 và nhà cung cấp dịch vụ */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">3. Minh Bạch Các Dịch Vụ Bên Thứ Ba Tích Hợp</h2>
            <p className="text-xs text-slate-300">Không có mã theo dõi ẩn danh trái phép hoặc trình nghe lén dữ liệu</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Dịch vụ bên thứ ba</th>
                <th className="py-2.5 px-3 font-semibold">Nhà cung cấp</th>
                <th className="py-2.5 px-3 font-semibold">Mục đích sử dụng</th>
                <th className="py-2.5 px-3 font-semibold">Địa điểm lưu trữ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Google OAuth 2.0</td>
                <td className="py-2.5 px-3">Google LLC (Hoa Kỳ)</td>
                <td className="py-2.5 px-3">Đăng nhập nhanh một chạm, xác minh email an toàn</td>
                <td className="py-2.5 px-3">Toàn cầu</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Google Gemini API</td>
                <td className="py-2.5 px-3">Google LLC (Hoa Kỳ)</td>
                <td className="py-2.5 px-3">Trợ lý AI tổng hợp công việc, tạo gợi ý phân chia mục tiêu</td>
                <td className="py-2.5 px-3">Toàn cầu</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Cơ sở dữ liệu PostgreSQL</td>
                <td className="py-2.5 px-3">Neon Cloud Serverless</td>
                <td className="py-2.5 px-3">Lưu trữ dữ liệu ứng dụng mã hóa tầng lưu trữ (At-rest Encryption)</td>
                <td className="py-2.5 px-3">Singapore / Global</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">VAPID Push Service</td>
                <td className="py-2.5 px-3">Apple / Mozilla / Google Push</td>
                <td className="py-2.5 px-3">Đẩy thông báo thời gian biểu ra màn hình khóa PWA</td>
                <td className="py-2.5 px-3">Trình duyệt thiết bị</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">SMTP Mail Service</td>
                <td className="py-2.5 px-3">Gmail / Resend</td>
                <td className="py-2.5 px-3">Gửi email kích hoạt, khôi phục mật khẩu, xác nhận xóa dữ liệu</td>
                <td className="py-2.5 px-3">Toàn cầu</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Box 4: Quyền của Chủ thể dữ liệu theo Điều 9 Nghị định 13 */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">4. Quyền Của Bạn Đối Với Dữ Liệu Cá Nhân</h2>
            <p className="text-xs text-slate-300">Căn cứ theo Điều 9 Nghị định 13/2023/NĐ-CP và Tiêu chuẩn GDPR</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">1. Quyền được biết:</span>
            <p className="text-slate-300">Bạn được thông báo minh bạch về mọi hoạt động xử lý dữ liệu qua văn bản chính sách này.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">2. Quyền đồng ý & rút lại đồng ý:</span>
            <p className="text-slate-300">Bạn có thể hủy kết nối Google hoặc thu hồi quyền thông báo PWA bất cứ lúc nào trong cài đặt.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">3. Quyền truy cập & xuất dữ liệu (Portability):</span>
            <p className="text-slate-300">Bạn có quyền tải xuống toàn bộ dữ liệu tài chính, nhiệm vụ và từ vựng ở định dạng JSON tiêu chuẩn.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">4. Quyền xóa dữ liệu (Right to Erasure):</span>
            <p className="text-slate-300">Bạn có quyền kích hoạt tính năng Xóa tài khoản vĩnh viễn, hệ thống sẽ thực hiện Cascading Delete xóa sạch toàn bộ bản ghi.</p>
          </div>
        </div>
      </section>

      {/* Box 5: Quy trình xóa tài khoản và thông tin DPO */}
      <section className="bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-800/40 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-emerald-400" />
          <span>5. Hướng Dẫn Yêu Cầu Xóa Dữ Liệu & Hỗ Trợ Pháp Lý</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Để xóa toàn bộ dữ liệu của bạn: Đăng nhập vào hệ thống $\rightarrow$ Vào mục <strong>Cài đặt tài khoản (My Account)</strong> $\rightarrow$ Kéo xuống khu vực <strong>Vùng Nguy Hiểm (Danger Zone)</strong> $\rightarrow$ Chọn <strong>"Xóa Toàn Bộ Dữ Liệu & Tài Khoản"</strong>. Sau khi xác nhận mật khẩu hoặc mã bảo vệ, toàn bộ dữ liệu của bạn sẽ được xóa ngay lập tức khỏi cơ sở dữ liệu.
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          Mọi khiếu nại, yêu cầu bảo vệ quyền riêng tư xin vui lòng gửi trực tiếp tới Cán bộ Bảo vệ Dữ liệu:
          <br />
          <strong>Email DPO:</strong> <a href={`mailto:${LEGAL_CONFIG.dpoEmail}`} className="text-emerald-400 hover:underline">{LEGAL_CONFIG.dpoEmail}</a> | <strong>Hotline:</strong> {LEGAL_CONFIG.hotline}
        </p>
      </section>
    </LegalLayout>
  );
}
