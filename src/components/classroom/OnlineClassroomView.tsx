import React, { useState, useEffect } from 'react';
import { 
  Video, Calendar, Clock, Plus, Users, Link2, ExternalLink, 
  CheckCircle2, AlertCircle, Trash2, Edit3, CheckSquare, 
  RefreshCw, X, Shield, Globe, Sparkles, ChevronRight, LogOut,
  Copy, Check, HelpCircle
} from 'lucide-react';
import { classroomApi, OnlineClassItem, GoogleIntegrationStatus } from '../../lib/classroomApiClient';
import { toast } from '../../lib/toast';
import { ClassroomSessionStage } from './ClassroomSessionStage';

interface OnlineClassroomViewProps {
  embedded?: boolean;
}

export function OnlineClassroomView({ embedded = false }: OnlineClassroomViewProps = {}) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [classes, setClasses] = useState<OnlineClassItem[]>([]);
  const [activeClassSession, setActiveClassSession] = useState<OnlineClassItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleIntegrationStatus | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [showRedirectGuide, setShowRedirectGuide] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  // Create / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '09:00',
    durationMinutes: 60,
    meetMode: 'GOOGLE_CALENDAR' as 'GOOGLE_CALENDAR' | 'MANUAL_LINK' | 'NONE',
    manualMeetUrl: '',
    participantEmails: ''
  });

  // Action loading trackers
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Initial load & query param check
  useEffect(() => {
    // Check if redirected from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      const email = params.get('email');
      toast.show(`Kết nối tài khoản Google ${email ? `(${email})` : ''} thành công!`, 'success');
      window.history.replaceState({}, '', window.location.pathname + '?view=classroom');
    } else if (params.get('google_error')) {
      toast.show(`Lỗi kết nối Google: ${params.get('google_error')}`, 'error');
      window.history.replaceState({}, '', window.location.pathname + '?view=classroom');
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    loadClasses(activeTab);
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [statusRes, classesRes] = await Promise.allSettled([
        classroomApi.getGoogleStatus(),
        classroomApi.listClasses('upcoming')
      ]);

      if (statusRes.status === 'fulfilled') {
        setGoogleStatus(statusRes.value);
        if (!statusRes.value.connected) {
          // Default to manual link if Google not yet connected
          setFormData(prev => ({ ...prev, meetMode: 'MANUAL_LINK' }));
        }
      }
      if (classesRes.status === 'fulfilled' && classesRes.value.success) {
        setClasses(classesRes.value.classes);
      } else if (classesRes.status === 'rejected') {
        setLoadError(classesRes.reason?.message || 'Không thể kết nối đến danh sách lớp học');
      }
    } catch (err: any) {
      setLoadError(err.message || 'Lỗi tải dữ liệu phòng học');
      toast.show(err.message || 'Lỗi tải dữ liệu phòng học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async (scope: 'upcoming' | 'history') => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await classroomApi.listClasses(scope);
      if (res.success) {
        setClasses(res.classes);
      }
    } catch (err: any) {
      setLoadError(err.message || 'Lỗi tải danh sách lớp học');
      toast.show(err.message || 'Lỗi tải danh sách lớp học', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnectingGoogle(true);
      const res = await classroomApi.getAuthUrl();
      if (res.success && res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tạo đường dẫn kết nối Google', 'error');
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Bạn có chắc muốn ngắt kết nối tài khoản Google? Bạn sẽ không thể tạo tự động Google Meet từ tài khoản này nữa.')) return;
    try {
      const res = await classroomApi.disconnectGoogle();
      if (res.success) {
        toast.show('Đã ngắt kết nối tài khoản Google', 'info');
        setGoogleStatus(prev => prev ? { ...prev, connected: false, googleEmail: null, status: 'DISCONNECTED' } : null);
        setFormData(prev => ({ ...prev, meetMode: 'MANUAL_LINK' }));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi ngắt kết nối Google', 'error');
    }
  };

  // Open modal for Create
  const openCreateModal = () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    setEditingClassId(null);
    setFormData({
      title: '',
      description: '',
      date: dateStr,
      time: '09:00',
      durationMinutes: 60,
      meetMode: googleStatus?.connected ? 'GOOGLE_CALENDAR' : 'MANUAL_LINK',
      manualMeetUrl: '',
      participantEmails: ''
    });
    setShowModal(true);
  };

  // Open modal for Edit
  const openEditModal = (c: OnlineClassItem) => {
    const start = new Date(c.startAt);
    const dateStr = start.toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const timeStr = start.toTimeString().slice(0, 5);
    setEditingClassId(c.id);
    setFormData({
      title: c.title,
      description: c.description || '',
      date: dateStr,
      time: timeStr,
      durationMinutes: c.durationMinutes,
      meetMode: c.meetSource,
      manualMeetUrl: c.meetUrl || '',
      participantEmails: (c.participants || []).map(p => p.email).join(', ')
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.show('Vui lòng nhập tên lớp học', 'warning');
      return;
    }
    if (!formData.date || !formData.time) {
      toast.show('Vui lòng chọn ngày và giờ bắt đầu', 'warning');
      return;
    }

    const startDateTime = new Date(`${formData.date}T${formData.time}:00`);
    if (isNaN(startDateTime.getTime())) {
      toast.show('Thời gian bắt đầu không hợp lệ', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const emails = formData.participantEmails
        .split(/[,;\s]+/)
        .map(e => e.trim())
        .filter(e => e.includes('@'));

      if (editingClassId) {
        // Edit existing
        const res = await classroomApi.updateClass(editingClassId, {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          startAt: startDateTime.toISOString(),
          durationMinutes: Number(formData.durationMinutes),
          participantEmails: emails
        });
        if (res.success) {
          toast.show('Đã cập nhật thông tin lớp học!', 'success');
          setShowModal(false);
          loadClasses(activeTab);
        }
      } else {
        // Create new
        const res = await classroomApi.createClass({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          startAt: startDateTime.toISOString(),
          durationMinutes: Number(formData.durationMinutes),
          meetMode: formData.meetMode,
          meetUrl: formData.meetMode === 'MANUAL_LINK' ? formData.manualMeetUrl.trim() : undefined,
          participantEmails: emails
        });
        if (res.success) {
          toast.show('Tạo lớp học trực tuyến thành công!', 'success');
          setShowModal(false);
          loadClasses(activeTab);
        }
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi khi lưu lớp học', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClass = async (classId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn hủy lớp học "${title}"? Sự kiện trên Google Calendar và Lịch LifeOS sẽ được cập nhật.`)) return;
    try {
      setActionLoadingId(classId);
      const res = await classroomApi.cancelClass(classId);
      if (res.success) {
        toast.show('Đã hủy lớp học', 'info');
        loadClasses(activeTab);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi hủy lớp học', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreatePrepTask = async (classId: string) => {
    try {
      setActionLoadingId(classId);
      const res = await classroomApi.createPrepTask(classId);
      if (res.success) {
        toast.show(res.message, 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tạo nhiệm vụ chuẩn bị', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (activeClassSession) {
    return (
      <ClassroomSessionStage
        onlineClass={activeClassSession}
        onBack={() => setActiveClassSession(null)}
        onUpdateClass={() => loadClasses(activeTab)}
      />
    );
  }

  return (
    <div className={embedded ? "space-y-6 animate-in fade-in duration-150" : "min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6"}>
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white">
              <Video className="w-3.5 h-3.5 text-emerald-300" />
              <span>Google Meet Official Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Phòng Học Trực Tuyến & Google Meet
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
              Tổ chức lớp học, lên lịch trao đổi bài vở, tạo Google Meet tự động qua Google Calendar API và đồng bộ trực tiếp với Lịch & Công việc LifeOS.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo lớp học mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Google Account Connection Status Card */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            googleStatus?.connected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Tích hợp Google Calendar & Meet
              </span>
              {googleStatus?.connected ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đã kết nối
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Chưa kết nối
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {googleStatus?.connected
                ? `Đang liên kết với: ${googleStatus.googleEmail}. Link Google Meet sẽ được tự động tạo khi đặt lịch lớp.`
                : 'Kết nối tài khoản Google một lần để tạo link Google Meet chính thức tự động mỗi khi mở lớp.'}
            </p>

            {!googleStatus?.connected && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRedirectGuide(!showRedirectGuide)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  {showRedirectGuide ? 'Ẩn hướng dẫn cấu hình Google Console' : 'Gặp lỗi "redirect_uri_mismatch"? Bấm vào đây'}
                </button>
              </div>
            )}

            {showRedirectGuide && !googleStatus?.connected && (
              <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-slate-700 dark:text-slate-300">
                <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Cách xử lý lỗi "redirect_uri_mismatch" (Google OAuth 400):</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Google yêu cầu URI chuyển hướng phải khớp 100% với danh sách trong Google Cloud Console. Hãy truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline text-emerald-600 dark:text-emerald-400 font-semibold">Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</a>, mở Web Client ID của bạn và thêm <strong>cả 2 URI bên dưới</strong> vào mục <strong>Authorized redirect URIs (URI chuyển hướng được ủy quyền)</strong>:
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px]">
                    <span className="truncate flex-1">http://localhost:3000/api/auth/google/callback</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:3000/api/auth/google/callback');
                        toast.show('Đã sao chép URI Localhost!', 'success');
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép Local</span>
                    </button>
                  </div>

                  {typeof window !== 'undefined' && window.location.origin !== 'http://localhost:3000' && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px]">
                      <span className="truncate flex-1">{`${window.location.origin}/api/auth/google/callback`}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/auth/google/callback`);
                          toast.show('Đã sao chép URI Tunnel/Domain!', 'success');
                        }}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-bold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Sao chép Domain</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {googleStatus?.connected ? (
            <button
              type="button"
              onClick={handleDisconnectGoogle}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ngắt kết nối</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={connectingGoogle}
              onClick={handleConnectGoogle}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {connectingGoogle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              <span>Kết nối Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Classes Navigation Tabs */}
      <div className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upcoming'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lớp sắp diễn ra</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lịch sử lớp học</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => loadClasses(activeTab)}
          className="p-2 text-slate-400 hover:text-emerald-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-2 cursor-pointer"
          title="Làm mới"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Classes List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400">Đang tải danh sách phòng học...</p>
        </div>
      ) : loadError && classes.length === 0 ? (
        <div className="p-8 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-rose-200 dark:border-rose-900/40 space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Không thể tải danh sách lớp học</h3>
          <p className="text-xs text-slate-400">{loadError}</p>
          <button
            type="button"
            onClick={() => loadClasses(activeTab)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Thử tải lại
          </button>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Video className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {activeTab === 'upcoming' ? 'Chưa có lớp học nào sắp diễn ra' : 'Lịch sử lớp học trống'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'Nhấn nút "Tạo lớp học mới" ở trên để lên lịch buổi học trực tuyến qua Google Meet.'
              : 'Các buổi học đã kết thúc hoặc bị hủy sẽ xuất hiện tại đây.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map(c => {
            const startDate = new Date(c.startAt);
            const dateStr = startDate.toLocaleDateString('vi-VN', { weekday: 'short', month: 'numeric', day: 'numeric' });
            const timeStr = startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const isCancelled = c.status === 'CANCELLED';
            const isActing = actionLoadingId === c.id;

            return (
              <div
                key={c.id}
                className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  isCancelled
                    ? 'border-slate-200 dark:border-slate-800 opacity-60'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr} lúc {timeStr}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({c.durationMinutes} phút)
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 mt-1">
                        {c.title}
                      </h4>
                    </div>

                    {isCancelled ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold text-[10px]">
                        Đã hủy
                      </span>
                    ) : c.isHost ? (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-[10px]">
                        Chủ phòng
                      </span>
                    ) : null}
                  </div>

                  {c.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  {/* Participants info */}
                  {c.participants && c.participants.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.participants.length} người tham gia được mời</span>
                    </div>
                  )}

                  {/* Google Calendar Link for Host */}
                  {c.googleEventLink && (
                    <a
                      href={c.googleEventLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Xem sự kiện trên Google Calendar</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {/* Primary Action: Enter Classroom Stage with Timer */}
                  {!isCancelled && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveClassSession(c)}
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>Vào Phòng Học (Google Meet & Timer)</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {c.meetUrl && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const width = 960;
                              const height = 640;
                              const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
                              const top = Math.max(0, Math.floor((window.screen.height - height) / 2));
                              window.open(c.meetUrl!, `lifeos_meet_${c.id}`, `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`);
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Mở Google Meet trong cửa sổ nổi"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-500" />
                            <span>Cửa sổ nổi</span>
                          </button>
                          <a
                            href={c.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors text-center"
                          >
                            <span>Mở Tab Meet ↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Secondary Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleCreatePrepTask(c.id)}
                      className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Tạo nhiệm vụ chuẩn bị bài trong LifeOS Tasks"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Chuẩn bị bài</span>
                    </button>

                    {c.isHost && !isCancelled && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleCancelClass(c.id, c.title)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Hủy lớp học"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-emerald-500" />
                <span>{editingClassId ? 'Chỉnh Sửa Lớp Học' : 'Tạo Phòng Học Trực Tuyến Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên lớp học *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ví dụ: Luyện nói IELTS Speaking Part 2 & 3..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả nội dung buổi học
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Nêu tài liệu cần chuẩn bị, chủ đề thảo luận chính..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày học *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giờ bắt đầu *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Thời lượng buổi học
                </label>
                <select
                  value={formData.durationMinutes}
                  onChange={e => setFormData(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                >
                  <option value={30}>30 phút (Học nhanh)</option>
                  <option value={45}>45 phút</option>
                  <option value={60}>60 phút (Tiêu chuẩn)</option>
                  <option value={90}>90 phút (Chuyên sâu)</option>
                  <option value={120}>120 phút (Workshop)</option>
                </select>
              </div>

              {/* Meet Mode Choice (only for new classes) */}
              {!editingClassId && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hình thức tạo phòng Google Meet
                  </label>

                  <div className="space-y-2">
                    <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      formData.meetMode === 'GOOGLE_CALENDAR'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-100'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="meetMode"
                        checked={formData.meetMode === 'GOOGLE_CALENDAR'}
                        onChange={() => setFormData(prev => ({ ...prev, meetMode: 'GOOGLE_CALENDAR' }))}
                        className="mt-0.5 text-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Tạo Google Meet tự động qua Google Calendar API</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {googleStatus?.connected
                            ? `Đã liên kết tài khoản: ${googleStatus.googleEmail}`
                            : 'Yêu cầu kết nối tài khoản Google để sử dụng tính năng này.'}
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                      formData.meetMode === 'MANUAL_LINK'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-100'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="meetMode"
                        checked={formData.meetMode === 'MANUAL_LINK'}
                        onChange={() => setFormData(prev => ({ ...prev, meetMode: 'MANUAL_LINK' }))}
                        className="mt-0.5 text-emerald-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Dán link Google Meet thủ công</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Dán trực tiếp link https://meet.google.com/... có sẵn của bạn.
                        </span>
                      </div>
                    </label>
                  </div>

                  {formData.meetMode === 'MANUAL_LINK' && (
                    <div className="pt-2">
                      <input
                        type="url"
                        required
                        value={formData.manualMeetUrl}
                        onChange={e => setFormData(prev => ({ ...prev, manualMeetUrl: e.target.value }))}
                        placeholder="https://meet.google.com/abc-defg-hij"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mời người tham gia (Danh sách email)
                </label>
                <input
                  type="text"
                  value={formData.participantEmails}
                  onChange={e => setFormData(prev => ({ ...prev, participantEmails: e.target.value }))}
                  placeholder="hocvien1@gmail.com, hocvien2@gmail.com (cách nhau bởi dấu phẩy)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : editingClassId ? 'Lưu thay đổi' : 'Tạo lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
