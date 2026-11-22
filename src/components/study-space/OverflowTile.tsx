import React from 'react';
import { Users, ArrowRight } from 'lucide-react';

export interface OverflowTileProps {
  count: number;
  previewAvatars?: string[];
  onClick?: () => void;
  isCompact?: boolean;
}

export const OverflowTile = React.memo(function OverflowTile({
  count,
  previewAvatars = [],
  onClick,
  isCompact = false,
}: OverflowTileProps) {
  return (
    <div
      onClick={onClick}
      className="group relative w-full h-full rounded-2xl overflow-hidden flex flex-col items-center justify-center p-3 select-none cursor-pointer transition-all duration-200 border border-white/10 hover:border-cyan-400/60 hover:scale-[1.02] shadow-lg active:scale-98"
      style={{
        aspectRatio: '16 / 9',
        backgroundColor: '#3c4043',
      }}
      title={`Xem thêm ${count} học viên khác trong phòng`}
    >
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* 1. Stack of top 3 preview avatars */}
      <div className="flex items-center -space-x-3 mb-2 transition-transform duration-200 group-hover:scale-105">
        {previewAvatars.slice(0, 3).map((av, idx) => (
          <img
            key={idx}
            src={av}
            alt="Bạn học"
            className={`rounded-full object-cover ring-2 ring-[#3c4043] bg-[#202124] ${
              isCompact ? 'w-8 h-8' : 'w-11 h-11'
            }`}
          />
        ))}

        {previewAvatars.length === 0 && (
          <div className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
            <Users className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* 2. Prominent +N Count */}
      <div className="flex items-center gap-1.5 font-black text-white group-hover:text-cyan-300 transition-colors">
        <span className={isCompact ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'}>
          +{count} người khác
        </span>
      </div>

      {/* 3. Subtitle CTA */}
      {!isCompact && (
        <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 group-hover:text-white transition-colors">
          <span>Xem toàn bộ danh sách phòng</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </p>
      )}

      {/* Corner Icon Badge */}
      <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1">
        <Users className="w-3 h-3 text-cyan-400" />
        <span>Tất cả</span>
      </div>
    </div>
  );
});
