import React, { useState, useEffect } from 'react';
import { 
  CompanionMood, 
  CompanionProfile, 
  CompanionSettings, 
  MASCOT_PROFILES, 
  COMPANION_ACCESSORIES 
} from '../../lib/companionEngine';
import { Sparkles, Heart, Zap, CheckCircle2 } from 'lucide-react';

interface CompanionAvatarProps {
  profile: CompanionProfile;
  mood: CompanionMood;
  size?: 'compact' | 'normal' | 'prominent';
  equippedAccessoryId?: string;
  onClick?: () => void;
  className?: string;
}

export const CompanionAvatar: React.FC<CompanionAvatarProps> = ({
  profile,
  mood,
  size = 'normal',
  equippedAccessoryId = 'none',
  onClick,
  className = ''
}) => {
  const [blink, setBlink] = useState(false);
  const [bounce, setBounce] = useState(false);

  // Natural blinking interval (every 3.5 - 6s)
  useEffect(() => {
    let timeout: any;
    const triggerBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
      const nextTime = Math.random() * 2500 + 3500;
      timeout = setTimeout(triggerBlink, nextTime);
    };
    timeout = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Micro bounce on mood change
  useEffect(() => {
    setBounce(true);
    const t = setTimeout(() => setBounce(false), 600);
    return () => clearTimeout(t);
  }, [mood]);

  const accessory = COMPANION_ACCESSORIES.find(a => a.id === equippedAccessoryId);

  // Size styling dimensions
  const sizeClasses = {
    compact: 'w-12 h-12 text-2xl',
    normal: 'w-20 h-20 text-4xl',
    prominent: 'w-28 h-28 text-5xl'
  }[size];

  // Mood specific animation & aura colors
  const moodStyle = {
    greeting: 'animate-wiggle',
    focus: 'opacity-90 scale-95',
    idle: 'animate-float-subtle',
    thinking: 'animate-pulse',
    celebrate: 'animate-bounce',
    encourage: 'animate-tilt',
    resting: 'opacity-80 scale-95',
    achievement: 'animate-spin-slow'
  }[mood] || 'animate-float-subtle';

  return (
    <div 
      onClick={onClick}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Background soft aura glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl transition-all duration-700 pointer-events-none"
        style={{ 
          backgroundColor: mood === 'focus' ? 'rgba(59, 130, 246, 0.2)' : profile.glowColor,
          transform: mood === 'celebrate' || mood === 'achievement' ? 'scale(1.4)' : 'scale(1)'
        }}
      />

      {/* Main mascot circular container */}
      <div 
        className={`relative rounded-3xl p-3 flex items-center justify-center shadow-lg border border-white/40 dark:border-white/10 backdrop-blur-md transition-all duration-300 ${sizeClasses} ${moodStyle} ${bounce ? 'scale-110' : ''}`}
        style={{
          background: mood === 'focus' 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))'
            : `linear-gradient(135deg, ${profile.themeColor}22, ${profile.themeColor}11)`,
          borderColor: `${profile.themeColor}44`
        }}
      >
        {/* Mascot Avatar Icon / Face */}
        <div className="relative flex items-center justify-center">
          <span className={`transform transition-transform duration-150 ${blink ? 'scale-y-20' : 'scale-y-100'}`}>
            {profile.avatar}
          </span>

          {/* Equipped Accessory Overlay */}
          {accessory && accessory.id !== 'none' && (
            <span 
              className="absolute -top-3.5 -right-2 text-sm sm:text-base drop-shadow-md animate-in zoom-in duration-200"
              title={accessory.name}
            >
              {accessory.icon}
            </span>
          )}
        </div>

        {/* Emotion Micro Badges */}
        {mood === 'celebrate' && (
          <div className="absolute -top-1 -right-1 p-1 bg-amber-400 text-amber-950 rounded-full shadow-md animate-bounce">
            <Sparkles className="w-3 h-3" />
          </div>
        )}
        {mood === 'encourage' && (
          <div className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full shadow-md animate-pulse">
            <Heart className="w-3 h-3 fill-white" />
          </div>
        )}
        {mood === 'focus' && (
          <div className="absolute -bottom-1 -right-1 p-1 bg-blue-500 text-white rounded-full shadow-md">
            <Zap className="w-3 h-3" />
          </div>
        )}
        {mood === 'achievement' && (
          <div className="absolute -top-1 -left-1 p-1 bg-emerald-500 text-white rounded-full shadow-md animate-ping">
            <CheckCircle2 className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
};
