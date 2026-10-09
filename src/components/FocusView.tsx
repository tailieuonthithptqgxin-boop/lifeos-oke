import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Play, Square, Pause, RotateCcw, 
  Target, Zap, Clock, ShieldAlert, CheckCircle2,
  ListTodo, FolderKanban, Briefcase, FileText
} from 'lucide-react';
import { FocusSession, FocusMode, FocusStatus, Task, Project } from '../lib/types';

export function FocusView() {
  const { 
    focusSessions, focusGoals, tasks, projects, 
    addFocusSession, updateFocusSession, updateTask,
    dailyCapacity
  } = useAppStore();

  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [selectedMode, setSelectedMode] = useState<FocusMode>('Pomodoro');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Note/Reflection state for when finishing
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [reflection, setReflection] = useState('');
  
  // Interruption
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [interruptionReason, setInterruptionReason] = useState('');
  const [interruptionStart, setInterruptionStart] = useState<number>(0);

  // Real dynamic focus streak calculation
  const focusStreak = React.useMemo(() => {
    if (!focusSessions || focusSessions.length === 0) return 0;
    const completedDates = Array.from(new Set(
      focusSessions
        .filter(s => s.status === 'Completed' && (s.createdAt || s.startTime))
        .map(s => (s.createdAt || s.startTime || '').split('T')[0])
    )).filter(Boolean).sort().reverse();

    if (completedDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];

    const startDate = completedDates.includes(todayStr) 
      ? todayStr 
      : (completedDates.includes(yestStr) ? yestStr : null);

    if (!startDate) return 0;

    let streak = 0;
    const d = new Date(startDate);
    while (true) {
      const dStr = d.toISOString().split('T')[0];
      if (completedDates.includes(dStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [focusSessions]);

  // Timer logic
  useEffect(() => {
    let interval: any = null;
    if (activeSession && activeSession.status === 'Running') {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const getDurationForMode = (mode: FocusMode) => {
    switch (mode) {
      case 'Pomodoro': return 25;
      case 'Quick': return 15;
      case 'Standard': return 45;
      case 'Deep': return 90;
      case 'Custom': return 60;
      default: return 25;
    }
  };

  const startFocus = () => {
    const duration = getDurationForMode(selectedMode);
    const newSession: any = {
      
      title: selectedTaskId ? (tasks || []).find(t => t.id === selectedTaskId)?.title || 'Không tên' : 'Phiên tự do',
      mode: selectedMode,
      status: 'Running',
      plannedDuration: duration,
      actualDuration: 0,
      startTime: new Date().toISOString(),
      taskId: selectedTaskId || null,
      interruptions: [],
      createdAt: new Date().toISOString()
    };
    addFocusSession(newSession);
    setActiveSession(newSession);
    setElapsedSeconds(0);
  };

  const pauseFocus = () => {
    if (!activeSession) return;
    updateFocusSession(activeSession.id, { status: 'Paused' });
    setActiveSession(prev => prev ? { ...prev, status: 'Paused' } : null);
    setInterruptionStart(Date.now());
    setShowInterruptionModal(true);
  };

  const resumeFocus = () => {
    if (!activeSession) return;
    const durationSecs = Math.floor((Date.now() - interruptionStart) / 1000);
    
    const newInterruption = {
      
      timestamp: new Date().toISOString(),
      reason: interruptionReason || 'Không rõ',
      duration: durationSecs
    };
    
    const updatedInterruptions = [...(activeSession.interruptions || []), newInterruption];
    
    updateFocusSession(activeSession.id, { 
      status: 'Running',
      interruptions: updatedInterruptions
    });
    
    setActiveSession(prev => prev ? { 
      ...prev, 
      status: 'Running',
      interruptions: updatedInterruptions
    } : null);
    
    setShowInterruptionModal(false);
    setInterruptionReason('');
  };

  const finishFocus = () => {
    if (!activeSession) return;
    updateFocusSession(activeSession.id, { status: 'Paused' }); // Pause background counter
    setShowFinishModal(true);
  };

  const saveFinishedSession = () => {
    if (!activeSession) return;
    
    const actualMinutes = Math.floor(elapsedSeconds / 60);
    
    updateFocusSession(activeSession.id, {
      status: 'Completed',
      actualDuration: actualMinutes,
      endTime: new Date().toISOString(),
      reflection: reflection
    });

    if (activeSession.taskId) {
      const task = (tasks || []).find(t => t.id === activeSession.taskId);
      if (task) {
        updateTask(task.id, {
          actualHours: (task.actualHours || 0) + Number((actualMinutes / 60).toFixed(2))
        });
      }
    }

    setActiveSession(null);
    setElapsedSeconds(0);
    setReflection('');
    setShowFinishModal(false);
  };

  const cancelFocus = () => {
    if (!activeSession) return;
    updateFocusSession(activeSession.id, {
      status: 'Cancelled',
      actualDuration: Math.floor(elapsedSeconds / 60),
      endTime: new Date().toISOString()
    });
    setActiveSession(null);
    setElapsedSeconds(0);
  };

  // Stats
  const todayDate = new Date().toISOString().split('T')[0];
  const todaySessions = (focusSessions || []).filter(s => s.createdAt?.startsWith(todayDate));
  
  const completedToday = todaySessions.filter(s => s.status === 'Completed');
  const totalMinutesToday = completedToday.reduce((acc, curr) => acc + (curr.actualDuration || 0), 0);
  
  const todayGoal = (focusGoals || []).find(g => g.type === 'daily' && g.startDate === todayDate);
  const targetMinutes = todayGoal ? todayGoal.targetHours * 60 : 120; // default 2h
  const progressPercent = Math.min(100, Math.round((totalMinutesToday / targetMinutes) * 100));

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto h-full flex flex-col space-y-6">
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center">
          <div className="text-sm font-bold text-slate-500 mb-1">Thời gian Focus (Hôm nay)</div>
          <div className="text-3xl font-black text-slate-900">{Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}m</div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="text-xs font-medium text-slate-400 mt-1">{progressPercent}% của mục tiêu {targetMinutes / 60}h</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center">
          <div className="text-sm font-bold text-slate-500 mb-1">Phiên hoàn thành</div>
          <div className="text-3xl font-black text-blue-600">{completedToday.length}</div>
          <div className="text-xs font-medium text-slate-400 mt-1">/{todaySessions.length} phiên đã bắt đầu</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center">
          <div className="text-sm font-bold text-slate-500 mb-1">Gián đoạn</div>
          <div className="text-3xl font-black text-amber-500">
            {todaySessions.reduce((acc, curr) => acc + (curr.interruptions?.length || 0), 0)}
          </div>
          <div className="text-xs font-medium text-slate-400 mt-1">Lần mất tập trung</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md border border-transparent p-4 flex flex-col justify-center text-white">
          <div className="text-sm font-bold text-blue-100 mb-1">Focus Streak</div>
          <div className="text-3xl font-black flex items-center gap-2">
            🔥 {focusStreak} <span className="text-lg font-medium">ngày</span>
          </div>
          <div className="text-xs font-medium text-blue-200 mt-1">Đạt mục tiêu liên tiếp</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Main Focus Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden">
          
          {!activeSession ? (
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Focus Center</h2>
                <p className="text-slate-500 font-medium">Chọn chế độ và công việc để bắt đầu.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Chế độ Focus</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Pomodoro', 'Quick', 'Standard', 'Deep'].map((m) => (
                      <button type="button"
                        key={m}
                        onClick={() => setSelectedMode(m as FocusMode)}
                        className={`py-2 px-1 rounded-xl text-sm font-bold border-2 transition-all
                          ${selectedMode === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'}`}
                      >
                        {m === 'Pomodoro' && '25m'}
                        {m === 'Quick' && '15m'}
                        {m === 'Standard' && '45m'}
                        {m === 'Deep' && '90m'}
                        <div className="text-[10px] font-medium opacity-70 mt-0.5">{m}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Liên kết Công việc (Tùy chọn)</label>
                  <div className="relative">
                    <ListTodo className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select 
                      value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow appearance-none"
                    >
                      <option value="">Phiên tự do (Không liên kết)</option>
                      {tasks.filter(t => t.status !== 'Hoàn thành' && t.status !== 'Hủy').map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button type="button" 
                onClick={startFocus}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center gap-2 group"
              >
                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" /> Start Focus
              </button>
            </div>
          ) : (
            <div className="w-full max-w-md text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5" /> {activeSession.mode} Focus
                </div>
                <h3 className="text-xl font-bold text-slate-900 truncate px-4">{activeSession.title}</h3>
              </div>

              {/* Timer Circle */}
              <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="128" cy="128" r="120" className="stroke-slate-100" strokeWidth="8" fill="none" />
                  <circle 
                    cx="128" cy="128" r="120" 
                    className={`stroke-current transition-all duration-1000 ease-linear ${activeSession.status === 'Paused' ? 'text-amber-400' : 'text-blue-600'}`} 
                    strokeWidth="8" fill="none" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - elapsedSeconds / (activeSession.plannedDuration * 60))}
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <div className={`text-5xl font-black tabular-nums tracking-tighter ${activeSession.status === 'Paused' ? 'text-amber-500' : 'text-slate-900'}`}>
                    {formatTime(activeSession.plannedDuration * 60 - elapsedSeconds)}
                  </div>
                  <div className="text-sm font-medium text-slate-400 mt-2">
                    {formatTime(elapsedSeconds)} đã trôi qua
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                {activeSession.status === 'Running' ? (
                  <button type="button" 
                    onClick={pauseFocus}
                    className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-200 transition-colors shadow-sm"
                  >
                    <Pause className="w-6 h-6 fill-current" />
                  </button>
                ) : (
                  <button type="button" 
                    onClick={resumeFocus}
                    className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors shadow-sm animate-pulse"
                  >
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </button>
                )}

                <button type="button" 
                  onClick={finishFocus}
                  className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-6 h-6" />
                </button>
                
                <button type="button" 
                  onClick={cancelFocus}
                  className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                  title="Hủy phiên"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="w-full lg:w-80 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Lịch sử hôm nay
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {todaySessions.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">Chưa có phiên nào hôm nay.</div>
            ) : (
              todaySessions.map(session => (
                <div key={session.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-800 truncate pr-2">{session.title}</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap
                      ${session.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                        session.status === 'Cancelled' ? 'bg-slate-200 text-slate-600' :
                        'bg-blue-100 text-blue-700'}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {session.mode} ({session.plannedDuration}m)</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Thực: {session.actualDuration}m</span>
                    {session.interruptions && session.interruptions.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600"><ShieldAlert className="w-3 h-3" /> {session.interruptions.length} gián đoạn</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      
      {/* Interruption Modal */}
      {showInterruptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 mb-2">Ghi nhận Gián đoạn</h3>
            <p className="text-sm text-slate-500 mb-4">Lý do bạn tạm dừng phiên này là gì?</p>
            
            <div className="space-y-2 mb-6">
              {['Điện thoại/Mạng xã hội', 'Có người gọi/Họp đột xuất', 'Nhu cầu cá nhân', 'Nghỉ giải lao', 'Khác'].map(reason => (
                <button type="button"
                  key={reason}
                  onClick={() => setInterruptionReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors border
                    ${interruptionReason === reason ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                >
                  {reason}
                </button>
              ))}
            </div>
            
            <button type="button" 
              onClick={resumeFocus}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              Tiếp tục Focus
            </button>
          </div>
        </div>
      )}

      {/* Finish Session Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Hoàn thành xuất sắc!</h3>
              <p className="text-sm text-slate-500 mt-1">Bạn đã focus được <strong className="text-slate-900">{Math.floor(elapsedSeconds / 60)} phút</strong>.</p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú / Kết quả đạt được (Tùy chọn)</label>
              <textarea 
                value={reflection} onChange={e => setReflection(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Tôi đã hoàn thành phần 1, phát hiện thêm lỗi ở module user..."
              ></textarea>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button type="button" 
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-3 text-slate-600 font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button type="button" 
                onClick={saveFinishedSession}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                Lưu kết quả
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
