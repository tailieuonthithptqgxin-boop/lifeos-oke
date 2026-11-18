import * as THREE from 'three';

export type SpatialThemeMode = 'cyber_zen' | 'acid_neon' | 'hologram_chrome';

export interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  fog: string;
  glassTransmission: number;
  roughness: number;
  metalness: number;
}

export const SPATIAL_PALETTES: Record<SpatialThemeMode, ThemePalette> = {
  cyber_zen: {
    primary: '#10B981',       // Emerald
    secondary: '#34D399',     // Mint
    accent: '#064E3B',        // Deep forest
    background: '#07090E',    // Obsidian
    fog: '#07090E',
    glassTransmission: 0.88,
    roughness: 0.12,
    metalness: 0.25
  },
  acid_neon: {
    primary: '#CCFF00',       // Acid Lime
    secondary: '#7B2CBF',     // Electric Violet
    accent: '#00F0FF',        // Cyber Cyan
    background: '#07070C',    // Deep Void Obsidian
    fog: '#07070C',
    glassTransmission: 0.82,
    roughness: 0.18,
    metalness: 0.65
  },
  hologram_chrome: {
    primary: '#E0E7FF',       // Platinum White
    secondary: '#818CF8',     // Iridescent Indigo
    accent: '#F472B6',        // Neon Pink
    background: '#050508',    // Jet Black
    fog: '#050508',
    glassTransmission: 0.95,
    roughness: 0.04,
    metalness: 0.98
  }
};

// 1. Procedural Holographic Iridescent Custom Shader Material
export function createHolographicMaterial(colorA: string = '#7B2CBF', colorB: string = '#CCFF00') {
  const uniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uFresnelPower: { value: 2.5 }
  };

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    uniform float uTime;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Subtle vertex undulation for liquid glass sensation
      vec3 pos = position;
      float displacement = sin(pos.y * 3.5 + uTime * 2.0) * cos(pos.x * 3.5 + uTime * 1.5) * 0.04;
      pos += normal * displacement;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uFresnelPower;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Fresnel rim calculation
      float fresnel = 1.0 - abs(dot(normal, viewDir));
      fresnel = pow(fresnel, uFresnelPower);

      // Iridescent chromatic gradient blend based on view angle and time
      float wave = sin(vUv.y * 6.28 + uTime * 1.2) * 0.5 + 0.5;
      vec3 iridColor = mix(uColorA, uColorB, wave);

      // Final emission with neon rim boost
      vec3 finalColor = iridColor * (0.35 + fresnel * 1.8);
      float alpha = clamp(0.45 + fresnel * 0.55, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// 2. Liquid Chrome Specular Material
export function createChromeMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    metalness: 0.98,
    roughness: 0.06,
    envMapIntensity: 2.5
  });
}

// 3. VisionOS Frosted Physical Glass Material
export function createFrostedGlassMaterial(color: string = '#FFFFFF', opacity: number = 0.85) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    transmission: 0.92,
    opacity,
    transparent: true,
    roughness: 0.12,
    ior: 1.52,
    thickness: 1.2,
    reflectivity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08
  });
}
