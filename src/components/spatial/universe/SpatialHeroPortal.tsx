import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ThemePalette } from './SpatialMaterials';

interface SpatialHeroPortalProps {
  palette: ThemePalette;
  onExploreClick: () => void;
}

export const SpatialHeroPortal: React.FC<SpatialHeroPortalProps> = ({
  palette,
  onExploreClick
}) => {
  const portalRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ pointer }, delta) => {
    // Subtle mouse tilt on hero group
    if (portalRef.current) {
      portalRef.current.rotation.y = THREE.MathUtils.lerp(portalRef.current.rotation.y, pointer.x * 0.25, delta * 4);
      portalRef.current.rotation.x = THREE.MathUtils.lerp(portalRef.current.rotation.x, -pointer.y * 0.2, delta * 4);
    }

    if (coreRef.current) {
      coreRef.current.rotation.x += delta * 0.4;
      coreRef.current.rotation.y += delta * 0.6;
    }

    if (outerRingRef.current) outerRingRef.current.rotation.z += delta * 0.35;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * 0.55;
  });

  return (
    <group ref={portalRef} position={[0, 0, 0]}>
      {/* Outer Holographic Energy Ring */}
      <mesh ref={outerRingRef} rotation={[-Math.PI / 4, 0, 0]}>
        <ringGeometry args={[2.8, 2.92, 64]} />
        <meshBasicMaterial
          color={palette.primary}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Energy Ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 3, Math.PI / 5, 0]}>
        <ringGeometry args={[2.1, 2.18, 64]} />
        <meshBasicMaterial
          color={palette.secondary}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Central Cyber-Zen Polyhedron Core */}
      <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh ref={coreRef} scale={1.4}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color={palette.primary}
            emissive={palette.accent}
            emissiveIntensity={0.6}
            metalness={0.9}
            roughness={0.12}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
            wireframe={false}
          />
        </mesh>

        {/* Ambient Wireframe Cage */}
        <mesh scale={1.75}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#FFFFFF"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>
      </Float>

      {/* Hero Typography & HUD Badges rendered in 3D Space */}
      <Html position={[0, 0, 0.4]} center distanceFactor={13} className="pointer-events-none select-none">
        <div className="flex flex-col items-center text-center w-[90vw] max-w-2xl px-4">
          
          {/* Top Pill Beacon */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/75 border border-white/10 backdrop-blur-xl shadow-lg mb-4">
            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-ping" />
            <span className="text-[10px] font-mono tracking-widest text-[#CCFF00] font-black uppercase">
              GEN Z SPATIAL OS // 2026 EDITION
            </span>
            <span className="text-white/20">|</span>
            <span className="text-[10px] font-mono text-slate-400">
              0ms PERSISTENCE
            </span>
          </div>

          {/* Oversized Kinetic Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-white uppercase drop-shadow-2xl">
            LIFE<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#CCFF00] via-emerald-400 to-[#10B981]">OS</span> SPATIAL
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base font-normal text-slate-300 max-w-lg mt-3 leading-relaxed drop-shadow">
            Hệ điều hành quản lý cuộc sống đa chiều: Deep Work, FSRS Spaced Repetition, Thói quen kỷ luật & Tài chính 50/30/20 trong một vũ trụ WebGL 60FPS.
          </p>

          {/* Interactive Scroll Prompt Indicator */}
          <button
            type="button"
            onClick={onExploreClick}
            className="pointer-events-auto mt-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-mono text-slate-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>CUỘN CHUỘT ĐỂ KHÁM PHÁ VŨ TRỤ 3D</span>
            <span className="animate-bounce">↓</span>
          </button>
        </div>
      </Html>
    </group>
  );
};

export default SpatialHeroPortal;
