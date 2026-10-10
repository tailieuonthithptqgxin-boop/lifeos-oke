import React from 'react';
import { 
  CompanionMood, 
  CompanionProfile, 
  COMPANION_ACCESSORIES 
} from '../../lib/companionEngine';
import { Sparkles, Heart, Zap, CheckCircle2 } from 'lucide-react';
import { LiveMascotCharacter } from './LiveMascotCharacter';

interface CompanionAvatarProps {
  profile: CompanionProfile;
  mood: CompanionMood;
  size?: 'compact' | 'normal' | 'prominent';
  equippedAccessoryId?: string;
  onClick?: () => void;
  className?: string;
  useLiveVector?: boolean;
}

export const CompanionAvatar: React.FC<CompanionAvatarProps> = ({
  profile,
  mood,
  size = 'normal',
  equippedAccessoryId = 'none',
  onClick,
  className = '',
  useLiveVector = true
}) => {
  const accessory = COMPANION_ACCESSORIES.find(a => a.id === equippedAccessoryId);

  // If useLiveVector is enabled, render the full LiveMascotCharacter for any mascot
  if (useLiveVector) {
    return (
      <div 
        onClick={onClick}
        className={`relative select-none flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
        style={{ touchAction: 'manipulation' }}
      >
        <LiveMascotCharacter 
          mood={mood} 
          mascotId={profile.id}
          size={size} 
        />

        {/* Equipped Accessory Overlay */}
        {accessory && accessory.id !== 'none' && (
          <span 
            className="absolute -top-1 -right-1 text-base sm:text-xl drop-shadow-md animate-in zoom-in duration-200 z-10"
            title={accessory.name}
          >
            {accessory.icon}
          </span>
        )}

        {/* Emotion Micro Badges */}
        {mood === 'celebrate' && (
          <div className="absolute -top-1 -left-1 p-1 bg-amber-400 text-amber-950 rounded-full shadow-md animate-bounce z-10">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        )}
        {mood === 'encourage' && (
          <div className="absolute -top-1 -left-1 p-1 bg-rose-500 text-white rounded-full shadow-md animate-pulse z-10">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
        )}
        {mood === 'focus' && (
          <div className="absolute -bottom-1 -right-1 p-1 bg-blue-500 text-white rounded-full shadow-md z-10">
            <Zap className="w-3 h-3" />
          </div>
        )}
        {mood === 'achievement' && (
          <div className="absolute -top-1 -left-1 p-1 bg-emerald-500 text-white rounded-full shadow-md animate-ping z-10">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    );
  }

  // Size styling dimensions for other mascots
  const sizeClasses = {
    compact: 'w-12 h-12 text-2xl',
    normal: 'w-20 h-20 text-4xl',
    prominent: 'w-28 h-28 text-5xl'
  }[size];

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
        className={`relative rounded-3xl p-3 flex items-center justify-center shadow-lg border border-white/40 dark:border-white/10 backdrop-blur-md transition-all duration-300 ${sizeClasses} ${moodStyle}`}
        style={{
          background: mood === 'focus' 
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))'
            : `linear-gradient(135deg, ${profile.themeColor}22, ${profile.themeColor}11)`,
          borderColor: `${profile.themeColor}44`
        }}
      >
        <div className="relative flex items-center justify-center">
          <span>{profile.avatar}</span>

          {accessory && accessory.id !== 'none' && (
            <span 
              className="absolute -top-3.5 -right-2 text-sm sm:text-base drop-shadow-md animate-in zoom-in duration-200"
              title={accessory.name}
            >
              {accessory.icon}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
export default CompanionAvatar;
