import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import {
  FileEdit, Trash2, Clock, CheckSquare, BookOpen,
  ChevronDown, ChevronUp, Copy, Check, Sparkles, AlertCircle
} from 'lucide-react';

interface ScratchpadData {
  content: string;
  createdAt: number;
}

const STORAGE_KEY = 'lifeos_scratchpad_data';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ScratchpadWidget() {
  const { addTask, setCurrentView } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [createdAt, setCreatedAt] = useState<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<string>('24:00:00');
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionCoords, setSelectionCoords] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ScratchpadData = JSON.parse(saved);
        const elapsed = Date.now() - parsed.createdAt;
        if (elapsed >= EXPIRY_MS) {
          // Expired, clear
          localStorage.removeItem(STORAGE_KEY);
          setContent('');
          setCreatedAt(Date.now());
        } else {
          setContent(parsed.content || '');
          setCreatedAt(parsed.createdAt || Date.now());
        }
      }
    } catch {
      // Ignore error
    }
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
    } catch {
      // Ignore
    }
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
      // Rough positioning for the mini floating bar
      setSelectionCoords({ x: 30, y: 40 });
    } else {
      setSelectedText('');
      setSelectionCoords(null);
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
    setSelectionCoords(null);
  };

  // 1-Click Convert selected text to Vocabulary Flashcard
  const handleCreateVocab = (textToUse?: string) => {
    const target = textToUse || selectedText || content.trim();
    if (!target) return;

    soundEngine.playPop();
    // Dispatch event to open Vocab Ingestion modal
    window.dispatchEvent(new CustomEvent('lifeos:quick-add-vocab', { detail: { word: target } }));
    showToast(`Đang nạp từ vựng: "${target}"`);
    setCurrentView('study');
    setSelectedText('');
    setSelectionCoords(null);
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
  };

  return (
    <>
      {/* Toast feedback */}
      {toastMsg && (
        <div className="fixed bottom-24 right-6 z-[9999] px-4 py-2.5 rounded-xl bg-slate-900/90 text-white text-xs font-medium backdrop-blur-md border border-slate-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* Floating Toggle Button / Docked Widget */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {isOpen && (
          <div className="w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 mb-3 transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
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
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  title="Xóa nháp"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Thu gọn"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Context Action Bar when text is selected */}
            {selectedText && (
              <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium truncate max-w-[140px]">
                  &ldquo;{selectedText}&rdquo;
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCreateTask()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors"
                  >
                    <CheckSquare className="w-2.5 h-2.5" />
                    + Task
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateVocab()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-colors"
                  >
                    <BookOpen className="w-2.5 h-2.5" />
                    + Từ vựng
                  </button>
                </div>
              </div>
            )}

            {/* Textarea */}
            <div className="mt-2.5 relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onSelect={handleSelect}
                onKeyUp={handleSelect}
                placeholder="Ghi nhanh ý tưởng, đường link, từ vựng... Bôi đen text để chuyển thành Task hoặc Flashcard trong 1 chạm. Tự động xóa sau 24h."
                rows={6}
                className="w-full resize-none text-xs p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-sans leading-relaxed"
              />
            </div>

            {/* Footer Quick Actions */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span>Bôi đen text để tạo nhanh</span>
              </div>
              {content.trim() && !selectedText && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCreateTask(content)}
                    className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Tạo Task từ nháp
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating pill button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg border transition-all ${
            isOpen
              ? 'bg-slate-900 text-white border-slate-800 dark:bg-white dark:text-slate-900'
              : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800 backdrop-blur-md hover:scale-105 active:scale-95'
          }`}
        >
          <FileEdit className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold tracking-tight">Giấy nháp 24h</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {timeLeft.slice(0, 5)}
          </span>
        </button>
      </div>
    </>
  );
}
