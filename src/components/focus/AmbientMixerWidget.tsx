import React, { useState, useEffect } from 'react';
import { ambientSoundMixer } from '../../lib/ambientSoundMixer';
import { CloudRain, Coffee, Keyboard, Waves, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';

interface TrackItem {
  id: 'rain' | 'cafe' | 'keyboard' | 'binaural';
  name: string;
  icon: any;
  color: string;
  desc: string;
}

const TRACKS: TrackItem[] = [
  { id: 'rain', name: 'Mưa rào', icon: CloudRain, color: '#38bdf8', desc: 'Mưa hồng dịu êm' },
  { id: 'cafe', name: 'Quán Cafe', icon: Coffee, color: '#f59e0b', desc: 'Không gian ấm cúng' },
  { id: 'keyboard', name: 'Phím cơ', icon: Keyboard, color: '#a855f7', desc: 'Âm gõ thocky thư giãn' },
  { id: 'binaural', name: 'Sóng Alpha', icon: Waves, color: '#10b981', desc: '10Hz kích hoạt siêu tập trung' },
];

export function AmbientMixerWidget() {
  const [tracksState, setTracksState] = useState<Record<string, { active: boolean; volume: number }>>({
    rain: { active: false, volume: 0.5 },
    cafe: { active: false, volume: 0.4 },
    keyboard: { active: false, volume: 0.3 },
    binaural: { active: false, volume: 0.4 }
  });

  const syncState = () => {
    setTracksState({
      rain: ambientSoundMixer.getTrackState('rain'),
      cafe: ambientSoundMixer.getTrackState('cafe'),
      keyboard: ambientSoundMixer.getTrackState('keyboard'),
      binaural: ambientSoundMixer.getTrackState('binaural'),
    });
  };

  useEffect(() => {
    syncState();
  }, []);

  const handleToggle = (id: 'rain' | 'cafe' | 'keyboard' | 'binaural') => {
    soundEngine.playPop();
    ambientSoundMixer.toggleTrack(id);
    syncState();
  };

  const handleVolumeChange = (id: 'rain' | 'cafe' | 'keyboard' | 'binaural', val: number) => {
    ambientSoundMixer.setTrackVolume(id, val);
    syncState();
  };

  const handleStopAll = () => {
    soundEngine.playPop();
    ambientSoundMixer.stopAll();
    syncState();
  };

  const isAnyActive = Object.values(tracksState).some((t: any) => Boolean(t?.active));

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <Waves className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Ambient Sound Mixer
            </h4>
            <p className="text-[10px] text-slate-400">Trộn đa tầng âm thanh môi trường 0ms offline</p>
          </div>
        </div>
        {isAnyActive && (
          <button
            type="button"
            onClick={handleStopAll}
            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
          >
            Tắt tất cả
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
        {TRACKS.map(t => {
          const state = tracksState[t.id];
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className={`p-3 rounded-xl border transition-all ${
                state.active
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-indigo-500/40 shadow-xs'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => handleToggle(t.id)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <span
                    className="p-1.5 rounded-lg transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${t.color}20`, color: t.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.name}</p>
                    <p className="text-[9px] text-slate-400">{t.desc}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(t.id)}
                  className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
                    state.active
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {state.active && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 mt-2">
                <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.volume}
                  disabled={!state.active}
                  onChange={e => handleVolumeChange(t.id, parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-30"
                />
                <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                  {Math.round(state.volume * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
