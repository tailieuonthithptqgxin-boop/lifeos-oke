import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Download, Copy, Share2, Sparkles, Flame, CheckCircle2, 
  BookOpen, Clock, Calendar, Check, Award
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { toast } from '../../lib/toast';

interface StoryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  overrideStudyMinutes?: number;
  overrideTasksCompleted?: number;
}

type StoryTheme = 'COZY_RECEIPT' | 'CYBERPUNK' | 'MATCHA_PASTEL' | 'RETRO_ARCADE';

export function StoryShareModal({
  isOpen,
  onClose,
  overrideStudyMinutes,
  overrideTasksCompleted
}: StoryShareModalProps) {
  const { currentUser, tasks, habits } = useAppStore();
  const [theme, setTheme] = useState<StoryTheme>('COZY_RECEIPT');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute stats from Single Source of Truth
  const totalStudyMinutes = overrideStudyMinutes ?? currentUser?.totalStudyMinutes ?? 0;
  const hours = Math.floor(totalStudyMinutes / 60);
  const mins = totalStudyMinutes % 60;
  const timeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} phút`;

  const completedTasksCount = overrideTasksCompleted ?? 
    (tasks || []).filter(t => t.status === 'Hoàn thành' || t.status === 'Done' || t.status === 'completed').length;
  
  const streakDays = currentUser?.streakDays ?? (habits || []).reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const dateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  useEffect(() => {
    if (isOpen) {
      renderStoryCanvas();
    }
  }, [isOpen, theme, totalStudyMinutes, completedTasksCount]);

  const renderStoryCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed 1080 x 1920 Instagram Story Resolution
    canvas.width = 1080;
    canvas.height = 1920;

    const width = 1080;
    const height = 1920;

    if (theme === 'COZY_RECEIPT') {
      // 1. Cozy Receipt Theme
      ctx.fillStyle = '#18181B';
      ctx.fillRect(0, 0, width, height);

      // Receipt Paper
      const rw = 920;
      const rh = 1600;
      const rx = (width - rw) / 2;
      const ry = 160;

      ctx.fillStyle = '#FAFAF9';
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 36);
      ctx.fill();

      // Top Header
      ctx.fillStyle = '#09090B';
      ctx.font = 'bold 56px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LIFEOS COZY CAFE', width / 2, ry + 120);

      ctx.font = '500 28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#71717A';
      ctx.fillText('HÓA ĐƠN NĂNG SUẤT HÔM NAY', width / 2, ry + 175);

      ctx.font = '400 24px monospace';
      ctx.fillText(`ORDER #LF-${Date.now().toString().slice(-6)} • ${dateStr.toUpperCase()}`, width / 2, ry + 225);

      // Dashed Line
      drawDashedLine(ctx, rx + 60, ry + 270, rx + rw - 60, ry + 270);

      // User Profile
      ctx.textAlign = 'left';
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.fillStyle = '#18181B';
      ctx.fillText(`KHÁCH HÀNG: ${currentUser?.name || 'Chiến thần tập trung'}`, rx + 60, ry + 340);

      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#059669';
      ctx.fillText(`CHUỖI KỶ LUẬT: 🔥 ${streakDays} NGÀY LIÊN TIẾP`, rx + 60, ry + 390);

      drawDashedLine(ctx, rx + 60, ry + 440, rx + rw - 60, ry + 440);

      // Items Table Header
      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = '#71717A';
      ctx.fillText('MỤC HỌC TẬP', rx + 60, ry + 500);
      ctx.textAlign = 'right';
      ctx.fillText('KẾT QUẢ', rx + rw - 60, ry + 500);

      // Items Rows
      const items = [
        { label: '01. Thời gian tập trung (Pomodoro)', val: timeFormatted },
        { label: '02. Nhiệm vụ đã hoàn thành', val: `${completedTasksCount} Việc` },
        { label: '03. Từ vựng & Kiến thức mới', val: 'Đã củng cố' },
        { label: '04. Cấp độ người dùng', val: `LV.${currentUser?.role === 'ADMIN' ? '99' : '12'}` },
        { label: '05. Tâm trạng thú cưng', val: '100% Tuyệt vời 🍊' }
      ];

      let itemY = ry + 570;
      items.forEach((item, idx) => {
        ctx.textAlign = 'left';
        ctx.font = '500 30px "Segoe UI", sans-serif';
        ctx.fillStyle = '#27272A';
        ctx.fillText(item.label, rx + 60, itemY);

        ctx.textAlign = 'right';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.fillStyle = '#09090B';
        ctx.fillText(item.val, rx + rw - 60, itemY);

        itemY += 85;
      });

      drawDashedLine(ctx, rx + 60, itemY + 20, rx + rw - 60, itemY + 20);

      // Total XP / Rating
      ctx.textAlign = 'left';
      ctx.font = 'bold 44px "Segoe UI", sans-serif';
      ctx.fillStyle = '#09090B';
      ctx.fillText('TỔNG ĐIỂM CHĂM CHỈ', rx + 60, itemY + 100);

      ctx.textAlign = 'right';
      ctx.font = 'bold 52px monospace';
      ctx.fillStyle = '#059669';
      ctx.fillText(`+${Math.max(50, totalStudyMinutes * 10)} XP`, rx + rw - 60, itemY + 100);

      // Barcode simulation
      drawBarcode(ctx, width / 2, ry + rh - 220, 560, 90);

      // Footer
      ctx.textAlign = 'center';
      ctx.font = 'italic 28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#71717A';
      ctx.fillText('“Mỗi phút giây nỗ lực hôm nay là nền tảng cho ngày mai.”', width / 2, ry + rh - 90);
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#A1A1AA';
      ctx.fillText('CREATED WITH LIFEOS • LIFEOS.VN', width / 2, ry + rh - 45);

    } else if (theme === 'CYBERPUNK') {
      // 2. Cyberpunk Neon Theme
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(0.5, '#0B0F19');
      grad.addColorStop(1, '#022C22');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Neon Frame
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 6;
      ctx.strokeRect(80, 120, width - 160, height - 240);

      // Corner Accents
      drawCyberCorners(ctx, 80, 120, width - 160, height - 240);

      ctx.fillStyle = '#10B981';
      ctx.font = 'black 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('// LIFEOS PROTOCOL: LEVEL UP', width / 2, 210);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 74px "Segoe UI", sans-serif';
      ctx.fillText(currentUser?.name || 'SUPERADMIN', width / 2, 310);

      // Giant Metric Rings
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(140, 420, width - 280, 320, 32);
      ctx.fill();
      ctx.strokeStyle = '#10B98133';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 110px monospace';
      ctx.fillText(timeFormatted, width / 2, 580);
      ctx.font = 'bold 30px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('TỔNG THỜI GIAN TẬP TRUNG HÔM NAY', width / 2, 650);

      // Stats 2 Columns
      drawCyberCard(ctx, 140, 780, 380, 260, '🔥 CHUỖI STREAK', `${streakDays} NGÀY`, '#F59E0B');
      drawCyberCard(ctx, 560, 780, 380, 260, '✅ NHIỆM VỤ', `${completedTasksCount} VIỆC`, '#38BDF8');

      // Achievement Badge
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(140, 1080, width - 280, 280, 32);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B55';
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.fillText('🏆 DANH HIỆU: CHIẾN THẦN KỶ LUẬT', width / 2, 1170);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '500 30px "Segoe UI", sans-serif';
      ctx.fillText('Đã hoàn thành 100% mục tiêu ngày với phong độ đỉnh cao.', width / 2, 1240);
      ctx.fillText(`Ghi nhận ngày ${dateStr}`, width / 2, 1290);

      // Footer
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('LIFEOS.VN • BUILD YOUR FUTURE', width / 2, 1720);

    } else if (theme === 'MATCHA_PASTEL') {
      // 3. Korean Matcha Minimalist
      ctx.fillStyle = '#F5F5F0';
      ctx.fillRect(0, 0, width, height);

      // Soft Matcha Card
      const mw = 900;
      const mh = 1600;
      const mx = (width - mw) / 2;
      const my = 160;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, 48);
      ctx.fill();

      // Soft Header
      ctx.fillStyle = '#2D4A3E';
      ctx.font = 'bold 50px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Hôm nay tôi đã làm được.', width / 2, my + 150);

      ctx.font = '400 30px "Segoe UI", sans-serif';
      ctx.fillStyle = '#6E857B';
      ctx.fillText(dateStr, width / 2, my + 210);

      // Focus Circle
      ctx.fillStyle = '#EAF0EC';
      ctx.beginPath();
      ctx.arc(width / 2, my + 520, 200, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2D4A3E';
      ctx.font = 'bold 84px "Segoe UI", sans-serif';
      ctx.fillText(timeFormatted, width / 2, my + 530);
      ctx.font = '500 28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#6E857B';
      ctx.fillText('Tập trung trọn vẹn', width / 2, my + 590);

      // Two rounded pills
      ctx.fillStyle = '#F5F5F0';
      ctx.beginPath();
      ctx.roundRect(mx + 80, my + 800, 340, 180, 28);
      ctx.fill();

      ctx.fillStyle = '#2D4A3E';
      ctx.font = 'bold 54px "Segoe UI", sans-serif';
      ctx.fillText(`${completedTasksCount}`, mx + 250, my + 890);
      ctx.font = '500 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#6E857B';
      ctx.fillText('Nhiệm vụ xong', mx + 250, my + 940);

      ctx.fillStyle = '#F5F5F0';
      ctx.beginPath();
      ctx.roundRect(mx + 480, my + 800, 340, 180, 28);
      ctx.fill();

      ctx.fillStyle = '#2D4A3E';
      ctx.font = 'bold 54px "Segoe UI", sans-serif';
      ctx.fillText(`${streakDays} ngày`, mx + 650, my + 890);
      ctx.font = '500 24px "Segoe UI", sans-serif';
      ctx.fillStyle = '#6E857B';
      ctx.fillText('Giữ chuỗi 🔥', mx + 650, my + 940);

      // Soft Quote
      ctx.font = 'italic 34px "Segoe UI", sans-serif';
      ctx.fillStyle = '#2D4A3E';
      ctx.fillText('“Mỗi ngày tích lũy một chút dịu dàng,”', width / 2, my + 1150);
      ctx.fillText('“cuộc sống sẽ trao bạn hoa thơm quả ngọt.”', width / 2, my + 1210);

      ctx.font = 'bold 28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#6E857B';
      ctx.fillText(`— ${currentUser?.name || 'LifeOS User'} —`, width / 2, my + 1300);

      ctx.font = '500 24px monospace';
      ctx.fillStyle = '#A3B8AF';
      ctx.fillText('LIFEOS • KHÔNG GIAN NĂNG SUẤT YÊN BÌNH', width / 2, my + mh - 80);

    } else if (theme === 'RETRO_ARCADE') {
      // 4. Retro 8-Bit Arcade
      ctx.fillStyle = '#262626';
      ctx.fillRect(0, 0, width, height);

      // Arcade Bezel
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.roundRect(60, 100, width - 120, height - 200, 40);
      ctx.fill();

      // Screen
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(110, 200, width - 220, 1150, 20);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★ STAGE CLEARED ★', width / 2, 330);

      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 64px monospace';
      ctx.fillText(`PLAYER: ${currentUser?.name?.toUpperCase() || 'HERO'}`, width / 2, 430);

      ctx.fillStyle = '#4ADE80';
      ctx.font = 'bold 90px monospace';
      ctx.fillText(`TIME: ${timeFormatted}`, width / 2, 590);

      ctx.fillStyle = '#F87171';
      ctx.font = 'bold 50px monospace';
      ctx.fillText(`STREAK: ❤❤❤ x ${streakDays}`, width / 2, 700);

      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 50px monospace';
      ctx.fillText(`TASKS DONE: ${completedTasksCount} PTS`, width / 2, 800);

      ctx.fillStyle = '#A78BFA';
      ctx.font = 'bold 40px monospace';
      ctx.fillText('RANK: S-CLASS MASTER', width / 2, 920);

      // Arcade Button Cutouts
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(350, 1530, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(540, 1530, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(730, 1530, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('PRESS START TO CONTINUE • LIFEOS.VN', width / 2, 1720);
    }
  };

  function drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.setLineDash([12, 10]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#D4D4D8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBarcode(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
    const startX = cx - w / 2;
    ctx.fillStyle = '#18181B';
    let currX = startX;
    while (currX < startX + w) {
      const bw = (Math.random() > 0.5 ? 4 : 8);
      const gap = (Math.random() > 0.5 ? 4 : 6);
      ctx.fillRect(currX, cy, bw, h);
      currX += bw + gap;
    }
  }

  function drawCyberCorners(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const len = 40;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#34D399';
    // Top-left
    ctx.beginPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len); ctx.stroke();
  }

  function drawCyberCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, val: string, color: string) {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 28);
    ctx.fill();
    ctx.strokeStyle = color + '44';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(title, x + w / 2, y + 80);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px monospace';
    ctx.fillText(val, x + w / 2, y + 175);
  }

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    soundEngine.playSuccess();
    const link = document.createElement('a');
    link.download = `lifeos-story-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.show('Đã tải ảnh Story 1080x1920 HD thành công!', 'success');
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setIsExporting(true);
      soundEngine.playPop();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.show('Không thể tạo file ảnh', 'error');
          setIsExporting(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          toast.show('Đã sao chép ảnh vào clipboard! Bạn có thể dán (Ctrl+V) vào Story ngay.', 'success');
          setTimeout(() => setCopied(false), 2500);
        } catch {
          handleDownload();
        } finally {
          setIsExporting(false);
        }
      });
    } catch {
      handleDownload();
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (navigator.share) {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'lifeos-story.png', { type: 'image/png' });
        try {
          await navigator.share({
            title: 'Thành tích học tập hôm nay trên LifeOS',
            text: `Hôm nay tôi đã tập trung ${timeFormatted} và giữ chuỗi ${streakDays} ngày 🔥 trên LifeOS!`,
            files: [file]
          });
        } catch {
          // User cancelled
        }
      });
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Interactive Canvas Preview */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-2 font-mono">
            Độ phân giải xuất: 1080 x 1920 (Chuẩn Instagram & Threads)
          </span>
        </div>

        {/* Right: Customization Controls */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 space-y-5 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Khoe Story Năng Suất
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Xuất thẻ ảnh thành tích tuyệt đẹp để chia sẻ lên Instagram Stories, Threads hoặc nhóm bạn bè!
            </p>

            {/* Choose Theme */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chọn phong cách thẻ:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'COZY_RECEIPT', label: 'Hóa đơn Cafe', icon: '🧾' },
                  { id: 'CYBERPUNK', label: 'Cyberpunk Neon', icon: '⚡' },
                  { id: 'MATCHA_PASTEL', label: 'Matcha Minimal', icon: '🍵' },
                  { id: 'RETRO_ARCADE', label: '8-Bit Arcade', icon: '🕹️' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setTheme(t.id as StoryTheme);
                    }}
                    className={`p-2.5 rounded-2xl flex items-center gap-2 border text-xs font-bold transition-all cursor-pointer ${
                      theme === t.id
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary metrics preview */}
            <div className="mt-5 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/70 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Thời gian học:</span>
                <span className="font-bold text-slate-900 dark:text-white">{timeFormatted}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Nhiệm vụ hoàn thành:</span>
                <span className="font-bold text-slate-900 dark:text-white">{completedTasksCount} việc</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Chuỗi kỷ luật:</span>
                <span className="font-bold text-amber-500">🔥 {streakDays} ngày</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCopy}
              disabled={isExporting}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã sao chép ảnh!' : 'Sao chép ảnh (Dán vào Story)'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải ảnh PNG</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Chia sẻ qua ứng dụng khác"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
