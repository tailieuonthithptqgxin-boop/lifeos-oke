import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import {
  Search, CheckSquare, Calendar, Wallet, FolderKanban,
  FileText, Target, Repeat, Scale, Cpu, User, ShoppingBag,
  ArrowRight, Sparkles, X, Plus, Clock, Shield, BookOpen, Zap, Heart, Palette, Coffee, Trophy
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ViewState } from '../lib/types';
import { soundEngine } from '../lib/soundEngine';
import { parseCommand } from '../utils/commandParser';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Điều hướng' | 'Công việc' | 'Dự án' | 'Ghi chú' | 'Tài chính' | 'Mục tiêu' | 'Thói quen' | 'Quyết định' | 'Lệnh nhanh';
  icon: any;
  action: () => void;
  badge?: string;
}

export function CommandCenter() {
  const {
    isCommandOpen,
    toggleCommand,
    setCurrentView,
    currentUser,
    tasks,
    projects,
    notes,
    transactions,
    goals,
    habits,
    decisions,
    addTask,
    addTransaction,
    addNote,
    language
  } = useAppStore();

  const t = useTranslation(language);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'commands' | 'tasks' | 'finance' | 'pages'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
      if (e.key === 'Escape' && isCommandOpen) {
        toggleCommand();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen, toggleCommand]);

  // Focus on open
  useEffect(() => {
    if (isCommandOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        setQuery('');
        setSelectedIndex(0);
      }, 50);
    }
  }, [isCommandOpen]);

  // Navigation pages list
  const navItems = useMemo(() => [
    { title: 'Bảng điều khiển Tổng quan (Dashboard)', view: 'dashboard' as ViewState, icon: Sparkles },
    { title: 'Quản lý Công việc & Nhiệm vụ (Tasks)', view: 'tasks' as ViewState, icon: CheckSquare },
    { title: 'Lịch trình & Thời gian biểu (Calendar)', view: 'calendar' as ViewState, icon: Calendar },
    { title: 'Dự án & Danh mục P.A.R.A (Projects)', view: 'projects' as ViewState, icon: FolderKanban },
    { title: 'Ghi chú & Sổ tay thông minh (Notes)', view: 'notes' as ViewState, icon: FileText },
    { title: 'Tài chính, Ví tiền & Chi tiêu (Finance)', view: 'finance' as ViewState, icon: Wallet },
    { title: 'Mục tiêu & Kế hoạch cuộc đời (Goals)', view: 'goals' as ViewState, icon: Target },
    { title: 'Theo dõi Thói quen hàng ngày (Habits)', view: 'habits' as ViewState, icon: Repeat },
    { title: 'Đồng hồ Tập trung Pomodoro (Focus)', view: 'focus' as ViewState, icon: Clock },
    { title: 'Hệ thống Quản lý Học tập (Study OS)', view: 'study' as ViewState, icon: BookOpen },
    { title: 'Động cơ Ra quyết định (Decision Engine)', view: 'decision' as ViewState, icon: Scale },
    { title: 'Quy tắc Tự động hóa (Automation Engine)', view: 'automation' as ViewState, icon: Cpu },
    { title: 'Kho Giao diện & Mẫu Templates (Marketplace)', view: 'marketplace' as ViewState, icon: ShoppingBag },
    { title: 'Gói dịch vụ & Quản lý Đội ngũ (Subscription)', view: 'subscription' as ViewState, icon: Zap },
    { title: 'Tài khoản & Thiết lập của tôi (My Account)', view: 'account' as ViewState, icon: User },
    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN' ? [
      { title: 'Trung tâm Quản trị Hệ thống (Admin Portal)', view: 'admin' as ViewState, icon: Shield }
    ] : [])
  ], [currentUser?.role]);

  // Computed Search Results
  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: SearchResultItem[] = [];

    // Check for Slash / Arrow Command mode
    if (q.startsWith('/') || q.startsWith('>')) {
      const cleanQ = q.replace(/^[/|>]/, '').trim();
      const parts = cleanQ.split(' ');
      const cmd = parts[0];
      const param = parts.slice(1).join(' ').trim();

      // /zen or >zen
      if ('zen'.startsWith(cmd) || 'focus'.startsWith(cmd)) {
        list.push({
          id: 'cmd-zen',
          title: '🧘 Bật Zen Focus Mode Toàn Màn Hình (Shift + F)',
          subtitle: 'Không gian Deep Work tối giản OLED + Âm thanh thư giãn Web Audio offline',
          category: 'Lệnh nhanh',
          icon: Sparkles,
          badge: 'Deep Work',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-zen-focus'));
            toggleCommand();
          }
        });
      }

      // /reset or >reset
      if ('reset'.startsWith(cmd) || 'sunday'.startsWith(cmd) || 'tuan'.startsWith(cmd)) {
        list.push({
          id: 'cmd-reset',
          title: '🌿 Lễ Tổng Kết Tuần (Sunday Weekly Reset)',
          subtitle: 'Nhìn lại tuần cũ, đúc kết bài học & đặt 3 mục tiêu lớn tuần mới (+100 XP)',
          category: 'Lệnh nhanh',
          icon: Calendar,
          badge: 'Nghi thức tuần',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-sunday-reset'));
            toggleCommand();
          }
        });
      }

      // /story or >story or /flex
      if ('story'.startsWith(cmd) || 'flex'.startsWith(cmd) || 'khoe'.startsWith(cmd)) {
        list.push({
          id: 'cmd-story',
          title: '📸 Xuất Thẻ Flex Instagram Story (Tỉ Lệ 9:16)',
          subtitle: 'Tải ảnh PNG thẩm mỹ để chia sẻ thành tích và chuỗi Streak lên Story/Threads',
          category: 'Lệnh nhanh',
          icon: Zap,
          badge: 'Story 9:16',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-share-story'));
            toggleCommand();
          }
        });
      }

      // /pet or >pet
      if ('pet'.startsWith(cmd) || 'mascot'.startsWith(cmd) || 'donghanh'.startsWith(cmd)) {
        list.push({
          id: 'cmd-pet',
          title: '🦊 Tương Tác Cùng Linh Thú Đồng Hành',
          subtitle: 'Nhận câu thoại động viên dopamine và kiểm tra cấp độ tiến hóa của linh thú',
          category: 'Lệnh nhanh',
          icon: Heart,
          badge: 'Linh thú',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:poke-pet'));
            toggleCommand();
          }
        });
      }

      // /theme or >theme
      if ('theme'.startsWith(cmd) || 'vibe'.startsWith(cmd) || 'mau'.startsWith(cmd)) {
        list.push({
          id: 'cmd-theme',
          title: '🎨 Đổi Vibe Thẩm Mỹ (Cyber Emerald, Matcha Latte, Midnight...)',
          subtitle: 'Cá nhân hóa giao diện LifeOS theo mood và phong cách của bạn',
          category: 'Lệnh nhanh',
          icon: Palette,
          badge: 'Aesthetic',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-theme-modal'));
            toggleCommand();
          }
        });
      }

      // /wrapped or >wrapped
      if ('wrapped'.startsWith(cmd) || 'thang'.startsWith(cmd) || 'month'.startsWith(cmd)) {
        list.push({
          id: 'cmd-wrapped',
          title: '🎉 LifeOS Wrapped Tháng (Tổng kết phong cách Spotify)',
          subtitle: 'Mở story tổng kết thành tích Deep Work, Tasks và Danh hiệu tháng để flex',
          category: 'Lệnh nhanh',
          icon: Trophy,
          badge: 'Wrapped',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-wrapped-modal'));
            toggleCommand();
          }
        });
      }

      // /rest or >rest
      if ('rest'.startsWith(cmd) || 'chill'.startsWith(cmd) || 'nghi'.startsWith(cmd)) {
        list.push({
          id: 'cmd-rest',
          title: '🍵 Bật Chế Độ Nghỉ Ngơi & Bảo Vệ Streak (Rest Day Mode)',
          subtitle: 'Khóa chuỗi kỉ luật hôm nay để sạc lại năng lượng, chống kiệt sức',
          category: 'Lệnh nhanh',
          icon: Coffee,
          badge: 'Chữa lành',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:toggle-rest-day'));
            toggleCommand();
          }
        });
      }

      // /ai or >ai or copilot
      if ('ai'.startsWith(cmd) || 'copilot'.startsWith(cmd) || 'buddy'.startsWith(cmd) || 'troly'.startsWith(cmd)) {
        list.push({
          id: 'cmd-ai-buddy',
          title: '🤖 Mở AI Life Buddy Copilot (Trợ lý cá nhân Gen Z)',
          subtitle: 'Tự xếp Daily Trifecta, chia nhỏ Overthinking Task, Roast chi tiêu và tư vấn thông minh',
          category: 'Lệnh nhanh',
          icon: Cpu,
          badge: 'AI Copilot',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-ai-buddy'));
            toggleCommand();
          }
        });
      }

      // /companion or >mascot or nhanvat (Bật / Tắt nhân vật đồng hành)
      if ('companion'.startsWith(cmd) || 'mascot'.startsWith(cmd) || 'nhanvat'.startsWith(cmd) || 'pet'.startsWith(cmd) || 'lumi'.startsWith(cmd)) {
        list.push({
          id: 'cmd-toggle-companion',
          title: '🌟 Bật / Tắt Nhân Vật AI Đồng Hành (Mascot Companion)',
          subtitle: 'Mở lại hoặc ẩn nhân vật đồng hành sống động trên màn hình',
          category: 'Lệnh nhanh',
          icon: Sparkles,
          badge: 'Nhân vật AI',
          action: () => {
            soundEngine.playPop();
            const current = JSON.parse(localStorage.getItem('lifeos_companion_settings') || '{}');
            const nextEnabled = !current.enabled;
            const updated = { ...current, enabled: nextEnabled, focusCompanionMode: nextEnabled ? 'normal' : 'off' };
            localStorage.setItem('lifeos_companion_settings', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('lifeos-companion-settings-updated', { detail: updated }));
            toggleCommand();
          }
        });
      }

      // /quiz or >quiz or persona
      if ('quiz'.startsWith(cmd) || 'persona'.startsWith(cmd) || 'onboard'.startsWith(cmd) || 'tinhcach'.startsWith(cmd)) {
        list.push({
          id: 'cmd-persona-quiz',
          title: '🎯 Khảo Sát Phong Cách Cá Nhân 15s (Persona Quiz)',
          subtitle: 'Thiết lập Vibe theme, linh thú khởi đầu và tự động gieo 3 nhiệm vụ Trifecta (+50 XP)',
          category: 'Lệnh nhanh',
          icon: Target,
          badge: '15s Quiz',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:open-persona-quiz'));
            toggleCommand();
          }
        });
      }

      // /task or >task
      if ('task'.startsWith(cmd) || 'viec'.startsWith(cmd)) {
        const isUrgent = param.includes('!gap') || param.includes('!high') || param.includes('!uutu');
        const isLow = param.includes('!thap') || param.includes('!low');
        const isTomorrow = /\bmai\b/i.test(param);
        const cleanTitle = param.replace(/!(gap|high|uutu|thap|low)/gi, '').trim();

        list.push({
          id: 'cmd-task',
          title: cleanTitle ? `Tạo công việc: "${cleanTitle}"` : 'Tạo công việc mới: /task [tên] [!gap]',
          subtitle: cleanTitle 
            ? `Ưu tiên: ${isUrgent ? 'Cao (!gap)' : isLow ? 'Thấp' : 'Trung bình'} · Hạn: ${isTomorrow ? 'Ngày mai' : 'Hôm nay'}` 
            : 'Mẹo: Gõ /task Hoàn thành đồ án !gap để tự gán ưu tiên cao',
          category: 'Lệnh nhanh',
          icon: CheckSquare,
          badge: isUrgent ? 'Ưu tiên Cao' : 'Nhiệm vụ',
          action: () => {
            if (cleanTitle) {
              soundEngine.playPop();
              const due = isTomorrow 
                ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
              addTask({
                title: cleanTitle,
                status: 'Chưa làm',
                priority: isUrgent ? 'Cao' : isLow ? 'Thấp' : 'Trung bình',
                dueDate: due,
                projectId: null,
                notes: 'Tạo nhanh từ Spotlight'
              });
              setSuccessToast(`Đã tạo công việc "${cleanTitle}"`);
              setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
            }
          }
        });
      }

      // /expense or /chi or >pay
      if ('expense'.startsWith(cmd) || 'chi'.startsWith(cmd) || 'pay'.startsWith(cmd)) {
        list.push({
          id: 'cmd-expense',
          title: param ? `Ghi chi tiêu: ${param}` : 'Ghi chi tiêu nhanh: /expense [số tiền] [nội dung]',
          subtitle: 'VD: /expense 50k Trà sữa',
          category: 'Lệnh nhanh',
          icon: Wallet,
          badge: 'Chi tiêu',
          action: () => {
            const rawParts = param.split(' ');
            let amt = parseInt(rawParts[0].replace(/\D/g, '')) || 0;
            if (rawParts[0].toLowerCase().includes('k') || amt < 1000) amt *= 1000;
            const desc = rawParts.slice(1).join(' ') || 'Chi tiêu nhanh';
            if (amt > 0) {
              soundEngine.playPop();
              addTransaction({
                amount: amt,
                type: 'Chi tiêu',
                category: 'Ăn uống / Sinh hoạt',
                date: new Date().toISOString().split('T')[0],
                description: desc
              });
              setSuccessToast(`Đã ghi chi tiêu ${formatCurrency(amt)}: "${desc}"`);
              setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
            }
          }
        });
      }

      if ('vocab'.startsWith(cmd) || 'hoc'.startsWith(cmd) || 'study'.startsWith(cmd)) {
        list.push({
          id: 'cmd-vocab',
          title: 'Mở Học Từ Vựng (Vocabulary Master)',
          subtitle: 'Luyện tập Flashcard Spaced Repetition SM-2 ngay lập tức',
          category: 'Lệnh nhanh',
          icon: BookOpen,
          badge: 'Học tập',
          action: () => {
            soundEngine.playPop();
            setCurrentView('study');
            toggleCommand();
          }
        });
      }

      return list;
    }

    // Default / General Search across everything
    if (!q) {
      // 1. Top Recommended Gen Z Power Actions
      list.push({
        id: 'rec-zen',
        title: '🧘 Bật Chế Độ Zen Focus Mode (Shift + F)',
        subtitle: 'Toàn màn hình tối giản OLED + Âm thanh thư giãn offline',
        category: 'Lệnh nhanh',
        icon: Sparkles,
        badge: 'Phím tắt ⇧F',
        action: () => {
          soundEngine.playPop();
          window.dispatchEvent(new CustomEvent('lifeos:open-zen-focus'));
          toggleCommand();
        }
      });

      list.push({
        id: 'rec-reset',
        title: '🌿 Lễ Tổng Kết Tuần (Sunday Weekly Reset)',
        subtitle: 'Nhìn lại 7 ngày qua, đúc kết bài học & đặt 3 mục tiêu lớn mới (+100 XP)',
        category: 'Lệnh nhanh',
        icon: Calendar,
        badge: 'Nghi thức',
        action: () => {
          soundEngine.playPop();
          window.dispatchEvent(new CustomEvent('lifeos:open-sunday-reset'));
          toggleCommand();
        }
      });

      list.push({
        id: 'rec-story',
        title: '📸 Xuất Thẻ Flex Instagram Story (9:16)',
        subtitle: 'Tải ảnh PNG aesthetic để flex thành tích & streak lên Stories/Threads',
        category: 'Lệnh nhanh',
        icon: Zap,
        badge: 'Story 9:16',
        action: () => {
          soundEngine.playPop();
          window.dispatchEvent(new CustomEvent('lifeos:open-share-story'));
          toggleCommand();
        }
      });

      list.push({
        id: 'rec-pet',
        title: '🦊 Tương Tác Cùng Linh Thú Đồng Hành',
        subtitle: 'Nhận năng lượng tích cực và xem cấp độ tiến hóa của linh thú',
        category: 'Lệnh nhanh',
        icon: Heart,
        badge: 'Linh thú',
        action: () => {
          soundEngine.playPop();
          window.dispatchEvent(new CustomEvent('lifeos:poke-pet'));
          toggleCommand();
        }
      });

      // 2. Common Quick Jump Navigation
      navItems.slice(0, 5).forEach((item) => {
        list.push({
          id: `nav-${item.view}`,
          title: item.title,
          subtitle: `Mở giao diện ${item.title.split('(')[0].trim()}`,
          category: 'Điều hướng',
          icon: item.icon,
          badge: 'Trang',
          action: () => {
            setCurrentView(item.view);
            toggleCommand();
          }
        });
      });
      return list;
    }

    // ==========================================
    // OMNI QUICK-CAPTURE NATURAL LANGUAGE PARSER
    // ==========================================

    // 0. Frictionless Regex Command Bar: @time, #tag, !energy, ~duration (0ms Zero-AI)
    const parsedTask = parseCommand(query);
    if (parsedTask.hasSpecialTokens && parsedTask.title) {
      list.unshift({
        id: 'regex-frictionless-task',
        title: `⚡ [${parsedTask.energyDisplay?.label || 'Task'}] "${parsedTask.title}"`,
        subtitle: `${parsedTask.dueDisplay ? `📅 ${parsedTask.dueDisplay} · ` : ''}${parsedTask.tags.length ? `🏷️ #${parsedTask.tags.join(' #')} · ` : ''}${parsedTask.durationDisplay ? `⏱️ ${parsedTask.durationDisplay} · ` : ''}Nhấn Enter để thêm ngay`,
        category: 'Lệnh nhanh',
        icon: CheckSquare,
        badge: parsedTask.energyDisplay?.label || '0ms Capture',
        action: () => {
          soundEngine.playPop();
          addTask({
            title: parsedTask.title,
            status: 'Chưa làm',
            priority: parsedTask.energy === 'deep_work' ? 'Khẩn cấp' : (parsedTask.energy === 'shallow' ? 'Trung bình' : 'Thấp'),
            dueDate: parsedTask.dueDate || new Date().toISOString().split('T')[0],
            estimatedHours: parsedTask.durationMinutes ? parsedTask.durationMinutes / 60 : undefined,
            tags: parsedTask.tags,
            notes: `Mức năng lượng: ${parsedTask.energyDisplay?.label || 'Chưa định'}`
          });
          setSuccessToast(`Đã tạo "${parsedTask.title}" (${parsedTask.energyDisplay?.label || 'Task'}) ⚡`);
          setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
        }
      });
    }

    // 0.1. Zero-Effort Vocab Quick Ingestion (e.g. "vocab serendipity", "tra ephemeral", "từ resilience")
    if (/^(vocab|tra|từ|word)\s+/i.test(q)) {
      const wordTerm = q.replace(/^(vocab|tra|từ|word)\s+/i, '').trim();
      if (wordTerm) {
        list.unshift({
          id: 'cmd-lookup-vocab',
          title: `📖 Nạp từ vựng tự động: "${wordTerm}"`,
          subtitle: 'Free Dictionary + Datamuse + Giphy meme (0ms Zero-AI)',
          category: 'Lệnh nhanh',
          icon: BookOpen,
          badge: 'Zero-Effort Vocab',
          action: () => {
            soundEngine.playPop();
            window.dispatchEvent(new CustomEvent('lifeos:quick-add-vocab', { detail: { word: wordTerm } }));
            setCurrentView('study');
            toggleCommand();
          }
        });
      }
    }

    // 1. Natural Language INCOME (e.g. "+15m Lương tháng", "lương 15m", "+500k thưởng")
    const isIncomeExplicit = q.startsWith('+') || /^(thu|lương|thưởng|nhận)\s+/i.test(q);
    const incomeMoneyMatch = q.match(/(?:\+)?(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan)?/i);
    if (isIncomeExplicit && incomeMoneyMatch) {
      let num = parseFloat(incomeMoneyMatch[1].replace(/,/g, ''));
      const unit = (incomeMoneyMatch[2] || '').toLowerCase();
      if (unit === 'm' || unit === 'tr' || unit === 'triệu') num *= 1000000;
      else if (unit === 'k' || unit === 'nghìn' || unit === 'ngan' || num < 1000) num *= 1000;
      
      if (num > 0) {
        const desc = q.replace(/^[+\s]+/, '').replace(/(?:thu|lương|thưởng|nhận)\s+/i, '').replace(/(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan)?/i, '').trim() || 'Thu nhập / Lương';
        list.unshift({
          id: 'nl-income',
          title: `💰 Ghi thu nhập: +${formatCurrency(num)} ("${desc}")`,
          subtitle: 'Nhấn Enter để cộng ngay vào ví tiền của bạn',
          category: 'Lệnh nhanh',
          icon: Wallet,
          badge: 'Thu nhập',
          action: () => {
            soundEngine.playPop();
            addTransaction({
              amount: num,
              type: 'Thu nhập',
              category: 'Lương & Thưởng',
              date: new Date().toISOString().split('T')[0],
              description: desc
            });
            setSuccessToast(`Đã ghi nhận thu nhập +${formatCurrency(num)}: "${desc}" ✨`);
            setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
          }
        });
      }
    }

    // 2. Natural Language EXPENSE (e.g. "ăn trưa 45k", "-45k cafe", "mua sách 120k", "cafe highland 45k", "xăng 70k")
    const isExpenseExplicit = q.startsWith('-') || /^(chi|mua|tiền|trả)\s+/i.test(q);
    const expenseMoneyMatch = q.match(/(?:-)?(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan|đ|vnd)?/i);
    const isExpenseContext = isExpenseExplicit || /chi|mua|ăn|uống|xăng|cà phê|cafe|tiền|trả|bánh|cơm|grab|shopee|lazada/i.test(q) || /(?:k|tr|m)$/i.test(q);
    
    if (expenseMoneyMatch && isExpenseContext && !isIncomeExplicit) {
      let rawNum = parseFloat(expenseMoneyMatch[1].replace(/,/g, ''));
      const unit = (expenseMoneyMatch[2] || '').toLowerCase();
      if (unit === 'm' || unit === 'tr' || unit === 'triệu') rawNum *= 1000000;
      else if (unit === 'k' || unit === 'nghìn' || unit === 'ngan' || rawNum < 1000) rawNum *= 1000;

      if (rawNum > 0) {
        const desc = q.replace(/^[-|\s]+/, '').replace(/(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan|đ|vnd)?/i, '').replace(/^(chi|mua|tiền)\s*/i, '').trim() || 'Chi tiêu nhanh';
        list.unshift({
          id: 'nl-expense',
          title: `💸 Ghi nhanh chi tiêu: -${formatCurrency(rawNum)} ("${desc}")`,
          subtitle: 'Nhấn Enter để trừ vào ngân sách & ghi sổ tức thì',
          category: 'Lệnh nhanh',
          icon: Wallet,
          badge: 'Chi tiêu',
          action: () => {
            soundEngine.playPop();
            addTransaction({
              amount: rawNum,
              type: 'Chi tiêu',
              category: 'Ăn uống / Sinh hoạt',
              date: new Date().toISOString().split('T')[0],
              description: desc
            });
            setSuccessToast(`Đã ghi chi tiêu ${formatCurrency(rawNum)}: "${desc}" ✨`);
            setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
          }
        });
      }
    }

    // 3. Natural Language QUICK NOTE (e.g. "#note Ý tưởng app podcast", "note: Mua quà sinh nhật")
    if (q.startsWith('#note') || q.startsWith('note:') || q.startsWith('#ghi') || q.startsWith('#y')) {
      const cleanContent = q.replace(/^(#note|note:|#ghi|#y)\s*/i, '').trim();
      if (cleanContent) {
        list.unshift({
          id: 'nl-note',
          title: `📝 Lưu ghi chú nhanh: "${cleanContent}"`,
          subtitle: 'Nhấn Enter để lưu ngay vào Sổ tay Second Brain',
          category: 'Lệnh nhanh',
          icon: FileText,
          badge: 'Ghi chú',
          action: () => {
            soundEngine.playPop();
            if (typeof addNote === 'function') {
              addNote({
                title: cleanContent.slice(0, 40),
                content: cleanContent,
                tags: ['QuickCapture'],
                date: new Date().toISOString().split('T')[0]
              });
            }
            setSuccessToast(`Đã lưu ghi chú "${cleanContent.slice(0, 30)}..." ✨`);
            setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
          }
        });
      }
    }

    // 4. Natural Language TASK (e.g. "Họp team 15:00 mai !p1", "Làm bài tập N3 !gap", "task chuẩn bị slide")
    const isTaskKeyword = /^(task|việc|todo)\s+/i.test(q);
    const hasPriorityFlag = /!(cao|gap|p1|uutu|thap|low|p3)/i.test(q);
    const hasTomorrow = /\b(mai|ngày mai|tomorrow)\b/i.test(q);
    const looksLikeTask = isTaskKeyword || hasPriorityFlag || hasTomorrow || (/^(họp|làm|viết|nộp|gọi|gửi|mua|đọc|ôn)\s+/i.test(q) && !expenseMoneyMatch);

    if (looksLikeTask && !q.startsWith('#') && !isIncomeExplicit) {
      const isHigh = /!(cao|gap|p1|uutu)/i.test(q);
      const isLow = /!(thap|low|p3)/i.test(q);
      const priority = isHigh ? 'Cao' : (isLow ? 'Thấp' : 'Trung bình');
      const cleanTitle = q.replace(/^(task|việc|todo)\s+/i, '').replace(/!(cao|gap|p1|uutu|thap|low|p3)/gi, '').trim();
      
      if (cleanTitle) {
        const dueDate = hasTomorrow 
          ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        list.unshift({
          id: 'nl-task',
          title: `✨ Tạo nhanh công việc: "${cleanTitle}"`,
          subtitle: `Ưu tiên: ${priority} · Hạn chót: ${hasTomorrow ? 'Ngày mai' : 'Hôm nay'} · Nhấn Enter để thêm`,
          category: 'Lệnh nhanh',
          icon: CheckSquare,
          badge: isHigh ? 'Ưu tiên Cao' : 'Nhiệm vụ',
          action: () => {
            soundEngine.playPop();
            addTask({
              title: cleanTitle,
              status: 'Chưa làm',
              priority,
              dueDate,
              projectId: null,
              notes: 'Tạo nhanh qua Omni Quick-Capture'
            });
            setSuccessToast(`Đã tạo công việc "${cleanTitle}" ✨`);
            setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
          }
        });
      }
    }

    // 1. Navigation items matching query
    navItems.forEach((item) => {
      if (item.title.toLowerCase().includes(q)) {
        list.push({
          id: `nav-${item.view}`,
          title: item.title,
          subtitle: 'Nhảy nhanh đến trang này',
          category: 'Điều hướng',
          icon: item.icon,
          badge: 'Trang',
          action: () => {
            setCurrentView(item.view);
            toggleCommand();
          }
        });
      }
    });

    // 2. Tasks
    (tasks || []).forEach((t: any) => {
      if (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        list.push({
          id: `task-${t.id}`,
          title: t.title,
          subtitle: `${t.status || 'Chưa làm'} • Hạn: ${t.dueDate ? formatDate(t.dueDate) : 'Không có'}`,
          category: 'Công việc',
          icon: CheckSquare,
          badge: t.priority || 'Trung bình',
          action: () => {
            setCurrentView('tasks');
            toggleCommand();
          }
        });
      }
    });

    // 3. Projects
    (projects || []).forEach((p: any) => {
      if (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
        list.push({
          id: `proj-${p.id}`,
          title: p.name,
          subtitle: `Tiến độ: ${Math.round(p.progress || 0)}% • Trạng thái: ${p.status || 'Đang làm'}`,
          category: 'Dự án',
          icon: FolderKanban,
          badge: 'Dự án',
          action: () => {
            setCurrentView('projects');
            toggleCommand();
          }
        });
      }
    });

    // 4. Notes
    (notes || []).forEach((n: any) => {
      if (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)) {
        list.push({
          id: `note-${n.id}`,
          title: n.title,
          subtitle: n.content ? (n.content.slice(0, 75) + '...') : 'Ghi chú',
          category: 'Ghi chú',
          icon: FileText,
          badge: n.category || 'Ghi chú',
          action: () => {
            setCurrentView('notes');
            toggleCommand();
          }
        });
      }
    });

    // 5. Goals & Habits
    (goals || []).forEach((g: any) => {
      if (g.title?.toLowerCase().includes(q)) {
        list.push({
          id: `goal-${g.id}`,
          title: g.title,
          subtitle: `Tiến độ: ${Math.round(g.progress || 0)}% • Danh mục: ${g.category || 'Cá nhân'}`,
          category: 'Mục tiêu',
          icon: Target,
          badge: 'Mục tiêu',
          action: () => {
            setCurrentView('goals');
            toggleCommand();
          }
        });
      }
    });

    (habits || []).forEach((h: any) => {
      if (h.name?.toLowerCase().includes(q)) {
        list.push({
          id: `habit-${h.id}`,
          title: h.name,
          subtitle: `Chuỗi hiện tại: ${h.streak || 0} ngày • Mục tiêu: ${h.target || 1} ${h.unitLabel || 'lần'}`,
          category: 'Thói quen',
          icon: Repeat,
          badge: `${h.streak || 0} ngày`,
          action: () => {
            setCurrentView('habits');
            toggleCommand();
          }
        });
      }
    });

    // 6. Transactions
    (transactions || []).forEach((tr: any) => {
      const desc = tr.description || tr.category || '';
      if (desc.toLowerCase().includes(q) || String(tr.amount).includes(q)) {
        list.push({
          id: `tx-${tr.id}`,
          title: `${tr.type === 'Thu nhập' ? '+' : '-'}${formatCurrency(tr.amount)}: ${desc}`,
          subtitle: `${tr.category || 'Chung'} • ${tr.date ? formatDate(tr.date) : ''}`,
          category: 'Tài chính',
          icon: Wallet,
          badge: tr.type || 'Giao dịch',
          action: () => {
            setCurrentView('finance');
            toggleCommand();
          }
        });
      }
    });

    // 7. Decisions
    (decisions || []).forEach((d: any) => {
      if (d.title?.toLowerCase().includes(q) || d.problem?.toLowerCase().includes(q)) {
        list.push({
          id: `dec-${d.id}`,
          title: d.title,
          subtitle: `Trạng thái: ${d.status || 'Đang phân tích'} • Điểm số: ${d.score || 0}`,
          category: 'Quyết định',
          icon: Scale,
          badge: d.importance || 'Chiến lược',
          action: () => {
            setCurrentView('decision_engine');
            toggleCommand();
          }
        });
      }
    });

    let filtered = list;
    if (activeCategory === 'commands') filtered = list.filter(i => i.category === 'Lệnh nhanh');
    else if (activeCategory === 'tasks') filtered = list.filter(i => i.category === 'Công việc');
    else if (activeCategory === 'finance') filtered = list.filter(i => i.category === 'Tài chính');
    else if (activeCategory === 'pages') filtered = list.filter(i => i.category === 'Điều hướng');

    return filtered.slice(0, 25);
  }, [query, activeCategory, navItems, tasks, projects, notes, goals, habits, transactions, decisions, addTask, addTransaction, setCurrentView, toggleCommand]);

  // Adjust selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    }
  };

  if (!isCommandOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={toggleCommand}
      />

      {/* Spotlight Window */}
      <div className="bg-white dark:bg-[#141E30] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-[#E2E8F0] dark:border-white/[0.08] animate-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]">
        {/* Input Bar */}
        <div className="relative border-b border-slate-100 dark:border-white/[0.08] p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("Gõ nhanh... VD: 'Cafe 45k', '+15m Lương', 'Họp mai !gap', '#note Ý tưởng'...")}
            className="w-full text-base sm:text-lg bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Quick Syntax Chips */}
        {!query && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/5 dark:bg-emerald-950/20 border-b border-emerald-500/10 text-[11px] overflow-x-auto no-scrollbar">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">⚡ Mẫu gõ 1-chạm:</span>
            <button type="button" onClick={() => setQuery('Cafe 45k')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer shrink-0 font-medium">"Cafe 45k"</button>
            <button type="button" onClick={() => setQuery('+15m Lương')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer shrink-0 font-medium">"+15m Lương"</button>
            <button type="button" onClick={() => setQuery('Họp 15h mai !gap')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer shrink-0 font-medium">"Họp mai !gap"</button>
            <button type="button" onClick={() => setQuery('#note Ý tưởng mới')} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer shrink-0 font-medium">"#note Ý tưởng"</button>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'commands', label: '⚡ Lệnh nhanh' },
            { id: 'tasks', label: '📋 Công việc' },
            { id: 'finance', label: '💸 Tài chính' },
            { id: 'pages', label: '🧭 Trang điều hướng' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setActiveCategory(tab.id as any);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1A2540] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/[0.08]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Success Toast inside modal */}
        {successToast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">{t('Không có kết quả nào phù hợp.')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('Thử tìm theo tên nhiệm vụ, dự án hoặc gõ /task để tạo mới')}</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 shadow-2xs'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm truncate">{t(item.title)}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {t(item.badge)}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                    <span className="text-[10px] font-medium hidden sm:inline-block">
                      {t(item.category)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0B1120]/80 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] font-bold">↑↓</kbd> {t('Di chuyển')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] font-bold">↵</kbd> {t('Chọn')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuery('/task ')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 font-mono text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            >
              /task
            </button>
            <button
              type="button"
              onClick={() => setQuery('/expense ')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 font-mono text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            >
              /expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
