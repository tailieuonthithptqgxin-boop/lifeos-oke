import React, { useState, useEffect } from 'react';
import { CompanionMood, CompanionMascotId } from '../../lib/companionEngine';
import { Sparkles, Star } from 'lucide-react';

export interface LiveMascotCharacterProps {
  mood: CompanionMood;
  mascotId?: CompanionMascotId;
  size?: 'compact' | 'normal' | 'prominent';
  onClick?: () => void;
  className?: string;
  showAura?: boolean;
}

export const LiveMascotCharacter: React.FC<LiveMascotCharacterProps> = ({
  mood = 'idle',
  mascotId = 'lumi',
  size = 'normal',
  onClick,
  className = '',
  showAura = true
}) => {
  // Normalize character id
  const activeChar = (mascotId === 'kitsu' ? 'fox' : mascotId === 'nova' ? 'lumi' : mascotId) as CompanionMascotId;

  // Continuous micro-animation states
  const [blink, setBlink] = useState(false);
  const [doubleBlink, setDoubleBlink] = useState(false);
  const [eyeGaze, setEyeGaze] = useState<'center' | 'left' | 'right' | 'up'>('center');
  const [headTilt, setHeadTilt] = useState<number>(0); // degrees
  const [bodySway, setBodySway] = useState<number>(0); // px
  const [isWaving, setIsWaving] = useState(false);

  // Natural randomized Blinking interval (every 3.2s - 5.8s with realistic double-blinks)
  useEffect(() => {
    let timeout: any;
    const scheduleNextBlink = () => {
      const delay = Math.random() * 2600 + 3200;
      timeout = setTimeout(() => {
        setBlink(true);
        const isDouble = Math.random() > 0.75;
        setTimeout(() => {
          setBlink(false);
          if (isDouble) {
            setTimeout(() => {
              setDoubleBlink(true);
              setTimeout(() => setDoubleBlink(false), 140);
            }, 120);
          }
        }, 160);
        scheduleNextBlink();
      }, delay);
    };

    scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Natural randomized Eye Gaze Shift (looking left/right/up every 4s - 8s)
  useEffect(() => {
    let gazeTimeout: any;
    const scheduleNextGaze = () => {
      const delay = Math.random() * 4000 + 4000;
      gazeTimeout = setTimeout(() => {
        if (mood === 'idle' || mood === 'resting') {
          const gazes: ('center' | 'left' | 'right' | 'up')[] = ['center', 'center', 'left', 'right', 'up'];
          const nextGaze = gazes[Math.floor(Math.random() * gazes.length)];
          setEyeGaze(nextGaze);
        }
        scheduleNextGaze();
      }, delay);
    };

    scheduleNextGaze();
    return () => clearTimeout(gazeTimeout);
  }, [mood]);

  // Natural randomized Head & Body Micro-Tilt (every 3s - 6s)
  useEffect(() => {
    let tiltTimeout: any;
    const scheduleNextTilt = () => {
      const delay = Math.random() * 3000 + 3500;
      tiltTimeout = setTimeout(() => {
        if (mood === 'idle') {
          const tilts = [-3, 0, 3, -1.5, 2];
          setHeadTilt(tilts[Math.floor(Math.random() * tilts.length)]);
          setBodySway(Math.random() > 0.5 ? 1 : -1);
        }
        scheduleNextTilt();
      }, delay);
    };

    scheduleNextTilt();
    return () => clearTimeout(tiltTimeout);
  }, [mood]);

  // Spontaneous random idle wave (every 25s - 45s)
  useEffect(() => {
    let waveTimeout: any;
    const scheduleNextWave = () => {
      const delay = Math.random() * 20000 + 25000;
      waveTimeout = setTimeout(() => {
        if (mood === 'idle') {
          setIsWaving(true);
          setTimeout(() => setIsWaving(false), 1800);
        }
        scheduleNextWave();
      }, delay);
    };

    scheduleNextWave();
    return () => clearTimeout(waveTimeout);
  }, [mood]);

  // Size styling dimensions
  const sizeConfig = {
    compact: { width: 72, height: 86, container: 'w-[72px] h-[86px]' },
    normal: { width: 110, height: 132, container: 'w-[110px] h-[132px]' },
    prominent: { width: 148, height: 178, container: 'w-[148px] h-[178px]' }
  }[size];

  // Gaze offset for eyes in SVG
  const getGazeOffset = () => {
    if (mood === 'thinking') return { x: 2, y: -2 };
    switch (eyeGaze) {
      case 'left': return { x: -2.5, y: 0 };
      case 'right': return { x: 2.5, y: 0 };
      case 'up': return { x: 0, y: -2 };
      default: return { x: 0, y: 0 };
    }
  };

  const gaze = getGazeOffset();
  const isEyeClosed = blink || doubleBlink || mood === 'celebrate' || mood === 'resting';

  // Dynamic CSS animation classes depending on mood
  const getMoodAnimClass = () => {
    switch (mood) {
      case 'celebrate':
        return 'animate-bounce';
      case 'achievement':
        return 'animate-bounce scale-105';
      case 'motivate':
        return 'scale-110';
      case 'greeting':
        return 'animate-pulse';
      case 'focus':
        return 'opacity-95';
      default:
        return '';
    }
  };

  const getAuraColor = () => {
    switch (activeChar) {
      case 'bunny': return 'rgba(16, 185, 129, 0.35)';
      case 'cat': return 'rgba(99, 102, 241, 0.35)';
      case 'bear': return 'rgba(217, 119, 6, 0.35)';
      case 'fox': return 'rgba(234, 88, 12, 0.35)';
      case 'panda': return 'rgba(13, 148, 136, 0.35)';
      default: return 'rgba(249, 115, 22, 0.35)';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative select-none flex items-center justify-center cursor-pointer transition-all duration-300 ${sizeConfig.container} ${getMoodAnimClass()} ${className}`}
      style={{
        transform: `rotate(${headTilt}deg) translateX(${bodySway}px)`,
        touchAction: 'manipulation'
      }}
      title={`AI Companion — Chạm vào để trò chuyện!`}
    >
      {/* 1. Dynamic Ambient Aura Glow */}
      {showAura && (
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none"
          style={{
            background: mood === 'focus' 
              ? 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(245, 158, 11, 0.15) 70%, transparent 100%)'
              : mood === 'celebrate' || mood === 'achievement'
              ? `radial-gradient(circle, ${getAuraColor()} 0%, rgba(249, 115, 22, 0.25) 70%, transparent 100%)`
              : `radial-gradient(circle, ${getAuraColor()} 0%, transparent 70%)`,
            transform: mood === 'celebrate' || mood === 'achievement' ? 'scale(1.4)' : 'scale(1.15)',
            opacity: mood === 'resting' ? 0.3 : 0.85
          }}
        />
      )}

      {/* 2. Sparkles explosion when Celebrate / Happy */}
      {(mood === 'celebrate' || mood === 'achievement') && (
        <>
          <div className="absolute -top-3 -left-2 text-amber-400 animate-ping pointer-events-none">
            <Sparkles className="w-5 h-5 drop-shadow-sm" />
          </div>
          <div className="absolute -top-4 -right-2 text-yellow-300 animate-bounce pointer-events-none">
            <Star className="w-4 h-4 fill-yellow-300" />
          </div>
          <div className="absolute -bottom-1 -right-3 text-amber-500 animate-pulse pointer-events-none">
            <Sparkles className="w-4 h-4" />
          </div>
        </>
      )}

      {/* 3. Pure Vector SVG Character */}
      <svg
        viewBox="0 0 160 190"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md transition-transform duration-300"
      >
        <defs>
          {/* Global Breathing & Sway Animation */}
          <style>{`
            @keyframes companionBreath {
              0%, 100% { transform: scale(1, 1) translateY(0px); }
              50% { transform: scale(1.025, 0.985) translateY(-2px); }
            }
            @keyframes earTwitch {
              0%, 90%, 100% { transform: rotate(0deg); }
              93% { transform: rotate(-5deg); }
              96% { transform: rotate(4deg); }
            }
            @keyframes tailSway {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(8deg); }
            }
            @keyframes floatProp {
              0%, 100% { transform: translateY(0px) scale(1); }
              50% { transform: translateY(-3px) scale(1.04); }
            }
            .companion-breathing-group {
              transform-origin: 80px 170px;
              animation: companionBreath 3.2s ease-in-out infinite;
            }
            .ear-twitch-left {
              transform-origin: 50px 50px;
              animation: earTwitch 4s ease-in-out infinite;
            }
            .ear-twitch-right {
              transform-origin: 110px 50px;
              animation: earTwitch 4s ease-in-out infinite 0.5s;
            }
            .tail-sway {
              transform-origin: 120px 150px;
              animation: tailSway 2.8s ease-in-out infinite;
            }
            .prop-float {
              transform-origin: 80px 115px;
              animation: floatProp 2.8s ease-in-out infinite;
            }
          `}</style>

          {/* Gradients */}
          {/* Lumi Peach Body */}
          <radialGradient id="gradLumiBody" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="45%" stopColor="#FDBA74" />
            <stop offset="85%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#F97316" />
          </radialGradient>

          {/* Bunny Ivory/Mint Body */}
          <radialGradient id="gradBunnyBody" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#ECFDF5" />
            <stop offset="90%" stopColor="#D1FAE5" />
            <stop offset="100%" stopColor="#A7F3D0" />
          </radialGradient>

          {/* Cat Lavender Body */}
          <radialGradient id="gradCatBody" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#EEF2FF" />
            <stop offset="50%" stopColor="#E0E7FF" />
            <stop offset="85%" stopColor="#C7D2FE" />
            <stop offset="100%" stopColor="#818CF8" />
          </radialGradient>

          {/* Bear Honey Bronze Body */}
          <radialGradient id="gradBearBody" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="45%" stopColor="#FDE68A" />
            <stop offset="85%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          {/* Fox Auburn Orange Body */}
          <radialGradient id="gradFoxBody" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFEDD5" />
            <stop offset="45%" stopColor="#FB923C" />
            <stop offset="85%" stopColor="#EA580C" />
            <stop offset="100%" stopColor="#C2410C" />
          </radialGradient>

          {/* Panda Body */}
          <radialGradient id="gradPandaBody" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>

          {/* Golden Glow Grad */}
          <radialGradient id="gradGold" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EAB308" />
          </radialGradient>

          {/* Blush Grad */}
          <radialGradient id="gradBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="companion-breathing-group">
          {/* ========================================================
              CHARACTER SPECIFIC SVG BODIES & ACCESSORIES
             ======================================================== */}

          {/* 1. BUNNY (Thỏ Ngọc) */}
          {activeChar === 'bunny' && (
            <>
              {/* Bunny Long Ears */}
              <g className="ear-twitch-left">
                <path d="M54 50 C40 10 50 -8 62 -4 C74 0 68 28 64 50 Z" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="1.5" />
                <path d="M56 42 C48 14 54 2 60 4 C66 8 63 26 60 42 Z" fill="#FBCFE8" />
              </g>
              <g className="ear-twitch-right">
                <path d="M106 50 C120 10 110 -8 98 -4 C86 0 92 28 96 50 Z" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="1.5" />
                <path d="M104 42 C112 14 106 2 100 4 C94 8 97 26 100 42 Z" fill="#FBCFE8" />
              </g>
              {/* Fluffy Feet */}
              <ellipse cx="58" cy="165" rx="15" ry="10" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="1.5" />
              <ellipse cx="102" cy="165" rx="15" ry="10" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="1.5" />
              {/* Body */}
              <path d="M80 44 C112 44 130 66 130 108 C130 144 114 164 80 164 C46 164 30 144 30 108 C30 66 48 44 80 44 Z" fill="url(#gradBunnyBody)" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.4" />
              {/* Tummy highlight */}
              <ellipse cx="80" cy="120" rx="30" ry="26" fill="#FFFFFF" opacity="0.9" />
              {/* Lucky Carrot Prop */}
              <g className="prop-float">
                <path d="M72 102 L88 102 L80 132 Z" fill="#F97316" stroke="#EA580C" strokeWidth="1" />
                <path d="M78 100 Q80 92 84 94 Q80 98 80 102" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M75 110 H85" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                <path d="M77 118 H83" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
              </g>
            </>
          )}

          {/* 2. CAT (Miu) */}
          {activeChar === 'cat' && (
            <>
              {/* Kitty Tail */}
              <g className="tail-sway">
                <path d="M125 140 C145 130 152 105 142 98 C134 94 130 102 135 112 C140 122 130 134 118 142" stroke="#818CF8" strokeWidth="6" strokeLinecap="round" fill="none" />
              </g>
              {/* Kitty Ears */}
              <polygon points="44,52 32,24 62,38" fill="url(#gradCatBody)" stroke="#818CF8" strokeWidth="1.5" />
              <polygon points="44,48 37,30 56,40" fill="#FDA4AF" />
              <polygon points="116,52 128,24 98,38" fill="url(#gradCatBody)" stroke="#818CF8" strokeWidth="1.5" />
              <polygon points="116,48 123,30 104,40" fill="#FDA4AF" />
              {/* Paws */}
              <ellipse cx="58" cy="165" rx="14" ry="10" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
              <ellipse cx="102" cy="165" rx="14" ry="10" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
              {/* Body */}
              <path d="M80 44 C112 44 130 66 130 108 C130 144 114 164 80 164 C46 164 30 144 30 108 C30 66 48 44 80 44 Z" fill="url(#gradCatBody)" stroke="#6366F1" strokeWidth="1.2" strokeOpacity="0.3" />
              {/* Bell Collar */}
              <path d="M50 102 Q80 112 110 102" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <g className="prop-float">
                <circle cx="80" cy="112" r="6" fill="url(#gradGold)" stroke="#D97706" strokeWidth="1" />
                <circle cx="80" cy="114" r="1.5" fill="#78350F" />
              </g>
              {/* Whiskers */}
              <line x1="38" y1="88" x2="22" y2="85" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="38" y1="92" x2="20" y2="93" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="122" y1="88" x2="138" y2="85" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="122" y1="92" x2="140" y2="93" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}

          {/* 3. BEAR (Kuma) */}
          {activeChar === 'bear' && (
            <>
              {/* Round Bear Ears */}
              <circle cx="44" cy="40" r="15" fill="url(#gradBearBody)" stroke="#D97706" strokeWidth="1.5" />
              <circle cx="44" cy="40" r="9" fill="#B45309" opacity="0.4" />
              <circle cx="116" cy="40" r="15" fill="url(#gradBearBody)" stroke="#D97706" strokeWidth="1.5" />
              <circle cx="116" cy="40" r="9" fill="#B45309" opacity="0.4" />
              {/* Feet */}
              <ellipse cx="58" cy="165" rx="15" ry="10" fill="#D97706" opacity="0.9" />
              <ellipse cx="102" cy="165" rx="15" ry="10" fill="#D97706" opacity="0.9" />
              {/* Chubby Body */}
              <path d="M80 44 C114 44 134 66 134 108 C134 144 116 164 80 164 C44 164 26 144 26 108 C26 66 46 44 80 44 Z" fill="url(#gradBearBody)" stroke="#B45309" strokeWidth="1.2" strokeOpacity="0.4" />
              {/* Snout Area */}
              <ellipse cx="80" cy="94" rx="18" ry="14" fill="#FEF3C7" />
              <ellipse cx="80" cy="88" rx="4.5" ry="3.5" fill="#78350F" />
              {/* Honey Pot Prop */}
              <g className="prop-float">
                <path d="M70 114 C70 108 90 108 90 114 L92 134 C92 138 68 138 68 134 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
                <ellipse cx="80" cy="114" rx="10" ry="3" fill="#FDE68A" />
                <path d="M76 114 Q78 122 84 122" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            </>
          )}

          {/* 4. FOX (Kitsu) */}
          {activeChar === 'fox' && (
            <>
              {/* Fox Pointy Ears */}
              <polygon points="40,54 28,18 64,36" fill="url(#gradFoxBody)" stroke="#C2410C" strokeWidth="1.5" />
              <polygon points="40,50 33,26 56,38" fill="#FFFFFF" />
              <polygon points="120,54 132,18 96,36" fill="url(#gradFoxBody)" stroke="#C2410C" strokeWidth="1.5" />
              <polygon points="120,50 127,26 104,38" fill="#FFFFFF" />
              {/* Paws */}
              <ellipse cx="58" cy="165" rx="14" ry="10" fill="#EA580C" opacity="0.9" />
              <ellipse cx="102" cy="165" rx="14" ry="10" fill="#EA580C" opacity="0.9" />
              {/* Body */}
              <path d="M80 44 C112 44 130 66 130 108 C130 144 114 164 80 164 C46 164 30 144 30 108 C30 66 48 44 80 44 Z" fill="url(#gradFoxBody)" stroke="#EA580C" strokeWidth="1.2" strokeOpacity="0.3" />
              {/* White Cheek Fluff */}
              <path d="M34 94 Q48 98 44 108 C38 106 32 100 34 94 Z" fill="#FFFFFF" />
              <path d="M126 94 Q112 98 116 108 C122 106 128 100 126 94 Z" fill="#FFFFFF" />
              {/* Book Prop */}
              <g className="prop-float">
                <rect x="68" y="112" width="24" height="18" rx="2" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" />
                <path d="M80 112 V130" stroke="#FFFFFF" strokeWidth="1" />
                <path d="M72 116 H78 M72 120 H77 M82 116 H88 M82 120 H87" stroke="#DBEAFE" strokeWidth="1" strokeLinecap="round" />
              </g>
            </>
          )}

          {/* 5. PANDA (Bao) */}
          {activeChar === 'panda' && (
            <>
              {/* Round Black Panda Ears */}
              <circle cx="44" cy="40" r="14" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
              <circle cx="116" cy="40" r="14" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
              {/* Dark Paws */}
              <ellipse cx="58" cy="165" rx="14" ry="10" fill="#1E293B" />
              <ellipse cx="102" cy="165" rx="14" ry="10" fill="#1E293B" />
              {/* White Body */}
              <path d="M80 44 C112 44 130 66 130 108 C130 144 114 164 80 164 C46 164 30 144 30 108 C30 66 48 44 80 44 Z" fill="url(#gradPandaBody)" stroke="#94A3B8" strokeWidth="1.2" />
              {/* Signature Panda Eye Patches */}
              <ellipse cx="58" cy="80" rx="10" ry="12" fill="#1E293B" transform="rotate(-15 58 80)" />
              <ellipse cx="102" cy="80" rx="10" ry="12" fill="#1E293B" transform="rotate(15 102 80)" />
              {/* Cute Panda Nose */}
              <ellipse cx="80" cy="90" rx="4" ry="3" fill="#1E293B" />
              {/* Bamboo Prop */}
              <g className="prop-float">
                <line x1="72" y1="135" x2="88" y2="108" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                <ellipse cx="84" cy="112" rx="6" ry="2.5" fill="#34D399" transform="rotate(25 84 112)" />
                <ellipse cx="76" cy="125" rx="6" ry="2.5" fill="#34D399" transform="rotate(-25 76 125)" />
              </g>
            </>
          )}

          {/* 6. LUMI (Bé Sao Nhỏ) - Default */}
          {(activeChar === 'lumi' || (!['bunny', 'cat', 'bear', 'fox', 'panda'].includes(activeChar))) && (
            <>
              {/* Wings */}
              <path d="M32 88 C18 82 10 92 14 104 C18 112 28 114 34 106 Z" fill="#FFEDD5" stroke="#FDBA74" strokeWidth="1.5" />
              <path d="M128 88 C142 82 150 92 146 104 C142 112 132 114 126 106 Z" fill="#FFEDD5" stroke="#FDBA74" strokeWidth="1.5" />
              {/* Feet */}
              <ellipse cx="60" cy="165" rx="14" ry="10" fill="#FB923C" opacity="0.9" />
              <ellipse cx="100" cy="165" rx="14" ry="10" fill="#FB923C" opacity="0.9" />
              {/* Body */}
              <path d="M80 40 C112 40 132 64 132 106 C132 144 116 164 80 164 C44 164 28 144 28 106 C28 64 48 40 80 40 Z" fill="url(#gradLumiBody)" stroke="#EA580C" strokeWidth="1.5" strokeOpacity="0.25" />
              {/* Antennae */}
              <path d="M62 46 C56 34 50 26 44 18" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" />
              <circle cx="44" cy="18" r="7" fill="url(#gradGold)" />
              <circle cx="42" cy="16" r="2.5" fill="#FFFFFF" opacity="0.8" />
              <path d="M98 46 C104 34 110 26 116 18" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" />
              <circle cx="116" cy="18" r="7" fill="url(#gradGold)" />
              <circle cx="114" cy="16" r="2.5" fill="#FFFFFF" opacity="0.8" />
              {/* Held Star Prop */}
              <g className="prop-float">
                <path d="M80 97 L84.5 107 L95.5 108 L87 115 L90 126 L80 120 L70 126 L73 115 L64.5 108 L75.5 107 Z" fill="url(#gradGold)" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="78" cy="106" r="2" fill="#FFFFFF" opacity="0.75" />
              </g>
            </>
          )}

          {/* ========================================================
              COMMON LIVING FACE FEATURES (Eyes, Cheeks, Mouth, Hands)
             ======================================================== */}
          {/* Cheeks Blush */}
          <ellipse cx="50" cy="88" rx="8" ry="4.5" fill="url(#gradBlush)" />
          <ellipse cx="110" cy="88" rx="8" ry="4.5" fill="url(#gradBlush)" />

          {/* EYES */}
          {isEyeClosed ? (
            /* Joyful curved happy/closed eyes (^‿^) */
            <g stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M54 80 Q59 74 64 80" />
              <path d="M96 80 Q101 74 106 80" />
            </g>
          ) : (
            /* Shiny Round Beady Black Eyes with Gaze Shift & Catchlights */
            <g>
              {/* Left Eye */}
              <circle cx={59 + gaze.x} cy={79 + gaze.y} r={activeChar === 'panda' ? 4 : 5} fill={activeChar === 'panda' ? '#FFFFFF' : '#0F172A'} />
              <circle cx={57.5 + gaze.x} cy={77 + gaze.y} r="1.8" fill={activeChar === 'panda' ? '#0F172A' : '#FFFFFF'} />
              <circle cx={61 + gaze.x} cy={80.5 + gaze.y} r="0.9" fill="#FFFFFF" opacity="0.7" />

              {/* Right Eye */}
              <circle cx={101 + gaze.x} cy={79 + gaze.y} r={activeChar === 'panda' ? 4 : 5} fill={activeChar === 'panda' ? '#FFFFFF' : '#0F172A'} />
              <circle cx={99.5 + gaze.x} cy={77 + gaze.y} r="1.8" fill={activeChar === 'panda' ? '#0F172A' : '#FFFFFF'} />
              <circle cx={103 + gaze.x} cy={80.5 + gaze.y} r="0.9" fill="#FFFFFF" opacity="0.7" />
            </g>
          )}

          {/* MOUTH */}
          {mood === 'thinking' ? (
            <ellipse cx="80" cy="91" rx="3" ry="3.5" fill="#0F172A" />
          ) : mood === 'celebrate' || mood === 'motivate' ? (
            <g>
              <path d="M72 88 Q80 98 88 88 Z" fill="#F43F5E" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
              <path d="M75 89 Q80 94 85 89" fill="#FDA4AF" />
            </g>
          ) : (
            <path d="M73 88 Q80 94 87 88" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          )}

          {/* ARMS / PAWS */}
          {/* Left Paw */}
          <path
            d={isWaving ? "M46 102 C38 90 40 76 52 74 C58 74 62 82 56 96 Z" : "M44 104 C40 114 56 122 68 116 C72 114 74 108 68 104 C60 100 50 100 44 104 Z"}
            fill={activeChar === 'panda' ? '#1E293B' : activeChar === 'bunny' ? '#FFFFFF' : activeChar === 'cat' ? '#C7D2FE' : '#FB923C'}
            stroke={activeChar === 'panda' ? '#0F172A' : activeChar === 'bunny' ? '#A7F3D0' : '#FB923C'}
            strokeWidth="1.2"
          />

          {/* Right Paw */}
          <path
            d="M116 104 C120 114 104 122 92 116 C88 114 86 108 92 104 C100 100 110 100 116 104 Z"
            fill={activeChar === 'panda' ? '#1E293B' : activeChar === 'bunny' ? '#FFFFFF' : activeChar === 'cat' ? '#C7D2FE' : '#FB923C'}
            stroke={activeChar === 'panda' ? '#0F172A' : activeChar === 'bunny' ? '#A7F3D0' : '#FB923C'}
            strokeWidth="1.2"
          />
        </g>
      </svg>
    </div>
  );
};

export default LiveMascotCharacter;
