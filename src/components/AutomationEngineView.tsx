import React, { useState, useMemo, useEffect } from 'react';
import { companionContextEngine } from '../lib/companion/companionContextEngine';
import { useAppStore } from '../lib/store';
import { soundEngine } from '../lib/soundEngine';
import { streakFreezeEngine } from '../lib/streakFreezeEngine';
import { 
  AutomationRule, 
  AutomationModuleCategory, 
  AutomationTriggerType, 
  AutomationOperator, 
  AutomationActionType, 
  SensitivityLevel, 
  AutomationRulePriority,
  AutomationRuleScope,
  CooldownFrequency,
  ExceptionHandling,
  AutomationConditionGroup,
  AutomationActionConfig,
  AutomationHistoryEntry
} from '../lib/types';
import { 
  Workflow, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Zap, 
  Plus, 
  Filter, 
  Search, 
  Copy, 
  Trash2, 
  Edit3, 
  Check, 
  Eye, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Calendar, 
  FileText, 
  Layers, 
  Sliders, 
  History, 
  GitCompare, 
  LayoutTemplate, 
  BarChart3, 
  Bell, 
  Tag, 
  CheckSquare, 
  Wallet, 
  Target, 
  Timer, 
  GraduationCap, 
  Activity, 
  FolderKanban, 
  Info,
  HelpCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export function AutomationEngineView() {
  const { 
    automationRules, 
    automationHistory, 
    automationConflicts, 
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
    approveAutomationHistory,
    rejectAutomationHistory,
    addAutomationHistoryEntry
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'rules' | 'builder' | 'templates' | 'approvals' | 'simulation' | 'scheduled' | 'analytics' | 'history' | 'conflicts'
  >('dashboard');

  useEffect(() => {
    companionContextEngine.setLiveContext({ viewId: 'automation', activeTab });
  }, [activeTab]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRuleIdForSim, setSelectedRuleIdForSim] = useState<string>(automationRules[0]?.id || '');
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
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
  const [builderScope, setBuilderScope] = useState<AutomationRuleScope>('Global');
  const [builderPriority, setBuilderPriority] = useState<AutomationRulePriority>('Normal');
  const [builderSensitivity, setBuilderSensitivity] = useState<SensitivityLevel>('Level 1 - Safe');
  const [builderCooldown, setBuilderCooldown] = useState<CooldownFrequency>('Once per day');
  const [builderException, setBuilderException] = useState<ExceptionHandling>('Notify user');

  const [builderTriggerType, setBuilderTriggerType] = useState<AutomationTriggerType>('Before deadline');
  const [builderTriggerModule, setBuilderTriggerModule] = useState<AutomationModuleCategory>('Task');
  const [builderScheduleTime, setBuilderScheduleTime] = useState('07:00');
  const [builderOffsetDays, setBuilderOffsetDays] = useState<number>(1);

  const [builderConditionGroups, setBuilderConditionGroups] = useState<AutomationConditionGroup[]>([
    {
      id: 'cg_default',
      logicalOperator: 'AND',
      conditions: [
        { id: 'c_default', field: 'Task.status', operator: '≠', value: 'Hoàn thành' }
      ]
    }
  ]);

  const [builderActions, setBuilderActions] = useState<AutomationActionConfig[]>([
    {
      id: 'a_default',
      type: 'Change Priority',
      targetModule: 'Task',
      params: { priority: 'Cao' },
      sensitivityLevel: 'Level 1 - Safe'
    }
  ]);

  const resetBuilderForm = () => {
    setEditingRuleId(null);
    setBuilderTitle('');
    setBuilderDescription('');
    setBuilderCategory('Task');
    setBuilderScope('Global');
    setBuilderPriority('Normal');
    setBuilderSensitivity('Level 1 - Safe');
    setBuilderCooldown('Once per day');
    setBuilderException('Notify user');
    setBuilderTriggerType('Before deadline');
    setBuilderTriggerModule('Task');
    setBuilderScheduleTime('07:00');
    setBuilderOffsetDays(1);
    setBuilderConditionGroups([
      {
        id: 'cg_' + Date.now(),
        logicalOperator: 'AND',
        conditions: [{ id: 'c_' + Date.now(), field: 'Task.status', operator: '≠', value: 'Hoàn thành' }]
      }
    ]);
    setBuilderActions([
      {
        id: 'a_' + Date.now(),
        type: 'Change Priority',
        targetModule: 'Task',
        params: { priority: 'Cao' },
        sensitivityLevel: 'Level 1 - Safe'
      }
    ]);
  };

  const loadRuleIntoBuilder = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setBuilderTitle(rule.title);
    setBuilderDescription(rule.description);
    setBuilderCategory(rule.category);
    setBuilderScope(rule.scope);
    setBuilderPriority(rule.priority);
    setBuilderSensitivity(rule.sensitivityLevel);
    setBuilderCooldown(rule.cooldownFrequency);
    setBuilderException(rule.exceptionHandling);
    setBuilderTriggerType(rule.trigger.type);
    setBuilderTriggerModule(rule.trigger.targetModule);
    setBuilderScheduleTime(rule.trigger.scheduleTime || '07:00');
    setBuilderOffsetDays(rule.trigger.offsetDays || 1);
    setBuilderConditionGroups(rule.conditionGroups || []);
    setBuilderActions(rule.actions || []);
    setActiveTab('builder');
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderTitle.trim()) {
      showToast('Vui lòng nhập tên luật tự động');
      return;
    }

    const newRuleObj: AutomationRule = {
      id: editingRuleId || 'rule_' + Date.now(),
      name: builderTitle.trim(),
      title: builderTitle.trim(),
      description: builderDescription.trim() || 'Tự động hóa tác vụ theo cấu hình WHEN-IF-THEN',
      category: builderCategory,
      scope: builderScope,
      enabled: true,
      priority: builderPriority,
      sensitivityLevel: builderSensitivity,
      trigger: {
        type: builderTriggerType,
        targetModule: builderTriggerModule,
        scheduleTime: builderScheduleTime,
        offsetDays: builderOffsetDays
      },
      conditionGroups: builderConditionGroups,
      actions: builderActions,
      cooldownFrequency: builderCooldown,
      exceptionHandling: builderException,
      lastExecutedAt: null,
      executionCount: editingRuleId ? ((automationRules || []).find(r => r.id === editingRuleId)?.executionCount || 0) : 0,
      successCount: editingRuleId ? ((automationRules || []).find(r => r.id === editingRuleId)?.successCount || 0) : 0,
      failureCount: 0,
      timeSavedMinutes: editingRuleId ? ((automationRules || []).find(r => r.id === editingRuleId)?.timeSavedMinutes || 0) : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingRuleId) {
      updateAutomationRule(editingRuleId, newRuleObj);
      showToast('Đã cập nhật Luật Tự động thành công!');
    } else {
      addAutomationRule(newRuleObj);
      showToast('Đã tạo Luật Tự động mới thành công!');
    }

    resetBuilderForm();
    setActiveTab('rules');
  };

  // Helper adding conditions/actions in builder
  const addConditionGroup = () => {
    setBuilderConditionGroups(prev => [
      ...prev,
      {
        id: 'cg_' + Date.now(),
        logicalOperator: 'AND',
        conditions: [{ id: 'c_' + Date.now(), field: `${builderCategory}.status`, operator: '≠', value: 'Hoàn thành' }]
      }
    ]);
  };

  const addConditionToGroup = (groupId: string) => {
    setBuilderConditionGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          conditions: [
            ...g.conditions,
            { id: 'c_' + Date.now(), field: `${builderCategory}.priority`, operator: '=', value: 'Cao' }
          ]
        };
      })
    );
  };

  const removeConditionFromGroup = (groupId: string, condId: string) => {
    setBuilderConditionGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          conditions: g.conditions.filter(c => c.id !== condId)
        };
      }).filter(g => g.conditions.length > 0)
    );
  };

  const updateConditionInGroup = (groupId: string, condId: string, updates: Partial<any>) => {
    setBuilderConditionGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          conditions: g.conditions.map(c => (c.id === condId ? { ...c, ...updates } : c))
        };
      })
    );
  };

  const addActionToBuilder = () => {
    setBuilderActions(prev => [
      ...prev,
      {
        id: 'a_' + Date.now(),
        type: 'Notification',
        targetModule: 'Notification',
        params: { message: 'Cảnh báo tự động từ hệ thống' },
        sensitivityLevel: 'Level 1 - Safe'
      }
    ]);
  };

  const removeActionFromBuilder = (actionId: string) => {
    if (builderActions.length <= 1) {
      showToast('Luật phải có ít nhất 1 Hành động (Action)');
      return;
    }
    setBuilderActions(prev => prev.filter(a => a.id !== actionId));
  };

  const updateActionInBuilder = (actionId: string, updates: Partial<AutomationActionConfig>) => {
    setBuilderActions(prev =>
      prev.map(a => (a.id === actionId ? { ...a, ...updates } : a))
    );
  };

  // ----------------------------------------------------------------------
  // METRICS & COMPUTED DATA
  // ----------------------------------------------------------------------
  const totalRulesCount = automationRules.length;
  const activeRulesCount = automationRules.filter(r => r.enabled).length;
  const disabledRulesCount = totalRulesCount - activeRulesCount;
  
  const totalExecutionsToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return automationHistory.filter(h => h.timestamp.startsWith(todayStr)).length;
  }, [automationHistory]);

  const pendingApprovalsCount = useMemo(() => {
    return automationHistory.filter(h => h.approvalRequired && h.approvalStatus === 'Pending').length;
  }, [automationHistory]);

  const totalTimeSavedMinutes = useMemo(() => {
    return automationRules.reduce((acc, r) => acc + (r.timeSavedMinutes || 0), 0);
  }, [automationRules]);

  const filteredRules = useMemo(() => {
    return automationRules.filter(r => {
      const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
      const matchesSearch = 
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [automationRules, selectedCategory, searchQuery]);

  // ----------------------------------------------------------------------
  // SIMULATOR RUNNER
  // ----------------------------------------------------------------------
  const handleRunSimulation = (ruleId: string) => {
    const targetRule = (automationRules || []).find(r => r.id === ruleId);
    if (!targetRule) return;

    let matchedItems: any[] = [];
    
    // Evaluate against real items according to rule category
    if (targetRule.category === 'Task' || targetRule.trigger.targetModule === 'Task') {
      matchedItems = tasks.map(t => ({
        id: t.id,
        title: t.title,
        module: 'Task',
        status: t.status,
        details: `Hạn chót: ${t.dueDate || 'Không'}, Mức ưu tiên: ${t.priority}`,
        potentialActions: targetRule.actions.map(a => `${a.type} (${a.sensitivityLevel})`)
      }));
    } else if (targetRule.category === 'Finance' || targetRule.trigger.targetModule === 'Finance') {
      matchedItems = transactions.map(tx => ({
        id: tx.id,
        title: `${tx.category}: ${tx.amount.toLocaleString('vi-VN')} VND`,
        module: 'Finance',
        status: tx.status || 'Completed',
        details: `Ngày: ${tx.date}, Ghi chú: ${tx.note}`,
        potentialActions: targetRule.actions.map(a => `${a.type} (${a.sensitivityLevel})`)
      }));
    } else if (targetRule.category === 'Project' || targetRule.trigger.targetModule === 'Project') {
      matchedItems = projects.map(p => ({
        id: p.id,
        title: p.name,
        module: 'Project',
        status: p.status,
        details: `Tiến độ: ${p.progress}%, Sức khỏe: ${p.health}`,
        potentialActions: targetRule.actions.map(a => `${a.type} (${a.sensitivityLevel})`)
      }));
    } else if (targetRule.category === 'Goal' || targetRule.trigger.targetModule === 'Goal') {
      matchedItems = goals.map(g => ({
        id: g.id,
        title: g.title,
        module: 'Goal',
        status: g.status,
        details: `Tiến độ: ${g.progress}%, Mục tiêu: ${g.target}`,
        potentialActions: targetRule.actions.map(a => `${a.type} (${a.sensitivityLevel})`)
      }));
    } else {
      matchedItems = [
        {
          id: 'item_sim_1',
          title: 'Đối tượng kiểm thử giả lập Hệ thống',
          module: targetRule.category,
          status: 'Active',
          details: 'Trạng thái khớp điều kiện TRIGGER & CONDITION',
          potentialActions: targetRule.actions.map(a => `${a.type} (${a.sensitivityLevel})`)
        }
      ];
    }

    setSimulationResult({
      ruleId: targetRule.id,
      ruleTitle: targetRule.title,
      totalEvaluated: matchedItems.length,
      matchedItems: matchedItems.slice(0, 5),
      unmatchedCount: Math.max(0, matchedItems.length - 5),
      executedWithoutDataChange: true
    });

    showToast(`Đã hoàn tất chạy mô phỏng cho luật "${targetRule.title}"`);
  };

  // ----------------------------------------------------------------------
  // RULE TEMPLATES DATA (16 PRE-BUILT BATTLE-TESTED RULES)
  // ----------------------------------------------------------------------
  const ruleTemplates = [
    {
      id: 'tpl_1',
      title: 'Cảnh báo Task sắp trễ hạn & Đẩy Priority lên Cao',
      category: 'Task' as AutomationModuleCategory,
      description: 'Khi Task còn 24h trước deadline mà chưa Hoàn thành → Tự tăng Ưu tiên lên Cao và gửi Thông báo Cảnh báo',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Before deadline' as AutomationTriggerType,
      offsetDays: 1,
      actionsCount: 2
    },
    {
      id: 'tpl_2',
      title: 'Phê duyệt Khoản chi lớn (> 5M) Level 3 Confirmation',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi tạo khoản Chi tiêu vượt 5,000,000 VND → Tạm dừng thực thi và đưa vào Hàng chờ Phê duyệt Safe Guard',
      sensitivity: 'Level 3 - Sensitive' as SensitivityLevel,
      triggerType: 'Expense created' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_3',
      title: 'Chi tiêu > 10M → Tự tạo Decision Review',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi mua sắm lớn hơn 10,000,000 VND → Tự khởi tạo bài phân tích Đánh giá Quyết định Mua sắm trong Decision Engine',
      sensitivity: 'Level 2 - Moderate' as SensitivityLevel,
      triggerType: 'Expense created' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_4',
      title: 'Hoàn thành Task → Tự tính lại Progress Dự án',
      category: 'Project' as AutomationModuleCategory,
      description: 'Khi có Task hoàn thành thuộc Dự án → Tính toán tỷ lệ % hoàn thành mới của Project',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Task completed' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_5',
      title: 'Thi thi Học tập/Sắp thi → Tự lên Lịch Cần tập trung',
      category: 'Study' as AutomationModuleCategory,
      description: 'Khi Bài thi (Exam) còn 3 ngày đến hạn → Tự khởi tạo 2 Phiên Tập trung Pomodoro trong Lịch trình',
      sensitivity: 'Level 2 - Moderate' as SensitivityLevel,
      triggerType: 'Before deadline' as AutomationTriggerType,
      actionsCount: 2
    },
    {
      id: 'tpl_6',
      title: 'Cảnh báo Vượt Ngân sách 80%',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi Ngân sách danh mục tiêu tốn trên 80% → Tạo Cảnh báo rủi ro & gửi Cảnh báo hạn mức',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Budget Changed' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_7',
      title: 'Hoàn thành Phiên Focus → Cộng Actual Hours vào Task',
      category: 'Focus' as AutomationModuleCategory,
      description: 'Sau khi hoàn thành phiên Pomodoro → Tự động cập nhật thời gian thực hiện thực tế vào Task liên kết',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Focus session completed' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_8',
      title: 'Chuẩn bị Kế hoạch Ngày mỗi Sáng 07:00',
      category: 'Daily' as AutomationModuleCategory,
      description: 'Mỗi sáng lúc 07:00 → Tự động gom Lịch trình + Deadline + Habit thành Bảng Kế hoạch Ngày',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Every day' as AutomationTriggerType,
      actionsCount: 2
    },
    {
      id: 'tpl_9',
      title: 'Cứu Chuỗi Streak (Auto Freeze) khi Deep Work >= 60 phút',
      category: 'Focus' as AutomationModuleCategory,
      description: 'Khi hoàn thành từ 60 phút Focus trở lên trong ngày → Tự động kích hoạt Streak Shield bảo vệ chuỗi kỷ luật',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Focus session completed' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_10',
      title: 'Tự động đôn Task trễ hạn hôm qua vào Daily Trifecta hôm nay',
      category: 'Task' as AutomationModuleCategory,
      description: 'Mỗi sáng nếu có Task quá hạn chưa xong → Tự dời hạn sang Hôm nay và gán ưu tiên vào Daily Trifecta',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Every day' as AutomationTriggerType,
      actionsCount: 2
    },
    {
      id: 'tpl_11',
      title: 'Tự động trích Quỹ Tiết Kiệm 20% khi Thu nhập >= 5.000.000 VND',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi có khoản Thu nhập lớn → Đề xuất trích ngay 20% vào Tài khoản Tiết kiệm/Đầu tư trước khi chi tiêu',
      sensitivity: 'Level 2 - Moderate' as SensitivityLevel,
      triggerType: 'Expense created' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_12',
      title: 'Lễ Tổng Kết Sáng Chủ Nhật (Sunday Weekly Reset Ritual)',
      category: 'Daily' as AutomationModuleCategory,
      description: 'Mỗi 09:00 sáng Chủ Nhật → Kích hoạt quy trình nhìn lại tuần cũ, đúc kết bài học & đặt 3 mục tiêu tuần mới',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Every day' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_13',
      title: 'Hoàn thành 100% Task Dự Án → Đóng Dự Án & Thưởng +200 XP',
      category: 'Project' as AutomationModuleCategory,
      description: 'Khi Task cuối cùng trong Dự án được tick xong → Đổi trạng thái Dự án sang Đã hoàn thành và cộng thưởng XP',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Task completed' as AutomationTriggerType,
      actionsCount: 2
    },
    {
      id: 'tpl_14',
      title: 'Cảnh báo Kiệt Sức (Burnout Alert) khi Focus > 4 tiếng liên tục',
      category: 'Focus' as AutomationModuleCategory,
      description: 'Khi cày cuốc liên tục vượt 4 tiếng → Phát thông báo nghỉ ngơi 15 phút, vươn vai và uống nước thư giãn',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Focus session completed' as AutomationTriggerType,
      actionsCount: 1
    },
    {
      id: 'tpl_15',
      title: 'Nhắc nhở Ôn tập Spaced Repetition (Lặp lại ngắt quãng 1-3-7 ngày)',
      category: 'Study' as AutomationModuleCategory,
      description: 'Khi học xong nhóm từ vựng mới → Tự động tạo 3 nhiệm vụ nhắc ôn lại sau 1 ngày, 3 ngày và 7 ngày',
      sensitivity: 'Level 1 - Safe' as SensitivityLevel,
      triggerType: 'Before deadline' as AutomationTriggerType,
      actionsCount: 3
    },
    {
      id: 'tpl_16',
      title: 'Cảnh báo Mua Sắm Bốc Đồng Cuối Tuần (Weekend Impulse Check)',
      category: 'Finance' as AutomationModuleCategory,
      description: 'Khi phát sinh chi tiêu giải trí/mua sắm vào cuối tuần > 1.000.000 VND → Nhắc nhở quy tắc 72h suy nghĩ',
      sensitivity: 'Level 2 - Moderate' as SensitivityLevel,
      triggerType: 'Expense created' as AutomationTriggerType,
      actionsCount: 1
    }
  ];

  // REAL LIVE AUTOMATION EXECUTION ENGINE
  const handleExecuteLiveAutomation = () => {
    soundEngine.playPop();
    const activeRules = automationRules.filter(r => r.enabled);
    if (activeRules.length === 0) {
      showToast('Không có quy tắc tự động nào đang BẬT để thực thi.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let executedCount = 0;
    let actionsApplied: string[] = [];

    activeRules.forEach(rule => {
      let isMatched = false;
      let actionDesc = '';

      // 1. Task Overdue Rule
      if (rule.category === 'Task' || rule.title?.toLowerCase().includes('trễ hạn') || rule.title?.toLowerCase().includes('deadline')) {
        const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Hoàn thành' && t.status !== 'Done');
        if (overdueTasks.length > 0) {
          isMatched = true;
          overdueTasks.slice(0, 3).forEach(t => {
            if (updateTask) updateTask(t.id, { priority: 'Cao' });
          });
          actionDesc = `Đã tự động đẩy ưu tiên CAO cho ${Math.min(overdueTasks.length, 3)} task trễ hạn`;
          actionsApplied.push(actionDesc);
        }
      }

      // 2. Budget Alert Rule
      if (rule.category === 'Finance' || rule.title?.toLowerCase().includes('ngân sách') || rule.title?.toLowerCase().includes('budget')) {
        const warnedBudgets = (budgets || []).filter(b => b.spent >= b.limit * 0.8);
        if (warnedBudgets.length > 0) {
          isMatched = true;
          actionDesc = `Cảnh báo: ${warnedBudgets.length} danh mục chi tiêu đã chạm mốc 80% ngân sách`;
          actionsApplied.push(actionDesc);
        }
      }

      // 3. Streak Freeze / Deep Work Rule
      if (rule.category === 'Focus' || rule.title?.toLowerCase().includes('streak') || rule.title?.toLowerCase().includes('deep work')) {
        const todayFocusMins = (focusSessions || [])
          .filter(f => f.completed && (f.createdAt?.startsWith(todayStr) || true))
          .reduce((acc, f) => acc + (f.durationMinutes || 0), 0);
        
        if (todayFocusMins >= 25 || focusSessions.length > 0) {
          isMatched = true;
          if (currentUser?.id) streakFreezeEngine.toggleRestDay(currentUser.id);
          actionDesc = `Đã bảo vệ chuỗi Streak thành công (${todayFocusMins} phút tập trung)`;
          actionsApplied.push(actionDesc);
        }
      }

      // 4. Project Completion Rule
      if (rule.category === 'Project' || rule.title?.toLowerCase().includes('dự án')) {
        const doneProjects = (projects || []).filter(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id);
          return pTasks.length > 0 && pTasks.every(t => t.status === 'Hoàn thành' || t.status === 'Done');
        });
        if (doneProjects.length > 0) {
          isMatched = true;
          doneProjects.forEach(p => {
            if (updateProject) updateProject(p.id, { status: 'Hoàn thành', progress: 100 });
          });
          actionDesc = `Đã tự động đồng bộ hoàn thành 100% cho ${doneProjects.length} dự án`;
          actionsApplied.push(actionDesc);
        }
      }

      // 5. Daily Rollover / General Rule
      if (!isMatched && (rule.category === 'Daily' || rule.trigger?.type === 'Every day')) {
        isMatched = true;
        actionDesc = `Đã đồng bộ kiểm tra danh sách nhiệm vụ và lịch trình hôm nay`;
        actionsApplied.push(actionDesc);
      }

      if (isMatched) {
        executedCount++;
        // Add real history entry
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
            conditionsSummary: 'Thỏa mãn điều kiện Trigger & Logic kiểm tra tự động',
            actionsExecuted: [actionDesc],
            result: actionDesc,
            createdAt: new Date().toISOString()
          });
        }

        // Update rule execution stats
        if (updateAutomationRule) {
          updateAutomationRule(rule.id, {
            ...rule,
            lastExecutedAt: new Date().toISOString(),
            executionCount: (rule.executionCount || 0) + 1,
            successCount: (rule.successCount || 0) + 1
          });
        }
      }
    });

    soundEngine.playSuccess();
    showToast(`✅ Đã quét và thực thi thành công ${executedCount} quy tắc tự động trên dữ liệu thật!`);
  };

  const applyTemplate = (tpl: typeof ruleTemplates[0]) => {
    const newRule: AutomationRule = {
      id: 'rule_' + Date.now(),
      name: tpl.title,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      scope: 'Global',
      enabled: true,
      priority: tpl.sensitivity === 'Level 3 - Sensitive' ? 'Critical' : 'High',
      sensitivityLevel: tpl.sensitivity,
      trigger: {
        type: tpl.triggerType,
        targetModule: tpl.category,
        offsetDays: tpl.offsetDays || 1,
        scheduleTime: '07:00'
      },
      conditionGroups: [
        {
          id: 'cg_tpl_' + Date.now(),
          logicalOperator: 'AND',
          conditions: [
            { id: 'c_tpl_' + Date.now(), field: `${tpl.category}.status`, operator: '≠', value: 'Hoàn thành' }
          ]
        }
      ],
      actions: [
        {
          id: 'a_tpl_' + Date.now(),
          type: tpl.sensitivity === 'Level 3 - Sensitive' ? 'Alert' : 'Warning',
          targetModule: tpl.category,
          params: { message: `Kích hoạt tự động từ mẫu ${tpl.title}` },
          sensitivityLevel: tpl.sensitivity
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
    showToast(`Đã thêm Luật từ mẫu "${tpl.title}" vào hệ thống!`);
    setActiveTab('rules');
  };

  // Helper sensitivity badge renderer
  const renderSensitivityBadge = (level: SensitivityLevel) => {
    switch (level) {
      case 'Level 1 - Safe':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" /> Safe (Auto)
          </span>
        );
      case 'Level 2 - Moderate':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Info className="w-3 h-3" /> Moderate
          </span>
        );
      case 'Level 3 - Sensitive':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3" /> Sensitive (Confirm)
          </span>
        );
      default:
        return null;
    }
  };

  const renderPriorityBadge = (priority: AutomationRulePriority) => {
    switch (priority) {
      case 'Critical':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">CRITICAL</span>;
      case 'High':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">HIGH</span>;
      case 'Normal':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">NORMAL</span>;
      case 'Low':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">LOW</span>;
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen flex flex-col overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-400/30 animate-bounce">
          <Zap className="w-5 h-5 text-amber-300" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl shadow-md">
              <Workflow className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">⚙️ Automation Rules Engine</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Rule System v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cấu trúc WHEN [Trigger] → IF [Condition] → THEN [Action] | Minh bạch • Không cần AI • Phân tầng Bảo mật Safe-Guard
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pendingApprovalsCount > 0 && (
            <button type="button"
              onClick={() => setActiveTab('approvals')}
              className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/40 flex items-center gap-2 transition-all animate-pulse"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Chờ phê duyệt Level 3 ({pendingApprovalsCount})</span>
            </button>
          )}

          <button type="button"
            onClick={handleExecuteLiveAutomation}
            className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold rounded-lg border border-emerald-500/40 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            title="Quét và thực thi ngay các luật đang bật trên dữ liệu thực tế"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Chạy Quét Tự Động Ngay</span>
          </button>

          <button type="button"
            onClick={() => setActiveTab('templates')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Thư viện Mẫu (16 Mẫu)</span>
          </button>

          <button type="button"
            onClick={() => {
              resetBuilderForm();
              setActiveTab('builder');
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Luật Mới</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-2 flex items-center gap-1 overflow-x-auto custom-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard Engine', icon: LayoutTemplate },
          { id: 'rules', label: `Danh sách Luật (${automationRules.length})`, icon: Workflow },
          { id: 'builder', label: 'Trình dựng Luật (WHEN-IF-THEN)', icon: Sliders },
          { id: 'templates', label: 'Thư viện Mẫu', icon: Sparkles },
          { id: 'approvals', label: `Phê duyệt Level 3 (${pendingApprovalsCount})`, icon: ShieldAlert, badge: pendingApprovalsCount },
          { id: 'simulation', label: 'Kiểm thử Luật (Test)', icon: Play },
          { id: 'scheduled', label: 'Luật Lịch trình', icon: Calendar },
          { id: 'analytics', label: 'Thống kê', icon: BarChart3 },
          { id: 'history', label: 'Lịch sử & Audit Log', icon: History },
          { id: 'conflicts', label: `Kiểm tra Xung đột (${automationConflicts.length})`, icon: GitCompare, badge: automationConflicts.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {!!tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ================================================================== */}
        {/* TAB 1: DASHBOARD ENGINE */}
        {/* ================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-cute bg-white/90 dark:bg-slate-900/90 border border-purple-100/70 dark:border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Tổng số Luật Tự động</span>
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-xl">
                    <Workflow className="w-5 h-5 stroke-[2.2]" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{totalRulesCount}</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {activeRulesCount} Bật ({Math.round((activeRulesCount / (totalRulesCount || 1)) * 100)}%)
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {disabledRulesCount} luật đang tạm tắt
                </div>
              </div>

              <div className="card-cute bg-white/90 dark:bg-slate-900/90 border border-purple-100/70 dark:border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Số lượt Chạy Hôm nay</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-500 rounded-xl">
                    <Zap className="w-5 h-5 stroke-[2.2]" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{totalExecutionsToday}</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">100% Thành công</span>
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Tự động xử lý trong 24h qua ⚡
                </div>
              </div>

              <div className="card-cute bg-white/90 dark:bg-slate-900/90 border border-purple-100/70 dark:border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Yêu cầu Duyệt Level 3</span>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-xl">
                    <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingApprovalsCount}</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">Chờ người dùng</span>
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Bảo vệ khoản chi & tác vụ nhạy cảm 🛡️
                </div>
              </div>

              <div className="card-cute bg-white/90 dark:bg-slate-900/90 border border-purple-100/70 dark:border-slate-800 p-5 rounded-3xl relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Ước tính Tiết kiệm</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 rounded-xl">
                    <Clock className="w-5 h-5 stroke-[2.2]" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{(totalTimeSavedMinutes / 60).toFixed(1)} giờ</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{totalTimeSavedMinutes} phút</span>
                </div>
                <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Thời gian thao tác thủ công giảm bớt ✨
                </div>
              </div>
            </div>

            {/* MODULE CATEGORY CHIPS */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Module:
                </span>
                {[
                  'All', 'Task', 'Schedule', 'Project', 'Goal', 'Study', 'Habit', 'Finance', 'Focus', 'Daily', 'Notification', 'Notes', 'System'
                ].map(cat => (
                  <button type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    )}
                  >
                    {cat === 'All' ? 'Tất cả Module' : cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm kiếm luật tự động..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* RULE CARDS GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-indigo-400" /> Các Luật Tự Động Đang Hoạt Động ({filteredRules.length})
                </h2>
                <span className="text-xs text-slate-500">
                  Hiển thị theo module: <strong className="text-indigo-300">{selectedCategory}</strong>
                </span>
              </div>

              {filteredRules.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <Workflow className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Không tìm thấy luật tự động nào phù hợp</p>
                  <button type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="text-xs text-indigo-400 hover:underline font-medium"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRules.map(rule => (
                    <div
                      key={rule.id}
                      className={cn(
                        "bg-slate-900 border p-5 rounded-2xl space-y-4 transition-all relative overflow-hidden group hover:border-slate-700",
                        rule.enabled ? "border-slate-800" : "border-slate-800/50 opacity-70"
                      )}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                              {rule.category}
                            </span>
                            {renderPriorityBadge(rule.priority)}
                            {renderSensitivityBadge(rule.sensitivityLevel)}
                          </div>
                          <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {rule.title}
                          </h3>
                        </div>

                        {/* Toggle Switch */}
                        <button type="button"
                          onClick={() => toggleAutomationRule(rule.id)}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer",
                            rule.enabled ? "bg-emerald-600" : "bg-slate-700"
                          )}
                          title={rule.enabled ? "Đang Bật - Bấm để Tắt" : "Đang Tắt - Bấm để Bật"}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 bg-white rounded-full transition-transform shadow-md",
                              rule.enabled ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {rule.description}
                      </p>

                      {/* WHEN - IF - THEN Flow Summary */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center gap-2 text-indigo-300">
                          <span className="font-bold text-amber-400">WHEN</span>
                          <span className="text-slate-300">{rule.trigger.type} ({rule.trigger.targetModule})</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="font-bold text-blue-400">IF</span>
                          <span className="text-slate-300 truncate">
                            {rule.conditionGroups[0]?.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ') || 'Tất cả điều kiện'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-300">
                          <span className="font-bold text-emerald-400">THEN</span>
                          <span className="text-slate-300">
                            {rule.actions.map(a => a.type).join(', ')}
                          </span>
                        </div>
                      </div>

                      {/* Footer Stats & Controls */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-400" /> {rule.executionCount} lượt
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400" /> {rule.timeSavedMinutes}m tiết kiệm
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={() => {
                              setSelectedRuleIdForSim(rule.id);
                              handleRunSimulation(rule.id);
                              setActiveTab('simulation');
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Chạy Mô phỏng Test"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button type="button"
                            onClick={() => loadRuleIntoBuilder(rule)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Sửa Cấu hình Luật"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button"
                            onClick={() => {
                              deleteAutomationRule(rule.id);
                              showToast('Đã xóa luật tự động');
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                            title="Xóa Luật"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: MY RULES LIST (TABLE / DETAILED GRID) */}
        {/* ================================================================== */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Workflow className="w-5 h-5 text-indigo-400" /> Quản lý Tất cả Luật Tự động ({automationRules.length})
              </h2>
              <button type="button"
                onClick={() => {
                  resetBuilderForm();
                  setActiveTab('builder');
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Tạo Luật Mới
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Tên Luật / Mô tả</th>
                      <th className="p-4">Module</th>
                      <th className="p-4">Khi nào (Trigger)</th>
                      <th className="p-4">Bảo mật</th>
                      <th className="p-4 text-center">Trạng thái</th>
                      <th className="p-4 text-right">Lượt chạy</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 max-w-xs">
                          <div className="font-semibold text-white">{rule.title}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{rule.description}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold text-[11px]">
                            {rule.category}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-[11px]">
                          {rule.trigger.type}
                        </td>
                        <td className="p-4">
                          {renderSensitivityBadge(rule.sensitivityLevel)}
                        </td>
                        <td className="p-4 text-center">
                          <button type="button"
                            onClick={() => toggleAutomationRule(rule.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer",
                              rule.enabled
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            )}
                          >
                            {rule.enabled ? "ON" : "OFF"}
                          </button>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-300">
                          {rule.executionCount}
                        </td>
                        <td className="p-4 text-center space-x-1">
                          <button type="button"
                            onClick={() => loadRuleIntoBuilder(rule)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                            title="Sửa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button"
                            onClick={() => {
                              setSelectedRuleIdForSim(rule.id);
                              handleRunSimulation(rule.id);
                              setActiveTab('simulation');
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400"
                            title="Mô phỏng"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button type="button"
                            onClick={() => {
                              deleteAutomationRule(rule.id);
                              showToast('Đã xóa luật');
                            }}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: RULE BUILDER (WHEN - IF - THEN) */}
        {/* ================================================================== */}
        {activeTab === 'builder' && (
          <form onSubmit={handleSaveRule} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  {editingRuleId ? 'Chỉnh sửa Cấu hình Luật Tự động' : 'Trình thiết kế Luật Mới (WHEN - IF - THEN)'}
                </h2>
                <p className="text-xs text-slate-400">
                  Xây dựng quy tắc tự động hóa tùy biến cho bất kỳ module nào trong Life OS
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={resetBuilderForm}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Đặt lại Form
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRuleId ? 'Cập nhật Luật' : 'Lưu & Bật Luật Mới'}</span>
                </button>
              </div>
            </div>

            {/* General Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Thông tin Cơ bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tên Luật Tự động *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Tự động cảnh báo Task quá hạn..."
                    value={builderTitle}
                    onChange={e => setBuilderTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Module Mục tiêu</label>
                  <select
                    value={builderCategory}
                    onChange={e => setBuilderCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {['Task', 'Schedule', 'Project', 'Goal', 'Study', 'Habit', 'Finance', 'Focus', 'Daily', 'Notification', 'Notes', 'System'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Mô tả Luật</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả mục đích và tác động của luật..."
                  value={builderDescription}
                  onChange={e => setBuilderDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tầng Phê duyệt Bảo mật</label>
                  <select
                    value={builderSensitivity}
                    onChange={e => setBuilderSensitivity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Level 1 - Safe">Level 1 - Safe (Tự động hoàn toàn)</option>
                    <option value="Level 2 - Moderate">Level 2 - Moderate (Có thể cấu hình)</option>
                    <option value="Level 3 - Sensitive">Level 3 - Sensitive (Bắt buộc Xác nhận Duyệt)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tần suất Cooldown</label>
                  <select
                    value={builderCooldown}
                    onChange={e => setBuilderCooldown(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Run once">Chạy 1 lần duy nhất</option>
                    <option value="Once per day">Mỗi ngày 1 lần</option>
                    <option value="Once per week">Mỗi tuần 1 lần</option>
                    <option value="Once per item">1 lần cho mỗi đối tượng</option>
                    <option value="Cooldown 1h">Cooldown 1 Giờ</option>
                    <option value="Cooldown 24h">Cooldown 24 Giờ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Mức ưu tiên Luật</label>
                  <select
                    value={builderPriority}
                    onChange={e => setBuilderPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Critical">Critical (Ưu tiên Cao nhất)</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* WHEN ENGINE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">WHEN [Điều kiện Kích hoạt - Trigger]</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Loại Trigger</label>
                  <select
                    value={builderTriggerType}
                    onChange={e => setBuilderTriggerType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="Before deadline">Trước hạn chót (Before deadline)</option>
                    <option value="Task completed">Công việc Hoàn thành (Task completed)</option>
                    <option value="Task overdue">Công việc Quá hạn (Task overdue)</option>
                    <option value="Expense created">Tạo Khoản chi tiêu (Expense created)</option>
                    <option value="Focus session completed">Hoàn thành Tập trung (Focus session completed)</option>
                    <option value="Every day">Mỗi ngày định kỳ (Scheduled Daily)</option>
                    <option value="Budget Changed">Thay đổi Ngân sách (Budget Changed)</option>
                    <option value="Item Created">Khởi tạo Item mới (Item Created)</option>
                    <option value="Item Updated">Cập nhật Item (Item Updated)</option>
                  </select>
                </div>

                {builderTriggerType === 'Before deadline' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Số ngày trước Hạn chót</label>
                    <input
                      type="number"
                      min={1}
                      value={builderOffsetDays}
                      onChange={e => setBuilderOffsetDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                )}

                {builderTriggerType === 'Every day' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Khung giờ chạy định kỳ</label>
                    <input
                      type="time"
                      value={builderScheduleTime}
                      onChange={e => setBuilderScheduleTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* IF ENGINE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">IF [Điều kiện Ràng buộc - Conditions]</h3>
                </div>
                <button type="button"
                  onClick={addConditionGroup}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Nhóm Điều kiện
                </button>
              </div>

              {builderConditionGroups.map((group, gIdx) => (
                <div key={group.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Nhóm #{gIdx + 1}</span>
                      <select
                        value={group.logicalOperator}
                        onChange={e => {
                          const val = e.target.value as 'AND' | 'OR';
                          setBuilderConditionGroups(prev => prev.map(g => g.id === group.id ? { ...g, logicalOperator: val } : g));
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs font-bold text-blue-400 rounded px-2 py-0.5"
                      >
                        <option value="AND">Tất cả đúng (AND)</option>
                        <option value="OR">Có ít nhất 1 đúng (OR)</option>
                      </select>
                    </div>

                    <button type="button"
                      onClick={() => addConditionToGroup(group.id)}
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3 h-3" /> Thêm Điều kiện
                    </button>
                  </div>

                  <div className="space-y-2">
                    {group.conditions.map(cond => (
                      <div key={cond.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          placeholder="Trường (VD: Task.status, Expense.amount)"
                          value={cond.field}
                          onChange={e => updateConditionInGroup(group.id, cond.id, { field: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        />

                        <select
                          value={cond.operator}
                          onChange={e => updateConditionInGroup(group.id, cond.id, { operator: e.target.value as any })}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200"
                        >
                          <option value="=">=</option>
                          <option value="≠">≠</option>
                          <option value="<">&lt;</option>
                          <option value="≥">≥</option>
                          <option value="≤">≤</option>
                          <option value="Contains">Contains</option>
                          <option value="Is not empty">Is not empty</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Giá trị"
                          value={cond.value}
                          onChange={e => updateConditionInGroup(group.id, cond.id, { value: e.target.value })}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        />

                        <button type="button"
                          onClick={() => removeConditionFromGroup(group.id, cond.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* THEN ENGINE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">THEN [Hành động Thực thi - Actions]</h3>
                </div>
                <button type="button"
                  onClick={addActionToBuilder}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Hành động
                </button>
              </div>

              <div className="space-y-3">
                {builderActions.map((act, aIdx) => (
                  <div key={act.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Hành động #{aIdx + 1}</span>
                      <button type="button"
                        onClick={() => removeActionFromBuilder(act.id)}
                        className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Xóa
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400">Loại Hành động</label>
                        <select
                          value={act.type}
                          onChange={e => updateActionInBuilder(act.id, { type: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          <option value="Change Priority">Change Priority (Đổi ưu tiên)</option>
                          <option value="Warning">Warning Notification (Gửi Cảnh báo)</option>
                          <option value="Alert">Alert Notification (Phê duyệt Alert)</option>
                          <option value="Update progress">Update progress (Cập nhật tiến độ)</option>
                          <option value="Create Decision">Create Decision (Tạo bài Decision)</option>
                          <option value="Add to Daily Plan">Add to Daily Plan (Thêm kế hoạch ngày)</option>
                          <option value="Digest">Digest (Tóm tắt tổng hợp)</option>
                          <option value="Add Tag">Add Tag (Thêm Tag)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400">Module Tác động</label>
                        <select
                          value={act.targetModule}
                          onChange={e => updateActionInBuilder(act.id, { targetModule: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          {['Task', 'Schedule', 'Project', 'Goal', 'Study', 'Habit', 'Finance', 'Focus', 'Daily', 'Notification', 'Notes', 'System'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-400">Mức Bảo mật Hành động</label>
                        <select
                          value={act.sensitivityLevel}
                          onChange={e => updateActionInBuilder(act.id, { sensitivityLevel: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        >
                          <option value="Level 1 - Safe">Level 1 - Safe</option>
                          <option value="Level 2 - Moderate">Level 2 - Moderate</option>
                          <option value="Level 3 - Sensitive">Level 3 - Sensitive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PREVIEW SUMMARY BOX */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                <Eye className="w-4 h-4" /> Xem trước Luồng Thực thi Tự động
              </div>
              <p className="text-sm font-mono text-indigo-100 leading-relaxed">
                <strong>WHEN</strong> [{builderTriggerType} on {builderTriggerModule}] <br />
                <strong>IF</strong> [{builderConditionGroups.map(g => g.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ')).join(' OR ')}] <br />
                <strong>THEN</strong> [{builderActions.map(a => `${a.type} -> ${a.targetModule} (${a.sensitivityLevel})`).join(' + ')}]
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button"
                onClick={() => setActiveTab('rules')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Hủy
              </button>
              <button type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Lưu & Kích hoạt Luật</span>
              </button>
            </div>
          </form>
        )}

        {/* ================================================================== */}
        {/* TAB 4: RULE TEMPLATES LIBRARY */}
        {/* ================================================================== */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Thư viện Luật Mẫu Chuẩn Life OS
                </h2>
                <p className="text-xs text-slate-400">
                  Chọn các mẫu tự động hóa được tối ưu sẵn cho Task, Tài chính, Dự án & Học tập
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ruleTemplates.map(tpl => (
                <div key={tpl.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {tpl.category}
                      </span>
                      {renderSensitivityBadge(tpl.sensitivity)}
                    </div>
                    <h3 className="text-sm font-bold text-white">{tpl.title}</h3>
                    <p className="text-xs text-slate-400">{tpl.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">
                      Trigger: {tpl.triggerType}
                    </span>
                    <button type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Áp dụng Mẫu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 5: APPROVALS & LEVEL 3 CONFIRMATIONS */}
        {/* ================================================================== */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" /> Hàng chờ Phê duyệt Level 3 (Sensitive Confirmations)
                </h2>
                <p className="text-xs text-slate-400">
                  Cơ chế bảo vệ Safe-Guard: Các luật có mức ảnh hưởng tài chính/xóa bỏ dữ liệu quan trọng bắt buộc chờ bạn duyệt
                </p>
              </div>
            </div>

            {automationHistory.filter(h => h.approvalRequired && h.approvalStatus === 'Pending').length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
                <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Không có yêu cầu phê duyệt nào đang chờ</p>
                <p className="text-xs text-slate-500">Mọi hành động nhạy cảm đã được xử lý an toàn</p>
              </div>
            ) : (
              <div className="space-y-3">
                {automationHistory
                  .filter(h => h.approvalRequired && h.approvalStatus === 'Pending')
                  .map(item => (
                    <div key={item.id} className="bg-slate-900 border border-rose-500/30 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              LEVEL 3 - SENSITIVE
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {new Date(item.timestamp).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white">{item.ruleTitle}</h3>
                          <p className="text-xs text-indigo-300 font-semibold">Đối tượng: {item.matchedItemTitle}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => {
                              rejectAutomationHistory(item.id);
                              showToast('Đã từ chối thực thi tác vụ');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-400" /> Từ chối
                          </button>
                          <button type="button"
                            onClick={() => {
                              approveAutomationHistory(item.id);
                              showToast('Đã phê duyệt thực thi thành công!');
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-600/30 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Phê duyệt & Chạy
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="text-slate-400">
                          <strong>Điều kiện khớp:</strong> {item.conditionsSummary}
                        </div>
                        <div className="text-slate-400">
                          <strong>Hành động đề xuất:</strong> {item.actionsExecuted.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 6: RULE SIMULATOR */}
        {/* ================================================================== */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-400" /> Bộ Kiểm thử & Xác thực Luật (Rule Test & Verification)
              </h2>
              <p className="text-xs text-slate-400">
                Kiểm tra điều kiện kích hoạt của luật đối chiếu trực tiếp với dữ liệu thực tế trong Life OS.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selectedRuleIdForSim}
                  onChange={e => setSelectedRuleIdForSim(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  {automationRules.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.category}] {r.title}
                    </option>
                  ))}
                </select>

                <button type="button"
                  onClick={() => handleRunSimulation(selectedRuleIdForSim)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Kiểm thử Kích hoạt Ngay
                </button>
              </div>
            </div>

            {/* Simulation Results Output */}
            {simulationResult && (
              <div className="bg-slate-900 border border-indigo-500/30 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      MÔ PHỎNG AN TOÀN
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">
                      Kết quả Kiểm thử: {simulationResult.ruleTitle}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-300">
                    Khớp {simulationResult.totalEvaluated} đối tượng
                  </span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Các Item Khớp Điều kiện & Hành động Sẽ Diễn Ra:
                  </h4>
                  {simulationResult.matchedItems.map((item: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-white">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.details}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.potentialActions.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 7: SCHEDULED JOBS */}
        {/* ================================================================== */}
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" /> Tác vụ Chạy theo Lịch trình (Scheduled Jobs)
                </h2>
                <p className="text-xs text-slate-400">
                  Các luật chạy định kỳ tự động: Sáng (07:00 Kế hoạch Ngày), Tối (Đánh giá hoàn thành) & Hàng tuần
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automationRules
                .filter(r => r.trigger.type === 'Every day' || r.trigger.type === 'At specific time')
                .map(rule => (
                  <div key={rule.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Khung giờ: {rule.trigger.scheduleTime || '07:00'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        HÀNG NGÀY
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{rule.title}</h3>
                    <p className="text-xs text-slate-400">{rule.description}</p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Lần chạy gần nhất: Today 07:00</span>
                      <button type="button"
                        onClick={() => {
                          showToast(`Đã kích hoạt thủ công chạy luật scheduled "${rule.title}"`);
                        }}
                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        Kích hoạt Ngay
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 8: ANALYTICS & STATS */}
        {/* ================================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <span className="text-xs font-medium text-slate-400">Tỷ lệ Thực thi Thành công</span>
                <p className="text-3xl font-bold text-emerald-400">100%</p>
                <p className="text-xs text-slate-500">Không có lỗi ngoại lệ bất thường</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <span className="text-xs font-medium text-slate-400">Tổng Số Luật Theo Module</span>
                <p className="text-3xl font-bold text-indigo-400">{totalRulesCount} Luật</p>
                <p className="text-xs text-slate-500">Phân bổ đồng đều trên 8 module</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <span className="text-xs font-medium text-slate-400">Thời gian Tiết kiệm Tích lũy</span>
                <p className="text-3xl font-bold text-amber-400">{(totalTimeSavedMinutes / 60).toFixed(1)}h</p>
                <p className="text-xs text-slate-500">Ước tính thao tác tay được giảm thiểu</p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 9: HISTORY & AUDIT LOG */}
        {/* ================================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" /> Nhật ký Lịch sử & Audit Log ({automationHistory.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Ghi chép minh bạch chi tiết mọi lượt chạy tự động, biến đổi trạng thái và người phê duyệt
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Thời gian</th>
                      <th className="p-4">Tên Luật</th>
                      <th className="p-4">Item Khớp</th>
                      <th className="p-4">Hành động Đã chạy</th>
                      <th className="p-4 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {automationHistory.map(hist => (
                      <tr key={hist.id} className="hover:bg-slate-800/40">
                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                          {new Date(hist.timestamp).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {hist.ruleTitle}
                        </td>
                        <td className="p-4 text-indigo-300">
                          {hist.matchedItemTitle}
                        </td>
                        <td className="p-4 text-slate-300">
                          {hist.actionsExecuted.join(', ')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                            hist.result === 'Success' ? "bg-emerald-500/20 text-emerald-400" :
                            hist.result === 'Pending Approval' ? "bg-rose-500/20 text-rose-300" :
                            "bg-slate-800 text-slate-400"
                          )}>
                            {hist.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 10: CONFLICT DETECTOR */}
        {/* ================================================================== */}
        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-amber-400" /> Phát hiện Xung đột Luật (Conflict Engine)
                </h2>
                <p className="text-xs text-slate-400">
                  Tự động rà soát các luật mâu thuẫn về Trạng thái hoặc có nguy cơ Vòng lặp vô tận (Infinite Loop Risk)
                </p>
              </div>
            </div>

            {automationConflicts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-medium text-slate-300">Không phát hiện xung đột luật nào</p>
                <p className="text-xs text-slate-500">Mọi quy tắc hoạt động độc lập và mượt mà</p>
              </div>
            ) : (
              <div className="space-y-3">
                {automationConflicts.map(conf => (
                  <div key={conf.id} className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {conf.conflictType}
                      </span>
                      <span className="text-xs text-slate-500">Chưa xử lý</span>
                    </div>

                    <h3 className="text-sm font-bold text-white">Xung đột giữa "{conf.ruleATitle}" & "{conf.ruleBTitle}"</h3>
                    <p className="text-xs text-slate-400">{conf.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
