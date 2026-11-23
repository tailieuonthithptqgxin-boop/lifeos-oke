import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Target,
  Sparkles,
  X,
  CheckCircle2,
  BookOpen,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Code2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export interface RoomCheckInOptions {
  micOn: boolean;
  camOn: boolean;
}

interface RoomCheckInModalProps {
  isOpen: boolean;
  roomName: string;
  roomTopic: string;
  userAvatar?: string;
  userName?: string;
  onClose: () => void;
  onCheckIn: (goal: string, options: RoomCheckInOptions) => Promise<void>;
  isSubmitting?: boolean;
}

const PRESET_GOALS = [
  { label: 'Giải bài tập & Làm đề', icon: BookOpen },
  { label: 'Đọc tài liệu & Nghiên cứu', icon: Sparkles },
  { label: 'Học nhóm / Thảo luận Meet', icon: Video },
  { label: 'Luyện 50 từ vựng Ngoại ngữ', icon: Target },
  { label: 'Lập trình & Fix bugs dự án', icon: Code2 },
  { label: 'Tập trung sâu Pomodoro (25m)', icon: Clock }
];

export function RoomCheckInModal({
  isOpen,
  roomName,
  roomTopic,
  userAvatar,
  userName = 'Bạn',
  onClose,
  onCheckIn,
  isSubmitting = false
}: RoomCheckInModalProps) {
  useBodyScrollLock(isOpen);
  const [goal, setGoal] = useState('Giải bài tập & Làm đề');
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize camera & mic preview when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } },
          audio: true
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasMediaPermission(true);

        // Apply initial toggle states
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = isCamOn;

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = isMicOn;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Set up real-time Web Audio Analyser for VU Level Meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              if (!mounted) return;
              if (analyserRef.current && isMicOn) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                // Scale to percentage (0 - 100)
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              } else {
                setAudioLevel(0);
              }
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            updateMeter();
          }
        } catch (audioErr) {
          console.warn('Audio analyser init warning:', audioErr);
        }
      } catch (err) {
        console.warn('getUserMedia warning (permission denied or no camera/mic):', err);
        if (mounted) {
          setHasMediaPermission(false);
          setIsCamOn(false);
          setIsMicOn(false);
        }
      }
    }

    initMedia();

    return () => {
      mounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle Cam Toggle
  const toggleCam = () => {
    setIsCamOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = next;
      }
      return next;
    });
  };

  // Handle Mic Toggle
  const toggleMic = () => {
    setIsMicOn((prev) => {
      const next = !prev;
      if (streamRef.current) {
        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = next;
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGoal = goal.trim() || 'Học tập tập trung';
    
    // Stop local preview stream before passing control to in-room meet
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
    }

    await onCheckIn(cleanGoal, { micOn: isMicOn, camOn: isCamOn });
  };

  const avatar = userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userName}`;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#181a1d] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-5 text-white">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase backdrop-blur-xs">
                <Target className="w-3 h-3" />
                <span>Phòng Chờ Meet (Pre-join Lobby)</span>
              </div>
              <h3 className="text-lg font-black tracking-tight">{roomName}</h3>
              <p className="text-xs text-emerald-100 line-clamp-1">Chủ đề: {roomTopic}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* 1. Live Google Meet Camera & Mic Green Room Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Kiểm tra Camera & Microphone trước khi vào</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {isCamOn ? 'Webcam bật' : 'Webcam tắt'} | {isMicOn ? 'Mic bật' : 'Mic tắt'}
              </span>
            </div>

            {/* Video Preview Box */}
            <div className="relative w-full aspect-video rounded-2xl bg-[#202124] border border-white/10 overflow-hidden shadow-inner flex items-center justify-center">
              {isCamOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden shadow-md">
                    <img src={avatar} alt={userName} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">{userName}</span>
                  <span className="text-[11px] text-slate-400 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                    Camera đang tắt (Sẽ hiển thị Avatar)
                  </span>
                </div>
              )}

              {/* Floating Camera & Mic Controls on Video */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-xl">
                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2.5 rounded-full transition-all cursor-pointer shadow-md active:scale-95 ${
                    isMicOn
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 ring-2 ring-emerald-400/50'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                  title={isMicOn ? 'Tắt Micro' : 'Bật Micro'}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                {/* Cam Button */}
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`p-2.5 rounded-full transition-all cursor-pointer shadow-md active:scale-95 ${
                    isCamOn
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 ring-2 ring-emerald-400/50'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                  title={isCamOn ? 'Tắt Camera' : 'Bật Camera'}
                >
                  {isCamOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Live VU Meter indicator */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white text-[11px]">
                {isMicOn ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <div className="flex items-center gap-0.5 h-3">
                      {[15, 35, 60, 85].map((threshold, idx) => (
                        <span
                          key={idx}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            audioLevel >= threshold
                              ? 'h-3 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                              : 'h-1.5 bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-emerald-300 font-mono">{audioLevel}%</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10px] text-slate-300">Mic đang tắt</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2. Goal Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Mục tiêu ca học hôm nay của bạn là gì? <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Mục tiêu sẽ hiển thị nổi bật trên video của bạn để cả phòng cùng theo dõi và tiếp thêm động lực!
            </p>

            <div className="relative">
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="VD: Hoàn thành 10 câu bài tập Toán / Đọc xong chương 3..."
                maxLength={90}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base sm:text-sm min-h-[44px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <span className="absolute right-3.5 bottom-3 text-[10px] text-slate-400 font-mono">
                {goal.length}/90
              </span>
            </div>
          </div>

          {/* Quick Choice Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Gợi ý mục tiêu nhanh:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_GOALS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = goal === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setGoal(preset.label)}
                    className={`p-2.5 min-h-[40px] sm:min-h-0 rounded-xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !goal.trim()}
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang vào phòng...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Điểm danh & Vào phòng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
