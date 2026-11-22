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
  Settings
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

  return (
    <footer
      className={`h-[76px] px-3 sm:px-6 fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl flex items-center justify-between transition-colors select-none ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-800 shadow-lg'
          : 'bg-[#202124] border-white/10 text-white shadow-2xl'
      }`}
      style={{
        backgroundColor: isLight ? undefined : '#202124',
      }}
    >
      {/* =================================================================== */}
      {/* 1. KHỐI TRÁI: ĐỒNG HỒ POMODORO, TÊN PHÒNG, SỐ NGƯỜI ONLINE          */}
      {/* =================================================================== */}
      <div className="flex items-center gap-3 min-w-0 max-w-[30%] sm:max-w-[35%]">
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
          <span className="font-bold text-xs truncate max-w-[160px] lg:max-w-[220px]">
            {roomName}
          </span>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{onlineCount} bạn đang học</span>
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. KHỐI GIỮA: NÚT ĐIỀU KHIỂN CHÍNH (CHUẨN GOOGLE MEET DARK DOCK)    */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Nút 1: Sửa mục tiêu cá nhân */}
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
          <span className="hidden lg:inline max-w-[130px] truncate">{userGoal}</span>
        </button>

        {/* Nút 2: Nhạc nền tập trung (Lo-Fi / Mưa rơi) */}
        <button
          type="button"
          onClick={onOpenAmbientMusic}
          className={`p-3 rounded-full border transition-all cursor-pointer shadow-xs active:scale-95 ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-indigo-600'
              : 'bg-[#3c4043] hover:bg-[#484c50] border-white/5 text-indigo-300'
          }`}
          title="Âm thanh trắng & Nhạc Lo-Fi thư giãn"
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Nút 3: Tiếp Lửa (Spark / Kudos) */}
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

        {/* Nút 4: Đổi bố cục (Change Layout) */}
        <button
          type="button"
          onClick={onOpenLayoutSettings}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
            isLight
              ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800'
              : 'bg-[#3c4043] hover:bg-cyan-500 hover:text-slate-950 border-white/5 text-cyan-300'
          }`}
          title="Thay đổi bố cục (Tự động, Xếp kề, Tiêu điểm, Thanh bên)"
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden sm:inline">Bố cục</span>
        </button>

        {/* Nút 4.1: Cài đặt phòng học (Chỉ dành cho Chủ phòng / Host) */}
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

        {/* Nút 5: Rời phòng học (Màu đỏ tròn chuẩn Google Meet) */}
        <button
          type="button"
          onClick={onLeaveRoomClick}
          className="p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
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

        {/* Nút Khung Chat (Có trạng thái Focus lock) */}
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
          title={isFocusPhase ? 'Trò chuyện (Đang khóa để giữ yên tĩnh)' : 'Trò chuyện giờ nghỉ'}
        >
          <MessageSquare className="w-4 h-4" />
          {isFocusPhase && (
            <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-slate-950">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
          {!isFocusPhase && unreadChatCount > 0 && (
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
    </footer>
  );
});
