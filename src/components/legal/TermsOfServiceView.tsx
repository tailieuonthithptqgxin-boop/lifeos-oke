import React from 'react';
import { LegalLayout } from './LegalLayout';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Scale } from 'lucide-react';
import { LEGAL_CONFIG } from '../../lib/legalConfig';

interface TermsOfServiceViewProps {
  onNavigate: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'home') => void;
}

export function TermsOfServiceView({ onNavigate }: TermsOfServiceViewProps) {
  return (
    <LegalLayout
      title="Điều Khoản Dịch Vụ & Thỏa Thuận Sử Dụng"
      subtitle={`Quy định chi tiết các quyền lợi, trách nhiệm và thỏa thuận pháp lý giữa bạn (Người dùng) và ${LEGAL_CONFIG.ownerName} khi truy cập và sử dụng nền tảng ${LEGAL_CONFIG.appName} (${LEGAL_CONFIG.appDomain}).`}
      activeTab="terms"
      onNavigate={onNavigate}
    >
      {/* Box 1: Quyền sở hữu dữ liệu */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">1. Quyền Sở Hữu Dữ Liệu Thuộc 100% Về Người Dùng</h2>
            <p className="text-xs text-slate-300">Nguyên tắc cốt lõi: Bạn là chủ nhân duy nhất của dữ liệu bạn tạo ra</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Mọi ghi chú, nhiệm vụ, dự án P.A.R.A, mục tiêu cá nhân, giao dịch tài chính và tiến độ học tập bạn nhập vào {LEGAL_CONFIG.appName} là <strong>tài sản sở hữu trí tuệ và bí mật riêng tư của riêng bạn</strong>. {LEGAL_CONFIG.appName} không có quyền sở hữu, không thương mại hóa, và không chuyển nhượng các dữ liệu này cho bất kỳ bên thứ ba nào. Bạn có toàn quyền tải về (xuất file JSON/CSV) hoặc xóa sạch dữ liệu khỏi máy chủ bất cứ khi nào bạn muốn.
        </p>
      </section>

      {/* Box 2: Giới hạn trách nhiệm quan trọng */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">2. Tuyên Bố Giới Hạn Trách Nhiệm (Disclaimer)</h2>
            <p className="text-xs text-slate-300">Vui lòng đọc kỹ trước khi sử dụng các phân hệ Tài chính và Trợ lý Trí tuệ Nhân tạo (AI)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>A. Giới hạn trách nhiệm đối với Phân hệ Quản lý Tài chính:</span>
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Phân hệ Tài chính trên {LEGAL_CONFIG.appName} là một <strong>công cụ kỹ thuật số hỗ trợ người dùng tự ghi chép, theo dõi ngân sách và tổng hợp biểu đồ dòng tiền cá nhân</strong>. Hệ thống <strong>không phải là</strong> tổ chức tư vấn tài chính, dịch vụ môi giới đầu tư hay đại lý kế toán/thuế được cấp phép. Các biểu đồ, phân tích tỷ lệ chi tiêu hay cảnh báo bội chi hoàn toàn dựa trên dữ liệu do chính bạn tự nhập. Chúng tôi không chịu trách nhiệm đối với bất kỳ quyết định đầu tư, tổn thất tài chính hay sai sót số liệu nào phát sinh từ việc sử dụng công cụ này.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>B. Giới hạn trách nhiệm đối với Gợi ý từ Trí Tuệ Nhân Tạo (Gemini AI / Copilot):</span>
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Các tính năng trợ lý ảo, phân chia mục tiêu, gợi ý thói quen hoặc hỗ trợ soạn thảo được vận hành thông qua các mô hình ngôn ngữ lớn (LLM). Bạn thừa nhận rằng các gợi ý từ AI chỉ mang tính chất <strong>tham khảo ý tưởng và hỗ trợ kích thích năng suất</strong>. Bạn tự chịu trách nhiệm đánh giá tính chính xác, phù hợp và an toàn trước khi áp dụng bất kỳ gợi ý nào vào công việc hoặc đời sống thực tế.
            </p>
          </div>
        </div>
      </section>

      {/* Box 3: Quy tắc sử dụng tài khoản & hành vi nghiêm cấm */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">3. Quy Tắc Sử Dụng & Hành Vi Bị Nghiêm Cấm</h2>
            <p className="text-xs text-slate-300">Đảm bảo môi trường làm việc văn minh, an toàn cho toàn bộ cộng đồng</p>
          </div>
        </div>

        <ul className="text-xs text-slate-300 space-y-2.5">
          <li className="flex items-start gap-2.5">
            <span className="text-rose-400 font-bold shrink-0">✕</span>
            <span>Không chia sẻ tài khoản đăng nhập cho nhiều người dùng chung để trục lợi tài nguyên gói PRO/TEAM.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-rose-400 font-bold shrink-0">✕</span>
            <span>Không tấn công từ chối dịch vụ (DDoS), quét lỗ hổng bảo mật hoặc can thiệp trái phép vào hệ thống API.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-rose-400 font-bold shrink-0">✕</span>
            <span>Không khai thác tự động (crawling/scraping) tài nguyên flashcard, âm thanh thiền định, hay mã nguồn của hệ thống.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-rose-400 font-bold shrink-0">✕</span>
            <span>Không phát tán nội dung vi phạm pháp luật Việt Nam, vi phạm thuần phong mỹ tục hoặc bản quyền sở hữu trí tuệ của người khác.</span>
          </li>
        </ul>
      </section>

      {/* Box 4: Sở hữu trí tuệ của nền tảng */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>4. Quyền Sở Hữu Trí Tuệ Của Nền Tảng LifeOS</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Giao diện Bento Grid, nhãn hiệu <strong>LifeOS</strong>, hình ảnh nhận diện linh vật <strong>Bé Lumi</strong>, hệ thống âm thanh Pomodoro và mã nguồn phần mềm đều thuộc quyền sở hữu trí tuệ độc quyền của {LEGAL_CONFIG.ownerName}. Nghiêm cấm mọi hành vi sao chép, làm giả thương hiệu hoặc phân phối lại vì mục đích thương mại mà không có văn bản chấp thuận trước.
        </p>
      </section>

      {/* Box 5: Luật điều chỉnh và Cơ quan tài phán */}
      <section className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span>5. Luật Áp Dụng & Giải Quyết Tranh Chấp</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Thỏa thuận dịch vụ này được điều chỉnh và giải thích theo quy định của pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh từ hoặc liên quan đến thỏa thuận này trước tiên sẽ được giải quyết thông qua thương lượng hòa giải. Trường hợp không đạt được thỏa thuận trong vòng 30 ngày, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại Việt Nam.
        </p>
      </section>
    </LegalLayout>
  );
}
