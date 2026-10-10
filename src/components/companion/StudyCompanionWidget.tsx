import React, { useState, useEffect, useRef } from 'react';
import { 
  CompanionMood, 
  CompanionSettings, 
  MASCOT_PROFILES, 
  companionEngine,
  CompanionDialoguePool
} from '../../lib/companionEngine';
import { soundEngine } from '../../lib/soundEngine';
import { CompanionAvatar } from './CompanionAvatar';
import { CompanionSpeechBubble } from './CompanionSpeechBubble';
import { CompanionSettingsModal } from './CompanionSettingsModal';
import { Settings2 } from 'lucide-react';

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

  const bubbleTimeoutRef = useRef<any>(null);

  // Sync settings when userId changes
  useEffect(() => {
    setSettings(companionEngine.getSettings(userId));
  }, [userId]);

  // Handle external contextual triggers (e.g. Focus started, Vocab correct)
  useEffect(() => {
    if (contextMood) {
      setCurrentMood(contextMood);
    }

    if (customMessage) {
      triggerDialogue(customMessage);
    } else if (contextDialogueKey) {
      const msg = companionEngine.pickMessage(settings.mascotId, contextDialogueKey);
      triggerDialogue(msg);
    }
  }, [contextMood, contextDialogueKey, customMessage, settings.mascotId]);

  const profile = MASCOT_PROFILES[settings.mascotId] || MASCOT_PROFILES.lumi;

  const triggerDialogue = (text: string) => {
    if (!settings.enabled || settings.quietMode || !settings.showSpeechBubble) return;

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);

    setSpeechMessage(text);
    setShowBubble(true);

    if (settings.soundEnabled) {
      soundEngine.playPop();
    }

    // Auto dismiss bubble after 5.5s
    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 5500);
  };

  const handleAvatarClick = () => {
    // Interactive greeting on poke
    const greetings = [
      `Chào bạn! Mình là ${profile.name}. Hôm nay bạn học tốt chứ?`,
      'Mình luôn ở đây để đồng hành cùng bạn!',
      profile.quote,
      'Cần nghỉ ngơi một chút không? Cố gắng từng bước một nhé!'
    ];
    const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
    setCurrentMood('greeting');
    triggerDialogue(randomGreet);
  };

  const handleSaveSettings = (updated: Partial<CompanionSettings>) => {
    const saved = companionEngine.saveSettings(updated, userId);
    setSettings(saved);
  };

  if (!settings.enabled && mode === 'floating') {
    return null;
  }

  // Position class for floating mode
  const floatingPosClass = settings.position === 'bottom-left'
    ? 'bottom-20 left-4 sm:left-6'
    : 'bottom-20 right-4 sm:right-6';

  if (mode === 'embedded') {
    return (
      <div className={`relative flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs ${className}`}>
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
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
            {speechMessage || profile.quote}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tùy chỉnh bạn đồng hành"
        >
          <Settings2 className="w-4 h-4" />
        </button>

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
        {/* Floating Speech Bubble */}
        {showBubble && speechMessage && (
          <CompanionSpeechBubble
            message={speechMessage}
            profile={profile}
            onDismiss={() => setShowBubble(false)}
            className="mb-2.5"
          />
        )}

        {/* Mascot + Quick Settings Button */}
        <div className="relative group">
          <CompanionAvatar
            profile={profile}
            mood={currentMood}
            size={settings.size}
            equippedAccessoryId={settings.equippedAccessoryId}
            onClick={handleAvatarClick}
          />

          {/* Quick Settings Gear Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettingsModal(true);
            }}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white shadow-md border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Cài đặt Companion"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
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
