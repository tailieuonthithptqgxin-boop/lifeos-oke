import React, { useState, useEffect } from 'react';
import { 
  Shield, Swords, Zap, Heart, BookOpen, Clock, Flame, 
  Crown, Sparkles, ChevronRight, ArrowUpRight, Camera, 
  Layers, Info, RefreshCw, X, Check, Lock, Award, Coins
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { useAppStore } from '../../lib/store';

interface RPGCharacterHubProps {
  charStats: any | null;
  onOpenAvatarModal: () => void;
  onOpenSkillTree: () => void;
  onRefresh: () => void;
  frameClass?: string;
}

export function RPGCharacterHub({
  charStats,
  onOpenAvatarModal,
  onOpenSkillTree,
  onRefresh,
  frameClass = 'ring-2 ring-slate-700'
}: RPGCharacterHubProps) {
  const { currentUser } = useAppStore();

  const [inventory, setInventory] = useState<any[]>([]);
  const [filterSlot, setFilterSlot] = useState<'ALL' | 'WEAPON' | 'ARMOR' | 'ACCESSORY'>('ALL');
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  // Stat Breakdown Modal
  const [statBreakdownOpen, setStatBreakdownOpen] = useState(false);

  // Selected Equipment Detail Modal
  const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null);

  const fetchInventory = async () => {
    try {
      setIsLoadingInventory(true);
      const res = await apiCall('/api/rpg/equipment');
      if (res && res.success && res.data) {
        setInventory(res.data.inventory || []);
      }
    } catch (e) {
      console.warn('Failed to load equipment inventory:', e);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleEquipItem = async (equipmentId: string) => {
    try {
      setEquippingId(equipmentId);
      soundEngine.playPop();
      const res = await apiCall('/api/rpg/equipment/equip', 'POST', { equipmentId });
      if (res && res.success) {
        await fetchInventory();
        onRefresh();
        soundEngine.playSuccess();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể trang bị vật phẩm.');
    } finally {
      setEquippingId(null);
    }
  };

  const handleUpgradeItem = async (equipmentId: string) => {
    try {
      setUpgradingId(equipmentId);
      soundEngine.playPop();
      const res = await apiCall('/api/rpg/equipment/upgrade', 'POST', { equipmentId });
      if (res && res.success) {
        await fetchInventory();
        onRefresh();
        soundEngine.playSuccess();
        triggerConfetti();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể nâng cấp vật phẩm.');
    } finally {
      setUpgradingId(null);
    }
  };

  if (!charStats) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-400" />
        <span>Đang nạp hồ sơ anh hùng và chỉ số thực tế...</span>
      </div>
    );
  }

  const { stats, hp, combatPower, statBreakdown, equippedGear, availableSkillPoints } = charStats;

  const filteredInventory = inventory.filter(item => {
    if (filterSlot === 'ALL') return true;
    return item.slot === filterSlot;
  });

  return (
    <div className="space-y-6">

      {/* ============================================================== */}
      {/* 1. HERO PROFILE & COMBAT ATTRIBUTES SUMMARY                    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Hero Character Card (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            
            {/* Avatar & Hero Title */}
            <div className="flex flex-col items-center text-center space-y-3 pt-1">
              <div 
                onClick={onOpenAvatarModal}
                className={`w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-4xl font-black text-emerald-400 ${frameClass} shadow-xl relative cursor-pointer group transition transform hover:scale-105`}
                title="Nhấn để đổi ảnh đại diện anh hùng"
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || 'Hero Avatar'}
                    className="w-full h-full object-cover rounded-3xl"
                  />
                ) : (
                  <span>{currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '⚡'}</span>
                )}

                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-xs rounded-3xl">
                  <Camera className="w-5 h-5 text-emerald-400 mb-0.5" />
                  <span className="text-[10px] font-bold">Đổi ảnh</span>
                </div>

                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] uppercase shadow-md z-10">
                  LV.{charStats.level}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">{currentUser?.name || 'Anh Hùng'}</h3>
                <span className="text-xs font-bold text-emerald-400 block mt-0.5">Bậc Thầy Làm Chủ Cuộc Đời</span>

                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenAvatarModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Đổi Avatar</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenSkillTree}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cây Kỹ Năng {availableSkillPoints > 0 ? `(${availableSkillPoints}⭐)` : ''}</span>
                  </button>
                </div>

                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>LỰC CHIẾN TỔNG THỂ: {combatPower.toLocaleString()} CP</span>
                </div>
              </div>
            </div>

            {/* Health (HP) Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>SINH LỰC (MAX HP)</span>
                </span>
                <span className="text-rose-400 font-mono">{hp.max} HP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full w-full" />
              </div>
            </div>

            {/* 3 Active Gear Slots */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  TRANG BỊ ĐANG MẶC (GEAR LOADOUT)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">3/3 SLOTS</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Weapon */}
                <div 
                  onClick={() => equippedGear.weapon && setSelectedItemDetail(equippedGear.weapon)}
                  className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                    equippedGear.weapon 
                      ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20' 
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <span className="text-2xl block mb-1">
                    {equippedGear.weapon ? (equippedGear.weapon.icon || '🗡️') : '⚔️'}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">VŨ KHÍ</span>
                  <span className="font-bold text-white text-[11px] truncate block mt-0.5">
                    {equippedGear.weapon ? equippedGear.weapon.name : 'Chưa trang bị'}
                  </span>
                  {equippedGear.weapon && (
                    <span className="text-[9px] text-rose-400 font-bold block mt-0.5">
                      Lv.{equippedGear.weapon.level}
                    </span>
                  )}
                </div>

                {/* Armor */}
                <div 
                  onClick={() => equippedGear.armor && setSelectedItemDetail(equippedGear.armor)}
                  className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                    equippedGear.armor 
                      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20' 
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <span className="text-2xl block mb-1">
                    {equippedGear.armor ? (equippedGear.armor.icon || '🥋') : '🛡️'}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">GIÁP TRỤ</span>
                  <span className="font-bold text-white text-[11px] truncate block mt-0.5">
                    {equippedGear.armor ? equippedGear.armor.name : 'Chưa trang bị'}
                  </span>
                  {equippedGear.armor && (
                    <span className="text-[9px] text-amber-400 font-bold block mt-0.5">
                      Lv.{equippedGear.armor.level}
                    </span>
                  )}
                </div>

                {/* Accessory */}
                <div 
                  onClick={() => equippedGear.accessory && setSelectedItemDetail(equippedGear.accessory)}
                  className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                    equippedGear.accessory 
                      ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20' 
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <span className="text-2xl block mb-1">
                    {equippedGear.accessory ? (equippedGear.accessory.icon || '💍') : '📿'}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">PHỤ KIỆN</span>
                  <span className="font-bold text-white text-[11px] truncate block mt-0.5">
                    {equippedGear.accessory ? equippedGear.accessory.name : 'Chưa trang bị'}
                  </span>
                  {equippedGear.accessory && (
                    <span className="text-[9px] text-indigo-400 font-bold block mt-0.5">
                      Lv.{equippedGear.accessory.level}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Stat Breakdown Trigger */}
          <button
            onClick={() => setStatBreakdownOpen(true)}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xem Nguồn Gốc Sức Mạnh (100% Hành Động Thật)</span>
          </button>
        </div>

        {/* 6 Real-Life Attributes Sheet (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Chỉ Số RPG Nhân Vật</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase">
                  Real Life Progression
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mọi chỉ số đều được tính toán từ các đầu việc, bài học và chuỗi ngày kỷ luật bạn thực sự hoàn thành.
              </p>
            </div>

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Đồng bộ lại chỉ số"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* POWER */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">SỨC MẠNH (POW)</span>
                <Swords className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-500">{stats.power}</span>
                <span className="text-xs font-bold text-slate-400">PTS</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Từ Tasks & Trang bị
              </span>
            </div>

            {/* DEFENSE */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">PHÒNG THỦ (DEF)</span>
                <Shield className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-500">{stats.defense}</span>
                <span className="text-xs font-bold text-slate-400">PTS</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Từ Habits & Giáp trụ
              </span>
            </div>

            {/* FOCUS */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TẬP TRUNG (FOC)</span>
                <Clock className="w-4 h-4 text-teal-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{stats.focus}</span>
                <span className="text-xs font-bold text-slate-400">phút</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Tổng giờ Deep Work
              </span>
            </div>

            {/* KNOWLEDGE */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TRI THỨC (KNW)</span>
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.knowledge}</span>
                <span className="text-xs font-bold text-slate-400">từ</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Từ vựng & Bài học
              </span>
            </div>

            {/* DISCIPLINE */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">KỶ LUẬT (DIS)</span>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-orange-500">{stats.discipline}</span>
                <span className="text-xs font-bold text-slate-400">lượt</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                {charStats.currentStreak} ngày streak
              </span>
            </div>

            {/* WEALTH */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TÀI PHÚ (WLT)</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{charStats.coins}</span>
                <span className="text-xs font-bold text-slate-400">🪙</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Dùng nâng cấp trang bị
              </span>
            </div>
          </div>

          {/* Quick Skill Points Callout */}
          {availableSkillPoints > 0 && (
            <div 
              onClick={onOpenSkillTree}
              className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/15 border border-amber-400/40 flex items-center justify-between cursor-pointer group transition hover:border-amber-400"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-lg shadow-md">
                  ⭐
                </div>
                <div>
                  <span className="text-xs font-black text-amber-300 block">
                    BẠN CÓ {availableSkillPoints} ĐIỂM KỸ NĂNG CHƯA DÙNG!
                  </span>
                  <span className="text-[11px] text-slate-300 block">
                    Mở khóa các nội tại mạnh mẽ trong 5 Cây Kỹ Năng để áp đảo quái vật.
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* 2. ARSENAL & EQUIPMENT INVENTORY (UPGRADE & EQUIP)             */}
      {/* ============================================================== */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Kho Trang Bị & Kho Vũ Khí</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                {inventory.length} Món
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chiến lợi phẩm thu được từ việc đánh quái. Sử dụng Coins tích lũy từ công việc thật để nâng cấp.
            </p>
          </div>

          {/* Slot Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['ALL', 'WEAPON', 'ARMOR', 'ACCESSORY'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterSlot(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  filterSlot === tab
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab === 'ALL' ? 'Tất Cả' : tab === 'WEAPON' ? 'Vũ Khí' : tab === 'ARMOR' ? 'Giáp Trụ' : 'Phụ Kiện'}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment Cards Grid */}
        {isLoadingInventory ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <span>Đang nạp kho trang bị...</span>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <span className="text-4xl block">🛡️</span>
            <p className="text-sm font-bold text-slate-300">Chưa có trang bị nào ở danh mục này.</p>
            <p className="text-xs text-slate-500">Hãy tiến vào Bản Đồ Thế Giới và đánh bại quái vật để nhặt trang bị cực phẩm!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map(item => {
              const isEquipped = item.isEquipped;
              const isMaxLvl = item.level >= item.maxLevel;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-3xl border text-left transition flex flex-col justify-between gap-3 ${
                    isEquipped
                      ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shadow-xs shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black uppercase">
                              {item.rarity}
                            </span>
                            <span className="text-[11px] font-bold text-amber-500">
                              Lv.{item.level} / {item.maxLevel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isEquipped && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[9px] uppercase shadow-xs shrink-0">
                          ĐANG DÙNG
                        </span>
                      )}
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-bold py-1.5 px-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <span className="text-[9px] text-slate-400 block">POWER</span>
                        <span className="text-rose-500 font-mono">+{item.stats.power}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">DEFENSE</span>
                        <span className="text-amber-500 font-mono">+{item.stats.defense}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block">HP</span>
                        <span className="text-emerald-500 font-mono">+{item.stats.hp}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                      "{item.specialEffect || item.lore}"
                    </p>
                  </div>

                  {/* Actions: Equip & Upgrade */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
                    {!isEquipped && (
                      <button
                        onClick={() => handleEquipItem(item.id)}
                        disabled={equippingId === item.id}
                        className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {equippingId === item.id ? 'Đang mặc...' : 'Trang bị'}
                      </button>
                    )}

                    {!isMaxLvl && (
                      <button
                        onClick={() => handleUpgradeItem(item.id)}
                        disabled={upgradingId === item.id || !item.canUpgrade}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                          item.canUpgrade
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                        title={item.canUpgrade ? 'Nâng cấp chỉ số' : 'Không đủ Coins'}
                      >
                        <span>{upgradingId === item.id ? 'Nâng...' : 'Nâng cấp'}</span>
                        <span className="text-[11px] font-mono">({item.upgradeCost} 🪙)</span>
                      </button>
                    )}

                    {isMaxLvl && (
                      <span className="text-xs font-bold text-amber-500 py-2 px-3 text-center flex-1">
                        ★ Max Level
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. MODAL: STAT TRANSPARENCY BREAKDOWN (100% REAL ACTIONS)       */}
      {/* ============================================================== */}
      {statBreakdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Nguồn Gốc Sức Mạnh Nhân Vật</h3>
                  <span className="text-xs text-slate-400">100% minh bạch từ hoạt động thực tế của bạn</span>
                </div>
              </div>
              <button
                onClick={() => setStatBreakdownOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 block">🎯 Nhiệm vụ hoàn thành ({statBreakdown.tasksContribution.completedTasksCount} tasks):</span>
                <span className="text-slate-300">Đóng góp <strong>+{statBreakdown.tasksContribution.power} điểm Sức Mạnh (Power)</strong> trực tiếp.</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-teal-400 block">⏳ Phiên tập trung Focus ({statBreakdown.focusContribution.totalFocusMinutes} phút):</span>
                <span className="text-slate-300">Tăng <strong>+{statBreakdown.focusContribution.hp} Sinh Lực (HP)</strong> và <strong>+{statBreakdown.focusContribution.power} Sức Mạnh</strong>.</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 block">🔥 Kỷ luật thói quen ({statBreakdown.habitsContribution.totalHabitChecks} lượt · {statBreakdown.habitsContribution.currentStreak} ngày streak):</span>
                <span className="text-slate-300">Xây dựng <strong>+{statBreakdown.habitsContribution.defense} điểm Phòng Thủ</strong> và <strong>+{statBreakdown.habitsContribution.hp} HP</strong>.</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-indigo-400 block">📚 Ôn tập tri thức ({statBreakdown.learningContribution.vocabWordCount} từ vựng):</span>
                <span className="text-slate-300">Đóng góp <strong>+{statBreakdown.learningContribution.power} điểm Tấn Công Phép Thuật</strong>.</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-rose-400 block">🗡️ Bộ 3 Trang bị đang mặc:</span>
                <span className="text-slate-300">Cộng thêm <strong>+{statBreakdown.gearContribution.power} POW</strong>, <strong>+{statBreakdown.gearContribution.defense} DEF</strong>, <strong>+{statBreakdown.gearContribution.hp} HP</strong>.</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setStatBreakdownOpen(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
              >
                Đã Rõ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
