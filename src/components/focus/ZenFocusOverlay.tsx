import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, Square, Sparkles, Volume2, VolumeX, 
  Flame, Zap, Check, ChevronDown, Music, RotateCcw,
  Target, Shield, Bell, Maximize, Minimize, Minus, Plus
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { apiCall } from '../../lib/apiClient';

interface ZenFocusOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTaskId?: string;
}

type AmbientTrack = 'none' | 'lofi' | 'rain' | 'brown_noise' | 'forest' | 'cafe';

const MINDFUL_FOCUS_TIPS = [
  '💡 Mẹo Deep Work: Tắt mọi thông báo để bảo toàn tối đa Dopamine làm việc sâu.',
  '🧠 Nhịp sinh học não bộ: 25 phút Pomodoro tối ưu hóa khả năng ghi nhớ dài hạn.',
  '✨ Chánh niệm: Hít thở sâu 4 giây - giữ 4 giây - thở ra 4 giây để đưa cơ thể về nhịp Flow.',
  '🎯 Đơn nhiệm (Single-tasking): Xử lý dứt điểm 1 mục tiêu duy nhất trước khi chuyển việc.',
  '🛡️ Không gian tĩnh: Âm thanh sóng âm mộc giúp loại bỏ tạp âm môi trường và giảm xao nhãng.',
  '🚀 Kỷ luật tự giác: Mỗi phút bạn ngồi lại với công việc là một bước tiến vượt bậc của bản thân.'
];

export function ZenFocusOverlay({ isOpen, onClose, defaultTaskId }: ZenFocusOverlayProps) {
  const { tasks = [], focusSessions = [], addFocusSession, updateTask } = useAppStore();

  const [mode, setMode] = useState<'POMODORO' | 'FLOW'>('POMODORO');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState(0);

  // Selected task to tie real work to focus
  const [selectedTaskId, setSelectedTaskId] = useState<string>(defaultTaskId || '');
  const [customIntention, setCustomIntention] = useState('');

  // Audio ambience state
  const [ambientTrack, setAmbientTrack] = useState<AmbientTrack>('lofi');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);

  // Web Audio synth generator refs for zero-external-dependency ambient sound
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<any>(null);

  // Live CP & XP ticker
  const liveXpEarned = Math.floor(elapsedTotalSeconds / 60) * 2;
  const liveCpEarned = Math.floor(elapsedTotalSeconds / 60) * 5;

  // Real focus session counters (zero fake data)
  const [systemFocusToday, setSystemFocusToday] = useState<number | null>(null);
  const [activePeerToast, setActivePeerToast] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const myTodayFocusCount = focusSessions.filter(s => s.createdAt && s.createdAt.startsWith(todayStr)).length;

  useEffect(() => {
    if (!isOpen) return;
    apiCall('/leaderboard')
      .then(res => {
        if (res?.data?.activeFocusToday !== undefined) {
          setSystemFocusToday(res.data.activeFocusToday);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isRunning) {
      setActivePeerToast(null);
      return;
    }

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * MINDFUL_FOCUS_TIPS.length);
      setActivePeerToast(MINDFUL_FOCUS_TIPS[idx]);
      setTimeout(() => setActivePeerToast(null), 6500);
    }, 25000);

    return () => clearInterval(interval);
  }, [isOpen, isRunning]);

  // Sync defaultTaskId
  useEffect(() => {
    if (defaultTaskId) setSelectedTaskId(defaultTaskId);
  }, [defaultTaskId]);

  // Handle timer countdown / flow
  useEffect(() => {
    if (!isOpen || !isRunning) return;

    const interval = setInterval(() => {
      setElapsedTotalSeconds(prev => prev + 1);

      if (mode === 'POMODORO') {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRunning, mode]);

  // Web Audio Ambient Synthesizer
  useEffect(() => {
    if (!isOpen || isMuted || ambientTrack === 'none' || !isRunning) {
      stopAmbientSound();
      return;
    }

    startAmbientSound(ambientTrack);

    return () => {
      stopAmbientSound();
    };
  }, [isOpen, isMuted, ambientTrack, isRunning, volume]);

  const startAmbientSound = (track: AmbientTrack) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopAmbientSound();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
      gainNode.connect(ctx.destination);

      if (track === 'brown_noise' || track === 'rain') {
        // Brown noise / Rain white noise generator
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Filter for Rain vs Brown Noise
        const filter = ctx.createBiquadFilter();
        filter.type = track === 'rain' ? 'bandpass' : 'lowpass';
        filter.frequency.setValueAtTime(track === 'rain' ? 800 : 350, ctx.currentTime);

        noise.connect(filter);
        filter.connect(gainNode);
        noise.start();
        ambientNodeRef.current = noise;
      } else if (track === 'lofi') {
        // Soft sine chord drone (Warm Lo-Fi Chord)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3
        osc2.frequency.setValueAtTime(196.00, ctx.currentTime); // G3

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);

        osc1.start();
        osc2.start();
        ambientNodeRef.current = {
          stop: () => {
            try { osc1.stop(); osc2.stop(); } catch (e) {}
          }
        };
      } else if (track === 'forest') {
        // Gentle airy breeze filter
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(440, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gainNode);
        osc.start();
        ambientNodeRef.current = osc;
      } else if (track === 'cafe') {
        // Warm cafe murmur (multilayer filtered noise + low drone)
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.015 * white) / 1.015;
          lastOut = data[i];
          data[i] *= 2.8;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        noise.connect(filter);
        filter.connect(gainNode);
        noise.start();
        ambientNodeRef.current = noise;
      }
    } catch (e) {
      console.warn('Web Audio Ambient failed to start:', e);
    }
  };

  const stopAmbientSound = () => {
    try {
      if (ambientNodeRef.current) {
        ambientNodeRef.current.stop?.();
        ambientNodeRef.current = null;
      }
    } catch (e) {}
  };

  const toggleTimer = () => {
    soundEngine.playPop();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    soundEngine.playPop();
    setIsRunning(false);
    setRemainingSeconds(durationMinutes * 60);
    setElapsedTotalSeconds(0);
  };

  const handleSelectPreset = (mins: number) => {
    soundEngine.playPop();
    setDurationMinutes(mins);
    setRemainingSeconds(mins * 60);
    setIsRunning(false);
  };

  const handleCompleteSession = async () => {
    soundEngine.playSuccess();
    triggerConfetti();
    setIsRunning(false);
    stopAmbientSound();

    const actualMinutes = Math.max(1, Math.round(elapsedTotalSeconds / 60));

    // Save to real database
    try {
      await addFocusSession({
        duration: actualMinutes,
        mode: mode === 'POMODORO' ? 'Pomodoro' : 'DeepWork',
        taskId: selectedTaskId || undefined,
        notes: customIntention || 'Phiên tập trung toàn màn hình Zen Focus'
      });

      // Also call direct backend progression complete
      await apiCall('/api/focus/complete', 'POST', {
        durationMinutes: actualMinutes,
        taskId: selectedTaskId || null
      });

      // If task was selected, optionally mark task done if user wants
      if (selectedTaskId) {
        const task = tasks.find(t => t.id === selectedTaskId);
        if (task) {
          await updateTask(selectedTaskId, {
            actualHours: (task.actualHours || 0) + Number((actualMinutes / 60).toFixed(2))
          });
        }
      }
    } catch (err) {
      console.warn('Failed to save focus session:', err);
    }

    onClose();
  };

  if (!isOpen) return null;

  // Format display numbers
  const displaySecs = mode === 'POMODORO' ? remainingSeconds : elapsedTotalSeconds;
  const mins = Math.floor(displaySecs / 60);
  const secs = displaySecs % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Radial progress percent
  const totalTargetSecs = durationMinutes * 60;
  const progressPercent = mode === 'POMODORO'
    ? Math.min(100, Math.max(0, ((totalTargetSecs - remainingSeconds) / totalTargetSecs) * 100))
    : 100;

  const currentTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white animate-in fade-in duration-300 select-none overflow-hidden font-sans">
      
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-black uppercase tracking-wider backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400">ZEN FOCUS MODE</span>
          </div>

          {/* Real Deep Work Sessions Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>
              🟢 {systemFocusToday !== null && systemFocusToday > 0 
                ? `${systemFocusToday} phiên Deep Work hôm nay` 
                : (myTodayFocusCount > 0 ? `${myTodayFocusCount} phiên của bạn hôm nay` : 'Phiên Deep Work tập trung cao độ')}
            </span>
          </div>
        </div>

        {/* Live RPG Gains Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-xs font-bold backdrop-blur-md">
            <div className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span>+{liveCpEarned} CP</span>
            </div>
            <div className="flex items-center gap-1 text-amber-300 border-l border-slate-800 pl-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{liveXpEarned} XP</span>
            </div>
          </div>

          {/* Exit Fullscreen */}
          <button
            onClick={() => {
              stopAmbientSound();
              onClose();
            }}
            title="Thoát chế độ Zen (Esc)"
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Hero: Circular Radial Timer & Task Intention */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-8 px-4">
        
        {/* Task / Intention Pill */}
        <div className="max-w-md w-full text-center space-y-2">
          {currentTask ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm backdrop-blur-md shadow-lg">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="truncate max-w-xs">{currentTask.title}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/70 border border-slate-800 text-slate-400 text-xs backdrop-blur-md">
              <Target className="w-4 h-4 text-slate-500" />
              <span>{customIntention || 'Tập trung sâu không phân tâm'}</span>
            </div>
          )}
        </div>

        {/* Giant Circular Digital Timer Display */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
          
          {/* SVG Radial Glow Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="stroke-slate-900"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="stroke-emerald-500 transition-all duration-1000 ease-linear"
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time Numerals */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-6xl sm:text-7xl font-black tracking-tight font-mono text-white tabular-nums drop-shadow-md">
              {timeFormatted}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {isRunning ? 'Đang tập trung' : 'Tạm dừng'}
            </span>
          </div>
        </div>

        {/* Primary Play / Pause / Complete Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={resetTimer}
            title="Làm mới thời gian"
            className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTimer}
            className={`px-8 py-4 rounded-3xl font-black text-sm tracking-wide shadow-xl flex items-center gap-2.5 transition transform active:scale-95 cursor-pointer ${
              isRunning 
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>TẠM DỪNG</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>BẮT ĐẦU</span>
              </>
            )}
          </button>

          {elapsedTotalSeconds >= 60 && (
            <button
              onClick={handleCompleteSession}
              title="Hoàn thành & Lưu kết quả"
              className="p-3.5 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 transition cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* Preset Selectors */}
        {mode === 'POMODORO' && !isRunning && (
          <div className="flex items-center gap-2">
            {[15, 25, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => handleSelectPreset(mins)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  durationMinutes === mins
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Controls: Task Picker & Ambient Sound Selector */}
      <div className="relative z-10 p-6 sm:p-8 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Task Chooser */}
        <div className="flex items-center gap-2 max-w-sm w-full">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Chọn công việc đang làm --</option>
            {tasks
              .filter(t => t.status !== 'Hoàn thành' && t.status !== 'Hủy')
              .map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
        </div>

        {/* Ambient Sound Selector */}
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-400">Âm thanh nền:</span>
          
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl text-xs overflow-x-auto no-scrollbar">
            {(['none', 'lofi', 'rain', 'brown_noise', 'cafe'] as const).map(track => {
              const labels = {
                none: 'Tắt',
                lofi: '🎧 Lo-Fi',
                rain: '🌧️ Mưa',
                brown_noise: '🌊 Sóng biển',
                cafe: '☕ Quán Cafe'
              };
              return (
                <button
                  key={track}
                  onClick={() => setAmbientTrack(track)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shrink-0 ${
                    ambientTrack === track ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {labels[track]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setVolume(v => Math.max(0, parseFloat((v - 0.05).toFixed(2))))}
              disabled={isMuted || volume <= 0}
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Giảm âm lượng 5%"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              aria-label="Âm lượng nền"
              className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <button
              type="button"
              onClick={() => {
                setVolume(v => Math.min(1, parseFloat((v + 0.05).toFixed(2))));
                if (isMuted) setIsMuted(false);
              }}
              disabled={isMuted || volume >= 1}
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Tăng âm lượng 5%"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-300 w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

      </div>

      {/* Live Peer Motivation Toast */}
      {isRunning && activePeerToast && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-slate-200 text-xs font-bold backdrop-blur-md shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 z-30">
          <span className="text-emerald-400 uppercase tracking-wider text-[10px]">Cùng tiến bước:</span>
          <span>{activePeerToast}</span>
        </div>
      )}

    </div>
  );
}
