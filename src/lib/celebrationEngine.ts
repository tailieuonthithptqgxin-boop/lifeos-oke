/**
 * High-Performance Gen Z Delight & Micro-Celebration Engine
 * - Zero memory leaks: automatically purges temporary celebration DOM elements after 1.8s
 * - GPU-accelerated: utilizes translate3d, scale, and opacity exclusively
 * - Respects prefers-reduced-motion
 */

import { useState, useEffect, useRef } from 'react';

export function triggerDelightCelebration(originX?: number, originY?: number): void {
  if (typeof window === 'undefined') return;

  // Check prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const startX = originX ?? window.innerWidth / 2;
  const startY = originY ?? window.innerHeight / 2;

  // Create isolated container
  const container = document.createElement('div');
  container.className = 'fixed inset-0 pointer-events-none z-[9999] overflow-hidden';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e'];
  const emojis = ['✨', '🔥', '⭐', '🎉', '⚡', '💎'];
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.4 - 0.2);
    const distance = 80 + Math.random() * 120;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - (40 + Math.random() * 40); // upward bias
    const rot = (Math.random() - 0.5) * 480;
    const scale = 0.7 + Math.random() * 0.6;
    const isEmoji = i % 3 === 0;

    el.style.position = 'absolute';
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.pointerEvents = 'none';
    el.style.willChange = 'transform, opacity';
    el.style.transition = 'transform 1.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transform = 'translate3d(0, 0, 0) scale(0.2)';
    el.style.opacity = '1';

    if (isEmoji) {
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.fontSize = `${16 * scale}px`;
    } else {
      const size = 8 * scale;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
    }

    container.appendChild(el);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      el.style.transform = `translate3d(${destX}px, ${destY}px, 0) scale(${scale}) rotate(${rot}deg)`;
      el.style.opacity = '0';
    });
  }

  // Purge completely from DOM after animation completes
  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 1600);
}

/**
 * Smooth Animated Counter Hook
 * Smoothly interpolates from previous number to targetNumber in `duration` ms (default 400ms)
 */
export function useSmoothCounter(targetNumber: number, duration: number = 400): number {
  const [current, setCurrent] = useState<number>(targetNumber);
  const startRef = useRef<number>(targetNumber);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // If target didn't change or user prefers reduced motion, update instantly
    if (targetNumber === current) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(targetNumber);
      return;
    }

    startRef.current = current;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Apple cubic-bezier easeOut: 1 - Math.pow(1 - progress, 3)
      const ease = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startRef.current + (targetNumber - startRef.current) * ease);

      setCurrent(nextVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(targetNumber);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetNumber, duration]);

  return current;
}
