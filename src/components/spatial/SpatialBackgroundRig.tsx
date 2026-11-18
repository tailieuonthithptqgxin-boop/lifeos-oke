import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../lib/store';

// Interactive 3D particle field reacting subtly to cursor parallax
function SpatialField({ isDark }: { isDark: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const targetRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) - 0.5;
      const ny = (e.clientY / window.innerHeight) - 0.5;
      targetRotation.current = {
        x: ny * 0.25,
        y: nx * 0.35,
      };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    // Smooth interpolation towards cursor parallax
    pointsRef.current.rotation.x = THREE.MathUtils.damp(
      pointsRef.current.rotation.x,
      targetRotation.current.x,
      2.5,
      delta
    );
    pointsRef.current.rotation.y = THREE.MathUtils.damp(
      pointsRef.current.rotation.y,
      targetRotation.current.y,
      2.5,
      delta
    );
    // Subtle continuous cosmic drift
    pointsRef.current.rotation.z += delta * 0.015;
  });

  return (
    <group ref={pointsRef as any}>
      {/* Primary Emerald/Mint Spatial Dust */}
      <Sparkles
        count={55}
        scale={[18, 14, 12]}
        size={2.5}
        speed={0.3}
        color={isDark ? '#10B981' : '#059669'}
        opacity={isDark ? 0.45 : 0.25}
      />
      {/* Secondary Electric Violet Stardust */}
      <Sparkles
        count={30}
        scale={[20, 16, 14]}
        size={2.0}
        speed={0.2}
        color={isDark ? '#8B5CF6' : '#6D28D9'}
        opacity={isDark ? 0.35 : 0.18}
      />
    </group>
  );
}

export function SpatialBackgroundRig() {
  const { theme } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [enableWebGL, setEnableWebGL] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = mediaQuery.matches;
    setPrefersReducedMotion(reduced);

    // Defer WebGL Canvas initialization until after main thread settles, and skip on mobile to save GPU/battery
    const isDesktop = window.innerWidth >= 1024;
    const hasGoodHardware = (navigator.hardwareConcurrency || 4) >= 4;
    if (!reduced && isDesktop && hasGoodHardware) {
      const timer = setTimeout(() => {
        setEnableWebGL(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!mounted || prefersReducedMotion) return null;

  const isDark = theme === 'dark';

  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-1000"
      style={{
        opacity: isDark ? 0.75 : 0.45
      }}
    >
      {/* Ambient Gradient Mesh Lighting (Zero-GPU-overhead fallback on all devices) */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.12), transparent 70%), radial-gradient(ellipse 60% 50% at 80% 120%, rgba(139, 92, 246, 0.08), transparent 70%), #07070C'
            : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16, 185, 129, 0.08), transparent 70%), radial-gradient(ellipse 60% 50% at 80% 120%, rgba(139, 92, 246, 0.05), transparent 70%), #F8FAFC'
        }}
      />

      {enableWebGL && (
        <Canvas
          {...({
            dpr: [1, 1.5],
            camera: { position: [0, 0, 7], fov: 60 },
            gl: { antialias: false, alpha: true, powerPreference: 'low-power' },
            style: { pointerEvents: 'none' },
            events: () => ({} as any)
          } as any)}
        >
          <AdaptiveDpr pixelated />
          <SpatialField isDark={isDark} />
        </Canvas>
      )}
    </div>
  );
}
export default SpatialBackgroundRig;
