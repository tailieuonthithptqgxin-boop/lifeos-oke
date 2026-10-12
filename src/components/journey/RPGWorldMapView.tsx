import React, { useState, useEffect } from 'react';
import { 
  Compass, Swords, Shield, Trophy, Skull, Lock, 
  Check, Sparkles, ChevronRight, Zap, Target, Clock, BookOpen, Flame
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';

interface RPGWorldMapViewProps {
  onSelectMonster: (monster: any) => void;
  onGoToTrain: (module: 'tasks' | 'focus' | 'study' | 'habits' | 'finance') => void;
}

export function RPGWorldMapView({
  onSelectMonster,
  onGoToTrain
}: RPGWorldMapViewProps) {
  const [chaptersData, setChaptersData] = useState<any[]>([]);
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [totalMonsters, setTotalMonsters] = useState(16);
  const [defeatedCount, setDefeatedCount] = useState(0);

  const fetchMonstersData = async () => {
    try {
      setIsLoading(true);
      const res = await apiCall('/api/rpg/monsters');
      if (res && res.success && res.data) {
        setChaptersData(res.data.chapters || []);
        setTotalMonsters(res.data.totalMonsters || 16);
        setDefeatedCount(res.data.defeatedMonstersCount || 0);
      }
    } catch (e) {
      console.warn('Failed to load RPG monsters roadmap:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonstersData();
  }, []);

  const activeChapter = chaptersData.find(c => c.index === selectedChapterIdx) || chaptersData[0];

  return (
    <div className="space-y-6">

      {/* World Map Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                BẢN ĐỒ THẾ GIỚI · WORLD MAP
              </span>
              <span className="text-xs text-slate-400 font-bold">
                Tiến độ: {defeatedCount} / {totalMonsters} Quái Vật
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Hành Trình Chinh Phục Thói Quen Xấu
            </h2>
            <p className="text-xs text-slate-300">
              Mỗi con quái vật đại diện cho một rào cản tâm lý ngoài đời thực. Hạ gục chúng để mở khóa trang bị và miền đất mới.
            </p>
          </div>

          <div className="shrink-0 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center sm:text-right">
            <span className="text-[10px] uppercase font-black text-slate-400 block">TỔNG ẢI CHIẾN ĐÃ HẠ</span>
            <div className="flex items-baseline justify-center sm:justify-end gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-amber-400">{defeatedCount}</span>
              <span className="text-xs font-bold text-slate-400">/ {totalMonsters}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Chapter Tabs Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {chaptersData.map(ch => {
          const isSelected = ch.index === selectedChapterIdx;
          const monstersInChapter = ch.monsters || [];
          const defeatedInChapter = monstersInChapter.filter((m: any) => m.status === 'DEFEATED').length;
          const isCompleted = defeatedInChapter === monstersInChapter.length && monstersInChapter.length > 0;

          return (
            <div
              key={ch.index}
              onClick={() => {
                soundEngine.playPop();
                setSelectedChapterIdx(ch.index);
              }}
              className={`p-4 rounded-3xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    CHƯƠNG 0{ch.index}
                  </span>
                  {isCompleted && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {ch.title}
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                  {ch.subtitle}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Ải đã hạ</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{defeatedInChapter} / {monstersInChapter.length}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${monstersInChapter.length ? (defeatedInChapter / monstersInChapter.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Chapter Monsters Path (Nodes Flow) */}
      {activeChapter && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{activeChapter.title} ({activeChapter.subtitle})</span>
            </h3>
            <span className="text-xs text-slate-500">
              Nhấp vào một ải để xem chi tiết và giao chiến
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(activeChapter.monsters || []).map((monster: any, idx: number) => {
              const isDefeated = monster.status === 'DEFEATED';
              const isLocked = monster.status === 'LOCKED';
              const canChallenge = monster.canChallenge;
              const isBoss = monster.isBoss;

              return (
                <div
                  key={monster.id}
                  onClick={() => {
                    soundEngine.playPop();
                    onSelectMonster(monster);
                  }}
                  className={`p-5 rounded-3xl border text-left transition flex flex-col justify-between gap-4 cursor-pointer relative group ${
                    isDefeated
                      ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : canChallenge
                      ? isBoss
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/40 shadow-lg'
                        : 'border-emerald-500 bg-white dark:bg-slate-900 ring-2 ring-emerald-500/30 shadow-md'
                      : isLocked
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 opacity-70'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Card Header: Node Index & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      ẢI {idx + 1} {isBoss ? '· BOSS TRÙM' : ''}
                    </span>

                    {isDefeated ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[9px] uppercase shadow-xs">
                        ĐÃ HẠ GỤC
                      </span>
                    ) : canChallenge ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] uppercase shadow-xs animate-pulse">
                        SẴN SÀNG ĐẤU
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 font-black text-[9px] uppercase">
                        CHƯA ĐỦ ĐIỀU KIỆN
                      </span>
                    )}
                  </div>

                  {/* Monster Avatar & Title */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0 ${
                        isBoss
                          ? 'bg-rose-500/20 border-2 border-rose-500/40'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className="group-hover:scale-110 transition-transform">{monster.avatar}</span>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {monster.name}
                        </h4>
                        <span className="text-xs font-bold text-amber-500 block">
                          LV.{monster.level} · {monster.title}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {monster.description}
                    </p>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-center text-[10px] font-bold">
                      <div>
                        <span className="text-slate-400 block text-[9px]">HP</span>
                        <span className="text-rose-500 font-mono">{monster.maxHp}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">POW</span>
                        <span className="text-amber-500 font-mono">{monster.power}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">DEF</span>
                        <span className="text-emerald-500 font-mono">{monster.defense}</span>
                      </div>
                    </div>

                    {/* Real Action Requirement Preview */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Yêu cầu rèn luyện:</span>
                        <span className={monster.meetsRealPrerequisite ? 'text-emerald-500' : 'text-amber-500'}>
                          {monster.meetsRealPrerequisite ? '✓ Đủ' : 'Chưa đạt'}
                        </span>
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 block line-clamp-1 font-medium">
                        {monster.requiredRealAction.description}
                      </span>
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                      isDefeated
                        ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300'
                        : canChallenge
                        ? isBoss
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isDefeated ? (
                      <>
                        <Swords className="w-3.5 h-3.5" />
                        <span>Khiêu Chiến Lại</span>
                      </>
                    ) : canChallenge ? (
                      <>
                        <Swords className="w-3.5 h-3.5" />
                        <span>Giao Chiến Ngay</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Chưa Mở Khóa</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
