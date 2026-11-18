import React from 'react';
import { LegalLayout } from './LegalLayout';
import { RefreshCw, CheckCircle2, Clock, Mail, ShieldAlert, AlertTriangle, Bug } from 'lucide-react';
import { LEGAL_CONFIG } from '../../lib/legalConfig';

interface RefundPolicyViewProps {
  onNavigate: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'home') => void;
}

export function RefundPolicyView({ onNavigate }: RefundPolicyViewProps) {
  return (
    <LegalLayout
      title="Chính Sách Hoàn Tiền (Điều Kiện Do Lỗi Kỹ Thuật Hệ Thống)"
      subtitle={`Quy định minh bạch về điều kiện hoàn tiền cho các dịch vụ và gói tài khoản (PRO & TEAM) trên ${LEGAL_CONFIG.appName}. Chúng tôi chỉ chấp thuận hoàn tiền đối với các sự cố kỹ thuật phát sinh từ phía website không thể khắc phục được.`}
      activeTab="refund"
      onNavigate={onNavigate}
    >
      {/* Box 1: Nguyên tắc hoàn tiền cốt lõi */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">1. Nguyên Tắc Hoàn Tiền Cốt Lõi</h2>
            <p className="text-xs text-slate-300">Chỉ áp dụng hoàn tiền đối với sự cố kỹ thuật từ hệ thống website</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-slate-200 leading-relaxed space-y-2">
          <p>
            <strong>Chính sách quy định rõ ràng:</strong> {LEGAL_CONFIG.appName} <strong>chỉ thực hiện hoàn tiền trong trường hợp lỗi phát sinh từ phía hệ thống website</strong> mà đội ngũ kỹ thuật của chúng tôi không thể khắc phục hoặc không thể cung cấp quyền truy cập tính năng như đã cam kết.
          </p>
          <p className="text-amber-300/90 font-medium">
            ⚠️ <strong>Hệ thống tuyệt đối KHÔNG chấp thuận hoàn tiền nếu yêu cầu không có lý do xác đáng hoặc xuất phát từ lý do cá nhân</strong> (ví dụ: đổi ý, không muốn dùng nữa, mua nhầm nhưng hệ thống vẫn hoạt động bình thường, hoặc thiết bị cá nhân của bạn không tương thích).
          </p>
        </div>
      </section>

      {/* Box 2: Các trường hợp chấp thuận hoàn tiền do lỗi kỹ thuật */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Bug className="w-4 h-4 text-emerald-400" />
          <span>2. Các Trường Hợp Được Chấp Thuận Hoàn Tiền (Do Lỗi Từ Web)</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">✓ Lỗi kích hoạt gói tính năng sau khi đã thanh toán thành công:</span>
            <p className="text-slate-300">
              Bạn đã chuyển khoản hoặc thanh toán thành công, có biên lai đối soát hợp lệ nhưng hệ thống máy chủ bị lỗi không thể kích hoạt tài khoản PRO/TEAM và đội ngũ kỹ thuật không thể hỗ trợ kích hoạt thủ công cho bạn trong vòng 48 giờ làm việc.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">✓ Sự cố trừ tiền trùng lặp từ cổng thanh toán (Duplicate Charge):</span>
            <p className="text-slate-300">
              Do lỗi kết nối kỹ thuật giữa website và cổng thanh toán khiến bạn bị trừ tiền nhiều lần cho cùng một gói dịch vụ trong cùng một thời điểm.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">✓ Sự cố gián đoạn dịch vụ nghiêm trọng do máy chủ LifeOS:</span>
            <p className="text-slate-300">
              Hệ thống máy chủ LifeOS bị lỗi sập toàn bộ dịch vụ cốt lõi kéo dài liên tục trên 72 giờ mà không có kế hoạch bảo trì trước, làm ảnh hưởng nghiêm trọng đến dữ liệu của bạn.
            </p>
          </div>
        </div>
      </section>

      {/* Box 3: Các trường hợp từ chối hoàn tiền */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>3. Các Trường Hợp Tuyệt Đối Không Áp Dụng Hoàn Tiền</span>
        </h2>

        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2.5 text-xs text-slate-300">
          <p className="font-bold text-rose-300">Hệ thống sẽ từ chối hoàn tiền trong các trường hợp sau:</p>
          <ul className="space-y-2 pl-4 list-disc marker:text-rose-400">
            <li>
              <strong>Không có lý do rõ ràng hoặc vì lý do chủ quan từ người dùng:</strong> Đổi ý định, không còn nhu cầu học tập/quản lý, thấy giao diện không hợp sở thích cá nhân, hoặc đã sử dụng xong mục đích cá nhân.
            </li>
            <li>
              <strong>Lỗi xuất phát từ phía người dùng hoặc bên thứ ba:</strong> Thiết bị cá nhân bị hỏng, trình duyệt cũ không hỗ trợ, kết nối internet của người dùng chập chờn, hoặc thông tin chuyển khoản sai cú pháp dẫn đến chậm trễ đối soát.
            </li>
            <li>
              <strong>Tài khoản có dấu hiệu vi phạm chính sách:</strong> Cố tình khai thác lỗ hổng, gian lận thanh toán, chia sẻ tài khoản trái phép hoặc vi phạm Điều khoản Dịch vụ của LifeOS.
            </li>
            <li>
              <strong>Yêu cầu gửi quá thời hạn 7 ngày:</strong> Kể từ ngày phát sinh giao dịch hoặc lỗi kỹ thuật.
            </li>
          </ul>
        </div>
      </section>

      {/* Box 4: Quy trình tiếp nhận qua Gmail hỗ trợ */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-400" />
          <span>4. Kênh Tiếp Nhận & Quy Trình Xử Lý Hoàn Tiền Do Lỗi Kỹ Thuật</span>
        </h2>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs text-slate-300">
          <p>
            Mọi yêu cầu liên quan đến lỗi kỹ thuật và đề nghị hoàn tiền phải được gửi chính thức qua hòm thư điện tử:
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Hòm thư Gmail tiếp nhận hỗ trợ:</span>
              <a 
                href={`mailto:${LEGAL_CONFIG.supportEmail}`} 
                className="text-sm sm:text-base font-black text-emerald-400 hover:text-emerald-300 hover:underline tracking-wide"
              >
                {LEGAL_CONFIG.supportEmail}
              </a>
            </div>
            <a
              href={`mailto:${LEGAL_CONFIG.supportEmail}?subject=Yeu%20Cau%20Hoan%20Tien%20Do%20Loi%20Ky%20Thuat`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer self-start sm:self-auto"
            >
              Soạn email ngay
            </a>
          </div>

          <div className="space-y-1.5 pt-2">
            <span className="font-bold text-white block">Email cần bao gồm đầy đủ các thông tin:</span>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
              <li>Email tài khoản LifeOS của bạn.</li>
              <li>Biên lai chuyển khoản hoặc mã giao dịch ngân hàng thành công.</li>
              <li>Mô tả chi tiết và hình ảnh/video bằng chứng về lỗi kỹ thuật gặp phải trên website.</li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            ⏱️ Đội ngũ kỹ thuật sẽ kiểm tra nhật ký máy chủ (server logs), đối soát giao dịch và phản hồi kết quả trong vòng <strong>24 - 48 giờ làm việc</strong>. Nếu xác nhận lỗi do website không thể xử lý, số tiền sẽ được hoàn trả đầy đủ vào tài khoản ngân hàng của bạn trong 3 - 5 ngày làm việc.
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
