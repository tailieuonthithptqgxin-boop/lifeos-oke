import React, { useState, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../../lib/store';
import { ViewState } from '../../lib/types';
import { IslandVibeMode, ISLAND_VIBES } from './island/CyberCozyVibes';
import { FloatingIslandBase } from './island/FloatingIslandBase';
import { LumiCyberCompanion } from './island/LumiCyberCompanion';
import { IslandStations, IslandStationData } from './island/IslandStations';
import { IslandCameraManager } from './island/IslandCameraManager';
import { IslandHUDOverlay } from './island/IslandHUDOverlay';
import { StationBentoModal } from './island/StationBentoModal';
import { SpatialStarField } from './universe/SpatialStarField';
import { spatialAudio } from './sound/SpatialAudioEngine';

interface CyberCozyIslandSpaceProps {
  onExit?: () => void;
}

export function CyberCozyIslandSpace({ onExit }: CyberCozyIslandSpaceProps) {
  const { setCurrentView } = useAppStore();
  const [currentVibe, setCurrentVibe] = useState<IslandVibeMode>('midnight');
  const vibe = ISLAND_VIBES[currentVibe];

  const [activeStation, setActiveStation] = useState<IslandStationData | null>(null);

  const handleOpenDashboard = useCallback(() => {
    spatialAudio.stopAmbientDrone();
    setCurrentView('dashboard');
    if (onExit) onExit();
  }, [setCurrentView, onExit]);

  const handleLaunchView = useCallback((viewId: string) => {
    spatialAudio.stopAmbientDrone();
    setCurrentView(viewId as ViewState);
    if (onExit) onExit();
  }, [setCurrentView, onExit]);

  const handleSelectStationById = useCallback((id: string) => {
    // We trigger station selection by simulated click
    // Pre-configured stations matching id
    const stationMap: Record<string, Partial<IslandStationData>> = {
      desk: {
        id: 'desk',
        viewId: 'tasks',
        name: 'Bàn Làm Việc & Hologram Terminal',
        badge: 'UNIFIED SCHEDULE',
        category: 'TASKS & TIMEBLOCK',
        tagline: 'Quản lý lịch biểu, Kanban và khung giờ tập trung',
        description: 'Phân hệ hợp nhất toàn diện kết hợp Lịch theo ngày/tuần/tháng, kéo thả sự kiện 0ms, và bảng việc Kanban tối ưu hóa năng suất.',
        primaryStatLabel: 'Việc cần làm hôm nay',
        primaryStatValue: '5 nhiệm vụ ưu tiên',
        secondaryStatLabel: 'Khung giờ vàng',
        secondaryStatValue: '09:00 - 11:30 Deep Work',
        cameraPosition: [-1.8, 1.8, 3.2],
        cameraTarget: [-3.4, 0.7, 1.6],
        accentColor: '#38BDF8'
      },
      focus: {
        id: 'focus',
        viewId: 'focus',
        name: 'Trụ Tháp Pomodoro Reactor',
        badge: 'DEEP WORK 0ms',
        category: 'FOCUS ROOM',
        tagline: 'Phòng tập trung Pomodoro, Zen Mode & YouTube Lo-Fi',
        description: 'Lõi đếm giờ Pomodoro 25/50p đồng bộ với mô hình 3D Cyber-Zen, bộ trộn âm thanh thiên nhiên Ambient Mixer và bảng vinh danh kỷ luật.',
        primaryStatLabel: 'Thời gian tập trung',
        primaryStatValue: '125 phút / 120p mục tiêu',
        secondaryStatLabel: 'Độ sâu Flowtime',
        secondaryStatValue: '92% Không gián đoạn',
        cameraPosition: [1.8, 2.0, -0.6],
        cameraTarget: [3.2, 0.8, -1.8],
        accentColor: vibe.neonAccentHex
      },
      study: {
        id: 'study',
        viewId: 'study',
        name: 'Kệ Sách Không Gian & Tinh Thể FSRS',
        badge: 'AI RETENTION',
        category: 'KNOWLEDGE HUB',
        tagline: 'Flashcards Spaced Repetition FSRS & Từ vựng',
        description: 'Thư viện 21.609 từ vựng Oxford 3000, JLPT tiếng Nhật và HSK tiếng Trung với phát âm chuẩn xác IPA và chu kỳ ôn tập ngắt quãng thông minh.',
        primaryStatLabel: 'Từ vựng cần ôn',
        primaryStatValue: '18 thẻ hôm nay',
        secondaryStatLabel: 'Tỷ lệ ghi nhớ dài hạn',
        secondaryStatValue: '94.2% Chuẩn FSRS',
        cameraPosition: [-1.4, 1.8, -1.5],
        cameraTarget: [-2.8, 0.8, -2.6],
        accentColor: '#A855F7'
      },
      finance: {
        id: 'finance',
        viewId: 'finance',
        name: 'Két Sắt Kim Cương & Dòng Tiền 50/30/20',
        badge: 'SAFE-TO-SPEND',
        category: 'FINANCE OS',
        tagline: 'Quản lý thu chi, ví tiền và hạn mức an toàn ngày',
        description: 'Tự động tính toán hạn mức chi tiêu an toàn Safe-to-Spend theo thời gian thực, bảo vệ dòng tiền cá nhân và mục tiêu tích lũy.',
        primaryStatLabel: 'Hạn mức an toàn ngày',
        primaryStatValue: '450.000 đ',
        secondaryStatLabel: 'Tỷ lệ phân bổ',
        secondaryStatValue: '50/30/20 Cân bằng',
        cameraPosition: [1.6, 1.8, 1.0],
        cameraTarget: [2.8, 0.8, 2.2],
        accentColor: '#10B981'
      },
      habits: {
        id: 'habits',
        viewId: 'habits',
        name: 'Ngọn Đuốc Kỷ Luật & Cúp Phong Thần',
        badge: 'FIRE STREAK',
        category: 'HABITS & GOALS',
        tagline: 'Theo dõi chuỗi thói quen và mục tiêu cốt lõi',
        description: 'Bảo hiểm chuỗi thói quen Streak Resurrection, thử thách thói quen buổi sáng và hệ thống tích lũy điểm kinh nghiệm thăng hạng.',
        primaryStatLabel: 'Chuỗi Streak cao nhất',
        primaryStatValue: '28 ngày liên tục 🔥',
        secondaryStatLabel: 'Thói quen hoàn thành',
        secondaryStatValue: '4/4 thói quen hôm nay',
        cameraPosition: [0.2, 1.8, 2.2],
        cameraTarget: [0.2, 0.8, 3.6],
        accentColor: '#F59E0B'
      }
    };

    if (stationMap[id]) {
      setActiveStation(stationMap[id] as IslandStationData);
    }
  }, [vibe.neonAccentHex]);

  return (
    <div className="relative w-screen h-screen w-[100vw] h-[100vh] overflow-hidden select-none bg-[#07090E]">
      
      {/* 1. Full-Screen 100% Three.js Canvas */}
      <Canvas
        camera={{ position: [8.5, 6.8, 8.5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        {...({ style: { width: '100%', height: '100%' } } as any)}
      >
        <color attach="background" args={[vibe.bgHex]} />
        <fog attach="fog" args={[vibe.fogHex, 12, 38]} />

        <AdaptiveDpr pixelated />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={vibe.ambientIntensity} color={vibe.ambientLightHex} />
        
        <directionalLight
          position={vibe.sunPosition}
          intensity={vibe.sunIntensity}
          color={vibe.sunLightHex}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Rim Specular Accent Lights */}
        <pointLight position={[-8, 6, -8]} intensity={1.8} color={vibe.neonSecondaryHex} distance={20} />
        <pointLight position={[6, -4, 6]} intensity={1.5} color={vibe.neonAccentHex} distance={15} />

        {/* Background Floating Cosmic Dust & Stars (1,200 Particles) */}
        <SpatialStarField count={800} color={vibe.neonAccentHex} />

        <Suspense fallback={null}>
          {/* A. The Floating Diorama Island Platform & Props */}
          <FloatingIslandBase vibe={vibe} />

          {/* B. Center Mascot: Bé Lumi Cyber-Zen Companion */}
          <LumiCyberCompanion vibe={vibe} onCompanionClick={() => spatialAudio.playHoverSparkle()} />

          {/* C. The 5 Interactive 3D Function Stations */}
          <IslandStations
            vibe={vibe}
            onSelectStation={(st) => setActiveStation(st)}
          />

          {/* D. GSAP Camera Flight & OrbitControls Manager */}
          <IslandCameraManager
            activeStation={activeStation}
            onResetComplete={() => setActiveStation(null)}
          />

          {/* E. Selective Bloom Post-Processing */}
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.5}
              luminanceSmoothing={0.85}
              intensity={0.8}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* 2. Floating Cyber-Cozy HUD Overlay */}
      <IslandHUDOverlay
        currentVibe={currentVibe}
        onVibeChange={setCurrentVibe}
        onResetCamera={() => setActiveStation(null)}
        onSelectStationById={handleSelectStationById}
        onOpenDashboard={handleOpenDashboard}
        activeStation={activeStation}
      />

      {/* 3. VisionOS 3D Glassmorphism Bento Modal */}
      <StationBentoModal
        station={activeStation}
        onClose={() => setActiveStation(null)}
        onLaunchView={handleLaunchView}
      />
    </div>
  );
}

export default CyberCozyIslandSpace;
