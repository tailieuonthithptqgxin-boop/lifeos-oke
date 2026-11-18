import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Flame, 
  Trash2, 
  Cloud, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  BellRing,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { clientCronEngine, ClientCronStatus } from '../../lib/cronEngine';
import { soundEngine } from '../../lib/soundEngine';
import { CloudflarePreFlightModal } from './CloudflarePreFlightModal';

interface AdminCronManagerTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' } | null) => void;
}

export function AdminCronManagerTab({ onShowMessage }: AdminCronManagerTabProps) {
  const [crons, setCrons] = useState<ClientCronStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState<any>(null);
  const [showPreFlightModal, setShowPreFlightModal] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const list = await clientCronEngine.getStatus();
      setCrons(list);
    } catch (e: any) {
      console.warn('Lỗi khi tải trạng thái Cron:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto refresh status every 30s
    const timer = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleRunAllCrons = async () => {
    try {
      setIsRunningAll(true);
      try { soundEngine.playSuccess(); } catch {}
      
      const res = await clientCronEngine.runAllCronsNow();
      setLastBatchResult(res);
      await fetchStatus();

      if (onShowMessage) {
        onShowMessage({
          text: '⚡ Đã kích hoạt và chạy thử toàn bộ 4 Cron thành công! Lịch hẹn, Tháp Trí Nhớ, Chuỗi lửa và Bộ nhớ đệm đã được đồng bộ.',
          type: 'success'
        });
      }
    } catch (e: any) {
      if (onShowMessage) {
        onShowMessage({
          text: 'Lỗi khi kích hoạt Cron: ' + e.message,
          type: 'error'
        });
      }
    } finally {
      setIsRunningAll(false);
    }
  };

  const getCronIcon = (id: string) => {
    switch (id) {
      case 'cron1': return BellRing;
      case 'cron2': return BookOpen;
      case 'cron3': return Flame;
      case 'cron4': return Trash2;
      default: return Clock;
    }
  };

  const getCronBadgeColor = (id: string) => {
    switch (id) {
      case 'cron1': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'cron2': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'cron3': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'cron4': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner & Control Deck */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Cpu className="w-5 h-5" />
              </span>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Hệ Thống Cron Tự Động 24/7 & Cloudflare Engine
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                HYBRID 24/7
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Vận hành song song: vừa chạy trực tiếp tại trình duyệt thông qua bộ lập lịch nền, vừa tích hợp sẵn mã Cloudflare Worker Cron Trigger (<code className="text-amber-300">*/5 * * * *</code> và <code className="text-amber-300">0 0,7,21 * * *</code>) đảm bảo 10.000 người dùng nhận nhắc nhở đúng từng phút mà không tốn chi phí máy chủ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Run All Button */}
            <button
              type="button"
              onClick={handleRunAllCrons}
              disabled={isRunningAll}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isRunningAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang thực thi...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>⚡ Chạy thử toàn bộ Cron ngay lập tức</span>
                </>
              )}
            </button>

            {/* Cloudflare Pre-Flight Button */}
            <button
              type="button"
              onClick={() => setShowPreFlightModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              <Cloud className="w-4 h-4 text-sky-400" />
              <span>☁️ Kiểm tra Cloudflare (Pre-Flight)</span>
            </button>
          </div>
        </div>

        {/* Ambient glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Cron Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {crons.map((cron) => {
          const Icon = getCronIcon(cron.id);
          const badgeClass = getCronBadgeColor(cron.id);

          return (
            <div
              key={cron.id}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${badgeClass} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {cron.name}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        {cron.schedule}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    🟢 Đang hoạt động
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {cron.scheduleDescription}
                </p>
              </div>

              {/* Status & Stats Box */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Lần chạy gần nhất:
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {cron.lastRunAt ? new Date(cron.lastRunAt).toLocaleTimeString('vi-VN') : 'Vừa khởi chạy'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Lần quét tiếp theo:
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {cron.nextRunAt ? new Date(cron.nextRunAt).toLocaleTimeString('vi-VN') : 'Trong chu kỳ tới'}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-400">Tổng số lượt chạy:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {cron.executionCount} lần
                  </span>
                </div>

                {cron.lastExecutionResult && (
                  <div className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate" title={cron.lastExecutionResult}>
                    ✓ {cron.lastExecutionResult}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Execution Result Terminal */}
      {lastBatchResult && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 text-slate-200 border border-slate-800 font-mono text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Kết quả kiểm tra thực tế (Batch Execution Log)
            </span>
            <span>{new Date(lastBatchResult.timestamp).toLocaleString('vi-VN')}</span>
          </div>

          <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap p-2 bg-slate-900/60 rounded-xl leading-relaxed text-[11px]">
            {JSON.stringify(lastBatchResult.results || lastBatchResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Cloudflare Pre-Flight Modal */}
      <CloudflarePreFlightModal
        isOpen={showPreFlightModal}
        onClose={() => setShowPreFlightModal(false)}
        onRunCrons={handleRunAllCrons}
        isRunningCrons={isRunningAll}
      />

    </div>
  );
}
