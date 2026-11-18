import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { spatialAudio } from '../sound/SpatialAudioEngine';
import { IslandVibeConfig } from './CyberCozyVibes';

export interface IslandStationData {
  id: string;
  viewId: string;
  name: string;
  badge: string;
  category: string;
  tagline: string;
  description: string;
  primaryStatLabel: string;
  primaryStatValue: string;
  secondaryStatLabel: string;
  secondaryStatValue: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  accentColor: string;
}

interface IslandStationsProps {
  vibe: IslandVibeConfig;
  onSelectStation: (station: IslandStationData) => void;
}

export const IslandStations: React.FC<IslandStationsProps> = ({
  vibe,
  onSelectStation
}) => {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  // Station 1: Cyber Work Desk & Hologram Terminal
  const deskGroupRef = useRef<THREE.Group>(null);
  // Station 2: Pomodoro Reactor
  const reactorRingRef = useRef<THREE.Mesh>(null);
  // Station 3: Knowledge Crystal
  const crystalRef = useRef<THREE.Mesh>(null);
  // Station 4: Wealth Vault
  const vaultCubeRef = useRef<THREE.Mesh>(null);
  // Station 5: Discipline Flame
  const flameRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (reactorRingRef.current) reactorRingRef.current.rotation.z += delta * 1.2;
    if (crystalRef.current) crystalRef.current.rotation.y += delta * 0.7;
    if (vaultCubeRef.current) vaultCubeRef.current.rotation.y -= delta * 0.5;
    if (flameRef.current) {
      flameRef.current.rotation.y += delta * 1.5;
      flameRef.current.scale.y = 1.0 + Math.sin(Date.now() * 0.009) * 0.15;
    }
  });

  const STATIONS_DATA: IslandStationData[] = [
    {
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
    {
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
    {
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
    {
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
    {
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
  ];

  return (
    <group>
      {/* ===================================================================== */}
      {/* 1. STATION: CYBER WORK DESK (TASKS)                                   */}
      {/* ===================================================================== */}
      <group
        ref={deskGroupRef}
        position={[-3.4, 0.4, 1.6]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredStation('desk');
          spatialAudio.playHoverSound();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredStation(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          spatialAudio.playSelectSound();
          onSelectStation(STATIONS_DATA[0]);
        }}
        scale={hoveredStation === 'desk' ? 1.15 : 1.0}
      >
        {/* Tabletop Slab */}
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1.5, 0.08, 0.9]} />
          <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Desk Legs */}
        <mesh position={[-0.65, 0.1, -0.35]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} />
        </mesh>
        <mesh position={[0.65, 0.1, -0.35]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} />
        </mesh>
        <mesh position={[-0.65, 0.1, 0.35]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} />
        </mesh>
        <mesh position={[0.65, 0.1, 0.35]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} />
        </mesh>
        {/* Curved Hologram Screen */}
        <mesh position={[0, 0.65, -0.15]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.1, 0.6, 0.04]} />
          <meshStandardMaterial
            color="#0284C7"
            emissive="#0284C7"
            emissiveIntensity={hoveredStation === 'desk' ? 0.9 : 0.4}
            roughness={0.1}
          />
        </mesh>
        {/* Keyboard with neon glow */}
        <mesh position={[0, 0.3, 0.15]}>
          <boxGeometry args={[0.55, 0.02, 0.22]} />
          <meshStandardMaterial color="#334155" emissive="#0284C7" emissiveIntensity={0.3} />
        </mesh>
        {/* Pill Badge HUD */}
        <Html position={[0, 1.25, 0]} center distanceFactor={12} className="pointer-events-none select-none">
          <div className={`px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
            hoveredStation === 'desk'
              ? 'bg-black/90 border-[#38BDF8] scale-110 shadow-[#38BDF8]/20'
              : 'bg-black/75 border-white/10 scale-100'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            <span className="text-[10px] font-mono font-black text-white">LỊCH & CÔNG VIỆC</span>
          </div>
        </Html>
      </group>

      {/* ===================================================================== */}
      {/* 2. STATION: POMODORO REACTOR TOWER (FOCUS)                           */}
      {/* ===================================================================== */}
      <group
        position={[3.2, 0.4, -1.8]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredStation('focus');
          spatialAudio.playHoverSound();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredStation(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          spatialAudio.playSelectSound();
          onSelectStation(STATIONS_DATA[1]);
        }}
        scale={hoveredStation === 'focus' ? 1.15 : 1.0}
      >
        {/* Reactor Base Pillar */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.6, 16]} />
          <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Central Energy Reactor Core */}
        <mesh position={[0, 0.85, 0]}>
          <octahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial
            color={vibe.neonAccentHex}
            emissive={vibe.neonAccentHex}
            emissiveIntensity={hoveredStation === 'focus' ? 1.8 : 0.8}
            roughness={0.1}
          />
        </mesh>
        {/* Rotating Orbital Gyro Ring */}
        <mesh ref={reactorRingRef} position={[0, 0.85, 0]} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[0.65, 0.04, 16, 48]} />
          <meshStandardMaterial color={vibe.neonSecondaryHex} metalness={0.9} />
        </mesh>
        {/* Pill Badge HUD */}
        <Html position={[0, 1.5, 0]} center distanceFactor={12} className="pointer-events-none select-none">
          <div className={`px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
            hoveredStation === 'focus'
              ? 'bg-black/90 border-[#10B981] scale-110 shadow-[#10B981]/20'
              : 'bg-black/75 border-white/10 scale-100'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-[10px] font-mono font-black text-white">PHÒNG TẬP TRUNG</span>
          </div>
        </Html>
      </group>

      {/* ===================================================================== */}
      {/* 3. STATION: KNOWLEDGE CRYSTAL & BOOKSHELF (STUDY)                     */}
      {/* ===================================================================== */}
      <group
        position={[-2.8, 0.4, -2.6]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredStation('study');
          spatialAudio.playHoverSound();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredStation(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          spatialAudio.playSelectSound();
          onSelectStation(STATIONS_DATA[2]);
        }}
        scale={hoveredStation === 'study' ? 1.15 : 1.0}
      >
        {/* Floating Bookshelf Stand */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.45, 0.5, 0.4, 8]} />
          <meshStandardMaterial color="#1E1B4B" metalness={0.7} />
        </mesh>
        {/* Central Spaced Repetition Crystal */}
        <mesh ref={crystalRef} position={[0, 0.8, 0]}>
          <icosahedronGeometry args={[0.38, 0]} />
          <meshStandardMaterial
            color="#A855F7"
            emissive="#7E22CE"
            emissiveIntensity={hoveredStation === 'study' ? 1.6 : 0.6}
            metalness={0.8}
            roughness={0.15}
          />
        </mesh>
        {/* Floating Translucent Study Flashcards Orbit */}
        <mesh position={[-0.45, 0.75, 0.2]} rotation={[0, 0.4, 0.2]}>
          <boxGeometry args={[0.3, 0.4, 0.03]} />
          <meshPhysicalMaterial color="#FFFFFF" transmission={0.8} roughness={0.1} />
        </mesh>
        <mesh position={[0.45, 0.85, -0.1]} rotation={[0, -0.5, -0.2]}>
          <boxGeometry args={[0.3, 0.4, 0.03]} />
          <meshPhysicalMaterial color="#E9D5FF" transmission={0.8} roughness={0.1} />
        </mesh>
        {/* Pill Badge HUD */}
        <Html position={[0, 1.45, 0]} center distanceFactor={12} className="pointer-events-none select-none">
          <div className={`px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
            hoveredStation === 'study'
              ? 'bg-black/90 border-[#A855F7] scale-110 shadow-[#A855F7]/20'
              : 'bg-black/75 border-white/10 scale-100'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
            <span className="text-[10px] font-mono font-black text-white">HỌC TẬP & TỪ VỰNG</span>
          </div>
        </Html>
      </group>

      {/* ===================================================================== */}
      {/* 4. STATION: WEALTH VAULT & DIAMOND PIGGY (FINANCE)                    */}
      {/* ===================================================================== */}
      <group
        position={[2.8, 0.4, 2.2]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredStation('finance');
          spatialAudio.playHoverSound();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredStation(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          spatialAudio.playSelectSound();
          onSelectStation(STATIONS_DATA[3]);
        }}
        scale={hoveredStation === 'finance' ? 1.15 : 1.0}
      >
        {/* Vault Pedestal */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.8, 0.4, 0.8]} />
          <meshStandardMaterial color="#064E3B" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Rotating 50/30/20 Golden Hypercube */}
        <mesh ref={vaultCubeRef} position={[0, 0.72, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial
            color="#10B981"
            emissive="#059669"
            emissiveIntensity={hoveredStation === 'finance' ? 1.2 : 0.4}
            metalness={0.95}
            roughness={0.1}
          />
        </mesh>
        {/* Floating Gold Coin Halo */}
        <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        {/* Pill Badge HUD */}
        <Html position={[0, 1.35, 0]} center distanceFactor={12} className="pointer-events-none select-none">
          <div className={`px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
            hoveredStation === 'finance'
              ? 'bg-black/90 border-[#10B981] scale-110 shadow-[#10B981]/20'
              : 'bg-black/75 border-white/10 scale-100'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-mono font-black text-white">TÀI CHÍNH 50/30/20</span>
          </div>
        </Html>
      </group>

      {/* ===================================================================== */}
      {/* 5. STATION: DISCIPLINE FLAME OBELISK & TROPHY (HABITS)                */}
      {/* ===================================================================== */}
      <group
        position={[0.2, 0.4, 3.6]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredStation('habits');
          spatialAudio.playHoverSound();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredStation(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          spatialAudio.playSelectSound();
          onSelectStation(STATIONS_DATA[4]);
        }}
        scale={hoveredStation === 'habits' ? 1.15 : 1.0}
      >
        {/* Trophy Altar */}
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 0.4, 8]} />
          <meshStandardMaterial color="#78350F" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Golden Trophy Cup */}
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.3, 0.35, 16, 1, true]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Eternal Discipline Cyber Flame */}
        <mesh ref={flameRef} position={[0, 0.85, 0]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color="#EF4444"
            emissive="#F97316"
            emissiveIntensity={hoveredStation === 'habits' ? 2.5 : 1.2}
            roughness={0.1}
          />
        </mesh>
        {/* Flame Warm Light */}
        <pointLight position={[0, 0.85, 0]} color="#F97316" intensity={1.2} distance={4} />
        {/* Pill Badge HUD */}
        <Html position={[0, 1.45, 0]} center distanceFactor={12} className="pointer-events-none select-none">
          <div className={`px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all flex items-center gap-1.5 whitespace-nowrap shadow-lg ${
            hoveredStation === 'habits'
              ? 'bg-black/90 border-[#F59E0B] scale-110 shadow-[#F59E0B]/20'
              : 'bg-black/75 border-white/10 scale-100'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-[10px] font-mono font-black text-white">THÓI QUEN & STREAK</span>
          </div>
        </Html>
      </group>
    </group>
  );
};

export default IslandStations;
