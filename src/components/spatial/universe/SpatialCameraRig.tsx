import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

interface SpatialCameraRigProps {
  onTelemetryUpdate?: (telemetry: {
    x: number;
    y: number;
    z: number;
    currentZone: number;
    scrollOffset: number;
  }) => void;
  targetJumpOffset?: number | null;
  onJumpComplete?: () => void;
}

export const SpatialCameraRig: React.FC<SpatialCameraRigProps> = ({
  onTelemetryUpdate,
  targetJumpOffset,
  onJumpComplete
}) => {
  const { camera } = useThree();
  const scroll = useScroll();

  // Curated 3D Spline Path across the 4 Universe Zones
  const { cameraCurve, lookAtCurve } = useMemo(() => {
    // Camera positions:
    // Zone 1: Hero Portal
    // Zone 2: Feature Islands
    // Zone 3: 3D Bento Showcase
    // Zone 4: Quantum Singularity CTA
    const camPoints = [
      new THREE.Vector3(0, 0.5, 7.5),     // Zone 1 (Hero)
      new THREE.Vector3(2.5, 1.8, -6.5),  // Zone 2 (Feature Islands)
      new THREE.Vector3(-2.2, 1.5, -19.5),// Zone 3 (Bento Showcase)
      new THREE.Vector3(0, 0.2, -31.5)    // Zone 4 (CTA Core)
    ];

    const lookPoints = [
      new THREE.Vector3(0, 0, 0),         // Looking at Hero
      new THREE.Vector3(0, 0.5, -12),     // Looking at Feature Islands
      new THREE.Vector3(0, 0, -25),       // Looking at Bento Showcase
      new THREE.Vector3(0, 0, -38)        // Looking at CTA Core
    ];

    return {
      cameraCurve: new THREE.CatmullRomCurve3(camPoints, false, 'catmullrom', 0.2),
      lookAtCurve: new THREE.CatmullRomCurve3(lookPoints, false, 'catmullrom', 0.2)
    };
  }, []);

  const currentLookAt = useRef(new THREE.Vector3());

  useFrame(({ pointer }, delta) => {
    // Current normalized scroll progress between 0 and 1
    let offset = scroll ? scroll.offset : 0;

    // Handle Quick-Jump navigation smoothly if requested by HUD
    if (targetJumpOffset !== null && targetJumpOffset !== undefined && scroll) {
      if (scroll.el) {
        const targetScroll = targetJumpOffset * (scroll.el.scrollHeight - scroll.el.clientHeight);
        scroll.el.scrollTop = THREE.MathUtils.lerp(scroll.el.scrollTop, targetScroll, delta * 6);
        if (Math.abs(scroll.el.scrollTop - targetScroll) < 5) {
          onJumpComplete?.();
        }
      }
    }

    // Clamp progress
    const t = Math.max(0, Math.min(1, offset));

    // Calculate spline positions
    const targetCamPos = cameraCurve.getPointAt(t);
    const targetLookAt = lookAtCurve.getPointAt(t);

    // Apply subtle mouse parallax to camera position
    const parallaxX = pointer.x * 0.45;
    const parallaxY = pointer.y * 0.35;
    targetCamPos.x += parallaxX;
    targetCamPos.y += parallaxY;

    // Smooth camera position interpolation
    camera.position.lerp(targetCamPos, delta * 4);

    // Smooth lookAt target interpolation
    currentLookAt.current.lerp(targetLookAt, delta * 4);
    camera.lookAt(currentLookAt.current);

    // Identify current zone (0: Hero, 1: Islands, 2: Bento, 3: CTA Core)
    const currentZone = t < 0.25 ? 0 : t < 0.55 ? 1 : t < 0.85 ? 2 : 3;

    // Telemetry update to HUD
    if (onTelemetryUpdate) {
      onTelemetryUpdate({
        x: parseFloat(camera.position.x.toFixed(2)),
        y: parseFloat(camera.position.y.toFixed(2)),
        z: parseFloat(camera.position.z.toFixed(2)),
        currentZone,
        scrollOffset: t
      });
    }
  });

  return null;
};

export default SpatialCameraRig;
