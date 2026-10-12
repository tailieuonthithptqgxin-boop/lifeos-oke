import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Share2, Copy, Check, Eye, EyeOff, Sparkles, 
  Palette, Smartphone, Square, Monitor, Award, Heart, CheckCircle2
} from 'lucide-react';
import { MilestoneItem, MonthlyRecapStats } from '../../backend/services/journey.service';

export type AspectRatioType = '1:1' | '4:5' | '9:16';
export type CardTemplateType = 'minimal' | 'achievement' | 'journey' | 'monthly_recap' | 'dark_premium' | 'social_story';
export type ColorThemeType = 'emerald' | 'indigo' | 'sunset' | 'obsidian' | 'ocean';

interface AchievementShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone?: MilestoneItem | null;
  recap?: MonthlyRecapStats | null;
  userName?: string;
}

const COLOR_THEMES: Record<ColorThemeType, {
  name: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  textLight: string;
  cardBg: string;
  badgeBg: string;
}> = {
  emerald: {
    name: 'Ngọc lục bảo (Emerald)',
    bgStart: '#064e3b',
    bgEnd: '#022c22',
    accent: '#34d399',
    textLight: '#ecfdf5',
    cardBg: 'rgba(6, 78, 59, 0.45)',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
  },
  indigo: {
    name: 'Chàm hoàng gia (Indigo)',
    bgStart: '#1e1b4b',
    bgEnd: '#0f172a',
    accent: '#818cf8',
    textLight: '#eef2ff',
    cardBg: 'rgba(30, 27, 75, 0.45)',
    badgeBg: 'rgba(129, 140, 248, 0.15)',
  },
  sunset: {
    name: 'Hoàng hôn (Sunset)',
    bgStart: '#4c0519',
    bgEnd: '#1f130b',
    accent: '#fb7185',
    textLight: '#fff1f2',
    cardBg: 'rgba(76, 5, 25, 0.45)',
    badgeBg: 'rgba(251, 113, 133, 0.15)',
  },
  obsidian: {
    name: 'Hắc diện thạch (Obsidian & Gold)',
    bgStart: '#0a0a0c',
    bgEnd: '#18181b',
    accent: '#fbbf24',
    textLight: '#fef3c7',
    cardBg: 'rgba(24, 24, 27, 0.6)',
    badgeBg: 'rgba(251, 191, 36, 0.15)',
  },
  ocean: {
    name: 'Đại dương sâu (Ocean)',
    bgStart: '#0c4a6e',
    bgEnd: '#082f49',
    accent: '#38bdf8',
    textLight: '#f0f9ff',
    cardBg: 'rgba(12, 74, 110, 0.45)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
  },
};

const TEMPLATES: { id: CardTemplateType; label: string; desc: string; icon: string }[] = [
  { id: 'achievement', label: 'Chứng nhận vinh danh', desc: 'Huy hiệu thành tựu, trang trọng & ấn tượng', icon: '🏆' },
  { id: 'minimal', label: 'Tối giản tinh tế', desc: 'Tập trung vào chỉ số và sự rõ ràng', icon: '✨' },
  { id: 'journey', label: 'Dòng thời gian', desc: 'Tiến trình bước tiến qua thời gian', icon: '🚀' },
  { id: 'dark_premium', label: 'Dark Premium', desc: 'Tông đen huyền bí viền vàng kim cao cấp', icon: '👑' },
  { id: 'social_story', label: 'Social Story (9:16)', desc: 'Thiết kế chuẩn Story IG/FB/TikTok', icon: '📱' },
  { id: 'monthly_recap', label: 'Tổng kết tháng', desc: 'Bảng tổng hợp chỉ số phát triển tháng', icon: '📊' },
];

export function AchievementShareModal({
  isOpen,
  onClose,
  milestone,
  recap,
  userName = 'Thành viên LifeOS'
}: AchievementShareModalProps) {
  const [template, setTemplate] = useState<CardTemplateType>(recap ? 'monthly_recap' : 'achievement');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(template === 'social_story' ? '9:16' : '1:1');
  const [theme, setTheme] = useState<ColorThemeType>('emerald');
  const [hideNumbers, setHideNumbers] = useState(false);
  const [showBranding, setShowBranding] = useState(true);
  const [customQuote, setCustomQuote] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Khởi tạo text mặc định khi đổi milestone
  useEffect(() => {
    if (milestone) {
      setCustomTitle(milestone.title);
      if (milestone.category === 'saving') {
        setCustomQuote('Tiết kiệm không chỉ là giữ tiền, mà là xây dựng nền móng cho tự do tài chính.');
      } else if (milestone.category === 'habit') {
        setCustomQuote('Kỷ luật hôm nay là chìa khóa mở ra phiên bản tốt hơn vào ngày mai.');
      } else if (milestone.category === 'goal') {
        setCustomQuote('Mỗi bước đi kiên trì đều đưa ta đến gần ước mơ hơn.');
      } else if (milestone.category === 'study') {
        setCustomQuote('Đầu tư vào tri thức là khoản đầu tư sinh lời bền vững nhất.');
      } else {
        setCustomQuote('Từng ngày nỗ lực nhỏ tích lũy thành bước nhảy vọt đáng tự hào.');
      }
    } else if (recap) {
      setCustomTitle(`Nhìn lại hành trình: ${recap.monthLabel}`);
      setCustomQuote('Nhìn lại tháng vừa qua, tự hào vì bản thân đã kiên trì không từ bỏ!');
      setTemplate('monthly_recap');
    }
  }, [milestone, recap]);

  // Tự động chuyển tỉ lệ 9:16 nếu chọn template social_story
  useEffect(() => {
    if (template === 'social_story') {
      setAspectRatio('9:16');
    }
  }, [template]);

  // Helper helper: draw high-resolution canvas
  const drawCardToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Kích thước xuất độ phân giải cao
    let width = 1080;
    let height = 1080;
    if (aspectRatio === '4:5') {
      height = 1350;
    } else if (aspectRatio === '9:16') {
      height = 1920;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const themeColors = COLOR_THEMES[theme];

    // 1. Nền Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, themeColors.bgStart);
    bgGrad.addColorStop(1, themeColors.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Hiệu ứng ánh sáng nền (Glow orbs)
    const radialGrad = ctx.createRadialGradient(width * 0.8, height * 0.2, 50, width * 0.8, height * 0.2, width * 0.6);
    radialGrad.addColorStop(0, themeColors.accent + '33'); // 20% alpha
    radialGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    const radialGrad2 = ctx.createRadialGradient(width * 0.2, height * 0.8, 50, width * 0.2, height * 0.8, width * 0.5);
    radialGrad2.addColorStop(0, themeColors.accent + '22');
    radialGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = radialGrad2;
    ctx.fillRect(0, 0, width, height);

    // Decorative grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Helper text wrap
    const wrapText = (text: string, x: number, startY: number, maxWidth: number, lineHeight: number, maxLines = 4) => {
      const words = text.split(' ');
      let line = '';
      let currentY = startY;
      let lineCount = 0;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lineCount++;
          if (lineCount >= maxLines) {
            ctx.fillText(line.trim() + '...', x, currentY);
            return currentY;
          }
          ctx.fillText(line.trim(), x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), x, currentY);
      return currentY;
    };

    // Helper draw rounded rect
    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, strokeW = 1) => {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      ctx.restore();
    };

    // Card Container Tùy theo mẫu
    const marginX = 80;
    const cardTop = aspectRatio === '9:16' ? 240 : 120;
    const cardBottom = height - (aspectRatio === '9:16' ? 260 : 160);
    const cardHeight = cardBottom - cardTop;
    const cardWidth = width - marginX * 2;

    // Khung thẻ Glassmorphism chính
    drawRoundRect(
      marginX,
      cardTop,
      cardWidth,
      cardHeight,
      36,
      themeColors.cardBg,
      'rgba(255, 255, 255, 0.15)',
      2
    );

    // Header thẻ: Badge và Icon
    const iconX = width / 2;
    const iconY = cardTop + 100;
    const iconEmoji = milestone?.icon || (recap ? '🌟' : '🏆');

    // Vòng tròn hào quang quanh Icon
    ctx.save();
    ctx.beginPath();
    ctx.arc(iconX, iconY, 65, 0, Math.PI * 2);
    ctx.fillStyle = themeColors.badgeBg;
    ctx.fill();
    ctx.strokeStyle = themeColors.accent;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Emoji Icon
    ctx.font = '54px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconEmoji, iconX, iconY);
    ctx.restore();

    // Nhãn danh mục / Category Pill
    const categoryLabel = recap 
      ? 'TỔNG KẾT THÁNG' 
      : (milestone?.category === 'saving' ? 'MỤC TIÊU TIẾT KIỆM' :
         milestone?.category === 'habit' ? 'THÓI QUEN KỶ LUẬT' :
         milestone?.category === 'goal' ? 'MỤC TIÊU CUỘC SỐNG' :
         milestone?.category === 'study' ? 'HỌC TẬP & TRI THỨC' :
         milestone?.category === 'project' ? 'DỰ ÁN HOÀN THÀNH' : 'CỘT MỐC HÀNH TRÌNH');

    const pillY = iconY + 95;
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const pillTextW = ctx.measureText(categoryLabel).width;
    drawRoundRect(
      iconX - (pillTextW + 40) / 2,
      pillY - 18,
      pillTextW + 40,
      38,
      19,
      themeColors.accent + '22',
      themeColors.accent,
      1.5
    );
    ctx.fillStyle = themeColors.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(categoryLabel, iconX, pillY);

    // Tiêu đề thành tựu
    const titleText = customTitle || milestone?.title || 'Dấu mốc phát triển bản thân';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const afterTitleY = wrapText(titleText, iconX, pillY + 40, cardWidth - 80, 56, 3);

    // Metric nổi bật (Nếu có và không bị ẩn)
    let currentY = afterTitleY + 35;

    if (recap) {
      // Hiển thị 4 ô chỉ số của tháng
      const gridW = (cardWidth - 80 - 24) / 2;
      const gridH = 110;
      const startGX = marginX + 40;
      const startGY = currentY + 10;

      const recapCards = [
        { label: 'Việc hoàn thành', val: `${recap.tasksCompleted} tasks`, emoji: '✅' },
        { label: 'Lượt thói quen', val: `${recap.habitsCompletedCount} lượt`, emoji: '🔥' },
        { label: 'Thời gian tập trung', val: `${Math.round(recap.focusMinutes / 60)} giờ`, emoji: '⏳' },
        { label: 'Cột mốc bứt phá', val: `${recap.milestonesInMonth} mốc`, emoji: '💎' },
      ];

      recapCards.forEach((c, idx) => {
        const gx = startGX + (idx % 2) * (gridW + 24);
        const gy = startGY + Math.floor(idx / 2) * (gridH + 16);
        drawRoundRect(gx, gy, gridW, gridH, 20, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.08)');
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${c.emoji} ${c.label}`, gx + 20, gy + 32);

        ctx.fillStyle = themeColors.accent;
        ctx.font = 'bold 32px system-ui, sans-serif';
        ctx.fillText(hideNumbers ? 'Đã hoàn thành' : c.val, gx + 20, gy + 75);
      });

      currentY = startGY + gridH * 2 + 30;
    } else if (milestone?.metricValue) {
      // Metric duy nhất
      drawRoundRect(
        iconX - 260,
        currentY,
        520,
        96,
        24,
        'rgba(0, 0, 0, 0.35)',
        themeColors.accent + '66',
        1.5
      );

      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(milestone.metricLabel || 'KẾT QUẢ ĐẠT ĐƯỢC', iconX, currentY + 28);

      ctx.fillStyle = themeColors.accent;
      ctx.font = 'bold 38px system-ui, sans-serif';
      const displayVal = hideNumbers ? 'Đã hoàn thành xuất sắc' : milestone.metricValue;
      ctx.fillText(displayVal, iconX, currentY + 68);

      currentY += 120;
    }

    // Mô tả hoặc Trích dẫn truyền cảm hứng (Quote)
    if (customQuote || milestone?.description) {
      const quoteText = `“${customQuote || milestone?.description}”`;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'italic 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      wrapText(quoteText, iconX, currentY + 15, cardWidth - 120, 38, 3);
    }

    // Footer trong Card: Ngày ghi nhận
    const dateStr = milestone?.date || new Date().toISOString().split('T')[0];
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CỘT MỐC GHI NHẬN: ${dateStr}`, iconX, cardBottom - 40);

    // Header & Footer ngoài Card (Branding & User)
    if (showBranding) {
      // Top header ngoài card
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`✨ ${userName}`, marginX, cardTop - 36);

      ctx.fillStyle = themeColors.accent;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('HÀNH TRÌNH CỦA TÔI', width - marginX, cardTop - 36);

      // Bottom footer ngoài card
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tạo bởi LifeOS — Ứng dụng Quản trị Cuộc sống & Tài chính Toàn diện', width / 2, height - (aspectRatio === '9:16' ? 120 : 60));
    }

    // Cập nhật previewDataUrl
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewDataUrl(dataUrl);
    } catch (e) {
      console.error('Error generating canvas preview data URL:', e);
    }
  };

  // Re-render khi các tùy chọn thay đổi
  useEffect(() => {
    if (isOpen) {
      // Delay nhỏ để modal mở và canvas ref sẵn sàng
      const timer = setTimeout(() => {
        drawCardToCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, template, aspectRatio, theme, hideNumbers, showBranding, customQuote, customTitle, milestone, recap]);

  // Hành động: Tải ảnh PNG
  const handleDownload = () => {
    setIsExporting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const link = document.createElement('a');
      const safeTitle = (customTitle || 'thanh-tuu').toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `lifeos-${safeTitle}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Hành động: Web Share API (Chia sẻ trực tiếp mạng xã hội nếu có)
  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'lifeos-achievement.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: customTitle || 'Thành tựu trên LifeOS',
            text: `${customTitle} - Mình vừa chinh phục dấu mốc này trên LifeOS! 🌟 #LifeOS #PhatTrienBanThan`,
          });
        } else {
          // Fallback tải ảnh
          handleDownload();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share failed', err);
      handleDownload();
    }
  };

  // Sao chép caption mẫu
  const handleCopyCaption = () => {
    const title = customTitle || milestone?.title || 'Dấu mốc của tôi';
    const quote = customQuote ? `\n"${customQuote}"\n` : '';
    const caption = `🌟 Cột mốc mới được ghi dấu trên hành trình hoàn thiện bản thân!\n\n✨ ${title}${quote}\n\nKỷ luật mỗi ngày, tích tiểu thành đại cùng LifeOS 🚀\n#LifeOS #HanhTrinhCuaToi #KyLuatBanThan #PhatTrienBanThan`;
    
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Tạo Thẻ Khoe Thành Tựu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xuất hình ảnh cá nhân hóa độ phân giải cao để chia sẻ Story, Feed, TikTok
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Preview, Right Controls */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6">
          
          {/* Cột trái: Live Preview Card (5 / 12) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-100/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 min-h-[360px]">
            {/* Hidden High-Res Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Visual Preview Image */}
            {previewDataUrl ? (
              <div className="relative group max-h-[500px] flex items-center justify-center">
                <img
                  src={previewDataUrl}
                  alt="Achievement Card Preview"
                  className={`rounded-2xl shadow-2xl object-contain max-h-[460px] border border-white/20 transition-transform ${
                    aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-square'
                  }`}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-xs font-medium">Đang kết xuất hình ảnh...</span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Độ phân giải siêu nét (1080px HD) · Không bị vỡ nét</span>
            </div>
          </div>

          {/* Cột phải: Control Panel (7 / 12) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* 1. Chọn phong cách (Template) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                1. Phong cách thiết kế
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setTemplate(tmpl.id)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition ${
                      template === tmpl.id
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-base mb-1">{tmpl.icon}</span>
                    <span className="text-xs font-semibold">{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tỉ lệ khung hình (Aspect Ratio) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                2. Kích thước & Nền tảng
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    aspectRatio === '1:1'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>1:1 Vuông (Feed)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('4:5')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    aspectRatio === '4:5'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>4:5 Dọc (Instagram)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    aspectRatio === '9:16'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>9:16 Story / TikTok</span>
                </button>
              </div>
            </div>

            {/* 3. Màu sắc chủ đạo (Theme Palette) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                3. Bảng màu chủ đạo
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_THEMES) as ColorThemeType[]).map((tKey) => {
                  const th = COLOR_THEMES[tKey];
                  const isSelected = theme === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTheme(tKey)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition ${
                        isSelected
                          ? 'border-slate-900 dark:border-white font-bold ring-2 ring-slate-400/40'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shadow-xs"
                        style={{ background: `linear-gradient(135deg, ${th.bgStart}, ${th.accent})` }}
                      />
                      <span>{th.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Nội dung tùy biến (Title & Quote) */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Tiêu đề cột mốc
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thành tựu..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Châm ngôn / Cảm nghĩ cá nhân
                </label>
                <input
                  type="text"
                  value={customQuote}
                  onChange={(e) => setCustomQuote(e.target.value)}
                  placeholder="Nhập câu trích dẫn hoặc cảm nghĩ của bạn..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* 5. Bảo vệ riêng tư & Tùy chọn hiển thị */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={hideNumbers}
                  onChange={(e) => setHideNumbers(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1.5">
                  {hideNumbers ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  Ẩn con số nhạy cảm (bảo vệ quyền riêng tư số tiền/kết quả)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showBranding}
                  onChange={(e) => setShowBranding(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Hiện tên của tôi & biểu trưng LifeOS</span>
              </label>
            </div>

          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <button
            type="button"
            onClick={handleCopyCaption}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {copiedCaption ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCaption ? 'Đã sao chép Caption!' : 'Sao chép Caption đăng bài'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Chia sẻ ngay</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang xuất ảnh...' : 'Tải ảnh PNG về máy'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
