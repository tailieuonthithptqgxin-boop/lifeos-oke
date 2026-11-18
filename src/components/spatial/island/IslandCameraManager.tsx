import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import gsap from 'gsap';
import { IslandStationData } from './IslandStations';

interface IslandCameraManagerProps {
  activeStation: IslandStationData | null;
  onResetComplete?: () => void;
}

export const IslandCameraManager: React.FC<IslandCameraManagerProps> = ({
  activeStation,
  onResetComplete
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Default Isometric Overview Camera Position & Target
  const defaultPosition = [8.5, 6.8, 8.5];
  const defaultTarget = [0, 0, 0];

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    if (activeStation) {
      // Station Close-Up Flight via GSAP Tween
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);

      gsap.to(camera.position, {
        x: activeStation.cameraPosition[0],
        y: activeStation.cameraPosition[1],
        z: activeStation.cameraPosition[2],
        duration: 1.25,
        ease: 'power3.out'
      });

      gsap.to(controls.target, {
        x: activeStation.cameraTarget[0],
        y: activeStation.cameraTarget[1],
        z: activeStation.cameraTarget[2],
        duration: 1.25,
        ease: 'power3.out',
        onUpdate: () => controls.update()
      });
    } else {
      // Reset Camera back to Isometric Overview
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);

      gsap.to(camera.position, {
        x: defaultPosition[0],
        y: defaultPosition[1],
        z: defaultPosition[2],
        duration: 1.2,
        ease: 'power3.inOut'
      });

      gsap.to(controls.target, {
        x: defaultTarget[0],
        y: defaultTarget[1],
        z: defaultTarget[2],
        duration: 1.2,
        ease: 'power3.inOut',
        onUpdate: () => controls.update(),
        onComplete: () => {
          onResetComplete?.();
        }
      });
    }
  }, [activeStation, camera]);

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={0.8}
      minDistance={3.5}
      maxDistance={15.0}
      minPolarAngle={Math.PI / 6}          // Prevent looking directly down from above
      maxPolarAngle={Math.PI / 2.15}       // Prevent flipping beneath the island platform
      autoRotate={!activeStation}
      autoRotateSpeed={0.5}
    />
  );
};

export default IslandCameraManager;
