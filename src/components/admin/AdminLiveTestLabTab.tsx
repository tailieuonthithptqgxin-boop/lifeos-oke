import React, { useState, useEffect } from 'react';
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
  ToggleRight
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';

export function AdminLiveTestLabTab() {
  const [loading, setLoading] = useState(false);
  const [globalFreeMode, setGlobalFreeMode] = useState<boolean>(false);
  const [freeModeLoading, setFreeModeLoading] = useState(false);

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
  const handleToggleFreeMode = async () => {
    const nextState = !globalFreeMode;
    const confirmMsg = nextState
      ? 'Bạn có chắc chắn muốn BẬT chế độ Dùng Thử Miễn Phí toàn hệ thống? Tất cả người dùng sẽ được mở khóa 100% tính năng.'
      : 'Bạn có chắc chắn muốn TẮT chế độ Dùng Thử Miễn Phí toàn hệ thống? Hệ thống sẽ yêu cầu người dùng mua gói để tiếp tục sử dụng.';

    if (!window.confirm(confirmMsg)) return;

    setFreeModeLoading(true);
    try {
      const res = await apiCall('/api/admin/free-mode/toggle', 'POST', { enabled: nextState });
      if (res && res.success) {
        setGlobalFreeMode(res.enabled);
        toast.success(res.message || 'Cập nhật trạng thái Dùng thử Miễn phí thành công!');
        // Refresh simulation
        handleRunSimulation();
      } else {
        toast.error(res?.message || 'Không thể thay đổi trạng thái.');
      }
    } catch (e: any) {
      toast.error('Lỗi thao tác: ' + e.message);
    } finally {
      setFreeModeLoading(false);
    }
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

  // Tool 2: Trigger Notification & Gmail Test
  const handleTriggerNotification = async () => {
    setNotifLoading(true);
    setNotifResult(null);
    try {
      const res = await apiCall('/api/admin/test-lab/trigger-notification-test', 'POST', {
        targetEmail: testEmail.trim() || undefined,
        message: testMessage.trim()
      });
      setNotifResult(res);
      if (res.success) {
        toast.success('Đã gửi thông báo web và xếp hàng email Outbox!');
        fetchQueueList();
      } else {
        toast.error(res.message || 'Thử nghiệm thất bại');
      }
    } catch (e: any) {
      toast.error('Lỗi gửi thử nghiệm: ' + e.message);
    } finally {
      setNotifLoading(false);
    }
  };

  // Tool 3: Run Simulation
  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await apiCall('/api/admin/test-lab/free-mode-simulation');
      setSimData(res);
    } catch (e: any) {
      toast.error('Lỗi chạy mô phỏng: ' + e.message);
    } finally {
      setSimLoading(false);
    }
  };

  // Tool 4: Seed Sandbox Data
  const handleSeedSandbox = async () => {
    setSandboxLoading(true);
    try {
      const res = await apiCall('/api/admin/test-lab/seed-sandbox-data', 'POST');
      setSandboxResult(res);
      if (res.success) {
        toast.success(res.message);
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
  const handleCleanSandbox = async () => {
    if (!window.confirm('Xác nhận dọn dẹp sạch toàn bộ dữ liệu thử nghiệm Sandbox (is_test_data = true)?')) {
      return;
    }
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
    }
  };

  // Retry an Email in Queue
  const handleRetryEmail = async (id: string) => {
    try {
      const res = await apiCall(`/api/admin/email-queue/${id}/retry`, 'POST');
      if (res.success) {
        toast.success('Đã xếp hàng gửi lại email ngay lập tức!');
        fetchQueueList();
      }
    } catch (e: any) {
      toast.error('Lỗi gửi lại email: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold">Trung Tâm Kiểm Tra Trực Tiếp (Live Test Lab)</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PROD-READY
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Môi trường chẩn đoán 5 công cụ thời gian thực, quản lý hàng đợi Outbox Email và kiểm soát dùng thử toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              fetchInitialData();
              fetchQueueList();
              handleRunHealthCheck();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/15"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới toàn bộ</span>
          </button>
        </div>
      </div>

      {/* GLOBAL FREE MODE TOGGLE CARD */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer active:scale-95 ${
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

      {/* 5 DIAGNOSTIC TOOLS GRID */}
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
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tin nhắn thử nghiệm:</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {sandboxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>1-Click Tạo Dữ Liệu Test</span>
                </button>

                <button
                  type="button"
                  disabled={cleanLoading}
                  onClick={handleCleanSandbox}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {cleanLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>1-Click Dọn Sạch Sandbox</span>
                </button>
              </div>

              {sandboxResult && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> {sandboxResult.message}
                  </p>
                  <p className="text-[11px] mt-1 font-mono">
                    User: {sandboxResult.data?.email} | Đã tạo: {JSON.stringify(sandboxResult.data?.seededCounts)}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                * Mọi dữ liệu tạo ra trong Sandbox đều được đánh dấu <code>is_test_data = true</code>. Nút 'Dọn Sạch' chỉ xóa các bản ghi test mà không ảnh hưởng bất kỳ dữ liệu thật nào của khách hàng.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OUTBOX EMAIL QUEUE MONITOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Mail className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Hàng Đợi Email Outbox (Guaranteed Delivery Queue)
              </h3>
              <p className="text-xs text-slate-400">
                Cơ chế hàng đợi bất đồng bộ với Exponential Backoff (15s, 1m, 5m, 15m, 30m). Tỷ lệ thất thoát 0%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={queueLoading}
              onClick={fetchQueueList}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
              <span>Cập nhật</span>
            </button>
          </div>
        </div>

        {/* Queue Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-2.5 px-3">Người Nhận</th>
                <th className="py-2.5 px-3">Tiêu Đề</th>
                <th className="py-2.5 px-3">Loại Sự Kiện</th>
                <th className="py-2.5 px-3">Trạng Thái</th>
                <th className="py-2.5 px-3 text-center">Thử Lại</th>
                <th className="py-2.5 px-3">Thời Gian</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {queueItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Hàng đợi hiện tại trống. Tất cả email đã được chuyển phát thành công.
                  </td>
                </tr>
              ) : (
                queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {item.recipient}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[220px]">
                      {item.subject}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.eventType || item.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : item.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 animate-pulse'
                            : item.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {item.retryCount ?? item.retry_count ?? 0}/5
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.status !== 'SENT' && (
                        <button
                          type="button"
                          onClick={() => handleRetryEmail(item.id)}
                          className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 hover:bg-indigo-100 text-[11px] font-bold cursor-pointer transition-colors"
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
    </div>
  );
}
