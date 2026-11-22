import React from 'react';
import { UserCheck, Sparkles } from 'lucide-react';
import type { CompactParticipant } from '../../backend/realtime/RoomManager';

export interface PinnedFriendsRowProps {
  friends: CompactParticipant[];
  isLight?: boolean;
}

export const PinnedFriendsRow = React.memo(function PinnedFriendsRow({
  friends,
  isLight = false,
}: PinnedFriendsRowProps) {
  if (friends.length === 0) return null;

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Bạn bè cùng phòng ({friends.length}/6)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className={`p-2 rounded-xl border flex items-center gap-2 transition-all hover:scale-[1.02] shadow-xs cursor-pointer group relative ${
              isLight
                ? 'bg-white/90 border-slate-200/90 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
                : 'bg-[#11151f]/90 border-white/10 hover:border-emerald-500/50 hover:shadow-emerald-500/10'
            }`}
          >
            {/* Avatar & Pulse Indicator */}
            <div className="relative shrink-0">
              <img
                src={friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.id}`}
                alt={friend.name}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500/30"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090b10]" />
            </div>

            {/* Name & Goal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-bold truncate ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {friend.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {friend.goal || 'Đang tập trung...'}
              </p>
            </div>

            {/* Hover Tooltip displaying full goal */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none w-max max-w-xs p-2 rounded-lg text-[11px] bg-slate-900 text-white shadow-xl border border-white/15 animate-in fade-in zoom-in-95">
              <p className="font-bold text-emerald-400">{friend.name}</p>
              <p className="text-slate-200 mt-0.5">{friend.goal || 'Đang tập trung...'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
