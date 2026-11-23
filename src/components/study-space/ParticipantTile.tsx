import React, { useRef, useEffect } from 'react';
import { Pin, Sparkles, Mic, MicOff, Flame, Target, Video, VideoOff, UserX, Crown, Headphones, Zap } from 'lucide-react';
import type { MeetParticipant } from './useSortedParticipants';

export interface ParticipantTileProps {
  participant: MeetParticipant;
  isPinned?: boolean;
  isSelf?: boolean;
  isCompact?: boolean; // When grid has >= 16 tiles or small height
  isHost?: boolean;
  roomHostId?: string;
  stream?: MediaStream | null;
  onTogglePin?: (id: string) => void;
  onSendKudos?: (id: string, emoji?: string) => void;
  onTileClick?: (participant: MeetParticipant) => void;
  onKick?: (participant: MeetParticipant) => void;
}

export const ParticipantTile = React.memo(function ParticipantTile({
  participant,
  isPinned = false,
  isSelf = false,
  isCompact = false,
  isHost = false,
  roomHostId,
  stream,
  onTogglePin,
  onSendKudos,
  onTileClick,
  onKick,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && isSelf) {
      if (participant.isCameraOn && stream) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [isSelf, stream, participant.isCameraOn]);

  const isFocusing =
    participant.presence === 'STUDYING' ||
    participant.presence === 'FOCUS' ||
    participant.presenceState === 'STUDYING';

  const streak = participant.streakDays ?? participant.streak ?? 0;
  const goal = participant.goal || participant.studyGoal || 'Đang tự học tập trung...';
  const name = participant.name || (isSelf ? 'Bạn' : 'Học Viên');

  const avatarUrl =
    participant.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.id || 'student'}`;

  // Gen Z aesthetic status label
  const genZVibe = isFocusing
    ? (streak >= 7 ? '🔥 Sát Thủ Deadline' : '⚡ 100% Tập Trung')
    : '🎧 Chill Study Vibe';

  return (
    <div
      onClick={() => onTileClick?.(participant)}
      className={`group relative w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-300 select-none cursor-pointer ${
        isFocusing
          ? 'bg-gradient-to-br from-[#101422] via-[#161c30] to-[#0c0f1a] ring-2 ring-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
          : 'bg-gradient-to-br from-[#121624] via-[#1a2035] to-[#0e121c] border border-white/10 hover:border-white/25 shadow-xl'
      }`}
      style={{
        aspectRatio: '16 / 9',
      }}
    >
      {/* Background Ambient Glow (Cyber-Lofi Desk Theme) */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.2),transparent_70%)]" />

      {/* 1. Center Avatar / Visual Content */}
      <div className="relative flex flex-col items-center justify-center w-full h-full p-2 pointer-events-none z-10">
        {isSelf && participant.isCameraOn && stream ? (
          <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 border border-emerald-500/30 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Webcam (Bạn)</span>
            </div>
          </div>
        ) : participant.isCameraOn ? (
          <div className="w-full h-full bg-slate-900/90 rounded-xl flex flex-col items-center justify-center text-xs text-slate-400 gap-2 p-2 border border-white/5">
            <div className="p-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Video className="w-7 h-7 text-emerald-400 animate-pulse" />
            </div>
            <span className="text-xs text-slate-200 font-bold">{name} đang mở Cam</span>
          </div>
        ) : (
          /* GEN Z AESTHETIC CAMERA-OFF CARD */
          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2">
            <div
              className={`rounded-full relative transition-all duration-300 group-hover:scale-105 flex items-center justify-center ${
                isCompact ? 'w-11 h-11 sm:w-14 sm:h-14' : 'w-16 h-16 sm:w-22 sm:h-22'
              }`}
            >
              {/* Animated Speaking / Focus Pulse Ring */}
              {participant.isMicOn && (
                <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
              )}

              {/* Glowing Aura Frame */}
              <div
                className={`w-full h-full rounded-full p-0.5 transition-all duration-300 ${
                  isFocusing
                    ? 'ring-4 ring-emerald-400/70 shadow-[0_0_25px_rgba(52,211,153,0.4)]'
                    : 'ring-2 ring-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                }`}
              >
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full rounded-full object-cover bg-[#161a29]"
                  loading="lazy"
                />
              </div>

              {/* Live Status Badge Dot */}
              <span
                className={`absolute bottom-0 right-0 rounded-full ring-2 ring-[#101422] ${
                  isCompact ? 'w-3 h-3' : 'w-4 h-4'
                } ${isFocusing ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`}
                title={isFocusing ? 'Đang tập trung cao độ' : 'Đang nghỉ ngơi'}
              />
            </div>

            {/* Gen Z Vibe Tag (Hiển thị khi ô không quá nhỏ) */}
            {!isCompact && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-semibold shadow-xs">
                <span>{genZVibe}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Top-Right Hover Quick Actions (Ghim & Tiếp Lửa & Kích) */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
        {/* Nút Ghim (Pin) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin?.(participant.id);
          }}
          className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
            isPinned
              ? 'bg-cyan-500 text-slate-950 shadow-md scale-105'
              : 'bg-black/60 hover:bg-black/80 text-white/90 hover:text-white border border-white/10'
          }`}
          title={isPinned ? 'Bỏ ghim thành viên' : 'Ghim lên vị trí ưu tiên (Tối đa 6)'}
        >
          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
        </button>

        {/* Nút Tiếp Lửa (Spark / Kudos) */}
        {!isSelf && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSendKudos?.(participant.id, '🔥');
            }}
            className="p-1.5 rounded-full bg-black/60 hover:bg-amber-500 text-amber-300 hover:text-slate-950 backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-md hover:scale-110 active:scale-95"
            title="Tiếp lửa (Bắn Kudos cổ vũ bạn học)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Nút Kích Học Viên (Chỉ Chủ phòng / Host) */}
        {isHost && !isSelf && onKick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onKick(participant);
            }}
            className="p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-all cursor-pointer shadow-md hover:scale-110 active:scale-95"
            title="Kích học viên này ra khỏi phòng (Quyền Chủ phòng)"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2.1 Always visible Pin Badge if pinned */}
      {isPinned && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md">
          <Pin className="w-2.5 h-2.5 fill-current" />
          <span>Đã ghim</span>
        </div>
      )}

      {/* 3. Bottom Pill: Name, Streak, Mic status, Equalizer */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1.5 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[85%] bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 text-white shadow-md">
          {/* Mic indicator with Equalizer waves */}
          {participant.isMicOn ? (
            <div className="flex items-center gap-1 shrink-0">
              <Mic className="w-3 h-3 text-emerald-400" />
              <div className="flex items-center gap-0.5 h-2.5">
                <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              </div>
            </div>
          ) : (
            <MicOff className="w-3 h-3 text-red-400 shrink-0" />
          )}

          {/* Host Crown indicator */}
          {roomHostId && participant.id === roomHostId && (
            <span title="Chủ phòng" className="text-amber-400 text-xs shrink-0">
              👑
            </span>
          )}

          {/* Name */}
          <span className="text-xs font-bold truncate">
            {isSelf ? `${name} (Bạn)` : name}
          </span>

          {/* Streak Flame */}
          {streak > 0 && (
            <span className="inline-flex items-center text-[10px] font-extrabold text-amber-400 shrink-0">
              <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{streak}</span>
            </span>
          )}
        </div>

        {/* Self Indicator / Crown */}
        {isSelf && (
          <span className="bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-lg shrink-0 shadow-sm">
            YOU
          </span>
        )}
      </div>

      {/* 4. Goal Display: Subtitle if space permits, or floating tooltip on hover */}
      {!isCompact ? (
        <div className="absolute bottom-9 left-2 right-2 z-10 pointer-events-none">
          <p className="text-[11px] text-slate-200 truncate bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10 shadow-sm">
            🎯 {goal}
          </p>
        </div>
      ) : (
        /* Floating hover tooltip for compact tiles */
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-1.5 z-50 pointer-events-none w-max max-w-xs p-2 rounded-xl text-xs bg-[#181a1d] text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95">
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{goal}</span>
        </div>
      )}
    </div>
  );
});
