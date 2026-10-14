import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { WorkspaceMode } from '../lib/types';
import { 
  Check, 
  ArrowRight, 
  User, 
  GraduationCap, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Target, 
  Wallet, 
  FolderKanban, 
  BookOpen, 
  Loader2, 
  Layers,
  Zap
} from 'lucide-react';
import { analytics } from '../lib/analytics';

const steps = [
  { id: 'purpose', title: 'Mục đích' },
  { id: 'domain', title: 'Lĩnh vực' },
  { id: 'goals', title: 'Mục tiêu' },
  { id: 'schedule', title: 'Thời gian' },
  { id: 'budget', title: 'Ngân sách' },
  { id: 'finish', title: 'Hoàn tất' }
];

export function OnboardingView() {
  const { completeOnboarding, setWorkspaceMode, setOnboardingPreferences, onboardingPreferences, setCurrentView } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selections, setSelections] = useState({
    purpose: onboardingPreferences?.purpose || '',
    domain: onboardingPreferences?.domain || '',
    focus: onboardingPreferences?.focus || ([] as string[]),
    schedule: onboardingPreferences?.schedule || '',
    budget: onboardingPreferences?.budget || ''
  });

  const updateSelections = (updater: (prev: typeof selections) => typeof selections) => {
    setSelections(prev => {
      const next = updater(prev);
      setOnboardingPreferences(next);
      return next;
    });
  };

  const handleNext = async () => {
    // Sync to global state
    setOnboardingPreferences(selections);
    analytics.track('onboarding_step_completed', { step: currentStep, stepId: steps[currentStep]?.id });

    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      setIsSubmitting(true);
      try {
        // Determine workspace mode based on selections
        let targetMode: WorkspaceMode = 'Advanced';
        if (selections.purpose === 'simple') {
          targetMode = 'Simple';
        } else if (selections.purpose === 'pro') {
          targetMode = 'Power';
        } else if (selections.domain === 'worker') {
          targetMode = 'Work';
        } else if (selections.domain === 'student') {
          targetMode = 'Personal';
        }
        
        // Immediately apply layout & mode to global state
        setWorkspaceMode(targetMode);
        setCurrentView('dashboard');
        
        analytics.track('onboarding_completed', { targetMode, selections });
        await completeOnboarding(selections);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleQuickSkip = async () => {
    setIsSubmitting(true);
    try {
      const defaultSelections = {
        purpose: 'standard',
        domain: 'worker',
        focus: ['Công việc', 'Tài chính'],
        schedule: 'standard',
        budget: '5.000.000 - 10.000.000 ₫'
      };
      setWorkspaceMode('Work');
      setCurrentView('dashboard');
      analytics.track('onboarding_completed', { skipped: true, targetMode: 'Work' });
      await completeOnboarding(defaultSelections);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to preview what will be generated
  const getDomainDetails = () => {
    switch (selections.domain) {
      case 'student':
        return {
          title: 'Học sinh / Sinh viên',
          projectName: 'Kế hoạch Học tập & Phát triển Kỹ năng',
          tasks: ['Tổng hợp giáo trình & đề cương kỳ này', 'Lập thời khóa biểu học & bài tập tuần', 'Luyện tập Tiếng Anh chuyên ngành'],
          subjects: ['Toán & Tư duy Logic (MATH101)', 'Tiếng Anh & Giao tiếp (ENG201)']
        };
      case 'freelancer':
        return {
          title: 'Freelancer / Creator',
          projectName: 'Dự án Khách hàng & Phát triển Thương hiệu',
          tasks: ['Chuẩn bị báo giá & hợp đồng khách mới', 'Lên lịch nội dung & cập nhật portfolio', 'Nghiệm thu dự án & đối soát thanh toán'],
          subjects: []
        };
      default:
        return {
          title: 'Người đi làm',
          projectName: 'Dự án Công việc & Tối ưu Năng suất',
          tasks: ['Lập kế hoạch OKR và đầu việc trọng tâm tuần', 'Tối ưu quy trình & checklist bàn giao', 'Tổng hợp báo cáo tuần và đề xuất cải tiến'],
          subjects: []
        };
    }
  };

  const getBudgetValue = () => {
    if (selections.budget.includes('Dưới 5')) return 4500000;
    if (selections.budget.includes('5.000.000')) return 8000000;
    if (selections.budget.includes('10.000.000')) return 15000000;
    if (selections.budget.includes('Trên 20')) return 25000000;
    return 8000000;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Khảo sát cá nhân hóa LifeOS
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Chào mừng đến với LifeOS</h2>
            <p className="text-slate-500 mb-6">Bạn muốn hệ thống tự động cấu hình theo định hướng nào?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => updateSelections(s => ({ ...s, purpose: 'simple' }))}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${selections.purpose === 'simple' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900">Đơn giản & Tập trung</h3>
                  {selections.purpose === 'simple' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-slate-500">Chỉ quản lý công việc, lịch trình và thói quen cốt lõi mỗi ngày.</p>
              </button>

              <button 
                type="button"
                onClick={() => updateSelections(s => ({ ...s, purpose: 'full' }))}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${selections.purpose === 'full' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">Hệ thống toàn diện</h3>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Khuyên dùng</span>
                  </div>
                  {selections.purpose === 'full' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-slate-500">Quản lý cả tài chính, học tập, thói quen, dự án và mục tiêu chiến lược.</p>
              </button>

              <button 
                type="button"
                onClick={() => updateSelections(s => ({ ...s, purpose: 'pro' }))}
                className={`p-6 rounded-2xl border-2 text-left transition-all md:col-span-2 ${selections.purpose === 'pro' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">Power User & Chuyên sâu</h3>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Tối đa sức mạnh</span>
                  </div>
                  {selections.purpose === 'pro' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                </div>
                <p className="text-sm text-slate-500">Kích hoạt quy trình làm việc nâng cao: Tự động hóa tác vụ, Động cơ ra quyết định và Kho dữ liệu mở rộng.</p>
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Định hình không gian làm việc</h2>
            <p className="text-slate-500 mb-6">Vai trò chính của bạn là gì? Hệ thống sẽ tạo cấu trúc dự án & công việc mẫu tương ứng.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { 
                  id: 'student', 
                  icon: GraduationCap, 
                  label: 'Học sinh / Sinh viên', 
                  desc: 'Theo dõi môn học, thời khóa biểu, ôn thi & bài tập' 
                },
                { 
                  id: 'worker', 
                  icon: Briefcase, 
                  label: 'Người đi làm', 
                  desc: 'Quản lý OKR, dự án cơ quan, báo cáo tuần & họp' 
                },
                { 
                  id: 'freelancer', 
                  icon: User, 
                  label: 'Freelancer / Creator', 
                  desc: 'Hợp đồng, tiến độ khách hàng, portfolio & thanh toán' 
                }
              ].map(item => (
                <button 
                  key={item.id}
                  type="button"
                  onClick={() => updateSelections(s => ({ ...s, domain: item.id }))}
                  className={`p-6 rounded-2xl border-2 flex flex-col items-center text-center gap-3 transition-all ${selections.domain === item.id ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm' : 'border-slate-200 hover:border-blue-200 bg-white text-slate-700'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selections.domain === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm text-slate-900">{item.label}</span>
                  <span className="text-xs text-slate-500 leading-relaxed">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Bạn muốn cải thiện điều gì nhất?</h2>
            <p className="text-slate-500 mb-6">Chọn các mục tiêu ưu tiên (chúng tôi sẽ tạo thói quen & thước đo mục tiêu tự động):</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Quản lý thời gian tốt hơn', sub: 'Tạo thói quen lập 3 việc quan trọng (MIT) & mục tiêu Deep Work' },
                { name: 'Theo dõi chi tiêu', sub: 'Tạo thói quen ghi chép chi tiêu & Quỹ dự phòng tài chính' },
                { name: 'Xây dựng thói quen', sub: 'Kích hoạt theo dõi uống nước 2L & vận động thể chất mỗi ngày' },
                { name: 'Cân bằng cuộc sống', sub: 'Kích hoạt thói quen ngủ trước 23h & đọc sách cuối ngày' },
                { name: 'Đạt điểm cao', sub: 'Tạo mục tiêu thành tích học tập xuất sắc học kỳ này' },
                { name: 'Tăng thu nhập', sub: 'Mục tiêu tài chính và tối ưu hoá thời gian làm việc hiệu quả' },
                { name: 'Giảm tải công việc', sub: 'Tập trung vào các khung giờ vàng và loại bỏ việc phân tâm' }
              ].map(item => {
                const isSelected = selections.focus.includes(item.name);
                return (
                  <button 
                    key={item.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        updateSelections(s => ({ ...s, focus: s.focus.filter(f => f !== item.name) }));
                      } else {
                        updateSelections(s => ({ ...s, focus: [...s.focus, item.name] }));
                      }
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Thiết lập Lịch biểu & Khung giờ vàng</h2>
            <p className="text-slate-500 mb-6">Bạn làm việc hoặc học tập tập trung nhất vào khoảng thời gian nào?</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { time: 'Sáng (6:00 - 11:00)', desc: 'Tập trung cao độ buổi sáng, lên kế hoạch và xử lý việc quan trọng nhất.' },
                { time: 'Chiều (13:00 - 17:00)', desc: 'Khung giờ xử lý việc vận hành, thảo luận công việc và bài tập trọng tâm.' },
                { time: 'Tối (18:00 - 22:00)', desc: 'Khung giờ học tập thêm, đọc sách, nghiên cứu và phát triển kỹ năng.' },
                { time: 'Đêm (Sau 22:00)', desc: 'Thời gian tĩnh lặng để tập trung sáng tạo, lập kế hoạch và review ngày.' }
              ].map(item => (
                <button 
                  key={item.time}
                  type="button"
                  onClick={() => updateSelections(s => ({ ...s, schedule: item.time }))}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${selections.schedule === item.time ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-medium shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`w-4 h-4 ${selections.schedule === item.time ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm text-slate-900">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Thiết lập Hạn mức Ngân sách tháng</h2>
            <p className="text-slate-500 mb-6">Mức chi tiêu hàng tháng dự kiến của bạn (hệ thống sẽ tự phân bổ theo quy tắc 50/30/20):</p>
            
            <div className="grid grid-cols-1 gap-3.5">
              {[
                { range: 'Dưới 5.000.000đ', val: '4.500.000đ/tháng', note: 'Phù hợp sinh viên tiết kiệm, chi tiêu thiết yếu & học tập.' },
                { range: '5.000.000đ - 10.000.000đ', val: '8.000.000đ/tháng', note: 'Mức phổ biến cho người mới đi làm hoặc sinh viên năm cuối.' },
                { range: '10.000.000đ - 20.000.000đ', val: '15.000.000đ/tháng', note: 'Cân đối đầy đủ sinh hoạt, phát triển cá nhân và quỹ tích lũy.' },
                { range: 'Trên 20.000.000đ', val: '25.000.000đ/tháng', note: 'Mức chi tiêu cao, đầu tư, đa dạng hóa tài khoản & tài sản.' }
              ].map(item => (
                <button 
                  key={item.range}
                  type="button"
                  onClick={() => updateSelections(s => ({ ...s, budget: item.range }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selections.budget === item.range ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selections.budget === item.range ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{item.range}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.note}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {item.val}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        const domainInfo = getDomainDetails();
        const budgetValue = getBudgetValue();

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">Không gian của bạn đã sẵn sàng được kích hoạt!</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Layout: {selections.purpose === 'simple' ? 'Tinh gọn & Tập trung' : selections.purpose === 'pro' ? 'Power User Chuyên sâu' : 'Toàn diện'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    Vai trò: {domainInfo.title}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {selections.focus.length} Mục tiêu ưu tiên
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Dự án & Nhiệm vụ */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-blue-900">
                  <FolderKanban className="w-4 h-4 text-blue-600" />
                  Dự án & Nhiệm vụ ({domainInfo.title})
                </div>
                <div className="text-xs font-semibold text-slate-800 mb-1.5">{domainInfo.projectName}</div>
                <ul className="text-xs text-slate-600 space-y-1 pl-3 list-disc">
                  {domainInfo.tasks.map((task, idx) => (
                    <li key={idx}>{task}</li>
                  ))}
                </ul>
                {domainInfo.subjects.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200/50 text-[11px] text-blue-800">
                    <span className="font-semibold">Môn học kích hoạt:</span> {domainInfo.subjects.join(', ')}
                  </div>
                )}
              </div>

              {/* Box 2: Ngân sách & Tài chính */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-emerald-900">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Ngân sách tháng ({budgetValue.toLocaleString('vi-VN')} đ)
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Ăn uống & Sinh hoạt (45%):</span>
                    <span className="font-semibold text-slate-800">{Math.round(budgetValue * 0.45).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Học tập & Phát triển (25%):</span>
                    <span className="font-semibold text-slate-800">{Math.round(budgetValue * 0.25).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quỹ Tiết kiệm (20%):</span>
                    <span className="font-semibold text-slate-800">{Math.round(budgetValue * 0.20).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Giải trí (10%):</span>
                    <span className="font-semibold text-slate-800">{Math.round(budgetValue * 0.10).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Thói quen & Mục tiêu */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-amber-900">
                  <Target className="w-4 h-4 text-amber-600" />
                  Thói quen & Mục tiêu ({selections.focus.length} tiêu chí)
                </div>
                <div className="text-xs text-slate-600">
                  {selections.focus.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selections.focus.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-medium text-[11px]">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>Tự động kích hoạt các thói quen năng suất & cân bằng cuộc sống.</span>
                  )}
                </div>
              </div>

              {/* Box 4: Lịch biểu */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm text-purple-900">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Lịch biểu & Giờ vàng Deep Work
                </div>
                <div className="text-xs text-slate-700 font-semibold mb-1">
                  {selections.schedule || 'Sáng (6:00 - 11:00)'}
                </div>
                <p className="text-xs text-slate-500">
                  Hệ thống đã thêm sự kiện Deep Work tương ứng vào Lịch trình cá nhân của bạn.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 0 && !selections.purpose) return true;
    if (currentStep === 1 && !selections.domain) return true;
    if (currentStep === 2 && selections.focus.length === 0) return true;
    if (currentStep === 3 && !selections.schedule) return true;
    if (currentStep === 4 && !selections.budget) return true;
    return false;
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-3.5 sm:p-6 font-sans w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="w-full max-w-2xl min-w-0">
        {/* Progress Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto no-scrollbar w-full min-w-0">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${currentStep >= idx ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {currentStep > idx ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : idx + 1}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block ${currentStep >= idx ? 'text-blue-900' : 'text-slate-400'}`}>
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 min-w-3 sm:min-w-6 h-1 rounded-full ${currentStep > idx ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 p-4 sm:p-10 mb-6 sm:mb-8 min-h-0 sm:min-h-[440px] flex flex-col justify-center w-full min-w-0">
          {renderStepContent()}
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              className={`px-4 sm:px-6 py-3 font-medium text-slate-500 hover:text-slate-900 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
            >
              Quay lại
            </button>
            {currentStep < steps.length - 1 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleQuickSkip}
                className="text-xs font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 transition-colors cursor-pointer"
              >
                Bỏ qua & dùng cấu hình mẫu
              </button>
            )}
          </div>
          
          <button 
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled() || isSubmitting}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm
              ${isNextDisabled() || isSubmitting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang khởi tạo không gian...</span>
              </>
            ) : currentStep === steps.length - 1 ? (
              <>
                <span>Bắt đầu sử dụng</span>
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <span>Tiếp tục</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
