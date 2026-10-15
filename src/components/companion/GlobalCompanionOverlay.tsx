import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../lib/store';
import { 
  CompanionMood, 
  CompanionSettings, 
  MASCOT_PROFILES, 
  companionEngine,
  CompanionFocusMode
} from '../../lib/companionEngine';
import { 
  companionEventBus, 
  CompanionEventPayload 
} from '../../lib/companion/companionEventBus';
import { 
  getCharacterProfile, 
  CompanionCharacterProfile 
} from '../../lib/companion/characterRegistry';
import { soundEngine } from '../../lib/soundEngine';
import { CompanionSpeechBubble } from './CompanionSpeechBubble';
import { CompanionSettingsModal } from './CompanionSettingsModal';
import { InteractiveCompanionChatModal } from './InteractiveCompanionChatModal';
import { 
  Settings2, 
  Moon, 
  Sparkles, 
  Bot 
} from 'lucide-react';

export interface GlobalCompanionOverlayProps {
  className?: string;
}

export const GlobalCompanionOverlay: React.FC<GlobalCompanionOverlayProps> = ({
  className = ''
}) => {
  const { currentView, currentUser, setCurrentView, habits, tasks, habitRecords } = useAppStore();
  const userId = currentUser?.id;

  const [settings, setSettings] = useState<CompanionSettings>(() => companionEngine.getSettings(userId));
  const [currentMood, setCurrentMood] = useState<CompanionMood>('idle');
  const [speechMessage, setSpeechMessage] = useState<string>('');
  const [showBubble, setShowBubble] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return true; // Collapsed by default on mobile to prevent blocking cards
    }
    return false;
  });

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  // Session timer
  const sessionStartTimeRef = useRef<number>(Date.now());
  const bubbleTimeoutRef = useRef<any>(null);
  const periodicTimerRef = useRef<any>(null);
  const moodResetTimeoutRef = useRef<any>(null);

  // Sync settings when userId changes or custom update event is fired
  useEffect(() => {
    const handleUpdate = () => {
      setSettings(companionEngine.getSettings(userId));
    };

    handleUpdate();
    window.addEventListener('lifeos-companion-settings-updated', handleUpdate);
    return () => window.removeEventListener('lifeos-companion-settings-updated', handleUpdate);
  }, [userId]);

  const profile = MASCOT_PROFILES[settings.mascotId] || MASCOT_PROFILES.lumi;
  const charDetails: CompanionCharacterProfile = getCharacterProfile(settings.mascotId);

  // Trigger dialogue with auto-dismiss
  const triggerDialogue = useCallback((text: string, moodOverride?: CompanionMood) => {
    if (!settings.enabled || settings.focusCompanionMode === 'off') return;
    if (!settings.showSpeechBubble) return;

    if (moodOverride) {
      setCurrentMood(moodOverride);
    }

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);

    setSpeechMessage(text);
    setShowBubble(true);

    if (settings.soundEnabled && !settings.quietMode && settings.focusCompanionMode !== 'quiet') {
      soundEngine.playPop();
    }

    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
      if (moodOverride) {
        setCurrentMood('idle');
      }
    }, 6000);
  }, [settings]);

  // Subscribe to companionEventBus triggers from views (Focus, Vocab, etc.)
  useEffect(() => {
    const unsubscribe = companionEventBus.subscribe((payload: CompanionEventPayload) => {
      if (!settings.enabled || settings.focusCompanionMode === 'off') return;

      if (payload.mood) {
        setCurrentMood(payload.mood);
        if (payload.mood !== 'focus' && payload.mood !== 'idle') {
          if (moodResetTimeoutRef.current) clearTimeout(moodResetTimeoutRef.current);
          moodResetTimeoutRef.current = setTimeout(() => {
            setCurrentMood('idle');
          }, 4500);
        }
      }

      if (payload.message) {
        triggerDialogue(payload.message, payload.mood);
      } else if (payload.category) {
        const msg = companionEngine.pickMessage(settings.mascotId, payload.category as any);
        triggerDialogue(msg, payload.mood);
      }
    });

    return () => unsubscribe();
  }, [settings.enabled, settings.focusCompanionMode, settings.mascotId, triggerDialogue]);

  // Periodic motivation cycle (120s – 180s)
  useEffect(() => {
    if (!settings.enabled || settings.focusCompanionMode === 'off' || settings.focusCompanionMode === 'minimal') {
      return;
    }

    let isMounted = true;

    const scheduleNextPeriodicMotivation = () => {
      const baseMin = settings.focusCompanionMode === 'quiet' || settings.quietMode ? 360000 : 120000;
      const range = settings.focusCompanionMode === 'quiet' || settings.quietMode ? 120000 : 60000;
      const nextDelay = Math.floor(Math.random() * range) + baseMin;

      periodicTimerRef.current = setTimeout(() => {
        if (!isMounted) return;

        const sessionMinutes = Math.floor((Date.now() - sessionStartTimeRef.current) / 60000);
        const randomQuote = companionEngine.getPeriodicMotivationQuote(sessionMinutes);

        triggerDialogue(randomQuote, 'motivate');
        scheduleNextPeriodicMotivation();
      }, nextDelay);
    };

    scheduleNextPeriodicMotivation();

    return () => {
      isMounted = false;
      if (periodicTimerRef.current) clearTimeout(periodicTimerRef.current);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      if (moodResetTimeoutRef.current) clearTimeout(moodResetTimeoutRef.current);
    };
  }, [settings.enabled, settings.focusCompanionMode, settings.quietMode, triggerDialogue]);

  // React to screen/view changes & Proactive Nudges
  useEffect(() => {
    if (currentView === 'focus') {
      setCurrentMood('focus');
    } else {
      setCurrentMood('idle');
    }

    // Proactive Nudge check (once per session view entry, polite and helpful)
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingHighPriority = (tasks || []).filter(t => 
      t.dueDate && t.dueDate.startsWith(todayStr) && 
      (t.priority === 'Cao' || t.priority === 'Nghiêm trọng') && 
      t.status !== 'Hoàn thành'
    );

    if (currentView === 'dashboard' && pendingHighPriority.length > 0) {
      const timer = setTimeout(() => {
        triggerDialogue(`Hôm nay bạn có ${pendingHighPriority.length} việc quan trọng cần ưu tiên nè! Hãy hoàn thành sớm nhé ✨`, 'motivate');
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (currentView === 'habits' && (habits || []).length > 0) {
      const completedToday = (habits || []).filter(h => {
        const records = habitRecords?.[h.id] || [];
        return records.some(r => r.date === todayStr && r.completed);
      });
      const remaining = (habits || []).length - completedToday.length;
      if (remaining > 0) {
        const timer = setTimeout(() => {
          triggerDialogue(`Bạn còn ${remaining} thói quen hôm nay chưa check nè! Cùng duy trì chuỗi streak nhé 🔥`, 'motivate');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [currentView, tasks, habits, habitRecords, triggerDialogue]);

  const handleAvatarClick = () => {
    // Open interactive chat assistant
    setShowChatModal(true);
  };

  const handleSaveSettings = (updated: Partial<CompanionSettings>) => {
    const saved = companionEngine.saveSettings(updated, userId);
    setSettings(saved);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lifeos-companion-settings-updated', { detail: saved }));
    }
  };

  const handleToggleQuietMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode: CompanionFocusMode = settings.focusCompanionMode === 'quiet' ? 'normal' : 'quiet';
    handleSaveSettings({ 
      focusCompanionMode: nextMode,
      quietMode: nextMode === 'quiet'
    });
  };

  // If disabled completely, off, or on dashboard (where Lumi is already docked in Gamification Bento Card)
  if (!settings.enabled || settings.focusCompanionMode === 'off' || currentView === 'dashboard') {
    return null;
  }

  // Positioning classes:
  // On desktop: bottom-6, right-6 (or left-6)
  // On mobile (< sm): bottom-20 left-3.5 so it docks cleanly on the left without colliding with right FAB or bottom nav
  const isLeft = settings.position === 'bottom-left';
  const posClasses = isLeft
    ? 'bottom-16 left-3 sm:bottom-6 sm:left-6 md:left-[17.5rem] items-start'
    : 'bottom-16 left-3 sm:bottom-6 sm:right-6 items-start sm:items-end';

  return (
    <>
      <div 
        className={`hidden md:flex fixed z-[60] flex-col pointer-events-auto transition-all duration-300 ${posClasses} ${className}`}
        aria-label="AI Study Companion"
      >
        {/* Floating Speech Bubble */}
        {!isCollapsed && showBubble && speechMessage && (
          <CompanionSpeechBubble
            message={speechMessage}
            profile={profile}
            onDismiss={() => setShowBubble(false)}
            className="mb-2 max-w-[calc(100vw-2.5rem)] sm:max-w-xs cursor-pointer"
            onClick={() => setShowChatModal(true)}
          />
        )}

        {/* Modern Flat FAB Button / 2D Vector Avatar */}
        <div className="relative group">
          <button
            type="button"
            onClick={handleAvatarClick}
            aria-label={`Trợ lý ảo ${profile.name}`}
            className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-sm hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors cursor-pointer"
          >
            <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#059669]">
              <Bot className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10B981] border border-white dark:border-slate-900" />
            </div>
            <span className="text-xs font-medium text-[#0F172A] dark:text-white">
              {profile.name}
            </span>
          </button>

          {/* Quick Actions Floating Toolbar on Hover */}
          <div className="absolute -top-8 right-0 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg shadow-sm border border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              onClick={handleToggleQuietMode}
              className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={settings.focusCompanionMode === 'quiet' ? 'Bật động viên' : 'Chế độ yên tĩnh'}
            >
              {settings.focusCompanionMode === 'quiet' ? <Moon className="w-3.5 h-3.5 text-amber-500" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsModal(true);
              }}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cài đặt"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Chat Assistant Modal */}
      {showChatModal && (
        <InteractiveCompanionChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          currentView={currentView}
          currentUser={currentUser}
          settings={settings}
          onNavigateView={(view) => setCurrentView(view as any)}
          onOpenSettings={() => {
            setShowChatModal(false);
            setShowSettingsModal(true);
          }}
          onMoodChange={(m) => setCurrentMood(m)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <CompanionSettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
          userId={userId}
        />
      )}
    </>
  );
};
