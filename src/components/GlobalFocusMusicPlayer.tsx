import React, { useEffect, useRef } from 'react';
import { youtubeMusicService, useFocusMusic } from '../lib/youtubeMusicEngine';

/**
 * GlobalFocusMusicPlayer
 * Mounted once at the application root (App.tsx).
 * Keeps the audio engine running continuously across route transitions,
 * fullscreen toggles, and panel collapses without ever resetting or stopping.
 */
export function GlobalFocusMusicPlayer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { currentTrack, isPlaying, isMuted, volume } = useFocusMusic();
  const lastTrackIdRef = useRef<string>(currentTrack.id);

  useEffect(() => {
    youtubeMusicService.registerIframe(iframeRef.current);
    return () => {
      youtubeMusicService.registerIframe(null);
    };
  }, []);

  const handleIframeLoad = () => {
    // When the iframe finishes loading, immediately sync settings
    youtubeMusicService.syncIframeSettings();
  };

  return (
    <div 
      aria-hidden="true" 
      className="hidden-audio-container pointer-events-none fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 z-[-1]"
    >
      <iframe
        id="lifeos-global-focus-music-iframe"
        ref={iframeRef}
        key={currentTrack.id}
        src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?enablejsapi=1&autoplay=${isPlaying ? '1' : '0'}&mute=${isMuted ? '1' : '0'}&rel=0&controls=0&modestbranding=1`}
        title="LifeOS Global Focus Music Engine"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        onLoad={handleIframeLoad}
        className="w-1 h-1 pointer-events-none opacity-0"
      />
    </div>
  );
}
