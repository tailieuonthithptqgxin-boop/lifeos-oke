import React, { useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../../lib/store';
import { ViewState } from '../../lib/types';
import { SPATIAL_PALETTES, SpatialThemeMode } from './universe/SpatialMaterials';
import { SpatialCameraRig } from './universe/SpatialCameraRig';
import { SpatialStarField } from './universe/SpatialStarField';
import { SpatialHeroPortal } from './universe/SpatialHeroPortal';
import { FeatureIslands, StationDetail } from './universe/SpatialStations';
import { SpatialBentoShowcase, SpatialSingularityCore } from './universe/SpatialBentoShowcase';
import { SpatialHUDOverlay } from './universe/SpatialHUDOverlay';
import { spatialAudio } from './sound/SpatialAudioEngine';

interface Spatial3DUniverseViewProps {
  onExit?: () => void;
}

export function Spatial3DUniverseView({ onExit }: Spatial3DUniverseViewProps) {
  const { setCurrentView } = useAppStore();
  const [themeMode, setThemeMode] = useState<SpatialThemeMode>('acid_neon');
  const palette = SPATIAL_PALETTES[themeMode];

  const [telemetry, setTelemetry] = useState({
    x: 0,
    y: 0.5,
    z: 7.5,
    currentZone: 0,
    scrollOffset: 0
  });

  const [targetJumpOffset, setTargetJumpOffset] = useState<number | null>(null);
  const [activeStationDetail, setActiveStationDetail] = useState<StationDetail | null>(null);

  const handleOpenApp = useCallback((view?: string) => {
    spatialAudio.stopAmbientDrone();
    if (view && typeof view === 'string') {
      setCurrentView(view as ViewState);
    } else {
      setCurrentView('dashboard');
    }
    if (onExit) onExit();
  }, [setCurrentView, onExit]);

  const handleJumpToZone = useCallback((zoneIndex: number) => {
    spatialAudio.playWarpWhoosh();
    // 0: 0.0, 1: 0.33, 2: 0.66, 3: 1.0
    const offsets = [0.0, 0.33, 0.66, 1.0];
    setTargetJumpOffset(offsets[zoneIndex]);
  }, []);

  return (
    <div className="relative w-screen h-screen w-[100vw] h-[100vh] overflow-hidden bg-[#07070C]">
      
      {/* 1. Full-Screen 100vw x 100vh WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 0.5, 7.5], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        {...({ style: { width: '100%', height: '100%' } } as any)}
      >
        <color attach="background" args={[palette.background]} />
        <fog attach="fog" args={[palette.fog, 10, 48]} />

        <AdaptiveDpr pixelated />

        {/* Global Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.5} color="#FFFFFF" />
        <pointLight position={[-10, -5, -5]} intensity={2.5} color={palette.primary} />
        <pointLight position={[5, -10, -25]} intensity={2.0} color={palette.secondary} />

        {/* 4-Page Scroll Flight Controller */}
        <ScrollControls pages={4} damping={0.2}>
          
          {/* Spline Camera Rig */}
          <SpatialCameraRig
            onTelemetryUpdate={setTelemetry}
            targetJumpOffset={targetJumpOffset}
            onJumpComplete={() => setTargetJumpOffset(null)}
          />

          {/* Procedural Instanced Star Field (1,200 particles) */}
          <SpatialStarField count={1200} color={palette.primary} />

          {/* ZONE 1: Hero Portal */}
          <SpatialHeroPortal
            palette={palette}
            onExploreClick={() => handleJumpToZone(1)}
          />

          {/* ZONE 2: Interactive Feature Islands */}
          <FeatureIslands
            palette={palette}
            onSelectStation={(detail) => setActiveStationDetail(detail)}
            onOpenApp={handleOpenApp}
          />

          {/* ZONE 3: 3D Bento Showcase */}
          <SpatialBentoShowcase
            palette={palette}
            onOpenApp={handleOpenApp}
          />

          {/* ZONE 4: Quantum Singularity & CTA Core */}
          <SpatialSingularityCore
            palette={palette}
            onEnterLifeOS={() => handleOpenApp('dashboard')}
          />
        </ScrollControls>

        {/* Post-Processing Bloom */}
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.5}
            luminanceSmoothing={0.85}
            intensity={0.9}
          />
        </EffectComposer>
      </Canvas>

      {/* 2. Floating Cyber-Zen HUD Overlay */}
      <SpatialHUDOverlay
        telemetry={telemetry}
        currentTheme={themeMode}
        onThemeChange={setThemeMode}
        onJumpToZone={handleJumpToZone}
        onOpenApp={handleOpenApp}
        activeStationDetail={activeStationDetail}
        onCloseStationDetail={() => setActiveStationDetail(null)}
      />
    </div>
  );
}

export default Spatial3DUniverseView;
