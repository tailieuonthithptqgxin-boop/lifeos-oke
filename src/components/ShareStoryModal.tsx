import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Flame, Sparkles, Download, Share2, 
  Check, Copy, Award, Zap, Palette, QrCode
} from 'lucide-react';
import { RetentionProfile, retentionEngine } from '../lib/retentionEngine';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { useAppStore } from '../lib/store';

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: RetentionProfile;
  userName?: string;
  todayCompletedTasks?: number;
  moodEmoji?: string;
  moodLabel?: string;
  bossDefeatedTitle?: string;
}

type StoryTheme = 'cyber_emerald' | 'obsidian_gold' | 'neon_violet' | 'minimal_dark';

export function ShareStoryModal({
  isOpen,
  onClose,
  profile,
  userName = 'Player',
  todayCompletedTasks = 0,
  moodEmoji = '⚡',
  moodLabel = 'Deep Focus',
  bossDefeatedTitle
}: ShareStoryModalProps) {
  const { currentUser } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentTheme, setCurrentTheme] = useState<StoryTheme>('cyber_emerald');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeProfile = profile || retentionEngine.getProfile(currentUser?.id);
  const displayName = currentUser?.name || userName;
  const userStreak = activeProfile?.streak || 1;
  const userLevel = activeProfile?.level || 1;
  const userCp = Math.floor((userLevel * 35) + (userStreak * 20));
  const referralCode = (currentUser as any)?.referralCode || 'LIFEOS2026';

  // Draw 1080x1920 high-res card onto canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    renderCanvas();
  }, [isOpen, currentTheme, displayName, userStreak, userLevel, userCp, todayCompletedTasks, bossDefeatedTitle]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set 1080 x 1920 internal resolution
    canvas.width = 1080;
    canvas.height = 1920;

    // Theme pallette
    let bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    let primaryColor = '#10b981'; // Emerald
    let accentColor = '#34d399';
    let textColor = '#ffffff';

    if (currentTheme === 'cyber_emerald') {
      bgGrad.addColorStop(0, '#021a12');
      bgGrad.addColorStop(0.5, '#060d0a');
      bgGrad.addColorStop(1, '#01140e');
      primaryColor = '#10b981';
      accentColor = '#38bdf8';
    } else if (currentTheme === 'obsidian_gold') {
      bgGrad.addColorStop(0, '#1c1503');
      bgGrad.addColorStop(0.5, '#0a0907');
      bgGrad.addColorStop(1, '#1f1604');
      primaryColor = '#f59e0b';
      accentColor = '#fbbf24';
    } else if (currentTheme === 'neon_violet') {
      bgGrad.addColorStop(0, '#1f072e');
      bgGrad.addColorStop(0.5, '#0c0514');
      bgGrad.addColorStop(1, '#1b0629');
      primaryColor = '#ec4899';
      accentColor = '#a855f7';
    } else {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#020617');
      bgGrad.addColorStop(1, '#090d16');
      primaryColor = '#38bdf8';
      accentColor = '#94a3b8';
    }

    // Background fill
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle Grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1920);
      ctx.stroke();
    }
    for (let y = 0; y < 1920; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1080, y);
      ctx.stroke();
    }

    // Top Glowing ambient aura
    const aura = ctx.createRadialGradient(540, 400, 50, 540, 400, 600);
    aura.addColorStop(0, primaryColor + '33');
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, 1080, 1920);

    // Brand Header: LIFE OS × REAL-LIFE PROGRESSION
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 36px sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('LIFE OS  ·  PERSONAL PROGRESSION RPG', 540, 160);

    // Decorative pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(390, 200, 300, 60, 30);
    ctx.fill();
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${moodEmoji} ${moodLabel.toUpperCase()}`, 540, 240);

    // User Avatar placeholder circle
    ctx.beginPath();
    ctx.arc(540, 430, 100, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor + '22';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = primaryColor;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px sans-serif';
    ctx.fillText(displayName.charAt(0).toUpperCase(), 540, 462);

    // User Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(displayName, 540, 600);

    // Level Badge
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`LV.${userLevel} HERO  ·  ${profile.levelTitle || 'INITIATOR'}`, 540, 660);

    // Giant Hero Flame Streak Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(140, 750, 800, 420, 40);
    ctx.fill();
    ctx.stroke();

    // Fire emoji
    ctx.font = '120px sans-serif';
    ctx.fillText('🔥', 540, 890);

    // Streak Count
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 110px sans-serif';
    ctx.fillText(`${userStreak} NGÀY`, 540, 1020);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 36px sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('CHUỖI KỶ LUẬT THỰC TẾ LIÊN TỤC', 540, 1090);

    // Stats 3-Grid Boxes
    const boxW = 250;
    const boxH = 180;
    const startX = 140;
    const gap = 25;
    const boxY = 1220;

    // Stat 1: Combat Power
    drawStatBox(ctx, startX, boxY, boxW, boxH, 'LỰC CHIẾN CP', `${userCp} CP ⚡`, primaryColor);
    // Stat 2: Tasks Done
    drawStatBox(ctx, startX + boxW + gap, boxY, boxW, boxH, 'TASKS XONG', `${todayCompletedTasks} VIỆC ✓`, accentColor);
    // Stat 3: Boss Trophy
    drawStatBox(ctx, startX + (boxW + gap) * 2, boxY, boxW, boxH, 'DANH HIỆU', 'TOP TỰ CHỦ 🏆', '#f59e0b');

    // Boss Defeated Banner (if present)
    if (bossDefeatedTitle) {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.2)';
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(140, 1440, 800, 110, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fda4af';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(`⚔️ VỪA CHÉM GỤC: ${bossDefeatedTitle.toUpperCase()}`, 540, 1510);
    }

    // Footer: Referral & Social Proof
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(140, 1620, 800, 180, 30);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('CÙNG RÈN LUYỆN TRÊN LIFE OS', 200, 1690);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'normal 30px sans-serif';
    ctx.fillText(`Nhập mã mời: ${referralCode} · lifeos.vn`, 200, 1745);

    // QR Code graphic placeholder
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(800, 1650, 100, 100, 16);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📱', 850, 1715);

    // Bottom Watermark
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('#DisciplineOverMotivation  ·  #LifeOS  ·  #GenZProductivity', 540, 1860);
  };

  const drawStatBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, val: string, color: string) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(label, x + w / 2, y + 55);

    ctx.fillStyle = color;
    ctx.font = '900 36px sans-serif';
    ctx.fillText(val, x + w / 2, y + 125);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundEngine.playSuccess();
    triggerConfetti();
    setIsExporting(true);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `lifeos_story_${userStreak}days_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export story card:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const handleShareStoryDirect = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundEngine.playSuccess();
    triggerConfetti();

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `lifeos_story_${userStreak}days.png`, { type: 'image/png' });
        const shareText = `🔥 Giữ vững chuỗi ${userStreak} ngày kỷ luật trên LifeOS!\n⚡ Lv.${userLevel} | ${userCp} CP\nTham gia cùng mình: lifeos.vn (Mã mời: ${referralCode})\n#LifeOS #Productivity #GenZ`;
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'LifeOS Story Flex',
            text: shareText,
            files: [file]
          });
        } else if (navigator.share) {
          await navigator.share({
            title: 'LifeOS Story Flex',
            text: shareText,
            url: window.location.origin
          });
        } else {
          handleDownloadPng();
        }
      }, 'image/png');
    } catch {
      handleDownloadPng();
    }
  };

  const handleCopyCaption = () => {
    soundEngine.playPop();
    const shareText = `🔥 Giữ vững chuỗi ${userStreak} ngày kỷ luật trên LifeOS!\n⚡ Cấp độ Lv.${userLevel} | ${userCp} Lực chiến CP\n🎯 Đã hoàn thành ${todayCompletedTasks} việc cốt lõi hôm nay.\n\nTham gia cùng mình tại: lifeos.vn (Mã mời: ${referralCode})\n#LifeOS #Productivity #Discipline #GenZ #LevelUp`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative text-white my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Share2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm text-white">Xuất Thẻ Story 9:16 (Instagram & Threads)</h3>
              <p className="text-[11px] text-slate-400">Ảnh dọc 1080x1920 siêu nét flex chuỗi streak</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'cyber_emerald', name: 'Cyber Emerald', color: 'bg-emerald-500' },
            { id: 'obsidian_gold', name: 'Obsidian Gold', color: 'bg-amber-400' },
            { id: 'neon_violet', name: 'Neon Violet', color: 'bg-purple-500' },
            { id: 'minimal_dark', name: 'Minimal Dark', color: 'bg-slate-400' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                soundEngine.playPop();
                setCurrentTheme(t.id as StoryTheme);
              }}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                currentTheme === t.id
                  ? 'bg-slate-800 text-white border border-slate-600'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.color}`} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        {/* Live Canvas Preview (Responsive scaled) */}
        <div className="relative w-full aspect-[9/16] max-h-[460px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain rounded-2xl"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareStoryDirect}
              className="py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs shadow-lg shadow-pink-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Share2 className="w-4 h-4" />
              <span>Khoe Story Ngay</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang xuất...' : 'Tải Ảnh PNG'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyCaption}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Đã copy caption kèm mã mời!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Caption kèm mã giới thiệu</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
