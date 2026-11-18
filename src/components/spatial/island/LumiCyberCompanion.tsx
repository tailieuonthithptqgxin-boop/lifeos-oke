import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { spatialAudio } from '../sound/SpatialAudioEngine';
import { IslandVibeConfig } from './CyberCozyVibes';

interface LumiCyberCompanionProps {
  vibe: IslandVibeConfig;
  onCompanionClick?: () => void;
}

export const LumiCyberCompanion: React.FC<LumiCyberCompanionProps> = ({
  vibe,
  onCompanionClick
}) => {
  const companionRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Mesh>(null);
  const eyeLeftRef = useRef<THREE.Mesh>(null);
  const eyeRightRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [speechBubble, setSpeechBubble] = useState('Chào bạn! Mình là Bé Lumi ✨');

  // Periodic Cute Dialogue
  useEffect(() => {
    const dialogues = [
      'Chào bạn! Mình là Bé Lumi ✨',
      'Đã hoàn thành 3 mục tiêu chưa nào? 🎯',
      'Đang ở Flowtime 25 phút nè ☕',
      'Đừng quên uống nước nhé 💧',
      'Nhấp vào một trạm bất kỳ để khám phá 🚀'
    ];
    const timer = setInterval(() => {
      const nextMsg = dialogues[Math.floor(Math.random() * dialogues.length)];
      setSpeechBubble(nextMsg);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // Blinking eyes logic
  const blinkStateRef = useRef(1);
  const blinkTimerRef = useRef(0);

  useFrame(({ pointer }, delta) => {
    // 1. Smooth Head Look-At Cursor
    if (headRef.current) {
      const targetRotY = pointer.x * 0.45;
      const targetRotX = -pointer.y * 0.3;
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetRotY, delta * 6);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetRotX, delta * 6);
    }

    // 2. Antenna Pulse
    if (antennaRef.current) {
      antennaRef.current.rotation.y += delta * 2.5;
    }

    // 3. Eye Blinking Loop
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > 3.5) {
      blinkStateRef.current = 0.1; // close eye
      if (blinkTimerRef.current > 3.7) {
        blinkStateRef.current = 1; // reopen
        blinkTimerRef.current = 0;
      }
    }
    if (eyeLeftRef.current && eyeRightRef.current) {
      eyeLeftRef.current.scale.y = blinkStateRef.current;
      eyeRightRef.current.scale.y = blinkStateRef.current;
    }

    // 4. Click Bounce Animation
    if (companionRef.current && bouncing) {
      companionRef.current.rotation.y += delta * 8;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    spatialAudio.playSelectSound();
    setBouncing(true);
    setSpeechBubble('Yeah! Sẵn sàng chinh phục mục tiêu! 🎉');
    setTimeout(() => setBouncing(false), 900);
    if (onCompanionClick) onCompanionClick();
  };

  return (
    <group position={[0, 1.45, 0]}>
      <Float speed={2.5} rotationIntensity={0.25} floatIntensity={0.5}>
        <group
          ref={companionRef}
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
          onClick={handleClick}
          scale={hovered ? 1.12 : 1.0}
        >
          {/* Head & Body Group */}
          <group ref={headRef}>
            {/* Robot Head (Cute rounded box) */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.9, 0.78, 0.78]} />
              <meshStandardMaterial
                color="#FFFFFF"
                roughness={0.15}
                metalness={0.2}
              />
            </mesh>

            {/* Glossy Black Face Screen */}
            <mesh position={[0, 0.02, 0.4]}>
              <planeGeometry args={[0.76, 0.52]} />
              <meshBasicMaterial color="#0A0F1D" />
            </mesh>

            {/* Left Eye (Kawaii Glowing Pill) */}
            <mesh ref={eyeLeftRef} position={[-0.2, 0.04, 0.405]}>
              <planeGeometry args={[0.16, 0.22]} />
              <meshBasicMaterial color={vibe.neonAccentHex} />
            </mesh>

            {/* Right Eye (Kawaii Glowing Pill) */}
            <mesh ref={eyeRightRef} position={[0.2, 0.04, 0.405]}>
              <planeGeometry args={[0.16, 0.22]} />
              <meshBasicMaterial color={vibe.neonAccentHex} />
            </mesh>

            {/* Cute Cheek Blushes */}
            <mesh position={[-0.28, -0.1, 0.405]}>
              <circleGeometry args={[0.045, 16]} />
              <meshBasicMaterial color="#FB7185" transparent opacity={0.65} />
            </mesh>
            <mesh position={[0.28, -0.1, 0.405]}>
              <circleGeometry args={[0.045, 16]} />
              <meshBasicMaterial color="#FB7185" transparent opacity={0.65} />
            </mesh>

            {/* Antenna Rod */}
            <mesh position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
              <meshStandardMaterial color="#94A3B8" metalness={0.8} />
            </mesh>

            {/* Glowing Star/Sphere on Antenna */}
            <mesh ref={antennaRef} position={[0, 0.62, 0]}>
              <octahedronGeometry args={[0.09, 0]} />
              <meshStandardMaterial
                color={vibe.neonAccentHex}
                emissive={vibe.neonAccentHex}
                emissiveIntensity={2.0}
              />
            </mesh>

            {/* Left Ear Phone */}
            <mesh position={[-0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
              <meshStandardMaterial color={vibe.neonSecondaryHex} metalness={0.6} />
            </mesh>

            {/* Right Ear Phone */}
            <mesh position={[0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
              <meshStandardMaterial color={vibe.neonSecondaryHex} metalness={0.6} />
            </mesh>
          </group>

          {/* Under-Body Anti-Gravity Levitation Orb */}
          <mesh position={[0, -0.48, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial
              color={vibe.neonAccentHex}
              emissive={vibe.neonAccentHex}
              emissiveIntensity={1.2}
            />
          </mesh>

          {/* Floating Speech Bubble HUD */}
          <Html position={[0, 1.15, 0]} center distanceFactor={12} className="pointer-events-none select-none">
            <div className={`px-3 py-1.5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap ${
              hovered
                ? 'bg-black/90 border-[#CCFF00] scale-105 shadow-[#CCFF00]/25'
                : 'bg-black/75 border-white/10 scale-100'
            }`}>
              <span className="text-xs">🤖</span>
              <span className="text-[11px] font-bold text-white tracking-wide">
                {speechBubble}
              </span>
            </div>
          </Html>
        </group>
      </Float>
    </group>
  );
};

export default LumiCyberCompanion;
