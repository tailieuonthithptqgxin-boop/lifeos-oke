import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CompanionMood, 
  CompanionSettings, 
  MASCOT_PROFILES, 
  companionEngine,
  CompanionDialoguePool,
  CompanionFocusMode
} from '../../lib/companionEngine';
import { soundEngine } from '../../lib/soundEngine';
import { CompanionAvatar } from './CompanionAvatar';
import { CompanionSpeechBubble } from './CompanionSpeechBubble';
import { CompanionSettingsModal } from './CompanionSettingsModal';
import { Settings2, Volume2, VolumeX, Moon, Sparkles, EyeOff } from 'lucide-react';

export interface StudyCompanionWidgetProps {
  userId?: string;
  contextMood?: CompanionMood;
  contextDialogueKey?: keyof CompanionDialoguePool;
  customMessage?: string;
  mode?: 'floating' | 'embedded';
  className?: string;
}

export const StudyCompanionWidget: React.FC<StudyCompanionWidgetProps> = ({
  userId,
  contextMood,
  contextDialogueKey,
  customMessage,
  mode = 'floating',
  className = ''
}) => {
  const [settings, setSettings] = useState<CompanionSettings>(() => companionEngine.getSettings(userId));
  const [currentMood, setCurrentMood] = useState<CompanionMood>(contextMood || 'idle');
  const [speechMessage, setSpeechMessage] = useState<string>('');
  const [showBubble, setShowBubble] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Session duration tracking in minutes for progressive quote intelligence
  const sessionStartTimeRef = useRef<number>(Date.now());
  const bubbleTimeoutRef = useRef<any>(null);
  const periodicTimerRef = useRef<any>(null);
  const moodResetTimeoutRef = useRef<any>(null);

  // Sync settings when userId changes
  useEffect(() => {
    setSettings(companionEngine.getSettings(userId));
  }, [userId]);

  // Handle external contextual triggers (e.g. Focus started, Vocab correct, Vocab incorrect)
  useEffect(() => {
    if (contextMood) {
      setCurrentMood(contextMood);
      // Auto return to idle after 4s unless it's focus mode
      if (contextMood !== 'focus' && contextMood !== 'idle') {
        if (moodResetTimeoutRef.current) clearTimeout(moodResetTimeoutRef.current);
        moodResetTimeoutRef.current = setTimeout(() => {
          setCurrentMood('idle');
        }, 4000);
      }
    }

    if (customMessage) {
      triggerDialogue(customMessage);
    } else if (contextDialogueKey) {
      const msg = companionEngine.pickMessage(settings.mascotId, contextDialogueKey);
      triggerDialogue(msg);
    }
  }, [contextMood, contextDialogueKey, customMessage, settings.mascotId]);

  const profile = MASCOT_PROFILES[settings.mascotId] || MASCOT_PROFILES.lumi;

  const triggerDialogue = useCallback((text: string, moodOverride?: CompanionMood) => {
    if (!settings.enabled || settings.focusCompanionMode === 'off') return;
    if (!settings.showSpeechBubble) return;

    if (moodOverride) {
      setCurrentMood(moodOverride);
    }

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);

    setSpeechMessage(text);
    setShowBubble(true);

    // Only play sound if user explicitly enabled it and not in quiet mode
    if (settings.soundEnabled && !settings.quietMode && settings.focusCompanionMode !== 'quiet') {
      soundEngine.playPop();
    }

    // Auto dismiss bubble after 5.5s and revert mood
    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
      if (moodOverride) {
        setCurrentMood('idle');
      }
    }, 5500);
  }, [settings]);

  // -------------------------------------------------------------
  // CONTINUOUS 2–3 MINUTE RANDOMIZED MOTIVATION ENGINE
  // (Interval randomized between 120s – 180s per user specification)
  // -------------------------------------------------------------
  useEffect(() => {
    // If companion is disabled, off, or minimal, skip periodic auto-triggers
    if (!settings.enabled || settings.focusCompanionMode === 'off' || settings.focusCompanionMode === 'minimal') {
      return;
    }

    let isMounted = true;

    const scheduleNextPeriodicMotivation = () => {
      // Normal mode: 120s – 180s (2–3 mins). Quiet mode: 360s – 480s (6–8 mins)
      const baseMin = settings.focusCompanionMode === 'quiet' || settings.quietMode ? 360000 : 120000;
      const range = settings.focusCompanionMode === 'quiet' || settings.quietMode ? 120000 : 60000;
      const nextDelay = Math.floor(Math.random() * range) + baseMin;

      periodicTimerRef.current = setTimeout(() => {
        if (!isMounted) return;

        const sessionMinutes = Math.floor((Date.now() - sessionStartTimeRef.current) / 60000);
        const randomQuote = companionEngine.getPeriodicMotivationQuote(sessionMinutes);

        // Perform lively motivation animation then show speech bubble
        triggerDialogue(randomQuote, 'motivate');

        // Schedule next random cycle
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

  const handleAvatarClick = () => {
    // Interactive greeting on poke with lively reactions
    const greetings = [
      `Chào bạn! Lumi vẫn đang học cùng bạn nè! ⭐`,
      'Hít thở sâu một hơi nhé, bạn đang làm rất tốt đó!',
      profile.quote,
      'Cần tiếp thêm chút năng lượng không? Ngôi sao của Lumi luôn sáng vì bạn!',
      'Cứ thong thả từng bước một nhé, mình luôn ở ngay đây.'
    ];
    const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
    setCurrentMood('greeting');
    triggerDialogue(randomGreet);

    if (moodResetTimeoutRef.current) clearTimeout(moodResetTimeoutRef.current);
    moodResetTimeoutRef.current = setTimeout(() => {
      setCurrentMood('idle');
    }, 3500);
  };

  const handleSaveSettings = (updated: Partial<CompanionSettings>) => {
    const saved = companionEngine.saveSettings(updated, userId);
    setSettings(saved);
  };

  // Quick toggle between Normal and Quiet focus mode directly from pill
  const handleToggleQuietMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode: CompanionFocusMode = settings.focusCompanionMode === 'quiet' ? 'normal' : 'quiet';
    handleSaveSettings({ 
      focusCompanionMode: nextMode,
      quietMode: nextMode === 'quiet'
    });
  };

  // Global floating overlay is now centrally managed by GlobalCompanionOverlay
  if (mode === 'floating') {
    return null;
  }

  if (!settings.enabled || settings.focusCompanionMode === 'off') {
    return null;
  }

  // Position class for floating mode
  const floatingPosClass = settings.position === 'bottom-left'
    ? 'bottom-20 left-4 sm:left-6'
    : 'bottom-20 right-4 sm:right-6';

  if (mode === 'embedded') {
    return (
      <div className={`relative flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs ${className}`}>
        <CompanionAvatar
          profile={profile}
          mood={currentMood}
          size="compact"
          equippedAccessoryId={settings.equippedAccessoryId}
          onClick={handleAvatarClick}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: profile.themeColor }}>
            <span>{profile.name}</span>
            <span className="text-[10px] text-slate-400 font-normal">({profile.title})</span>
            {settings.focusCompanionMode === 'quiet' && (
              <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded text-[9px] font-bold">
                Chế độ Yên tĩnh
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
            {speechMessage || profile.quote}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleQuietMode}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={settings.focusCompanionMode === 'quiet' ? 'Chuyển sang chế độ Động viên 2-3 phút' : 'Chuyển sang Chế độ Yên tĩnh'}
          >
            {settings.focusCompanionMode === 'quiet' ? <Moon className="w-4 h-4 text-amber-500" /> : <Sparkles className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tùy chỉnh bạn đồng hành"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {showSettingsModal && (
          <CompanionSettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettingsModal(false)}
            userId={userId}
          />
        )}
      </div>
    );
  }

  // Floating companion mode
  return (
    <>
      <div className={`fixed z-40 flex flex-col items-end pointer-events-auto transition-all duration-300 ${floatingPosClass} ${className}`}>
        {/* Floating Speech Bubble with Smooth Fade/Pop */}
        {showBubble && speechMessage && (
          <CompanionSpeechBubble
            message={speechMessage}
            profile={profile}
            onDismiss={() => setShowBubble(false)}
            className="mb-2.5 max-w-[280px] sm:max-w-xs"
          />
        )}

        {/* Living Mascot Avatar + Fast Action Toolbar */}
        <div className="relative group">
          <CompanionAvatar
            profile={profile}
            mood={currentMood}
            size={settings.size}
            equippedAccessoryId={settings.equippedAccessoryId}
            onClick={handleAvatarClick}
          />

          {/* Mini Control Badges (Visible on hover or touch) */}
          <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {/* Quick Quiet Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleQuietMode}
              className="p-1 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-amber-500 shadow-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title={settings.focusCompanionMode === 'quiet' ? 'Bật động viên 2-3 phút' : 'Chuyển Chế độ Yên tĩnh'}
            >
              {settings.focusCompanionMode === 'quiet' ? <Moon className="w-3.5 h-3.5 text-amber-500" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Settings Gear */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsModal(true);
              }}
              className="p-1 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 shadow-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Cài đặt Companion"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

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
export default StudyCompanionWidget;
