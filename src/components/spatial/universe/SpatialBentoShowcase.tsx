import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { spatialAudio } from '../sound/SpatialAudioEngine';
import { ThemePalette } from './SpatialMaterials';

// ==============================================================================
// ZONE 3: 3D BENTO SHOWCASE (FLOATING VISION-OS PANELS IN SPACE)
// ==============================================================================

interface SpatialBentoShowcaseProps {
  palette: ThemePalette;
  onOpenApp: (view?: string) => void;
}

export const SpatialBentoShowcase: React.FC<SpatialBentoShowcaseProps> = ({
  palette,
  onOpenApp
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(Date.now() * 0.0006) * 0.08;
  });

  const cards = [
    {
      id: 'today',
      title: 'Trạm Chỉ Huy 3 Giây',
      tag: 'DAILY TRIFECTA',
      desc: '3 ưu tiên sinh tử hôm nay. Chống quá tải nhận thức ADHD.',
      stat: '3/3 Hoàn Thành',
      pos: [-3.8, 1.2, 0] as [number, number, number],
      color: '#CCFF00',
      action: () => onOpenApp('dashboard')
    },
    {
      id: 'schedule',
      title: 'Lịch & Time-blocking',
      tag: 'UNIFIED SCHEDULE',
      desc: 'Kéo thả sự kiện 0ms, tự động đồng bộ deadline công việc.',
      stat: '09:00 Deep Work',
      pos: [0, 1.6, -1.2] as [number, number, number],
      color: '#10B981',
      action: () => onOpenApp('tasks')
    },
    {
      id: 'companion',
      title: 'Trợ Lý Không Gian Bé Lumi',
      tag: 'AI COMPANION',
      desc: 'Phản ứng thời gian thực theo chuỗi streak & nhịp sinh học.',
      stat: 'Tâm trạng: Tràn đầy năng lượng ✨',
      pos: [3.8, 0.8, 0.5] as [number, number, number],
      color: '#7B2CBF',
      action: () => onOpenApp('dashboard')
    },
    {
      id: 'study-space',
      title: 'Sảnh Học & Co-working 👑',
      tag: 'ONLINE STUDY ROOMS',
      desc: 'Google Meet, tính giờ học tích lũy và đua Bảng xếp hạng tuần.',
      stat: 'Phòng học trực tuyến',
      pos: [-1.8, -1.8, 0.8] as [number, number, number],
      color: '#8B5CF6',
      action: () => onOpenApp('study-space')
    },
    {
      id: 'offline',
      title: 'Zero Latency & Offline First',
      tag: 'PG-LITE // PWA',
      desc: 'Mở trang trong 0ms. Hoạt động trơn tru ngay cả khi mất mạng.',
      stat: '100% Sẵn sàng Offline',
      pos: [2.2, -1.6, -0.5] as [number, number, number],
      color: '#F59E0B',
      action: () => onOpenApp('dashboard')
    }
  ];

  return (
    <group ref={groupRef} position={[0, 0, -25]}>
      {/* Background Spatial Grid Wireframe Frame */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[14, 8, 28, 16]} />
        <meshBasicMaterial
          color={palette.primary}
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Title HUD in 3D */}
      <Html position={[0, 3.6, 0]} center distanceFactor={16} className="pointer-events-none select-none">
        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            ZONE 03 // ARCHITECTURE SHOWCASE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            Spatial Bento Architecture
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mt-0.5">
            Mọi dữ liệu cá nhân hóa lơ lửng trong không gian 2.5D với độ trễ 0ms.
          </p>
        </div>
      </Html>

      {/* Floating Spatial Cards */}
      {cards.map((c, idx) => {
        const isHovered = hoveredCard === idx;
        return (
          <Float key={c.id} speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
            <group
              position={c.pos}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredCard(idx);
                spatialAudio.playHoverSound();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredCard(null);
                document.body.style.cursor = 'auto';
              }}
              onClick={(e) => {
                e.stopPropagation();
                spatialAudio.playSelectSound();
                c.action();
              }}
            >
              {/* 3D Glass Slab Geometry */}
              <mesh scale={isHovered ? 1.05 : 1.0}>
                <boxGeometry args={[3.2, 2.0, 0.15]} />
                <meshStandardMaterial
                  color="#07090E"
                  metalness={0.9}
                  roughness={0.15}
                  emissive={isHovered ? c.color : '#000000'}
                  emissiveIntensity={isHovered ? 0.35 : 0.0}
                />
              </mesh>

              {/* Glowing Rim Border */}
              <mesh scale={isHovered ? 1.05 : 1.0}>
                <boxGeometry args={[3.24, 2.04, 0.16]} />
                <meshBasicMaterial
                  color={isHovered ? c.color : '#ffffff'}
                  wireframe
                  transparent
                  opacity={isHovered ? 0.8 : 0.12}
                />
              </mesh>

              {/* 2.5D Content Overlay rendered via HTML */}
              <Html
                position={[0, 0, 0.1]}
                center
                distanceFactor={12}
                className="pointer-events-none select-none w-56 p-3"
              >
                <div className="flex flex-col justify-between h-full text-left">
                  <div>
                    <span 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-md font-mono"
                      style={{ 
                        backgroundColor: `${c.color}20`, 
                        color: c.color, 
                        border: `1px solid ${c.color}40` 
                      }}
                    >
                      {c.tag}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {c.desc}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500 font-medium">STATUS</span>
                    <span className="text-white font-bold">{c.stat}</span>
                  </div>
                </div>
              </Html>
            </group>
          </Float>
        );
      })}
    </group>
  );
};

// ==============================================================================
// ZONE 4: QUANTUM SINGULARITY & CTA CORE
// ==============================================================================

interface SpatialSingularityCoreProps {
  palette: ThemePalette;
  onEnterLifeOS: () => void;
}

export const SpatialSingularityCore: React.FC<SpatialSingularityCoreProps> = ({
  palette,
  onEnterLifeOS
}) => {
  const portalRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const [btnHovered, setBtnHovered] = useState(false);

  useFrame((_, delta) => {
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.9;
    if (ring2Ref.current) ring2Ref.current.rotation.z -= delta * 0.6;
    if (ring3Ref.current) ring3Ref.current.rotation.x += delta * 0.7;
  });

  return (
    <group ref={portalRef} position={[0, 0, -38]}>
      {/* Graviton Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[3.2, 0.08, 16, 100]} />
        <meshStandardMaterial
          color={palette.primary}
          emissive={palette.primary}
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Graviton Ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.6, 0.06, 16, 100]} />
        <meshStandardMaterial
          color={palette.secondary}
          emissive={palette.secondary}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Graviton Ring 3 */}
      <mesh ref={ring3Ref} rotation={[-Math.PI / 3, Math.PI / 6, 0]}>
        <torusGeometry args={[3.8, 0.04, 16, 100]} />
        <meshStandardMaterial
          color="#CCFF00"
          emissive="#CCFF00"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Central Quantum Core Sphere */}
      <mesh scale={btnHovered ? 1.25 : 1.1}>
        <icosahedronGeometry args={[1.4, 4]} />
        <meshPhysicalMaterial
          color="#050508"
          roughness={0.05}
          metalness={0.95}
          transmission={0.4}
          ior={1.8}
        />
      </mesh>

      {/* Interactive CTA Portal Button via HTML */}
      <Html position={[0, 0, 0.2]} center distanceFactor={14}>
        <div className="flex flex-col items-center text-center select-none w-72">
          <span className="text-[10px] font-mono tracking-widest text-[#CCFF00] uppercase bg-black/80 px-3 py-1 rounded-full border border-[#CCFF00]/40 backdrop-blur-md">
            ZONE 04 // QUANTUM SINGULARITY
          </span>

          <h1 className="text-3xl font-black text-white tracking-tight mt-3 drop-shadow-md">
            Khởi Động LifeOS
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Không gian làm việc & thói quen All-in-One 0ms
          </p>

          <button
            type="button"
            onMouseEnter={() => {
              setBtnHovered(true);
              spatialAudio.playHoverSound();
            }}
            onMouseLeave={() => setBtnHovered(false)}
            onClick={() => {
              spatialAudio.playWarpWhoosh();
              onEnterLifeOS();
            }}
            className="mt-5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#CCFF00] via-emerald-400 to-[#10B981] hover:scale-105 active:scale-95 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-[#CCFF00]/25 transition-all cursor-pointer flex items-center gap-2 group"
          >
            <span>BẮT ĐẦU NGAY (0ms)</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </Html>
    </group>
  );
};
