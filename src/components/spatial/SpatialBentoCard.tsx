import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface SpatialBentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  depth?: number;            // Max tilt degree (default: 10)
  glareColor?: string;       // Custom spotlight highlight
  spotlightBorder?: boolean; // Enable cursor-tracking neon border
  disabled?: boolean;
}

// Helper to separate grid/flex positioning classes to outer perspective container
function partitionClasses(className: string = '') {
  const tokens = className.split(/\s+/).filter(Boolean);
  const layoutTokens: string[] = [];
  const contentTokens: string[] = [];
  const cardTokens: string[] = [];

  const layoutPrefixes = [
    'col-span-', 'row-span-', 'order-', 'col-start-', 'col-end-',
    'row-start-', 'row-end-', 'justify-self-', 'self-'
  ];

  const contentPrefixes = [
    'flex', 'inline-flex', 'grid', 'inline-grid', 'flex-', 'items-',
    'justify-', 'content-', 'space-y-', 'space-x-', 'gap-', 'text-'
  ];

  for (const token of tokens) {
    const base = token.includes(':') ? token.split(':').pop()! : token;

    if (layoutPrefixes.some(p => base.startsWith(p) || base === 'order-none' || base === 'order-first' || base === 'order-last')) {
      layoutTokens.push(token);
    } else if (contentPrefixes.some(p => base === p || base.startsWith(p))) {
      contentTokens.push(token);
    } else {
      cardTokens.push(token);
    }
  }

  return {
    layoutClass: layoutTokens.join(' '),
    contentClass: contentTokens.join(' '),
    cardClass: cardTokens.join(' ')
  };
}

export const SpatialBentoCard: React.FC<SpatialBentoCardProps> = ({
  children,
  className = '',
  containerClassName = '',
  depth = 0,
  glareColor = 'rgba(16, 185, 129, 0.18)', // Neon Emerald glare
  spotlightBorder = true,
  disabled = false,
  id,
  style: customStyle,
  ...rest
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const { layoutClass, contentClass, cardClass } = partitionClasses(className);

  // Check accessibility prefers-reduced-motion and touch device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
      const handleMotionChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleMotionChange);

      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    }
  }, []);

  const isInteractiveDisabled = disabled || isReducedMotion || isTouchDevice;

  // Raw cursor position values normalized from -0.5 to 0.5
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spot coordinate relative to card in pixels
  const spotX = useMotionValue(0);
  const spotY = useMotionValue(0);

  // Spring physics configuration for tactile responsiveness
  const springConfig = { stiffness: 280, damping: 24, mass: 0.8 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // 3D Rotations (Smooth & bounded to prevent distortion)
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [depth, -depth]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-depth, depth]);

  // Spotlight gradient transform (Unconditionally declared at top-level)
  const spotlightBackground = useTransform(
    [spotX, spotY],
    ([x, y]) => `radial-gradient(380px circle at ${x}px ${y}px, ${glareColor}, transparent 70%)`
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isInteractiveDisabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    
    // Coordinates inside card
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    spotX.set(currentX);
    spotY.set(currentY);

    // Normalized from -0.5 to 0.5
    mouseX.set((currentX / rect.width) - 0.5);
    mouseY.set((currentY / rect.height) - 0.5);
  }, [isInteractiveDisabled, mouseX, mouseY, spotX, spotY]);

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div 
      id={id}
      className={`w-full min-w-0 ${layoutClass} ${containerClassName}`.trim()}
      style={{ perspective: '1200px', ...customStyle }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: isInteractiveDisabled ? 0 : rotateX,
          rotateY: isInteractiveDisabled ? 0 : rotateY,
        }}
        className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-white/[0.08] p-5 sm:p-6 transition-colors shadow-xs hover:shadow-xl hover:border-emerald-500/40 w-full h-full ${cardClass}`.trim()}
        {...(rest as any)}
      >
        {/* Cursor Spotlight Layer (Border & Surface Glow) */}
        {spotlightBorder && !isInteractiveDisabled && (
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
            style={{
              background: spotlightBackground,
            }}
          />
        )}

        {/* Ambient Top Rim Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent dark:via-emerald-400/30" />

        {/* Content Container (2D Flat hit-testing plane with full interactive clickability) */}
        <div 
          className={`relative z-20 w-full h-full pointer-events-auto ${contentClass}`.trim()}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};
export default SpatialBentoCard;
