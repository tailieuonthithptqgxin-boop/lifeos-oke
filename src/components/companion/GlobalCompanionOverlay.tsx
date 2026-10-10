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
import { CompanionAvatar } from './CompanionAvatar';
import { CompanionSpeechBubble } from './CompanionSpeechBubble';
import { CompanionSettingsModal } from './CompanionSettingsModal';
import { InteractiveCompanionChatModal } from './InteractiveCompanionChatModal';
import { 
  Settings2, 
  Moon, 
  Sparkles, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Bot,
  Minimize2,
  Maximize2
} from 'lucide-react';

export interface GlobalCompanionOverlayProps {
  className?: string;
}

export const GlobalCompanionOverlay: React.FC<GlobalCompanionOverlayProps> = ({
  className = ''
}) => {
  const { currentView, currentUser, setCurrentView } = useAppStore();
  const userId = currentUser?.id;

  const [settings, setSettings] = useState<CompanionSettings>(() => companionEngine.getSettings(userId));
  const [currentMood, setCurrentMood] = useState<CompanionMood>('idle');
  const [speechMessage, setSpeechMessage] = useState<string>('');
  const [showBubble, setShowBubble] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  // Session timer
  const sessionStartTimeRef = useRef<number>(Date.now());
  const bubbleTimeoutRef = useRef<any>(null);
  const periodicTimerRef = useRef<any>(null);
  const moodResetTimeoutRef = useRef<any>(null);

  // Sync settings when userId changes
  useEffect(() => {
    setSettings(companionEngine.getSettings(userId));
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

  // React to screen/view changes
  useEffect(() => {
    // Show polite gentle greeting or reset state on view transition
    if (currentView === 'focus') {
      setCurrentMood('focus');
    } else {
      setCurrentMood('idle');
    }
  }, [currentView]);

  const handleAvatarClick = () => {
    // Open interactive chat assistant
    setShowChatModal(true);
  };

  const handleSaveSettings = (updated: Partial<CompanionSettings>) => {
    const saved = companionEngine.saveSettings(updated, userId);
    setSettings(saved);
  };

  const handleToggleQuietMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode: CompanionFocusMode = settings.focusCompanionMode === 'quiet' ? 'normal' : 'quiet';
    handleSaveSettings({ 
      focusCompanionMode: nextMode,
      quietMode: nextMode === 'quiet'
    });
  };

  // If disabled completely or off, do not render floating widget
  if (!settings.enabled || settings.focusCompanionMode === 'off') {
    return null;
  }

  // Positioning classes:
  // Desktop: bottom-6, right-6 (or left-6)
  // Mobile: bottom-20 (to strictly stay above bottom navigation bar)
  const isLeft = settings.position === 'bottom-left';
  const posClasses = isLeft
    ? 'bottom-20 left-3 sm:bottom-6 sm:left-6 items-start'
    : 'bottom-20 right-3 sm:bottom-6 sm:right-6 items-end';

  return (
    <>
      <div 
        className={`fixed z-[60] flex flex-col pointer-events-auto transition-all duration-300 ${posClasses} ${className}`}
        aria-label="AI Study Companion"
      >
        {/* Floating Speech Bubble */}
        {!isCollapsed && showBubble && speechMessage && (
          <CompanionSpeechBubble
            message={speechMessage}
            profile={profile}
            onDismiss={() => setShowBubble(false)}
            className="mb-2.5 max-w-[280px] sm:max-w-xs cursor-pointer"
            onClick={() => setShowChatModal(true)}
          />
        )}

        {/* Collapsed Compact Docked Pill Mode */}
        {isCollapsed ? (
          <div 
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-lg backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            style={{ borderColor: `${profile.themeColor}44` }}
          >
            <span className="text-base sm:text-lg animate-bounce">{profile.avatar}</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {profile.name}
            </span>
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
        ) : (
          /* Expanded Full Living Mascot Widget */
          <div className="relative group">
            <CompanionAvatar
              profile={profile}
              mood={currentMood}
              size={settings.size}
              equippedAccessoryId={settings.equippedAccessoryId}
              onClick={handleAvatarClick}
            />

            {/* Quick Actions Floating Toolbar */}
            <div className="absolute -top-2.5 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 dark:bg-slate-900/90 p-0.5 rounded-full shadow-md border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs">
              {/* Chat Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChatModal(true);
                }}
                className="p-1 rounded-full text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Hỏi đáp cùng AI"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>

              {/* Quiet Mode Quick Toggle */}
              <button
                type="button"
                onClick={handleToggleQuietMode}
                className="p-1 rounded-full text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={settings.focusCompanionMode === 'quiet' ? 'Bật động viên 2-3 phút' : 'Chuyển Chế độ Yên tĩnh'}
              >
                {settings.focusCompanionMode === 'quiet' ? <Moon className="w-3.5 h-3.5 text-amber-500" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>

              {/* Minimize Pill Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                className="p-1 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Thu gọn"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* Settings Gear Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsModal(true);
                }}
                className="p-1 rounded-full text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cài đặt Companion"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
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
