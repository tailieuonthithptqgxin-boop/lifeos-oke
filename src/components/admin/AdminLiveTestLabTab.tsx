import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Server,
  Mail,
  ShieldAlert,
  Database,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Clock,
  Send,
  Zap,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Wrench,
  Flame,
  ArrowRight
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { AdminConfirmModal } from './AdminConfirmModal';
import {
  ARMY_CORPS,
  TestCaseResult,
  executeAll100RealTests,
  executeSingleRealTest,
  purgeAllTestData
} from '../../lib/e2eTruthEngine';

export function AdminLiveTestLabTab() {
  const [loading, setLoading] = useState(false);
  const [globalFreeMode, setGlobalFreeMode] = useState<boolean>(false);
  const [freeModeLoading, setFreeModeLoading] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isProcessing?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // =========================================================================
  // 1000 AGENT & 100 E2E MUTATION TESTS STATE
  // =========================================================================
  const [e2eResults, setE2eResults] = useState<Record<string, TestCaseResult>>(() => {
    try {
      const cached = localStorage.getItem('lifeos_e2e_results');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return {};
  });

  const [isRunningE2E, setIsRunningE2E] = useState(false);
  const [e2eProgress, setE2eProgress] = useState({ current: 0, total: 100, activeName: '' });
  const [selectedCorpsFilter, setSelectedCorpsFilter] = useState<number | 'all'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsedCorps, setCollapsedCorps] = useState<Record<number, boolean>>({});
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState<string | null>(null);

  // Compute test stats
  const totalExecuted = Object.keys(e2eResults).length;
  const passedCount = useMemo(() => {
    return Object.values(e2eResults).filter(r => r.status === 'passed').length;
  }, [e2eResults]);

  const failedCount = useMemo(() => {
    return Object.values(e2eResults).filter(r => r.status === 'failed').length;
  }, [e2eResults]);

  // Handle run all 100 tests
  const handleRunAll100Tests = async () => {
    setIsRunningE2E(true);
    setPurgeSuccessMsg(null);
    setE2eProgress({ current: 0, total: 100, activeName: 'Đang chuẩn bị 1000 AI Agent...' });

    try {
      toast.info('Đã xuất kích 1.000 AI Agent qua 10 Quân Đoàn kiểm định...');
      const results = await executeAll100RealTests((current, total, result) => {
        setE2eProgress({ current, total, activeName: `${result.id}: ${result.name}` });
        setE2eResults(prev => {
          const updated = { ...prev, [result.id]: result };
          try {
            localStorage.setItem('lifeos_e2e_results', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      });

      const allPassed = results.every(r => r.status === 'passed');
      if (allPassed) {
        toast.success('XUẤT SẮC: Toàn bộ 100/100 Bài Test ĐẠT THẬT 100%! Không có dữ liệu ảo.');
      } else {
        toast.warning(`Hoàn thành 100 bài test: ${results.filter(r => r.status === 'passed').length} Đạt, ${results.filter(r => r.status === 'failed').length} Cần chỉnh`);
      }
    } catch (err: any) {
      toast.error('Lỗi khi chạy bộ kiểm định: ' + err.message);
    } finally {
      setIsRunningE2E(false);
    }
  };

  // Run single test
  const handleRunSingleTest = async (testId: string) => {
    try {
      const res = await executeSingleRealTest(testId);
      setE2eResults(prev => {
        const updated = { ...prev, [res.id]: res };
        try {
          localStorage.setItem('lifeos_e2e_results', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      if (res.status === 'passed') {
        toast.success(`[🟢 ĐẠT THẬT] ${res.id}: ${res.name}`);
      } else {
        toast.error(`[🔴 LỆCH] ${res.id}: ${res.evidence}`);
      }
    } catch (err: any) {
      toast.error('Lỗi kiểm tra bài test: ' + err.message);
    }
  };

  // Purge test data
  const handlePurgeTestData = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Dọn sạch dữ liệu vừa Test để Up Cloudflare',
      description: (
        <div className="space-y-2 text-xs">
          <p>
            Bạn có chắc chắn muốn xóa sạch toàn bộ các bản ghi thử nghiệm vừa sinh ra trong quá trình chạy 100 bài test?
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium">
            🛡️ <strong>Bảo Vệ Dữ Liệu Vàng 100%:</strong> Tài khoản chính, mật khẩu, số dư CTV, chuỗi ngày Streak, thời gian học và kho từ vựng sẽ được giữ nguyên vẹn tuyệt đối!
          </div>
        </div>
      ),
      confirmLabel: 'Xóa sạch & Đưa web về trạng thái Sạch',
      variant: 'warning',
      onConfirm: async () => {
        setIsPurging(true);
        try {
          const res = await purgeAllTestData();
          if (res.success) {
            setPurgeSuccessMsg(res.message);
            toast.success('Hệ thống đã được làm sạch 100%, sẵn sàng triển khai Cloudflare!');
          } else {
            toast.error(res.message);
          }
        } catch (err: any) {
          toast.error('Lỗi dọn dẹp: ' + err.message);
        } finally {
          setIsPurging(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Toggle accordion
  const toggleCorpsCollapse = (corpsId: number) => {
    setCollapsedCorps(prev => ({ ...prev, [corpsId]: !prev[corpsId] }));
  };

  // Filtered Corps
  const displayedCorps = useMemo(() => {
    return ARMY_CORPS.filter(c => {
      if (selectedCorpsFilter !== 'all' && c.id !== selectedCorpsFilter) return false;
      return true;
    }).map(c => {
      let tests = c.tests;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        tests = tests.filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
      }
      return { ...c, tests };
    }).filter(c => c.tests.length > 0);
  }, [selectedCorpsFilter, searchFilter]);

  // =========================================================================
  // EXISTING TOOLS: HEALTH, SMTP, POLICY SIMULATION, QUEUE
  // =========================================================================
  // Tool 1: Health & Infra
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Tool 2: Notification & Gmail Test
  const [testEmail, setTestEmail] = useState('');
  const [testMessage, setTestMessage] = useState('Kiểm tra kết nối Live Test Lab & Outbox Email Queue');
  const [notifResult, setNotifResult] = useState<any>(null);
  const [notifLoading, setNotifLoading] = useState(false);

  // Tool 3: Simulation
  const [simData, setSimData] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Tool 4 & 5: Sandbox
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);

  // Email Queue Monitor
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueStats, setQueueStats] = useState<any>(null);
  const [queueLoading, setQueueLoading] = useState(false);

  // Fetch initial free mode state & queue stats
  const fetchInitialData = async () => {
    try {
      const [freeRes, queueRes] = await Promise.all([
        apiCall('/api/admin/free-mode'),
        apiCall('/api/admin/email-queue/stats')
      ]);
      if (freeRes && typeof freeRes.enabled === 'boolean') {
        setGlobalFreeMode(freeRes.enabled);
      }
      if (queueRes) {
        setQueueStats(queueRes);
      }
    } catch (e: any) {
      console.warn('Initial test lab fetch notice:', e.message);
    }
  };

  const fetchQueueList = async () => {
    setQueueLoading(true);
    try {
      const res = await apiCall('/api/admin/email-queue?limit=10');
      if (res && res.items) {
        setQueueItems(res.items);
      }
    } catch (e: any) {
      toast.error('Lỗi tải danh sách hàng đợi email: ' + e.message);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchQueueList();
  }, []);

  // Toggle Global Free Mode
  const handleToggleFreeMode = () => {
    const nextState = !globalFreeMode;
    const confirmMsg = nextState
      ? 'Bạn có chắc chắn muốn BẬT chế độ Dùng Thử Miễn Phí toàn hệ thống? Tất cả người dùng sẽ được mở khóa 100% tính năng.'
      : 'Bạn có chắc chắn muốn TẮT chế độ Dùng Thử Miễn Phí toàn hệ thống? Hệ thống sẽ yêu cầu người dùng mua gói để tiếp tục sử dụng.';

    setConfirmConfig({
      isOpen: true,
      title: nextState ? 'Bật Dùng Thử Miễn Phí Toàn Hệ Thống' : 'Tắt Dùng Thử Miễn Phí Toàn Hệ Thống',
      description: confirmMsg,
      confirmLabel: nextState ? 'Bật chế độ' : 'Tắt chế độ',
      variant: nextState ? 'info' : 'warning',
      onConfirm: async () => {
        setFreeModeLoading(true);
        try {
          const res = await apiCall('/api/admin/free-mode/toggle', 'POST', { enabled: nextState });
          if (res && res.success) {
            setGlobalFreeMode(res.enabled);
            toast.success(res.message || 'Cập nhật trạng thái Dùng thử Miễn phí thành công!');
            handleRunSimulation();
          } else {
            toast.error(res?.message || 'Không thể thay đổi trạng thái.');
          }
        } catch (e: any) {
          toast.error('Lỗi thao tác: ' + e.message);
        } finally {
          setFreeModeLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Tool 1: Run Health Check
  const handleRunHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const res = await apiCall('/api/admin/test-lab/health-check');
      setHealthData(res);
      if (res.database?.ok) {
        toast.success(`Hệ thống ổn định! Độ trễ CSDL: ${res.database.latencyMs}ms`);
      } else {
        toast.error('Phát hiện sự cố kết nối cơ sở dữ liệu!');
      }
    } catch (e: any) {
      toast.error('Lỗi kiểm tra hạ tầng: ' + e.message);
    } finally {
      setHealthLoading(false);
    }
  };

  // Tool 2: Trigger Real Notification & Outbox
  const handleTriggerNotification = async () => {
    setNotifLoading(true);
    try {
      const res = await apiCall('/api/admin/test-lab/trigger-notification', 'POST', {
        email: testEmail.trim() || undefined,
        message: testMessage.trim()
      });
      setNotifResult(res);
      if (res.success) {
        toast.success('Đã phát chuông thông báo và đưa email vào Outbox!');
        fetchQueueList();
      } else {
        toast.error(res.message || 'Lỗi gửi thông báo');
      }
    } catch (e: any) {
      toast.error('Lỗi gửi thông báo: ' + e.message);
    } finally {
      setNotifLoading(false);
    }
  };

  // Tool 3: Run Policy Simulation
  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await apiCall('/api/admin/test-lab/simulate-policy');
      setSimData(res);
      toast.success('Đã hoàn thành mô phỏng ma trận phân quyền!');
    } catch (e: any) {
      toast.error('Lỗi mô phỏng quyền: ' + e.message);
    } finally {
      setSimLoading(false);
    }
  };

  // Tool 4: Seed Sandbox Data
  const handleSeedSandbox = async () => {
    setSandboxLoading(true);
    try {
      const res = await apiCall('/api/admin/test-lab/seed-sandbox-data', 'POST');
      if (res.success) {
        setSandboxResult(res);
        toast.success(res.message);
        fetchQueueList();
      } else {
        toast.error(res.message || 'Lỗi khởi tạo');
      }
    } catch (e: any) {
      toast.error('Lỗi khởi tạo Sandbox: ' + e.message);
    } finally {
      setSandboxLoading(false);
    }
  };

  // Tool 5: Clean Sandbox Data
  const handleCleanSandbox = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Dọn dẹp dữ liệu Sandbox',
      description: 'Xác nhận dọn dẹp sạch toàn bộ dữ liệu thử nghiệm Sandbox (is_test_data = true)? Thao tác này sẽ xóa vĩnh viễn các bản ghi thử nghiệm.',
      confirmLabel: 'Dọn dẹp ngay',
      variant: 'danger',
      onConfirm: async () => {
        setCleanLoading(true);
        try {
          const res = await apiCall('/api/admin/test-lab/clean-sandbox-data', 'POST');
          if (res.success) {
            toast.success(res.message);
            setSandboxResult(null);
            fetchQueueList();
          } else {
            toast.error(res.message || 'Lỗi dọn dẹp');
          }
        } catch (e: any) {
          toast.error('Lỗi dọn dẹp Sandbox: ' + e.message);
        } finally {
          setCleanLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  // Retry an Email in Queue
  const handleRetryEmail = async (id: string) => {
    try {
      const res = await apiCall(`/api/admin/email-queue/${id}/retry`, 'POST');
      if (res.success) {
        toast.success('Đã xếp hàng gửi lại email ngay lập tức!');
        fetchQueueList();
      } else {
        toast.error('Không thể xếp hàng lại');
      }
    } catch (e: any) {
      toast.error('Lỗi gửi lại email: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* =================================================================== */}
      {/* 1. HERO BANNER: 1000 AGENT & 100 E2E MUTATION TESTS TRUTH VERIFIER   */}
      {/* =================================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 shadow-2xl border border-emerald-500/20">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
              <span>Phòng Thí Nghiệm Kiểm Định Sự Thật E2E 100%</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              🛡️ Trung Tâm Kiểm Định 100 Bài Test & 1000 Agent
            </h1>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              Môi trường tự động chạy ngầm <strong>100 bài test ngóc ngách (End-to-End Mutation Tests)</strong> chia làm <strong>10 Quân Đoàn</strong> để xác minh thuật toán thật 100%, kiểm tra đối chiếu dữ liệu giữa Kho Trung Tâm và DOM, và loại bỏ triệt để mọi dữ liệu giả trước khi triển khai lên Cloudflare.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isRunningE2E}
              onClick={handleRunAll100Tests}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xl cursor-pointer ${
                isRunningE2E
                  ? 'bg-emerald-700 text-white cursor-wait opacity-80'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-95'
              }`}
            >
              {isRunningE2E ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>ĐANG KIỂM ĐỊNH ({e2eProgress.current}/100)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>🚀 Kích Hoạt 1000 Agent Chạy Thử Nghiệm 100 Bài Test Ngay</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isPurging || isRunningE2E}
              onClick={handlePurgeTestData}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-rose-500/20 text-rose-300 border border-rose-400/30 transition-all cursor-pointer active:scale-95"
            >
              {isPurging ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>🧹 Xóa sạch dữ liệu Test để Up Cloudflare</span>
            </button>
          </div>
        </div>

        {/* Live Progress Bar when running */}
        {(isRunningE2E || e2eProgress.current > 0) && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningE2E ? 'animate-spin' : ''}`} />
                {isRunningE2E ? `Đang chạy: ${e2eProgress.activeName}` : 'Đã hoàn thành lượt kiểm định gần nhất'}
              </span>
              <span className="font-mono font-bold text-white">
                {e2eProgress.current} / {e2eProgress.total} ({Math.round((e2eProgress.current / e2eProgress.total) * 100)}%)
              </span>
            </div>
            
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-300"
                style={{ width: `${(e2eProgress.current / e2eProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Purge Success Alert */}
        {purgeSuccessMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{purgeSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. HUD METRICS: 4 BENTO SUMMARY CARDS                               */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Tổng Bài Test</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">100 / 100</div>
          <p className="text-[11px] text-slate-400 mt-1">10 Quân đoàn phủ 1.000 điểm kiểm tra</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold">Đạt Thật 100%</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {passedCount} <span className="text-xs font-normal text-emerald-700/70">bài test</span>
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1">Thuật toán sống, đối chiếu Central Store</p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
            <span className="text-xs font-semibold">Phát Hiện Lệch</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {failedCount} <span className="text-xs font-normal text-rose-700/70">bài test</span>
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1">Hỗ trợ tự động sửa và nạp lại ngay</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Trạng Thái Toàn Cục</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100 truncate">
            {totalExecuted === 0 ? 'Chưa khởi chạy' : failedCount === 0 ? '🟢 100% SẠCH SẼ' : '⚠️ Có điểm cần chỉnh'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sẵn sàng đưa lên Cloudflare 10k User</p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. FILTER TABS & SEARCH BAR FOR 10 ARMY CORPS                       */}
      {/* =================================================================== */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCorpsFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCorpsFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tất cả 10 Quân Đoàn (100)
            </button>
            {ARMY_CORPS.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCorpsFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCorpsFilter === c.id
                    ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                QĐ {c.id}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm kiếm test case hoặc ID..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. 10 ARMY CORPS TEST ACCORDION / DETAILED RESULTS                  */}
      {/* =================================================================== */}
      <div className="space-y-4">
        {displayedCorps.map(corps => {
          const isCollapsed = !!collapsedCorps[corps.id];
          const corpsTests = corps.tests;
          const corpsPassed = corpsTests.filter(t => e2eResults[t.id]?.status === 'passed').length;
          const corpsFailed = corpsTests.filter(t => e2eResults[t.id]?.status === 'failed').length;

          return (
            <div
              key={corps.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
            >
              {/* Corps Header */}
              <div
                onClick={() => toggleCorpsCollapse(corps.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    QĐ {corps.id}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {corps.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {corps.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {corpsPassed}/{corpsTests.length} Đạt
                    </span>
                    {corpsFailed > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        {corpsFailed} Lệch
                      </span>
                    )}
                  </div>
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Corps Test Items */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {corpsTests.map(test => {
                    const result = e2eResults[test.id];
                    const isPassed = result?.status === 'passed';
                    const isFailed = result?.status === 'failed';
                    const isPending = !result;

                    return (
                      <div
                        key={test.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="space-y-1 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                              {test.id}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {test.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {test.description}
                          </p>

                          {/* Live Evidence Report */}
                          {result && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              <span>Bằng chứng:</span>
                              <strong className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                                {result.evidence}
                              </strong>
                              {result.executionTimeMs > 0 && (
                                <span className="text-slate-400">({result.executionTimeMs}ms)</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPassed && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 text-[11px] font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>[🟢 ĐẠT THẬT 100%]</span>
                            </span>
                          )}

                          {isFailed && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300/40 text-[11px] font-black flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>[🔴 PHÁT HIỆN LỆCH]</span>
                            </span>
                          )}

                          {isPending && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px] font-medium">
                              Chưa kiểm định
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRunSingleTest(test.id)}
                            title="Chạy lại bài test này với mutation thật"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* 5. GLOBAL FREE MODE TOGGLE CARD                                     */}
      {/* =================================================================== */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 shadow-xs ${
          globalFreeMode
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                globalFreeMode
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Công Tắc Dùng Thử Miễn Phí Toàn Hệ Thống (Global Free Mode)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    globalFreeMode
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {globalFreeMode ? 'ĐANG BẬT (MỞ KHÓA 100%)' : 'ĐANG TẮT (BẮT BUỘC MUA GÓI)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {globalFreeMode
                  ? 'Tất cả người dùng (kể cả chưa mua gói) đang được trải nghiệm toàn bộ tính năng cao cấp. Dữ liệu gói của các khách hàng đã mua trước đó được bảo toàn nguyên vẹn trong CSDL.'
                  : 'Chỉ các tài khoản có gói trả phí đang hoạt động hoặc trong thời hạn 7 ngày dùng thử mới được truy cập các phân hệ. Các tài khoản khác bị chặn bởi Paywall.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={freeModeLoading}
              onClick={handleToggleFreeMode}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
                globalFreeMode
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {freeModeLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : globalFreeMode ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  <span>TẮT DÙNG THỬ</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>BẬT DÙNG THỬ TOÀN DÂN</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 6. 5 DIAGNOSTIC TOOLS GRID (INFRA, SMTP, NOTIFICATIONS, SANDBOX)     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TOOL 1: INFRASTRUCTURE & SMTP HEALTH */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Server className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Công Cụ 1: Kiểm Tra Hạ Tầng & SMTP
                  </h4>
                  <p className="text-[11px] text-slate-400">Đo độ trễ PostgreSQL, Node RAM, Uptime và kết nối Mail</p>
                </div>
              </div>
              <button
                type="button"
                disabled={healthLoading}
                onClick={handleRunHealthCheck}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {healthLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Kiểm tra</span>
              </button>
            </div>

            {healthData && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5 text-emerald-500" /> PostgreSQL:
                    </span>
                    <span className="font-mono font-bold text-emerald-600">
                      {healthData.database?.latencyMs} ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> SMTP Server:
                    </span>
                    <span className={`font-bold ${healthData.smtp?.ok ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {healthData.smtp?.ok ? 'Connected' : 'Chưa kích hoạt'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-purple-500" /> Node RSS:
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {healthData.memory?.rssMb} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-500" /> Uptime:
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {healthData.uptime?.formatted}
                    </span>
                  </div>
                </div>
                {healthData.smtp?.message && (
                  <p className="text-[11px] text-slate-400 truncate">
                    Thông điệp SMTP: {healthData.smtp.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TOOL 2: LIVE WEB BELL & REAL GMAIL TRIGGER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <Send className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Công Cụ 2: Thử Nghiệm Chuông Web & Gmail
                  </h4>
                  <p className="text-[11px] text-slate-400">Tạo thông báo In-App + Đưa vào Outbox Queue</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Email nhận:</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Để trống sẽ gửi đến email Admin hiện tại"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tin nhắn thử nghiệm:</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={notifLoading}
                  onClick={handleTriggerNotification}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {notifLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Kích hoạt thử nghiệm ngay</span>
                </button>
              </div>

              {notifResult && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-200">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {notifResult.message}
                  </p>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                    Notification ID: {notifResult.notification?.id} | Queue ID: {notifResult.emailQueue?.queueId}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TOOL 3: GLOBAL FREE MODE SIMULATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Công Cụ 3: Mô Phỏng Quyền Truy Cập (Policy Simulation)
                  </h4>
                  <p className="text-[11px] text-slate-400">Kiểm tra phân quyền tài khoản Paid vs Free trong CSDL</p>
                </div>
              </div>
              <button
                type="button"
                disabled={simLoading}
                onClick={handleRunSimulation}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Mô phỏng</span>
              </button>
            </div>

            {simData ? (
              <div className="mt-2 space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Tài khoản Free: {simData.simulation?.unpaidUser?.email || 'N/A'}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                        simData.simulation?.unpaidUser?.hasAccessUnderCurrentPolicy
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}
                    >
                      {simData.simulation?.unpaidUser?.hasAccessUnderCurrentPolicy ? 'CÓ QUYỀN (ACCESS OK)' : 'BỊ CHẶN (PAYWALL)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gói hiệu lực: {simData.simulation?.unpaidUser?.effectivePlanName}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Tài khoản Paid: {simData.simulation?.paidUser?.email || 'N/A'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      CÓ QUYỀN (ACCESS OK)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gói hiệu lực: {simData.simulation?.paidUser?.effectivePlanName}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-4 text-center">Bấm 'Mô phỏng' để kiểm tra ma trận phân quyền thực tế.</p>
            )}
          </div>
        </div>

        {/* TOOLS 4 & 5: ONE-CLICK SANDBOX SEEDER & CLEANER */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Công Cụ 4 & 5: Quản Trị Sandbox Demo
                  </h4>
                  <p className="text-[11px] text-slate-400">Tạo mẫu & Dọn dẹp sạch bằng cờ is_test_data</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sandboxLoading}
                  onClick={handleSeedSandbox}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {sandboxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Tạo dữ liệu Sandbox</span>
                </button>

                <button
                  type="button"
                  disabled={cleanLoading}
                  onClick={handleCleanSandbox}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {cleanLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Dọn sạch Sandbox</span>
                </button>
              </div>

              {sandboxResult && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-bold">{sandboxResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 7. OUTBOX EMAIL QUEUE MONITOR TABLE                                 */}
      {/* =================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-500" />
              <span>Hàng Đợi Email Ra Ngoài (Outbox Email Queue Monitor)</span>
            </h3>
            <p className="text-xs text-slate-400">Theo dõi trạng thái gửi email qua Cloudflare Worker / VPS SMTP</p>
          </div>
          <button
            type="button"
            disabled={queueLoading}
            onClick={fetchQueueList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới hàng đợi</span>
          </button>
        </div>

        {queueStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-400">Đang chờ (Pending)</div>
              <div className="text-lg font-bold text-amber-500">{queueStats.pendingCount || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-400">Đang gửi (Processing)</div>
              <div className="text-lg font-bold text-blue-500">{queueStats.processingCount || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-400">Thành công (Sent)</div>
              <div className="text-lg font-bold text-emerald-500">{queueStats.sentCount || 0}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-400">Thất bại (Failed)</div>
              <div className="text-lg font-bold text-rose-500">{queueStats.failedCount || 0}</div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3">Thời gian</th>
                <th className="py-2.5 px-3">Người nhận</th>
                <th className="py-2.5 px-3">Tiêu đề</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {queueLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Đang tải hàng đợi email...
                  </td>
                </tr>
              ) : queueItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Hàng đợi trống. Không có email nào tồn đọng!
                  </td>
                </tr>
              ) : (
                queueItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {item.recipient}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {item.subject}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : item.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : item.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.status === 'FAILED' && (
                        <button
                          type="button"
                          onClick={() => handleRetryEmail(item.id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                        >
                          Gửi lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmConfig && (
        <AdminConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          variant={confirmConfig.variant}
          isProcessing={confirmConfig.isProcessing}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}
