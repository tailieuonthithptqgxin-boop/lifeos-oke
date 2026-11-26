import React from 'react';
import {
  PhoneOff,
  Sliders,
  Sparkles,
  Headphones,
  Target,
  Users,
  MessageSquare,
  Lock,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Music
} from 'lucide-react';

export interface BottomControlBarProps {
  roomName: string;
  onlineCount: number;
  userGoal: string;
  pomodoro: {
    phase: 'FOCUS' | 'BREAK';
    timeFormatted: string;
    isRunning: boolean;
  };
  unreadChatCount?: number;
  isDrawerOpen: boolean;
  activeDrawerTab: 'members' | 'chat';
  isLight?: boolean;
  isFullscreen?: boolean;
  isHost?: boolean;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  isYouTubePlaying?: boolean;
  youTubeTrackTitle?: string;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onOpenYouTubePlayer?: () => void;
  onTogglePlayPomodoro?: () => void;
  onResetPomodoro?: () => void;
  onEditGoalClick?: () => void;
  onOpenAmbientMusic?: () => void;
  onSendKudosClick?: () => void;
  onOpenLayoutSettings?: () => void;
  onOpenRoomSettings?: () => void;
  onLeaveRoomClick?: () => void;
  onToggleDrawer?: (tab: 'members' | 'chat') => void;
  onToggleTheme?: () => void;
  onToggleFullscreen?: () => void;
}

export const BottomControlBar = React.memo(function BottomControlBar({
  roomName,
  onlineCount,
  userGoal,
  pomodoro,
  unreadChatCount = 0,
  isDrawerOpen,
  activeDrawerTab,
  isLight = false,
  isFullscreen = false,
  isHost = false,
  isMicOn = false,
  isCameraOn = false,
  isScreenSharing = false,
  isYouTubePlaying = false,
  youTubeTrackTitle,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onOpenYouTubePlayer,
  onTogglePlayPomodoro,
  onResetPomodoro,
  onEditGoalClick,
  onOpenAmbientMusic,
  onSendKudosClick,
  onOpenLayoutSettings,
  onOpenRoomSettings,
  onLeaveRoomClick,
  onToggleDrawer,
  onToggleTheme,
  onToggleFullscreen,
}: BottomControlBarProps) {
  const isFocusPhase = pomodoro.phase === 'FOCUS';
  const [mobileToolsOpen, setMobileToolsOpen] = React.useState(false);

  return (
    <>
      {/* =================================================================== */}
      {/* MOBILE TOOLS ACTION SHEET (< md) — GỌN GÀNG, CHỐNG TRÀN 100%        */}
      {/* =================================================================== */}
      {mobileToolsOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setMobileToolsOpen(false)}
          />
          <div
            className={`relative z-10 rounded-t-3xl border-t p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#181a1f]/98 border-white/10 text-white backdrop-blur-2xl'
            }`}
          >
            <div className="w-10 h-1 rounded-full bg-slate-400/40 mx-auto" />

            {/* Live Pomodoro Control Strip inside Mobile Sheet */}
            <div
              className={`flex items-center justify-between p-3 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.05] border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isFocusPhase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <div>
                  <div className="font-mono font-black text-base tracking-wider leading-none">
                    {pomodoro.timeFormatted}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Đồng hồ Pomodoro · {isFocusPhase ? 'Tập trung' : 'Giải lao'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePlayPomodoro}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  {pomodoro.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{pomodoro.isRunning ? 'Tạm dừng' : 'Chạy'}</span>
                </button>
                <button
                  type="button"
                  onClick={onResetPomodoro}
                  className={`p-2 rounded-xl border active:scale-95 cursor-pointer ${
                    isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/10 border-white/10 text-slate-300'
                  }`}
                  title="Đặt lại"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Grid of Study Utilities */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  onOpenYouTubePlayer?.();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isYouTubePlaying
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-white/[0.04] border-white/10 text-slate-200'
                }`}
              >
                <Music className="w-5 h-5 text-rose-400" />
                <span className="text-[11px] font-bold">Nhạc Lofi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  onOpenAmbientMusic?.();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/[0.04] border-white/10 text-slate-200'
                }`}
              >
                <Headphones className="w-5 h-5 text-indigo-400" />
                <span className="text-[11px] font-bold">Tiếng mưa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  onSendKudosClick?.();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-[11px] font-bold">Tiếp lửa 🔥</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  onToggleDrawer?.('members');
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/[0.04] border-white/10 text-slate-200'
                }`}
              >
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="text-[11px] font-bold">Học viên ({onlineCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  onEditGoalClick?.();
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/[0.04] border-white/10 text-slate-200'
                }`}
              >
                <Target className="w-5 h-5 text-emerald-400" />
                <span className="text-[11px] font-bold">Đổi mục tiêu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  if (isHost && onOpenRoomSettings) {
                    onOpenRoomSettings();
                  } else {
                    onOpenLayoutSettings?.();
                  }
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/[0.04] border-white/10 text-slate-200'
                }`}
              >
                {isHost ? <Settings className="w-5 h-5 text-purple-400" /> : <Sliders className="w-5 h-5 text-cyan-400" />}
                <span className="text-[11px] font-bold">{isHost ? 'Cài đặt phòng' : 'Bố cục'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer
        className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-2xl transition-colors select-none ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-lg'
            : 'bg-[#18191c]/95 border-white/10 text-white shadow-2xl'
        }`}
      >
        {/* =================================================================== */}
        {/* GIAO DIỆN MOBILE (< md): 5 NÚT CHUẨN FACETIME / DISCORD, DỄ BẤM 100% */}
        {/* =================================================================== */}
        <div className="flex md:hidden items-center justify-between gap-2 px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
          {/* 1. Mic */}
          <button
            type="button"
            onClick={onToggleMic}
            className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-95 transition cursor-pointer"
          >
            <span
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                isMicOn
                  ? isLight
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-white/[0.07] border-white/10 text-slate-300'
              }`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-rose-400" />}
            </span>
            <span className="text-[10px] font-bold opacity-80">{isMicOn ? 'Đang bật' : 'Tắt Mic'}</span>
          </button>

          {/* 2. Camera */}
          <button
            type="button"
            onClick={onToggleCamera}
            className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-95 transition cursor-pointer"
          >
            <span
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                isCameraOn
                  ? isLight
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-white/[0.07] border-white/10 text-slate-300'
              }`}
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-rose-400" />}
            </span>
            <span className="text-[10px] font-bold opacity-80">{isCameraOn ? 'Cam bật' : 'Tắt Cam'}</span>
          </button>

          {/* 3. Chat Phòng (1-Tap) */}
          <button
            type="button"
            onClick={() => onToggleDrawer?.('chat')}
            className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-95 transition cursor-pointer"
          >
            <span
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                isDrawerOpen && activeDrawerTab === 'chat'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                  : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-white/[0.07] border-white/10 text-slate-200'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-bold opacity-80">Trò chuyện</span>
          </button>

          {/* 4. Tiện ích (Nhạc, Mưa, Pomodoro, Mục tiêu) */}
          <button
            type="button"
            onClick={() => setMobileToolsOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-95 transition cursor-pointer"
          >
            <span
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
                isYouTubePlaying
                  ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-300'
                  : isLight
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'bg-white/[0.07] border-white/10 text-amber-300'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              {isYouTubePlaying && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </span>
            <span className="text-[10px] font-bold opacity-80">Tiện ích</span>
          </button>

          {/* 5. Rời phòng */}
          <button
            type="button"
            onClick={onLeaveRoomClick}
            className="flex-1 flex flex-col items-center gap-1 py-1 active:scale-95 transition cursor-pointer"
          >
            <span className="w-11 h-11 rounded-2xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center">
              <PhoneOff className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold text-rose-400">Rời phòng</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* GIAO DIỆN DESKTOP (hidden md:flex): ĐẦY ĐỦ 3 CỤM GOOGLE MEET        */}
        {/* =================================================================== */}
        <div className="hidden md:flex h-[76px] px-5 items-center justify-between">
      {/* =================================================================== */}
      {/* 1. KHỐI TRÁI: ĐỒNG HỒ POMODORO, TÊN PHÒNG, SỐ NGƯỜI ONLINE          */}
      {/* =================================================================== */}
      <div className="flex items-center gap-3 min-w-0 max-w-[35%]">
        {/* Pomodoro Clock Capsule */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xs shrink-0 ${
            isLight
              ? 'bg-slate-100 border-slate-200'
              : 'bg-[#3c4043]/80 border-white/10'
          }`}
        >
          {/* Status Dot / Flame */}
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isFocusPhase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />

          <span className="font-mono font-black text-sm tracking-wider">
            {pomodoro.timeFormatted}
          </span>

          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
              isFocusPhase
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isFocusPhase ? 'Focus' : 'Break'}
          </span>

          {/* Quick Play/Pause & Reset for host / local */}
          <button
            type="button"
            onClick={onTogglePlayPomodoro}
            className="text-emerald-400 hover:scale-110 transition p-0.5 cursor-pointer"
            title={pomodoro.isRunning ? 'Tạm dừng đồng hồ' : 'Tiếp tục đồng hồ'}
          >
            {pomodoro.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onResetPomodoro}
            className="text-slate-400 hover:text-white transition p-0.5 cursor-pointer"
            title="Đặt lại đồng hồ"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Divider */}
        <div className={`hidden md:block h-6 w-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />

        {/* Room Name & Online Count */}
        <div className="hidden md:flex flex-col min-w-0">
          <span className="font-bold text-xs truncate max-w-[160px] lg:max-w-[200px]">
            {roomName}
          </span>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{onlineCount} bạn đang học</span>
          </span>
        </div>

        {/* Live YouTube Mini Ticker */}
        {isYouTubePlaying && youTubeTrackTitle && (
          <div
            onClick={onOpenYouTubePlayer}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-rose-300 text-[11px] font-medium cursor-pointer hover:bg-red-500/25 transition max-w-[180px] shrink-0"
            title={`Đang phát: ${youTubeTrackTitle} (Nhấn để mở)`}
          >
            <Music className="w-3 h-3 text-red-400 animate-pulse shrink-0" />
            <span className="truncate">{youTubeTrackTitle}</span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 2. KHỐI GIỮA: NÚT ĐIỀU KHIỂN CHÍNH (CHUẨN GOOGLE MEET DARK DOCK)    */}
      {/* =================================================================== */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Nút 1: Bật / Tắt Micro */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isMicOn
              ? isLight
                ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700'
                : 'bg-[#3c4043] hover:bg-[#484c50] border-emerald-500/40 text-emerald-400 shadow-sm'
              : 'bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-md shadow-red-600/25'
          }`}
          title={isMicOn ? 'Tắt Micro (Đang bật)' : 'Bật Micro (Đang tắt)'}
        >
          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Nút 2: Bật / Tắt Camera */}
        <button
          type="button"
          onClick={onToggleCamera}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isCameraOn
              ? isLight
                ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-700'
                : 'bg-[#3c4043] hover:bg-[#484c50] border-emerald-500/40 text-emerald-400 shadow-sm'
              : 'bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-md shadow-red-600/25'
          }`}
          title={isCameraOn ? 'Tắt Camera (Đang bật)' : 'Bật Camera (Đang tắt)'}
        >
          {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        {/* Nút 3: Chia sẻ màn hình (Screen Share) */}
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isScreenSharing
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-slate-200'
          }`}
          title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
        >
          <Monitor className="w-4 h-4" />
        </button>

        {/* Nút 4: YouTube Study Music Player */}
        <button
          type="button"
          onClick={onOpenYouTubePlayer}
          className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
            isYouTubePlaying
              ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white shadow-md shadow-red-600/30'
              : isLight
              ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-rose-300'
          }`}
          title="Nhạc học tập YouTube (Lofi, Không lời, Sóng não)"
        >
          <Music className={`w-4 h-4 ${isYouTubePlaying ? 'animate-bounce text-white' : 'text-rose-400'}`} />
          <span className="hidden md:inline">Nhạc YouTube</span>
          {isYouTubePlaying && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          )}
        </button>

        {/* Nút 5: Sửa mục tiêu cá nhân */}
        <button
          type="button"
          onClick={onEditGoalClick}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-white'
          }`}
          title={`Mục tiêu hiện tại: ${userGoal} - Bấm để thay đổi`}
        >
          <Target className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="hidden lg:inline max-w-[120px] truncate">{userGoal}</span>
        </button>

        {/* Nút 6: Nhạc nền tập trung (Âm thanh trắng, Mưa rơi, Cafe) */}
        <button
          type="button"
          onClick={onOpenAmbientMusic}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-indigo-600'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-indigo-300'
          }`}
          title="Âm thanh trắng & Tiếng mưa/Bàn phím/Quán Cafe"
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Nút 7: Tiếp Lửa (Spark / Kudos) */}
        <button
          type="button"
          onClick={onSendKudosClick}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isLight
              ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700'
              : 'bg-[#3c4043] hover:bg-amber-500 hover:text-slate-950 border-white/5 text-amber-400'
          }`}
          title="Tiếp Lửa: Bắn Kudos cổ vũ toàn phòng học"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Nút 8: Đổi bố cục (Change Layout) */}
        <button
          type="button"
          onClick={onOpenLayoutSettings}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isLight
              ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800'
              : 'bg-[#3c4043] hover:bg-cyan-500 hover:text-slate-950 border-white/5 text-cyan-300'
          }`}
          title="Thay đổi bố cục (Tự động, Xếp kề, Tiêu điểm, Thanh bên)"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Nút 8.1: Cài đặt phòng học (Chỉ dành cho Chủ phòng / Host) */}
        {isHost && (
          <button
            type="button"
            onClick={onOpenRoomSettings}
            className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isLight
                ? 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-700'
                : 'bg-[#3c4043] hover:bg-purple-600 hover:text-white border-white/5 text-purple-300'
            }`}
            title="Cài đặt phòng học (Quyền Chủ phòng)"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Nút 9: Rời phòng học (Màu đỏ tròn chuẩn Google Meet) */}
        <button
          type="button"
          onClick={onLeaveRoomClick}
          className="p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-90 transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="Rời khỏi phòng học"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>

      {/* =================================================================== */}
      {/* 3. KHỐI PHẢI: DRAWER TOGGLES (THÀNH VIÊN, CHAT), SÁNG/TỐI, FULLSCREEN*/}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Nút Danh sách thành viên (Badge số người) */}
        <button
          type="button"
          onClick={() => onToggleDrawer?.('members')}
          className={`relative p-2.5 rounded-full border transition-all cursor-pointer ${
            isDrawerOpen && activeDrawerTab === 'members'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-slate-300'
          }`}
          title="Danh sách học viên trong phòng"
        >
          <Users className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] shadow-xs">
            {onlineCount}
          </span>
        </button>

        {/* Nút Khung Chat (Luôn mở) */}
        <button
          type="button"
          onClick={() => onToggleDrawer?.('chat')}
          className={`relative p-2.5 rounded-full border transition-all cursor-pointer ${
            isDrawerOpen && activeDrawerTab === 'chat'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-slate-300'
          }`}
          title="Trò chuyện phòng học (Luôn mở)"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px]">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className={`hidden sm:block h-6 w-px ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />

        {/* Nút Đổi Sáng/Tối */}
        <button
          type="button"
          onClick={onToggleTheme}
          className={`hidden sm:flex p-2.5 rounded-full border transition-all cursor-pointer ${
            isLight
              ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-amber-400'
          }`}
          title={isLight ? 'Chuyển sang Chế độ Tối' : 'Chuyển sang Chế độ Sáng'}
        >
          {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Nút Toàn màn hình */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={`hidden sm:flex p-2.5 rounded-full border transition-all cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-slate-300'
          }`}
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      </div>
    </footer>
    </>
  );
});
