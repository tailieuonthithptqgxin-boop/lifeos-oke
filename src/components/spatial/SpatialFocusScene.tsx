import React, { useRef, useMemo, useEffect, useState, Suspense, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Float, 
  PresentationControls, 
  MeshDistortMaterial, 
  AdaptiveDpr, 
  Sparkles,
  Ring
} from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

export type Focus3DModelType = 'hourglass' | 'pomodoro' | 'gyro';

export interface SpatialFocusSceneProps {
  isFocusing?: boolean;
  focusProgress?: number;       // 0 to 1
  celebrationTrigger?: number;  // Timestamp to trigger shockwave
  activeTaskCount?: number;
  className?: string;
  onSceneClick?: () => void;
}

interface WebGLErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

// 1. Error Boundary for WebGL context loss recovery
class WebGLErrorBoundary extends Component<WebGLErrorBoundaryProps, WebGLErrorBoundaryState> {
  props: WebGLErrorBoundaryProps;
  state: WebGLErrorBoundaryState = { hasError: false };

  constructor(props: WebGLErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[SpatialFocusScene] WebGL fallback activated:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Resource cleaner to prevent memory leak and context loss on tab navigation
const WebGLResourceCleaner = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    return () => {
      try {
        scene.traverse((object: any) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat: any) => mat?.dispose?.());
            } else {
              object.material?.dispose?.();
            }
          }
        });
        gl.dispose();
      } catch (err) {
        console.debug('[SpatialFocusScene] WebGL cleanup debug:', err);
      }
    };
  }, [gl, scene]);
  return null;
};

// ============================================================================
// MODEL 1: CHRONO HOURGLASS (Đồng Hồ Cát Không Gian 3D) - MẶC ĐỊNH
// Biểu tượng kinh điển, trực quan nhất cho việc đếm ngược thời gian tập trung
// ============================================================================
const ChronoHourglass = ({ 
  isFocusing, 
  focusProgress = 0,
  celebrationTrigger 
}: { 
  isFocusing: boolean; 
  focusProgress: number;
  celebrationTrigger?: number; 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const sandStreamRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const topSandRef = useRef<THREE.Mesh>(null);
  const bottomSandRef = useRef<THREE.Mesh>(null);

  // Clamp progress between 0 and 1
  const progress = Math.max(0, Math.min(1, focusProgress));

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Gentle idle rotation and breathing
    groupRef.current.rotation.y += delta * (isFocusing ? 0.65 : 0.25);

    // Sand stream pulsing glow when focusing
    if (sandStreamRef.current) {
      const mat = sandStreamRef.current.material as THREE.MeshStandardMaterial;
      if (isFocusing) {
        mat.opacity = 0.75 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      } else {
        mat.opacity = 0.25;
      }
    }

    // Dynamic sand levels
    if (topSandRef.current) {
      const remaining = Math.max(0.08, 1 - progress * 0.92);
      topSandRef.current.scale.set(remaining, remaining, remaining);
    }
    if (bottomSandRef.current) {
      const accumulated = Math.max(0.12, progress * 0.95 + 0.12);
      bottomSandRef.current.scale.set(accumulated, accumulated, accumulated);
    }

    // Shockwave expansion animation on celebration
    if (shockwaveRef.current) {
      if (shockwaveRef.current.scale.x < 4.5) {
        shockwaveRef.current.scale.x += delta * 12;
        shockwaveRef.current.scale.y += delta * 12;
        shockwaveRef.current.scale.z += delta * 12;
        const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - delta * 3.2);
      }
    }
  });

  // Trigger bounce on celebration
  useEffect(() => {
    if (!celebrationTrigger || !groupRef.current) return;
    groupRef.current.scale.set(1.4, 1.4, 1.4);

    if (shockwaveRef.current) {
      shockwaveRef.current.scale.set(0.1, 0.1, 0.1);
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
  }, [celebrationTrigger]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), delta * 4);
  });

  // Pillars around the glass
  const pillars = useMemo(() => {
    const arr = [];
    const radius = 0.76;
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3;
      arr.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius
      });
    }
    return arr;
  }, []);

  const brassMetalColor = isFocusing ? '#10B981' : '#059669';
  const sandColor = isFocusing ? '#34D399' : '#10B981';
  const glassColor = '#E2E8F0';

  return (
    <group ref={groupRef} scale={[1.15, 1.15, 1.15]}>
      {/* 3D Celebration Shockwave Ring */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial 
          color="#10B981" 
          transparent 
          opacity={0} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Top Cap (Disk + Bevel Rim) */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.1, 32]} />
        <meshStandardMaterial 
          color={brassMetalColor} 
          metalness={0.85} 
          roughness={0.2} 
        />
      </mesh>
      <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.04, 16, 32]} />
        <meshStandardMaterial color={brassMetalColor} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Bottom Cap (Disk + Bevel Rim) */}
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.1, 32]} />
        <meshStandardMaterial 
          color={brassMetalColor} 
          metalness={0.85} 
          roughness={0.2} 
        />
      </mesh>
      <mesh position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.04, 16, 32]} />
        <meshStandardMaterial color={brassMetalColor} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 3 Brass Support Pillars */}
      {pillars.map((p, idx) => (
        <mesh key={idx} position={[p.x, 0, p.z]}>
          <cylinderGeometry args={[0.035, 0.035, 2.45, 16]} />
          <meshStandardMaterial 
            color={brassMetalColor} 
            metalness={0.85} 
            roughness={0.25} 
          />
        </mesh>
      ))}

      {/* Central Waist Collar */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.045, 16, 32]} />
        <meshStandardMaterial color={brassMetalColor} metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Upper Glass Bulb */}
      <mesh position={[0, 0.58, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.82, 1.15, 32, 1, true]} />
        <meshStandardMaterial 
          color={glassColor} 
          transparent 
          opacity={0.35} 
          roughness={0.1} 
          metalness={0.1} 
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lower Glass Bulb */}
      <mesh position={[0, -0.58, 0]}>
        <coneGeometry args={[0.82, 1.15, 32, 1, true]} />
        <meshStandardMaterial 
          color={glassColor} 
          transparent 
          opacity={0.35} 
          roughness={0.1} 
          metalness={0.1} 
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Upper Sand (Decreases with progress) */}
      <mesh ref={topSandRef} position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.74, 1.0, 24]} />
        <meshStandardMaterial 
          color={sandColor} 
          emissive={sandColor}
          emissiveIntensity={isFocusing ? 0.65 : 0.3}
          roughness={0.65}
          metalness={0.1}
        />
      </mesh>

      {/* Trickling Sand Stream (Falls through waist) */}
      <mesh ref={sandStreamRef} position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.022, 0.028, 0.85, 12]} />
        <meshStandardMaterial 
          color={sandColor} 
          emissive={sandColor}
          emissiveIntensity={isFocusing ? 0.9 : 0.4}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Lower Sand Heap (Accumulates with progress) */}
      <mesh ref={bottomSandRef} position={[0, -0.85, 0]}>
        <coneGeometry args={[0.76, 0.75, 24]} />
        <meshStandardMaterial 
          color={sandColor} 
          emissive={sandColor}
          emissiveIntensity={isFocusing ? 0.65 : 0.3}
          roughness={0.65}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
};

// ============================================================================
// MODEL 2: POMODORO CLOCK (Cà Chua Pomodoro 3D)
// Biểu tượng truyền cảm hứng theo phương pháp Pomodoro nguyên bản
// ============================================================================
const PomodoroCore = ({ 
  isFocusing, 
  celebrationTrigger 
}: { 
  isFocusing: boolean; 
  celebrationTrigger?: number; 
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * (isFocusing ? 0.85 : 0.4);

    if (shockwaveRef.current && shockwaveRef.current.scale.x < 4.5) {
      shockwaveRef.current.scale.x += delta * 12;
      shockwaveRef.current.scale.y += delta * 12;
      shockwaveRef.current.scale.z += delta * 12;
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 3.2);
    }
  });

  useEffect(() => {
    if (!celebrationTrigger || !meshRef.current) return;
    meshRef.current.scale.set(1.4, 1.4, 1.4);
    if (shockwaveRef.current) {
      shockwaveRef.current.scale.set(0.1, 0.1, 0.1);
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
  }, [celebrationTrigger]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.scale.lerp(new THREE.Vector3(1.1, 1.1, 1.1), delta * 4);
  });

  return (
    <group ref={meshRef} scale={[1.1, 1.1, 1.1]}>
      {/* Shockwave */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial color="#10B981" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Main Tomato Body (Plump, glossy sphere) */}
      <mesh scale={[1.15, 0.95, 1.15]}>
        <sphereGeometry args={[0.95, 32, 32]} />
        <MeshDistortMaterial
          color={isFocusing ? "#E11D48" : "#F43F5E"}
          roughness={0.2}
          metalness={0.25}
          distort={isFocusing ? 0.15 : 0.08}
          speed={isFocusing ? 2.5 : 1.2}
          emissive={isFocusing ? "#881337" : "#4C0519"}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Equator Timer Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.08, 0.035, 16, 48]} />
        <meshStandardMaterial color="#FCD34D" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Top Green Calyx Leaves (5 leaves) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * 2 * Math.PI) / 5;
        return (
          <mesh 
            key={i} 
            position={[Math.cos(angle) * 0.28, 0.88, Math.sin(angle) * 0.28]} 
            rotation={[Math.sin(angle) * 0.4, angle, Math.cos(angle) * 0.4]}
          >
            <coneGeometry args={[0.16, 0.55, 12]} />
            <meshStandardMaterial color="#10B981" roughness={0.3} metalness={0.1} />
          </mesh>
        );
      })}

      {/* Tomato Stem */}
      <mesh position={[0, 1.08, 0]} rotation={[0.1, 0, 0.15]}>
        <cylinderGeometry args={[0.045, 0.055, 0.35, 12]} />
        <meshStandardMaterial color="#047857" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
};

// ============================================================================
// MODEL 3: CHRONO GYRO (Con Quay Thời Gian Cơ Học Tương Lai)
// ============================================================================
const ChronoGyroCore = ({ 
  isFocusing, 
  celebrationTrigger 
}: { 
  isFocusing: boolean; 
  celebrationTrigger?: number; 
}) => {
  const outerRingRef = useRef<THREE.Group>(null);
  const midRingRef = useRef<THREE.Group>(null);
  const innerRingRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const speed = isFocusing ? 1.5 : 0.7;
    if (outerRingRef.current) outerRingRef.current.rotation.y += delta * 0.75 * speed;
    if (midRingRef.current) midRingRef.current.rotation.x += delta * 1.1 * speed;
    if (innerRingRef.current) innerRingRef.current.rotation.z -= delta * 0.9 * speed;
    if (coreRef.current) {
      coreRef.current.rotation.x += delta * 0.5;
      coreRef.current.rotation.y += delta * 0.8;
    }

    if (shockwaveRef.current && shockwaveRef.current.scale.x < 4.5) {
      shockwaveRef.current.scale.x += delta * 12;
      shockwaveRef.current.scale.y += delta * 12;
      shockwaveRef.current.scale.z += delta * 12;
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 3.2);
    }
  });

  useEffect(() => {
    if (!celebrationTrigger) return;
    if (shockwaveRef.current) {
      shockwaveRef.current.scale.set(0.1, 0.1, 0.1);
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }
  }, [celebrationTrigger]);

  const metalColor = isFocusing ? '#10B981' : '#34D399';

  return (
    <group scale={[1.1, 1.1, 1.1]}>
      {/* Shockwave */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial color="#10B981" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer Ring */}
      <group ref={outerRingRef}>
        <mesh>
          <torusGeometry args={[1.5, 0.04, 16, 64]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* Mid Ring */}
      <group ref={midRingRef}>
        <mesh>
          <torusGeometry args={[1.2, 0.04, 16, 64]} />
          <meshStandardMaterial color="#FCD34D" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* Inner Ring */}
      <group ref={innerRingRef}>
        <mesh>
          <torusGeometry args={[0.9, 0.04, 16, 64]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* Glowing Chrono Core Sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <MeshDistortMaterial
          color={isFocusing ? "#10B981" : "#34D399"}
          roughness={0.15}
          metalness={0.8}
          distort={isFocusing ? 0.3 : 0.15}
          speed={isFocusing ? 3.0 : 1.5}
          emissive={isFocusing ? "#065F46" : "#042F2E"}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
};

// 4. Orbital Pomodoro Timer Energy Ring
const OrbitalEnergyRing = ({ progress = 0 }: { progress: number }) => {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.55;
      ringRef.current.rotation.x = Math.PI / 3.2;
    }
  });

  const activeColor = useMemo(() => new THREE.Color("#10B981"), []);

  return (
    <group ref={ringRef}>
      {/* Base Track Ring */}
      <Ring args={[2.0, 2.06, 64]}>
        <meshBasicMaterial color="#334155" transparent opacity={0.3} side={THREE.DoubleSide} />
      </Ring>
      
      {/* Active Progress Segment */}
      <Ring args={[1.97, 2.09, 64, 1, 0, Math.PI * 2 * Math.max(0.03, Math.min(1, progress))]}>
        <meshBasicMaterial color={activeColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </Ring>
    </group>
  );
};

// 5. Dynamic Camera Lerp Controller
const CameraFocusController = ({ isFocusing }: { isFocusing: boolean }) => {
  const { camera } = useThree();
  const targetZ = isFocusing ? 4.3 : 5.4;

  useFrame((_, delta) => {
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3, delta);
  });

  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const SpatialFocusScene: React.FC<SpatialFocusSceneProps> = ({
  isFocusing = false,
  focusProgress = 0,
  celebrationTrigger = 0,
  activeTaskCount = 3,
  className = '',
  onSceneClick
}) => {
  const [internalCelebration, setInternalCelebration] = useState(celebrationTrigger);
  const [activeModel, setActiveModel] = useState<Focus3DModelType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('lifeos:focus_3d_model') as Focus3DModelType) || 'hourglass';
    }
    return 'hourglass';
  });

  const handleSelectModel = (model: Focus3DModelType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveModel(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifeos:focus_3d_model', model);
    }
  };

  // Subscribe to global task completion event
  useEffect(() => {
    const handleGlobalTaskDone = () => {
      setInternalCelebration(Date.now());
    };
    window.addEventListener('lifeos:task-completed', handleGlobalTaskDone);
    return () => window.removeEventListener('lifeos:task-completed', handleGlobalTaskDone);
  }, []);

  useEffect(() => {
    if (celebrationTrigger > 0) {
      setInternalCelebration(celebrationTrigger);
    }
  }, [celebrationTrigger]);

  const modelLabels: Record<Focus3DModelType, { name: string; icon: string }> = {
    hourglass: { name: 'Đồng Hồ Cát', icon: '⏳' },
    pomodoro: { name: 'Quả Pomodoro', icon: '🍅' },
    gyro: { name: 'Con Quay Chrono', icon: '⏱️' }
  };

  const fallback2D = (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-emerald-950/20 to-slate-900/40 rounded-2xl border border-emerald-500/20">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-3 shadow-lg shadow-emerald-500/20 animate-pulse">
        {modelLabels[activeModel].icon}
      </div>
      <h4 className="text-sm font-bold text-white">{modelLabels[activeModel].name} 3D</h4>
      <p className="text-xs text-slate-400 mt-1">
        {isFocusing ? 'Trạng thái tập trung sâu đang đếm ngược' : 'Sẵn sàng bước vào phiên làm việc'}
      </p>
    </div>
  );

  const hasExplicitHeight = className && /\bh-\S+/.test(className);
  const defaultHeightClass = hasExplicitHeight ? '' : 'h-[200px] sm:h-[220px]';

  return (
    <div 
      onClick={onSceneClick}
      className={`relative w-full rounded-2xl overflow-hidden select-none ${defaultHeightClass} ${className || ''}`}
    >
      {/* Background Ambient Radial Glow */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-1000"
        style={{
          background: isFocusing
            ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.22) 0%, transparent 68%)'
            : 'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.12) 0%, transparent 65%)'
        }}
      />

      <WebGLErrorBoundary fallback={fallback2D}>
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center text-xs font-mono text-emerald-400/60 animate-pulse">
            ĐANG TẢI ĐỒNG HỒ 3D...
          </div>
        }>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 5.4], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
            {...({ style: { width: '100%', height: '100%', display: 'block' } } as any)}
          >
            <WebGLResourceCleaner />
            <AdaptiveDpr pixelated />
            <CameraFocusController isFocusing={isFocusing} />

            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={2.0} color="#FFFFFF" />
            <pointLight position={[-10, -10, -5]} intensity={2.2} color="#10B981" />

            <PresentationControls
              global={false}
              snap={true}
              speed={1.5}
              zoom={1}
              rotation={[0, 0, 0]}
              polar={[-Math.PI / 5, Math.PI / 5]}
              azimuth={[-Math.PI / 4, Math.PI / 4]}
            >
              <Float speed={2.0} rotationIntensity={0.8} floatIntensity={1.2}>
                {activeModel === 'hourglass' && (
                  <ChronoHourglass 
                    isFocusing={isFocusing} 
                    focusProgress={focusProgress}
                    celebrationTrigger={internalCelebration} 
                  />
                )}
                {activeModel === 'pomodoro' && (
                  <PomodoroCore 
                    isFocusing={isFocusing} 
                    celebrationTrigger={internalCelebration} 
                  />
                )}
                {activeModel === 'gyro' && (
                  <ChronoGyroCore 
                    isFocusing={isFocusing} 
                    celebrationTrigger={internalCelebration} 
                  />
                )}

                <OrbitalEnergyRing progress={focusProgress} />

                {/* Particle sparkles reactive to active tasks count */}
                <Sparkles 
                  count={Math.max(16, Math.min(50, activeTaskCount * 12))} 
                  scale={4} 
                  size={2.2} 
                  speed={0.4} 
                  color="#34D399" 
                />
              </Float>
            </PresentationControls>

            {/* Subtle Post-processing Bloom for Emerald Glow */}
            <EffectComposer multisampling={0}>
              <Bloom 
                luminanceThreshold={0.55} 
                luminanceSmoothing={0.85} 
                intensity={isFocusing ? 1.3 : 0.75} 
              />
            </EffectComposer>
          </Canvas>
        </Suspense>
      </WebGLErrorBoundary>

      {/* Floating State Pill HUD (Left) */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 dark:bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-emerald-400">
        <span className={`w-2 h-2 rounded-full ${isFocusing ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
        <span>
          {isFocusing 
            ? 'ĐANG TẬP TRUNG SÂU' 
            : `${modelLabels[activeModel].icon} ${modelLabels[activeModel].name.toUpperCase()}`
          }
        </span>
      </div>

      {/* 3D Model Switcher Buttons (Right) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-full bg-slate-900/80 dark:bg-black/80 backdrop-blur-md border border-white/10">
        {(['hourglass', 'pomodoro', 'gyro'] as Focus3DModelType[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={(e) => handleSelectModel(m, e)}
            title={modelLabels[m].name}
            className={`px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer ${
              activeModel === m
                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{modelLabels[m].icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpatialFocusScene;
