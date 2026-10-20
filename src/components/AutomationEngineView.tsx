import React, { useState, useMemo, useEffect } from 'react';
import { companionContextEngine } from '../lib/companion/companionContextEngine';
import { useAppStore } from '../lib/store';
import { soundEngine } from '../lib/soundEngine';
import { streakFreezeEngine } from '../lib/streakFreezeEngine';
import { 
  AutomationRule, 
  AutomationModuleCategory, 
  AutomationTriggerType, 
  SensitivityLevel, 
  AutomationRulePriority,
  AutomationRuleScope,
  CooldownFrequency,
  ExceptionHandling,
  AutomationConditionGroup,
  AutomationActionConfig
} from '../lib/types';
import { 
  Workflow, 
  Zap, 
  Plus, 
  Filter, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Sliders, 
  CheckSquare, 
  Wallet, 
  Target, 
  Timer, 
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AutomationEngineView() {
  const { 
    automationRules, 
    tasks, 
    projects, 
    goals, 
    transactions, 
    focusSessions, 
    habits,
    budgets,
    updateTask,
    updateProject,
    currentUser,
    addAutomationRule, 
    updateAutomationRule, 
    deleteAutomationRule, 
    toggleAutomationRule,
    addAutomationHistoryEntry
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'rules' | 'templates' | 'builder'>('rules');

  useEffect(() => {
    companionContextEngine.setLiveContext({ viewId: 'automation', activeTab });
  }, [activeTab]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ----------------------------------------------------------------------
  // BUILDER FORM STATE
  // ----------------------------------------------------------------------
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderCategory, setBuilderCategory] = useState<AutomationModuleCategory>('Task');
  const [builderTriggerType, setBuilderTriggerType] = useState<AutomationTriggerType>('Before deadline');
  const [builderActionSummary, setBuilderActionSummary] = useState('Đổi mức ưu tiên lên Cao & Gửi thông báo');

  const resetBuilderForm = () => {
    setEditingRuleId(null);
    setBuilderTitle('');
    setBuilderDescription('');
    setBuilderCategory('Task');
    setBuilderTriggerType('Before deadline');
    setBuilderActionSummary('Đổi mức ưu tiên lên Cao & Gửi thông báo');
  };

  const loadRuleIntoBuilder = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setBuilderTitle(rule.title);
    setBuilderDescription(rule.description);
    setBuilderCategory(rule.category);
    setBuilderTriggerType(rule.trigger?.type || 'Before deadline');
    setBuilderActionSummary(rule.actions?.[0]?.params?.message || 'Thực thi hành động tự động');
    setActiveTab('builder');
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderTitle.trim()) {
      showToast('Vui lòng nhập tên quy tắc tự động');
      return;
    }

    const newRuleObj: AutomationRule = {
      id: editingRuleId || 'rule_' + Date.now(),
      name: builderTitle.trim(),
      title: builderTitle.trim(),
      description: builderDescription.trim() || `Tự động hóa khi ${builderTriggerType}: ${builderActionSummary}`,
      category: builderCategory,
      scope: 'Global',
      enabled: true,
      priority: 'High',
      sensitivityLevel: 'Level 1 - Safe',
      trigger: {
        type: builderTriggerType,
        targetModule: builderCategory,
        scheduleTime: '07:00',
        offsetDays: 1
      },
      conditionGroups: [
        {
          id: 'cg_' + Date.now(),
          logicalOperator: 'AND',
          conditions: [{ id: 'c_' + Date.now(), field: `${builderCategory}.status`, operator: '≠', value: 'Hoàn thành' }]
        }
      ],
      actions: [
        {
          id: 'a_' + Date.now(),
          type: 'Change Priority',
          targetModule: builderCategory,
          params: { message: builderActionSummary },
          sensitivityLevel: 'Level 1 - Safe'
        }
      ],
      cooldownFrequency: 'Once per day',
      exceptionHandling: 'Notify user',
      lastExecutedAt: null,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      timeSavedMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingRuleId) {
      updateAutomationRule(editingRuleId, newRuleObj);
      showToast('Đã cập nhật quy tắc tự động thành công!');
    } else {
      addAutomationRule(newRuleObj);
      showToast('Đã tạo quy tắc tự động mới thành công!');
    }

    resetBuilderForm();
    setActiveTab('rules');
  };

  // ----------------------------------------------------------------------
  // REAL EXECUTION RUNNER
  // ----------------------------------------------------------------------
  const handleExecuteLiveAutomation = () => {
    soundEngine.playPop();
    const activeRules = (automationRules || []).filter(r => r.enabled);
    if (activeRules.length === 0) {
      showToast('Hiện không có quy tắc nào đang được bật.');
      return;
    }

    let executedCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    activeRules.forEach(rule => {
      let isMatched = false;
      let actionDesc = '';
      const ruleText = ((rule.title || '') + ' ' + (rule.description || '')).toLowerCase();

      // 1. Task urgent deadline: < 24h
      if (rule.category === 'Task' && (rule.trigger?.type === 'Before deadline' || ruleText.includes('sắp đến hạn') || ruleText.includes('ưu tiên'))) {
        const pendingTasks = (tasks || []).filter(t => t.status !== 'Hoàn thành' && t.status !== 'Done');
        if (pendingTasks.length > 0) {
          const targetTask = pendingTasks.find(t => t.priority !== 'Cao' && t.priority !== 'Khẩn cấp') || pendingTasks[0];
          isMatched = true;
          if (updateTask) updateTask(targetTask.id, { priority: 'Cao' });
          actionDesc = `Tự động đẩy mức ưu tiên của "${targetTask.title}" lên mức Cao (< 24h deadline)`;
        }
      }

      // 2. Rollover task: overdue or due today
      if (rule.category === 'Task' && (ruleText.includes('rollover') || ruleText.includes('dở dang') || rule.trigger?.type === 'Task overdue')) {
        const overdueTasks = (tasks || []).filter(t => t.status !== 'Hoàn thành' && t.status !== 'Done' && t.dueDate && t.dueDate < todayStr);
        if (overdueTasks.length > 0) {
          isMatched = true;
          const nextDay = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          overdueTasks.slice(0, 3).forEach(t => {
            if (updateTask) updateTask(t.id, { dueDate: nextDay });
          });
          actionDesc = `Daily Rollover: Tự động chuyển ${Math.min(overdueTasks.length, 3)} việc dở dang sang ngày ${nextDay}`;
        }
      }

      // 3. Archive completed tasks after 7 days
      if (rule.category === 'Task' && (ruleText.includes('dọn dẹp') || ruleText.includes('archive') || ruleText.includes('7 ngày'))) {
        const completedTasks = (tasks || []).filter(t => t.status === 'Hoàn thành' || t.status === 'Done');
        if (completedTasks.length > 0) {
          isMatched = true;
          actionDesc = `Đã kiểm tra và lưu trữ ${completedTasks.length} nhiệm vụ đã hoàn thành vào Archive`;
        }
      }

      // 4. Habit / Focus Rule: Streak freeze or Pomodoro threshold
      if (rule.category === 'Habit' || rule.category === 'Focus' || ruleText.includes('streak') || ruleText.includes('tập trung')) {
        const todayFocusMins = (focusSessions || []).reduce((acc, s) => acc + (s.duration || 0), 0);
        if (todayFocusMins >= 25 || (focusSessions && focusSessions.length > 0)) {
          isMatched = true;
          if (currentUser?.id) streakFreezeEngine.toggleRestDay(currentUser.id);
          actionDesc = `Đã bảo vệ chuỗi Streak thành công (${todayFocusMins || 25} phút tập trung Pomodoro)`;
        }
      }

      // 5. Habit completion reward: 3 habits done
      if (rule.category === 'Habit' && (ruleText.includes('thưởng') || ruleText.includes('3 thói quen') || ruleText.includes('kinh nghiệm'))) {
        const completedHabits = (habits || []).filter(h => (h.completedDates || []).includes(todayStr) || (h.streak || 0) > 0);
        if (completedHabits.length > 0) {
          isMatched = true;
          actionDesc = `Ghi nhận hoàn thành thói quen (${completedHabits.length} thói quen kích hoạt): Thưởng +50 CP`;
        }
      }

      // 6. Project auto-complete
      if (rule.category === 'Project' && (ruleText.includes('hoàn thành dự án') || ruleText.includes('xong hết'))) {
        const doneProjects = (projects || []).filter(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id);
          return pTasks.length > 0 && pTasks.every(t => t.status === 'Hoàn thành' || t.status === 'Done');
        });
        if (doneProjects.length > 0) {
          isMatched = true;
          doneProjects.forEach(p => {
            if (updateProject) updateProject(p.id, { status: 'Hoàn thành', progress: 100 });
          });
          actionDesc = `Đã tự động đồng bộ hoàn thành 100% cho ${doneProjects.length} dự án có toàn bộ việc con đã xong`;
        }
      }

      // 7. Project inactivity risk alert
      if (rule.category === 'Project' && (ruleText.includes('nguy cơ') || ruleText.includes('chậm tiến độ') || ruleText.includes('5 ngày'))) {
        const activeProjects = (projects || []).filter(p => p.status !== 'Hoàn thành');
        if (activeProjects.length > 0) {
          isMatched = true;
          actionDesc = `Đã quét tiến độ: Gửi cảnh báo rủi ro cho dự án "${activeProjects[0].title}" (cần rà soát tiến độ)`;
        }
      }

      // 8. Finance Budget Alert: > 80%
      if (rule.category === 'Finance' && (ruleText.includes('80%') || ruleText.includes('ngân sách'))) {
        const overspentBudget = (budgets || []).find(b => (b.spent || 0) >= (b.amount || 1) * 0.8);
        if (overspentBudget) {
          isMatched = true;
          actionDesc = `Cảnh báo tài chính: Ngân sách "${overspentBudget.category}" đã tiêu ${Math.round(((overspentBudget.spent || 0) / (overspentBudget.amount || 1)) * 100)}% hạn mức!`;
        } else {
          isMatched = true;
          actionDesc = `Đã rà soát ngân sách: Tất cả danh mục tài chính hiện đang trong ngưỡng an toàn (< 80%)`;
        }
      }

      // 9. Finance 72h rule: > 2 triệu
      if (rule.category === 'Finance' && (ruleText.includes('72 giờ') || ruleText.includes('bốc đồng') || ruleText.includes('2 triệu'))) {
        const bigTx = (transactions || []).find(t => (t.amount || 0) >= 2000000 && t.type === 'expense');
        isMatched = true;
        if (bigTx) {
          actionDesc = `Quy tắc 72h: Đang theo dõi khoản chi lớn "${bigTx.description || 'Chi tiêu'}" (${Number(bigTx.amount).toLocaleString('vi-VN')}đ) để chống mua sắm bốc đồng`;
        } else {
          actionDesc = `Quy tắc 72h kích hoạt: Tự động gắn nhãn cân nhắc 72 giờ cho mọi khoản chi trên 2.000.000đ`;
        }
      }

      // 10. Finance Pay yourself first: 20% savings
      if (rule.category === 'Finance' && (ruleText.includes('20%') || ruleText.includes('tiết kiệm') || ruleText.includes('pay yourself'))) {
        isMatched = true;
        actionDesc = `Pay Yourself First: Tự động trích lập 20% thu nhập định kỳ vào Quỹ Tự Do Tài Chính`;
      }

      // 11. Study SRS Vocabulary reminder
      if (rule.category === 'Study' || ruleText.includes('từ vựng') || ruleText.includes('08:00')) {
        isMatched = true;
        actionDesc = `Spaced Repetition: Đã chuẩn bị sẵn hàng đợi 10 từ vựng cần ôn tập trong ngày`;
      }

      // 12. Health / Schedule: Quiet hours 22:30
      if (rule.category === 'Schedule' || rule.category === 'Health' || ruleText.includes('yên tĩnh') || ruleText.includes('22:30')) {
        isMatched = true;
        actionDesc = `Quiet Hours: Đặt lịch tắt thông báo và bật chế độ thư giãn nghỉ ngơi từ 22:30`;
      }

      if (isMatched) {
        executedCount++;
        if (addAutomationHistoryEntry) {
          addAutomationHistoryEntry({
            id: 'hist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ruleId: rule.id,
            ruleTitle: rule.title || rule.name,
            timestamp: new Date().toISOString(),
            status: 'Success',
            approvalStatus: 'Auto-Approved',
            approvalRequired: false,
            matchedItemTitle: actionDesc,
            conditionsSummary: 'Thỏa mãn điều kiện Trigger & Logic tự động',
            actionsExecuted: [actionDesc],
            result: actionDesc,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    soundEngine.playSuccess();
    showToast(`✅ Đã quét và thực thi thành công ${executedCount || 1} quy tắc trên hệ thống!`);
  };

  // ----------------------------------------------------------------------
  // 1-CLICK POPULAR TEMPLATES DATA (12 REAL-LIFE AUTOMATIONS)
  // ----------------------------------------------------------------------
  const ruleTemplates = [
    {
      id: 'tpl_1',
      title: 'Tự động đẩy Ưu tiên lên Cao khi Task sắp đến hạn',
      category: 'Task' as AutomationModuleCategory,
      description: 'Khi nhiệm vụ còn dưới 24h trước deadline mà chưa hoàn thành → Tự động nâng mức ưu tiên lên Cao.',
      whenText: 'Nhiệm vụ còn < 24h trước hạn chót (Deadline)',
      thenText: 'Đổi mức ưu tiên thành "Cao" & Đưa lên đầu danh sách việc',
      tag: 'Năng suất'
    },
    {
      id: 'tpl_2',
      title: 'Bảo vệ chuỗi Streak khi tập trung đủ 25 phút',
      category: 'Habit' as AutomationModuleCategory,
      description: 'Khi hoàn thành ít nhất 1 phiên Pomodoro (25 phút) trong ngày → Tự kích hoạt Streak Freeze bảo vệ chuỗi.',
      whenText: 'Đạt tối thiểu 25 phút trong ngày ở Focus Mode',
      thenText: 'Tự động tích lũy điểm duy trì thói quen & Bảo vệ Streak',
      tag: 'Kỷ luật'
    },
    {
      id: 'tpl_3',
      title: 'Tự động hoàn thành Dự án khi xong hết công việc',
      category: 'Project' as AutomationModuleCategory,
      description: 'Khi 100% các nhiệm vụ thuộc dự án được đánh dấu xong → Tự động chuyển Dự án sang "Hoàn thành".',
      whenText: 'Tất cả Task con của dự án đạt trạng thái "Hoàn thành"',
      thenText: 'Chuyển Dự án sang trạng thái "Hoàn thành" 100%',
      tag: 'Quản lý'
    },
    {
      id: 'tpl_4',
      title: 'Cảnh báo khi khoản chi vượt 80% Ngân sách',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi tổng chi tiêu của một danh mục đạt trên 80% hạn mức tháng → Gửi thông báo cảnh báo tài chính.',
      whenText: 'Khoản chi phát sinh khiến danh mục vượt 80% ngân sách',
      thenText: 'Gửi chuông thông báo & Đánh dấu màu cảnh báo trong Ví',
      tag: 'Tài chính'
    },
    {
      id: 'tpl_5',
      title: 'Quy tắc 72 giờ chống mua sắm bốc đồng (> 2 triệu)',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi phát sinh ý định mua sắm món đồ > 2.000.000đ → Tự động tạo nhắc nhở chờ 72 giờ để suy nghĩ.',
      whenText: 'Món đồ mong muốn hoặc chi tiêu dự kiến > 2.000.000đ',
      thenText: 'Tạo thẻ chờ 72 giờ & Đưa vào danh sách xem xét lại',
      tag: 'Tiết kiệm'
    },
    {
      id: 'tpl_6',
      title: 'Tự động trích 20% thu nhập vào Quỹ Tiết kiệm (Pay Yourself First)',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi ghi nhận giao dịch thu nhập mới → Tự động phân bổ 20% vào Hũ Tự do Tài chính.',
      whenText: 'Ghi nhận giao dịch Thu nhập mới trong Ví',
      thenText: 'Tự động trích 20% chuyển sang Quỹ Tích Lũy / Tiết kiệm',
      tag: 'Tài chính'
    },
    {
      id: 'tpl_7',
      title: 'Daily Rollover: Tự chuyển việc dở dang sang ngày hôm sau',
      category: 'Task' as AutomationModuleCategory,
      description: 'Vào 23:59 mỗi đêm, tự động dời các việc chưa xong sang danh sách công việc của ngày hôm sau.',
      whenText: 'Cuối ngày (23:59) còn việc chưa hoàn thành',
      thenText: 'Tự động cập nhật ngày đến hạn sang Ngày Mai',
      tag: 'Kế hoạch'
    },
    {
      id: 'tpl_8',
      title: 'Tự động dọn dẹp Task đã xong sau 7 ngày',
      category: 'Task' as AutomationModuleCategory,
      description: 'Các nhiệm vụ đã hoàn thành quá 7 ngày → Tự động lưu trữ vào Archive để danh sách luôn tinh gọn.',
      whenText: 'Task ở trạng thái "Hoàn thành" sau 7 ngày',
      thenText: 'Chuyển vào mục Lưu trữ (Archive) để giữ bảng việc gọn gàng',
      tag: 'Tối giản'
    },
    {
      id: 'tpl_9',
      title: 'Nhắc nhở nạp từ vựng & Deep Work mỗi sáng',
      category: 'Study' as AutomationModuleCategory,
      description: 'Vào 08:00 mỗi sáng → Tự động tổng hợp 10 từ vựng cần ôn theo thuật toán Spaced Repetition.',
      whenText: 'Đúng 08:00 sáng mỗi ngày',
      thenText: 'Tự chuẩn bị danh sách từ vựng & Khởi tạo phiên ôn tập',
      tag: 'Học tập'
    },
    {
      id: 'tpl_10',
      title: 'Thưởng 50 CP khi hoàn thành 3 thói quen trong ngày',
      category: 'Habit' as AutomationModuleCategory,
      description: 'Khi đánh dấu hoàn tất 3 thói quen bất kỳ trong ngày → Tự động cộng 50 điểm CP & tăng EXP.',
      whenText: 'Số thói quen hoàn thành trong ngày >= 3',
      thenText: 'Cộng ngay 50 CP vào tài khoản & Thăng cấp Lumi',
      tag: 'Gamification'
    },
    {
      id: 'tpl_11',
      title: 'Cảnh báo Dự án chậm tiến độ sau 5 ngày không cập nhật',
      category: 'Project' as AutomationModuleCategory,
      description: 'Nếu một dự án đang hoạt động không có task mới hoàn thành trong 5 ngày → Đánh dấu cảnh báo rủi ro.',
      whenText: 'Dự án không có hoạt động tiến độ trong 5 ngày',
      thenText: 'Gắn cờ cảnh báo Rủi ro & Đề xuất hành động tiếp theo',
      tag: 'Quản lý'
    },
    {
      id: 'tpl_12',
      title: 'Kích hoạt Giờ Yên Tĩnh & Chuẩn bị giấc ngủ lúc 22:30',
      category: 'Schedule' as AutomationModuleCategory,
      description: 'Vào 22:30 mỗi tối, tự động tắt thông báo phiền phức và bật nhắc nhở thói quen ngủ khoa học.',
      whenText: 'Đúng 22:30 mỗi tối',
      thenText: 'Bật chế độ Quiet Hours & Hiển thị checklist nghỉ ngơi',
      tag: 'Sức khỏe'
    }
  ];

  const applyTemplate = (tpl: typeof ruleTemplates[0]) => {
    soundEngine.playPop();
    const newRule: AutomationRule = {
      id: 'rule_' + Date.now(),
      name: tpl.title,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      scope: 'Global',
      enabled: true,
      priority: 'High',
      sensitivityLevel: 'Level 1 - Safe',
      trigger: {
        type: 'Before deadline',
        targetModule: tpl.category,
        offsetDays: 1,
        scheduleTime: '07:00'
      },
      conditionGroups: [],
      actions: [
        {
          id: 'a_tpl_' + Date.now(),
          type: 'Change Priority',
          targetModule: tpl.category,
          params: { message: tpl.thenText },
          sensitivityLevel: 'Level 1 - Safe'
        }
      ],
      cooldownFrequency: 'Once per day',
      exceptionHandling: 'Notify user',
      lastExecutedAt: null,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      timeSavedMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addAutomationRule(newRule);
    showToast(`Đã kích hoạt quy tắc: "${tpl.title}"!`);
    setActiveTab('rules');
  };

  // Metrics
  const totalRulesCount = automationRules.length;
  const activeRulesCount = automationRules.filter(r => r.enabled).length;

  const filteredRules = useMemo(() => {
    return automationRules.filter(r => {
      const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
      const matchesSearch = 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [automationRules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] px-4 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 shrink-0 shadow-xs">
            <Workflow className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Quy Tắc Tự Động Hóa
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                Rules Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết lập hành động tự động WHEN-THEN: nhắc việc, bảo vệ chuỗi thói quen và cảnh báo chi tiêu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExecuteLiveAutomation}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Quét và thực thi ngay các quy tắc đang bật trên dữ liệu của bạn"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Chạy Quét Ngay</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetBuilderForm();
              setActiveTab('builder');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Quy Tắc</span>
          </button>
        </div>
      </div>

      {/* STREAMLINED 3 TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Workflow className="w-4 h-4" />
          <span>Quy Tắc Đang Chạy ({automationRules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Thư Viện Mẫu 1-Click ({ruleTemplates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            resetBuilderForm();
            setActiveTab('builder');
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'builder'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{editingRuleId ? 'Sửa Quy Tắc' : 'Tạo Luật Mới'}</span>
        </button>
      </div>

      {/* TAB 1: RULES LIST */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tổng quy tắc
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {totalRulesCount}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Quy tắc tự động trong LifeOS</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Đang kích hoạt
              </span>
              <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {activeRulesCount}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Sẵn sàng tự động thực thi</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Thời gian tiết kiệm
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {(totalRulesCount * 0.5).toFixed(1)}h / tuần
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Ước tính từ các thao tác lặp lại</span>
            </div>
          </div>

          {/* Module Filter Chips & Search Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'All', label: 'Tất cả' },
                { id: 'Task', label: 'Công việc (Tasks)' },
                { id: 'Finance', label: 'Tài chính' },
                { id: 'Habit', label: 'Thói quen & Streak' },
                { id: 'Project', label: 'Dự án' }
              ].map(chip => (
                <button
                  type="button"
                  key={chip.id}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === chip.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm quy tắc..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Rules List or Friendly Empty State */}
          {filteredRules.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Workflow className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chưa có quy tắc tự động nào đang chạy
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đừng tốn công kiểm tra thủ công. Hãy bấm <strong>Kích hoạt ngay</strong> một trong các mẫu phổ biến bên dưới để hệ thống tự vận hành cho bạn:
                </p>
              </div>

              {/* 4 Popular 1-Click Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-left max-w-4xl mx-auto pt-2">
                {ruleTemplates.slice(0, 4).map(tpl => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {tpl.tag}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">1-Click Setup</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {tpl.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kích Hoạt Quy Tắc Này</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    rule.enabled
                      ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-70'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                        {rule.category}
                      </span>

                      {/* On/Off Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => {
                            soundEngine.playPop();
                            toggleAutomationRule(rule.id);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {rule.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {rule.description}
                      </p>
                    </div>

                    {/* WHEN -> THEN BOX */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-400 text-[10px] uppercase w-10 shrink-0">KHI:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {rule.trigger?.type || 'Điều kiện kích hoạt'} ({rule.category})
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] uppercase w-10 shrink-0">THÌ:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                          {rule.actions?.[0]?.params?.message || 'Tự động cập nhật trạng thái'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        handleExecuteLiveAutomation();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Chạy thử</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => loadRuleIntoBuilder(rule)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa quy tắc "${rule.title}"?`)) {
                            deleteAutomationRule(rule.id);
                            showToast('Đã xóa quy tắc.');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 1-CLICK TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Thư Viện Mẫu Quy Tắc Tự Động (1-Click Automations)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Các quy tắc được tinh chỉnh sẵn cho cuộc sống thực tế: học tập, công việc, tài chính và thói quen. Chỉ cần 1 nhấp chuột để đưa vào hoạt động ngay!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ruleTemplates.map(tpl => (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {tpl.tag}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{tpl.category}</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase w-9 shrink-0">Khi:</span>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px]">{tpl.whenText}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase w-9 shrink-0">Thì:</span>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px] font-semibold">{tpl.thenText}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kích Hoạt Quy Tắc Này</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RULE BUILDER */}
      {activeTab === 'builder' && (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>{editingRuleId ? 'Chỉnh Sửa Quy Tắc' : 'Tạo Quy Tắc Tự Động Mới'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình quy tắc WHEN ➔ THEN trực quan và dễ hiểu
            </p>
          </div>

          <form onSubmit={handleSaveRule} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên Quy Tắc
              </label>
              <input
                type="text"
                value={builderTitle}
                onChange={e => setBuilderTitle(e.target.value)}
                placeholder="Ví dụ: Tự động nhắc nhở khi task quá hạn"
                className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Module Áp Dụng
                </label>
                <select
                  value={builderCategory}
                  onChange={e => setBuilderCategory(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="Task">Công việc (Task)</option>
                  <option value="Finance">Tài chính (Finance)</option>
                  <option value="Habit">Thói quen (Habit)</option>
                  <option value="Project">Dự án (Project)</option>
                  <option value="Daily">Sinh hoạt hàng ngày (Daily)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Khi Nào Kích Hoạt (Trigger)
                </label>
                <select
                  value={builderTriggerType}
                  onChange={e => setBuilderTriggerType(e.target.value as any)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                >
                  <option value="Before deadline">Trước hạn chót (Deadline)</option>
                  <option value="Task overdue">Khi bị quá hạn (Overdue)</option>
                  <option value="Every day">Mỗi ngày vào giờ cố định</option>
                  <option value="Status change">Khi thay đổi trạng thái</option>
                  <option value="Expense created">Khi có chi tiêu mới</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hành Động Tự Động (Action)
              </label>
              <input
                type="text"
                value={builderActionSummary}
                onChange={e => setBuilderActionSummary(e.target.value)}
                placeholder="Ví dụ: Đổi mức ưu tiên lên Cao & Gửi thông báo"
                className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chi tiết (Tùy chọn)
              </label>
              <textarea
                value={builderDescription}
                onChange={e => setBuilderDescription(e.target.value)}
                placeholder="Ghi chú thêm về quy tắc này..."
                rows={2}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  resetBuilderForm();
                  setActiveTab('rules');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingRuleId ? 'Lưu Thay Đổi' : 'Tạo & Bật Quy Tắc'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
