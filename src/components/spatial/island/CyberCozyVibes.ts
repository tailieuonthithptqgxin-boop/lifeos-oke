import * as THREE from 'three';

export type IslandVibeMode = 'midnight' | 'sunset_lofi' | 'acid_cyber';

export interface IslandVibeConfig {
  id: IslandVibeMode;
  name: string;
  emoji: string;
  bgHex: string;
  fogHex: string;
  islandPlatformHex: string;
  ambientLightHex: string;
  ambientIntensity: number;
  sunLightHex: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  neonAccentHex: string;
  neonSecondaryHex: string;
  rimLightHex: string;
}

export const ISLAND_VIBES: Record<IslandVibeMode, IslandVibeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'Cyber Midnight',
    emoji: '🌙',
    bgHex: '#07090E',
    fogHex: '#07090E',
    islandPlatformHex: '#0B1120',
    ambientLightHex: '#1E293B',
    ambientIntensity: 0.65,
    sunLightHex: '#38BDF8',
    sunIntensity: 1.8,
    sunPosition: [8, 12, 6],
    neonAccentHex: '#10B981',      // Emerald
    neonSecondaryHex: '#06B6D4',    // Cyan
    rimLightHex: '#34D399'
  },
  sunset_lofi: {
    id: 'sunset_lofi',
    name: 'Sunset Lo-Fi Cozy',
    emoji: '🌅',
    bgHex: '#180B24',
    fogHex: '#180B24',
    islandPlatformHex: '#251239',
    ambientLightHex: '#4C1D95',
    ambientIntensity: 0.8,
    sunLightHex: '#FF7E5F',
    sunIntensity: 2.2,
    sunPosition: [-10, 8, -6],
    neonAccentHex: '#FEB47B',      // Peach Gold
    neonSecondaryHex: '#F43F5E',    // Rose Sunset
    rimLightHex: '#FBBF24'
  },
  acid_cyber: {
    id: 'acid_cyber',
    name: 'Acid Cyberpunk',
    emoji: '⚡',
    bgHex: '#06070A',
    fogHex: '#06070A',
    islandPlatformHex: '#0F1017',
    ambientLightHex: '#181A2A',
    ambientIntensity: 0.6,
    sunLightHex: '#CCFF00',
    sunIntensity: 2.0,
    sunPosition: [6, 14, 8],
    neonAccentHex: '#CCFF00',      // Acid Lime
    neonSecondaryHex: '#7B2CBF',    // Electric Violet
    rimLightHex: '#A855F7'
  }
};
