import React, { useRef, useEffect } from 'react';
import { Pin, Sparkles, Mic, MicOff, Flame, Target, Video, VideoOff, UserX, Crown } from 'lucide-react';
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

  return (
    <div
      onClick={() => onTileClick?.(participant)}
      className={`group relative w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-200 select-none cursor-pointer ${
        isFocusing
          ? 'bg-[#3c4043] ring-2 ring-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
          : 'bg-[#3c4043] border border-white/5 hover:border-white/20'
      }`}
      style={{
        aspectRatio: '16 / 9',
        backgroundColor: '#3c4043',
      }}
    >
      {/* 1. Center Avatar / Visual Content */}
      <div className="relative flex flex-col items-center justify-center w-full h-full p-2 pointer-events-none">
        {isSelf && participant.isCameraOn && stream ? (
          <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
              <Video className="w-2.5 h-2.5" />
              <span>Webcam (Bạn)</span>
            </div>
          </div>
        ) : participant.isCameraOn ? (
          <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center text-xs text-slate-400 gap-1.5 p-2">
            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Video className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-300 font-semibold">{name} đang mở Cam</span>
          </div>
        ) : (
          <div
            className={`rounded-full relative transition-transform duration-200 group-hover:scale-105 ${
              isCompact ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-14 h-14 sm:w-20 sm:h-20'
            }`}
          >
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full rounded-full object-cover bg-[#202124] ring-2 ring-white/10"
              loading="lazy"
            />
            {/* Live Status Dot */}
            <span
              className={`absolute bottom-0 right-0 rounded-full ring-2 ring-[#3c4043] ${
                isCompact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
              } ${isFocusing ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}
              title={isFocusing ? 'Đang tập trung cao độ' : 'Đang nghỉ ngơi'}
            />
          </div>
        )}
      </div>

      {/* 2. Top-Right Hover Quick Actions (Ghim & Tiếp Lửa) */}
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
              : 'bg-black/60 hover:bg-black/80 text-white/90 hover:text-white'
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
            className="p-1.5 rounded-full bg-black/60 hover:bg-amber-500 text-amber-300 hover:text-slate-950 backdrop-blur-md transition-all cursor-pointer shadow-md hover:scale-110 active:scale-95"
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
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
          <Pin className="w-2.5 h-2.5 fill-current" />
          <span>Đã ghim</span>
        </div>
      )}

      {/* 3. Bottom Pill: Name, Streak, Mic status */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1.5 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[85%] bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 text-white shadow-xs">
          {/* Mic indicator */}
          {participant.isMicOn ? (
            <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
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
          <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
            YOU
          </span>
        )}
      </div>

      {/* 4. Goal Display: Subtitle if space permits, or floating tooltip on hover */}
      {!isCompact ? (
        <div className="absolute bottom-9 left-2 right-2 z-10 pointer-events-none">
          <p className="text-[11px] text-slate-300 truncate bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/5">
            🎯 {goal}
          </p>
        </div>
      ) : (
        /* Floating hover tooltip for compact tiles */
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex items-center gap-1.5 z-50 pointer-events-none w-max max-w-xs p-2 rounded-xl text-xs bg-[#202124] text-white shadow-2xl border border-white/20 animate-in fade-in zoom-in-95">
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{goal}</span>
        </div>
      )}
    </div>
  );
});
