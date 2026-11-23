import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../lib/store';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { companionEngine } from '../lib/companionEngine';
import { MobileBottomSheet } from './common/MobileBottomSheet';
import { useSmartDismiss } from '../lib/useSmartDismiss';
import {
  FileEdit, Trash2, Clock, CheckSquare, BookOpen,
  ChevronDown, Copy, Check, Sparkles, AlertCircle, X
} from 'lucide-react';

interface ScratchpadData {
  content: string;
  createdAt: number;
}

const STORAGE_KEY = 'lifeos_scratchpad_data';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ScratchpadWidget() {
  const { addTask, setCurrentView, currentUser } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<string>('24:00:00');
  const [selectedText, setSelectedText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopPopoverRef = useRef<HTMLDivElement>(null);

  // Smart dismiss on desktop for click outside and escape
  useSmartDismiss({
    isOpen,
    onDismiss: () => setIsOpen(false),
    targetRef: desktopPopoverRef,
    closeOnEscape: true,
    closeOnClickOutside: true
  });

  const [hasMascotOnRight, setHasMascotOnRight] = useState(() => {
    try {
      const s = companionEngine.getSettings(currentUser?.id);
      return s.enabled && s.focusCompanionMode !== 'off' && s.position !== 'bottom-left';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleSettingsUpdate = () => {
      try {
        const s = companionEngine.getSettings(currentUser?.id);
        const enabled = s.enabled && s.focusCompanionMode !== 'off';
        setHasMascotOnRight(enabled && s.position !== 'bottom-left');
      } catch {}
    };
    window.addEventListener('lifeos-companion-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('lifeos-companion-settings-updated', handleSettingsUpdate);
  }, [currentUser]);

  // Global event listeners for opening/closing scratchpad
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTimeout(() => textareaRef.current?.focus(), 150);
    };
    const handleClose = () => setIsOpen(false);
    const handleToggle = () => setIsOpen(prev => !prev);

    window.addEventListener('lifeos:open-scratchpad', handleOpen);
    window.addEventListener('lifeos:close-scratchpad', handleClose);
    window.addEventListener('lifeos:toggle-scratchpad', handleToggle);

    return () => {
      window.removeEventListener('lifeos:open-scratchpad', handleOpen);
      window.removeEventListener('lifeos:close-scratchpad', handleClose);
      window.removeEventListener('lifeos:toggle-scratchpad', handleToggle);
    };
  }, []);

  // Broadcast status to MobileFloatingDock
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('lifeos:scratchpad-status', {
      detail: {
        timeLeft,
        isOpen,
        hasContent: Boolean(content.trim())
      }
    }));
  }, [timeLeft, isOpen, content]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ScratchpadData = JSON.parse(saved);
        const elapsed = Date.now() - parsed.createdAt;
        if (elapsed >= EXPIRY_MS) {
          localStorage.removeItem(STORAGE_KEY);
          setContent('');
          setCreatedAt(Date.now());
        } else {
          setContent(parsed.content || '');
          setCreatedAt(parsed.createdAt || Date.now());
        }
      }
    } catch {}
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(0, createdAt + EXPIRY_MS - now);
      if (remaining <= 0) {
        setContent('');
        setCreatedAt(now);
        localStorage.removeItem(STORAGE_KEY);
        setTimeLeft('00:00:00');
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Save changes to localStorage
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const newCreatedAt = content ? createdAt : Date.now();
    if (!content) setCreatedAt(newCreatedAt);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ content: val, createdAt: newCreatedAt }));
    } catch {}
  };

  // Text selection handler
  const handleSelect = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value.substring(
      textareaRef.current.selectionStart,
      textareaRef.current.selectionEnd
    ).trim();

    if (text.length > 0) {
      setSelectedText(text);
    } else {
      setSelectedText('');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 1-Click Convert selected or full text to Task
  const handleCreateTask = (textToUse?: string) => {
    const target = textToUse || selectedText || content.trim();
    if (!target) return;

    soundEngine.playPop();
    addTask({
      title: target.length > 80 ? target.slice(0, 80) + '...' : target,
      status: 'Chưa làm',
      priority: 'Trung bình',
      dueDate: new Date().toISOString().split('T')[0],
      notes: target.length > 80 ? target : 'Tạo nhanh từ Giấy nháp 24h'
    });
    triggerConfetti({ particleCount: 25 });
    showToast(`Đã chuyển thành Task: "${target.slice(0, 30)}..."`);
    setSelectedText('');
  };

  // 1-Click Convert selected text to Vocabulary Flashcard
  const handleCreateVocab = (textToUse?: string) => {
    const target = textToUse || selectedText || content.trim();
    if (!target) return;

    soundEngine.playPop();
    window.dispatchEvent(new CustomEvent('lifeos:quick-add-vocab', { detail: { word: target } }));
    showToast(`Đang nạp từ vựng: "${target}"`);
    setCurrentView('study');
    setSelectedText('');
    setIsOpen(false);
  };

  const handleClear = () => {
    soundEngine.playPop();
    setContent('');
    setCreatedAt(Date.now());
    localStorage.removeItem(STORAGE_KEY);
    showToast('Đã làm sạch giấy nháp');
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    soundEngine.playPop();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép vào bộ nhớ tạm');
  };

  // Render Scratchpad Core Editor
  const renderEditorBody = () => (
    <div className="space-y-3">
      {/* Context Action Bar when text is selected */}
      {selectedText && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium truncate max-w-[160px]">
            &ldquo;{selectedText}&rdquo;
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleCreateTask()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3 h-3" />
              + Task
            </button>
            <button
              type="button"
              onClick={() => handleCreateVocab()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <BookOpen className="w-3 h-3" />
              + Từ vựng
            </button>
          </div>
        </div>
      )}

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          placeholder="Ghi nhanh ý tưởng, đường link, từ vựng... Bôi đen đoạn chữ để tạo Task hoặc Từ vựng trong 1 chạm. Dữ liệu tự động hủy sạch sau 24h."
          rows={7}
          className="w-full resize-none text-xs sm:text-sm p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-sans leading-relaxed"
        />
      </div>

      {/* Footer Quick Actions */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px]">Bôi đen chữ để chuyển thành Task / Flashcard</span>
        </div>

        {content.trim() && !selectedText && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCreateTask(content)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              + Toàn bộ Task
            </button>
            <button
              type="button"
              onClick={() => handleCreateVocab(content)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              + Từ vựng
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 right-6 z-[9999] px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white text-xs font-medium backdrop-blur-md border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* 1. MOBILE BOTTOM SHEET (md:hidden) */}
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxHeight="86dvh"
        title={
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
              Giấy Nháp Tự Hủy 24h
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {timeLeft}
            </span>
          </div>
        }
        subtitle={
          <span className="text-[11px] text-slate-400">
            Tự động xóa sau 24h · Lưu tức thì
          </span>
        }
        headerAction={
          <div className="flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Sao chép toàn bộ"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleClear}
              title="Làm sạch nháp"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        }
      >
        <div className="p-4 pb-6">
          {renderEditorBody()}
        </div>
      </MobileBottomSheet>

      {/* 2. DESKTOP FLOATING POPOVER & TRIGGER BUTTON (hidden md:block) */}
      <div 
        ref={desktopPopoverRef}
        className={`hidden md:flex fixed z-40 flex-col pointer-events-none transition-all duration-300 ${
          hasMascotOnRight 
            ? 'bottom-6 right-48 items-end' 
            : 'bottom-6 right-48 items-end'
        }`}
      >
        {isOpen && (
          <div className="pointer-events-auto w-96 rounded-3xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-4 mb-3 transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold tracking-wide uppercase text-slate-800 dark:text-slate-200">
                  Giấy nháp tự hủy
                </h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {timeLeft}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Sao chép toàn bộ"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  title="Xóa nháp"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Thu gọn"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Desktop Editor */}
            <div className="pt-2">
              {renderEditorBody()}
            </div>
          </div>
        )}

        {/* Desktop Floating Pill Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setIsOpen(!isOpen);
          }}
          className={`pointer-events-auto cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl border transition-all duration-200 ${
            isOpen
              ? 'bg-slate-900 text-white border-slate-800 dark:bg-white dark:text-slate-900 shadow-slate-900/30'
              : 'bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-white/10 backdrop-blur-xl hover:scale-105 active:scale-95 shadow-lg'
          }`}
        >
          <FileEdit className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold tracking-tight">Giấy nháp 24h</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {timeLeft.slice(0, 5)}
          </span>
        </button>
      </div>
    </>
  );
}
