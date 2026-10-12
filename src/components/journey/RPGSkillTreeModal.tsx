import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Check, Lock, Zap, Shield, Swords, 
  BookOpen, Clock, Flame, Coins, Award, RefreshCw
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';

interface RPGSkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillUnlocked: () => void;
}

export function RPGSkillTreeModal({
  isOpen,
  onClose,
  onSkillUnlocked
}: RPGSkillTreeModalProps) {
  const [trees, setTrees] = useState<any[]>([]);
  const [availableSkillPoints, setAvailableSkillPoints] = useState<number>(0);
  const [selectedTreeId, setSelectedTreeId] = useState<string>('FOCUS');
  const [isLoading, setIsLoading] = useState(true);
  const [unlockingKey, setUnlockingKey] = useState<string | null>(null);

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      const res = await apiCall('/api/rpg/skills');
      if (res && res.success && res.data) {
        setTrees(res.data.trees || []);
        setAvailableSkillPoints(res.data.availableSkillPoints || 0);
      }
    } catch (e) {
      console.warn('Failed to load skill trees:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSkills();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeTree = trees.find(t => t.id === selectedTreeId) || trees[0];

  const handleUnlockSkill = async (skillKey: string) => {
    try {
      setUnlockingKey(skillKey);
      soundEngine.playPop();
      const res = await apiCall('/api/rpg/skills/unlock', 'POST', { skillKey });
      if (res && res.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        await fetchSkills();
        onSkillUnlocked();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể mở khóa kỹ năng.');
    } finally {
      setUnlockingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-white overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
              ⭐
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Cây Kỹ Năng Nhân Vật (Talent Trees)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  {availableSkillPoints} Điểm Khả Dụng
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mở khóa các nội tại đặc biệt để gia tăng sát thương và tỷ lệ sống sót trong trận chiến
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Tree Tabs */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-800 gap-1.5 overflow-x-auto pb-2">
          {trees.map(tree => {
            const isSelected = tree.id === selectedTreeId;
            return (
              <button
                key={tree.id}
                onClick={() => setSelectedTreeId(tree.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{tree.icon}</span>
                <span>{tree.name.split(' (')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tree Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              <span>Đang tải cây kỹ năng...</span>
            </div>
          ) : activeTree ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold text-amber-300 block">{activeTree.name}</span>
                <p className="text-xs text-slate-400 mt-0.5">{activeTree.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(activeTree.skills || []).map((skill: any) => {
                  const isUnlocked = skill.isUnlocked;
                  const canUnlock = skill.canUnlock;

                  return (
                    <div
                      key={skill.key}
                      className={`p-5 rounded-3xl border text-left transition flex flex-col justify-between gap-4 ${
                        isUnlocked
                          ? 'border-emerald-500/80 bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/30'
                          : canUnlock
                          ? 'border-amber-400 bg-amber-950/20 ring-1 ring-amber-400/30 shadow-md'
                          : 'border-slate-800 bg-slate-950/40 opacity-60'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{skill.icon}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                            BẬC {skill.tier} · LV.{skill.requiredLevel}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-white">{skill.name}</h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {skill.description}
                          </p>
                        </div>
                      </div>

                      {/* Unlock Action */}
                      <div className="pt-3 border-t border-slate-800/80">
                        {isUnlocked ? (
                          <div className="w-full py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Đã Kích Hoạt</span>
                          </div>
                        ) : canUnlock ? (
                          <button
                            onClick={() => handleUnlockSkill(skill.key)}
                            disabled={unlockingKey === skill.key}
                            className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition active:scale-95 cursor-pointer shadow-md"
                          >
                            {unlockingKey === skill.key ? 'Đang mở...' : `Mở Khóa (${skill.costSkillPoints} ⭐)`}
                          </button>
                        ) : (
                          <div className="w-full py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Yêu cầu Level {skill.requiredLevel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mỗi khi thăng cấp Level ngoài đời thật, bạn sẽ nhận được 1 Điểm Kỹ Năng.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
