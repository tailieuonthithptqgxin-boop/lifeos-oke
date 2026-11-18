import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { spatialAudio } from '../sound/SpatialAudioEngine';
import { createHolographicMaterial, createChromeMaterial, createFrostedGlassMaterial, ThemePalette } from './SpatialMaterials';

export interface StationDetail {
  id: string;
  title: string;
  badge: string;
  category: string;
  description: string;
  statLabel: string;
  statValue: string;
  actionText: string;
  onAction?: () => void;
}

interface SpatialStationNodeProps {
  position: [number, number, number];
  title: string;
  subtitle: string;
  palette: ThemePalette;
  detail: StationDetail;
  onSelectStation: (detail: StationDetail) => void;
  renderGeometry: (hovered: boolean) => React.ReactNode;
}

export const SpatialStationNode: React.FC<SpatialStationNodeProps> = ({
  position,
  title,
  subtitle,
  palette,
  detail,
  onSelectStation,
  renderGeometry
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetScale = hovered ? 1.15 : 1.0;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Smooth spring scale interpolation on hover
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    // Idle rotation
    groupRef.current.rotation.y += delta * (hovered ? 0.8 : 0.25);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        spatialAudio.playHoverSound();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        spatialAudio.playSelectSound();
        onSelectStation(detail);
      }}
    >
      {/* Station 3D Geometry */}
      {renderGeometry(hovered)}

      {/* Floating Orbital Halo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.68, 64]} />
        <meshBasicMaterial
          color={hovered ? palette.primary : palette.secondary}
          transparent
          opacity={hovered ? 0.9 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spatial HUD Tag */}
      <Html
        position={[0, 1.85, 0]}
        center
        distanceFactor={14}
        className="pointer-events-none select-none transition-transform duration-200"
      >
        <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md flex flex-col items-center shadow-lg transition-all ${
          hovered
            ? 'bg-black/90 border-[#CCFF00] scale-110 shadow-[#CCFF00]/20'
            : 'bg-black/75 border-white/10 scale-100'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${hovered ? 'bg-[#CCFF00] animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-[11px] font-black tracking-wider text-white font-mono uppercase whitespace-nowrap">
              {title}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono tracking-tight whitespace-nowrap">
            {subtitle} · Click to inspect
          </span>
        </div>
      </Html>
    </group>
  );
};

// ==============================================================================
// 4 DISTINCT FEATURE STATIONS (ZONE 2)
// ==============================================================================

interface FeatureIslandsProps {
  palette: ThemePalette;
  onSelectStation: (detail: StationDetail) => void;
  onOpenApp: (view?: string) => void;
}

export const FeatureIslands: React.FC<FeatureIslandsProps> = ({
  palette,
  onSelectStation,
  onOpenApp
}) => {
  // 1. Pomodoro Time Reactor Geometry
  const renderPomodoroReactor = (hovered: boolean) => (
    <group>
      <mesh>
        <torusKnotGeometry args={[0.7, 0.22, 128, 32]} />
        <meshStandardMaterial
          color={hovered ? '#CCFF00' : palette.primary}
          metalness={0.85}
          roughness={0.15}
          emissive={hovered ? '#CCFF00' : palette.primary}
          emissiveIntensity={hovered ? 0.6 : 0.2}
        />
      </mesh>
      <mesh scale={1.3}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          transmission={0.9}
          roughness={0.05}
          ior={1.5}
        />
      </mesh>
    </group>
  );

  // 2. FSRS Memory Monolith Geometry
  const renderMemoryMonolith = (hovered: boolean) => (
    <group>
      <mesh>
        <octahedronGeometry args={[0.95, 0]} />
        <meshStandardMaterial
          color={hovered ? '#7B2CBF' : palette.secondary}
          metalness={0.9}
          roughness={0.1}
          wireframe={!hovered}
        />
      </mesh>
      <mesh scale={0.65}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color={hovered ? '#CCFF00' : '#FFFFFF'}
          wireframe
        />
      </mesh>
    </group>
  );

  // 3. Habit Galaxy Rings Geometry
  const renderHabitGalaxy = (hovered: boolean) => (
    <group>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          color={hovered ? '#F59E0B' : '#EF4444'}
          emissive={hovered ? '#F59E0B' : '#EF4444'}
          emissiveIntensity={0.5}
          roughness={0.2}
        />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.05, 0.06, 16, 64]} />
        <meshBasicMaterial color={hovered ? '#CCFF00' : '#F59E0B'} />
      </mesh>
      <mesh rotation={[-Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.35, 0.04, 16, 64]} />
        <meshBasicMaterial color={palette.primary} />
      </mesh>
    </group>
  );

  // 4. Safe-to-Spend Hypercube Geometry
  const renderFinanceHypercube = (hovered: boolean) => (
    <group>
      <mesh>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshStandardMaterial
          color="#0B1120"
          metalness={0.8}
          roughness={0.2}
          wireframe
        />
      </mesh>
      <mesh scale={0.75}>
        <boxGeometry args={[1.0, 1.0, 1.0]} />
        <meshStandardMaterial
          color={hovered ? '#10B981' : palette.primary}
          metalness={0.95}
          roughness={0.08}
          emissive="#10B981"
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>
    </group>
  );

  return (
    <group position={[0, 0, -12]}>
      {/* Station 1: Focus Reactor */}
      <SpatialStationNode
        position={[-4.5, 1.2, 0]}
        title="TIME REACTOR"
        subtitle="Pomodoro & Zen Lo-Fi"
        palette={palette}
        detail={{
          id: 'focus',
          title: 'Phòng Tập Trung & Time Reactor',
          badge: '0ms LATENCY',
          category: 'DEEP WORK',
          description: 'Hệ thống đếm nhịp Pomodoro 25/50p kết hợp bộ trộn âm thanh không gian (mưa rào, cafe, sóng não alpha) và cảnh báo gián đoạn thông minh.',
          statLabel: 'Độ tập trung trung bình',
          statValue: '88.4% Flowtime',
          actionText: 'Mở Trạm Tập Trung ⚡',
          onAction: () => onOpenApp('focus')
        }}
        onSelectStation={onSelectStation}
        renderGeometry={renderPomodoroReactor}
      />

      {/* Station 2: Memory Monolith */}
      <SpatialStationNode
        position={[-1.5, -1.0, 1.5]}
        title="FSRS MONOLITH"
        subtitle="Spaced Repetition"
        palette={palette}
        detail={{
          id: 'study',
          title: 'Tháp Trí Nhớ FSRS Spaced Repetition',
          badge: 'AI RETENTION',
          category: 'KNOWLEDGE HUB',
          description: 'Thuật toán lặp lại ngắt quãng thế hệ mới FSRS-4.5 giúp ghi nhớ vĩnh viễn từ vựng JLPT, Oxford 3000, HSK với thời gian ôn tập tối thiểu.',
          statLabel: 'Tỷ lệ duy trì trí nhớ',
          statValue: '93.7% Chuẩn FSRS',
          actionText: 'Khám phá Bộ Thẻ FSRS 📚',
          onAction: () => onOpenApp('study')
        }}
        onSelectStation={onSelectStation}
        renderGeometry={renderMemoryMonolith}
      />

      {/* Station 3: Habit Galaxy */}
      <SpatialStationNode
        position={[2.0, 1.6, -1]}
        title="HABIT GALAXY"
        subtitle="Discipline Streaks"
        palette={palette}
        detail={{
          id: 'habits',
          title: 'Dải Ngân Hà Thói Quen (Habits)',
          badge: 'FIRE STREAK',
          category: 'DISCIPLINE',
          description: 'Cơ chế kích hoạt chuỗi thói quen liên tục, bảo hiểm chuỗi Streak Resurrection và phân bổ năng lượng kỉ luật mỗi ngày.',
          statLabel: 'Kỷ lục chuỗi liên tục',
          statValue: '42 Ngày Bất Bại 🔥',
          actionText: 'Xem Chuỗi Thói Quen 🎯',
          onAction: () => onOpenApp('habits')
        }}
        onSelectStation={onSelectStation}
        renderGeometry={renderHabitGalaxy}
      />

      {/* Station 4: Safe-to-Spend Vault */}
      <SpatialStationNode
        position={[4.8, -0.8, 0.5]}
        title="FINANCE VAULT"
        subtitle="Safe-to-Spend 50/30/20"
        palette={palette}
        detail={{
          id: 'finance',
          title: 'Kho Lưu Trữ Tài Chính Thông Minh',
          badge: 'ZERO ANXIETY',
          category: 'WEALTH OS',
          description: 'Bảo vệ dòng tiền cá nhân với chỉ số Safe-to-Spend thời gian thực. Tự động chia tỉ lệ 50% Nhu cầu - 30% Mong muốn - 20% Tích lũy.',
          statLabel: 'Hạn mức an toàn ngày',
          statValue: '450.000 đ / Ngày 💎',
          actionText: 'Quản Lý Tài Chính 💳',
          onAction: () => onOpenApp('finance')
        }}
        onSelectStation={onSelectStation}
        renderGeometry={renderFinanceHypercube}
      />
    </group>
  );
};
