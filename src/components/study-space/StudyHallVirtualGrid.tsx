import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Flame, BookOpen, ShieldCheck } from 'lucide-react';
import type { CompactParticipant } from '../../backend/realtime/RoomManager';

export interface StudyHallVirtualGridProps {
  members: CompactParticipant[];
  isLight?: boolean;
}

// Memoized Individual Member Card: ZERO re-render unless this specific member changes
const StudyMemberCard = React.memo(function StudyMemberCard({
  member,
  isLight,
}: {
  member: CompactParticipant;
  isLight: boolean;
}) {
  const isStudying = member.presence === 'STUDYING';

  return (
    <div
      className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all hover:scale-[1.03] shadow-xs cursor-pointer group relative ${
        isLight
          ? 'bg-white/80 border-slate-200/80 hover:border-emerald-500/40 hover:bg-white'
          : 'bg-[#11151f]/80 border-white/10 hover:border-emerald-500/40 hover:bg-[#151b27]'
      }`}
    >
      {/* Avatar with Status Pulse */}
      <div className="relative shrink-0">
        <img
          src={member.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.id}`}
          alt={member.name}
          className="w-9 h-9 rounded-full object-cover border border-emerald-500/20"
          loading="lazy"
        />
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ${
            isStudying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
          } ${isLight ? 'ring-white' : 'ring-[#090b10]'}`}
          title={isStudying ? 'Đang tập trung' : 'Đang nghỉ giải lao'}
        />
      </div>

      {/* Info: Name & Goal */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-bold truncate ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {member.name}
          </span>
          {member.streak > 0 && (
            <span className="flex items-center text-[10px] text-amber-500 font-bold shrink-0">
              <Flame className="w-2.5 h-2.5" />
              {member.streak}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">
          {member.goal || 'Tự học kỷ luật...'}
        </p>
      </div>

      {/* Hover Goal Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none w-max max-w-xs p-2.5 rounded-xl text-xs bg-slate-950/95 text-white shadow-2xl border border-white/15 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{member.name}</span>
        </div>
        <p className="text-slate-200 mt-1 leading-relaxed text-[11px]">
          {member.goal || 'Tự học kỷ luật...'}
        </p>
      </div>
    </div>
  );
});

export const StudyHallVirtualGrid = React.memo(function StudyHallVirtualGrid({
  members,
  isLight = false,
}: StudyHallVirtualGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  // Instant client-side search filter
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.goal.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Group items into rows of 4 for grid virtualization (responsive 1-4 columns)
  const COLUMNS = 4;
  const rows = useMemo(() => {
    const result: CompactParticipant[][] = [];
    for (let i = 0; i < filteredMembers.length; i += COLUMNS) {
      result.push(filteredMembers.slice(i, i + COLUMNS));
    }
    return result;
  }, [filteredMembers]);

  // TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Approximate row height with gap
    overscan: 4,
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Top Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <h3
            className={`font-bold text-sm flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            <span>Đại Sảnh Tự Học</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {filteredMembers.length} thành viên
            </span>
          </h3>
        </div>

        {/* Quick Search Input */}
        <div className="relative w-48 sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bạn học, mục tiêu..."
            className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-emerald-500 transition ${
              isLight
                ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                : 'bg-white/5 border-white/10 text-white placeholder-slate-500'
            }`}
          />
        </div>
      </div>

      {/* Virtualized Container (60 FPS on 500+ users) */}
      <div
        ref={parentRef}
        className={`flex-1 overflow-y-auto rounded-2xl p-2.5 border transition-colors ${
          isLight ? 'bg-slate-50/50 border-slate-200/90' : 'bg-black/20 border-white/5'
        }`}
        style={{ contain: 'strict' }}
      >
        {filteredMembers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
            <Search className="w-8 h-8 opacity-40 mb-2" />
            <p>Không tìm thấy thành viên phù hợp với từ khóa</p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowItems = rows[virtualRow.index] || [];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pb-2"
                >
                  {rowItems.map((member) => (
                    <StudyMemberCard key={member.id} member={member} isLight={isLight} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
