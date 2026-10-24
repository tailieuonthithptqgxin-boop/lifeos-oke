import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { youtubeMusicService, CURATED_FOCUS_TRACKS } from '../src/lib/youtubeMusicEngine.js';

describe('Focus Mode Audio Engine & Volume Control Test Suite', () => {

  beforeEach(() => {
    // Reset test state to known defaults
    youtubeMusicService.setVolume(70);
    if (youtubeMusicService.getState().isMuted) {
      youtubeMusicService.toggleMute();
    }
    youtubeMusicService.pause();
  });

  it('1. Initial volume is initialized within bounds (0-100) and defaults gracefully', () => {
    const state = youtubeMusicService.getState();
    assert.ok(typeof state.volume === 'number');
    assert.ok(state.volume >= 0 && state.volume <= 100);
    assert.strictEqual(state.isMuted, false);
    assert.ok(state.currentTrack);
    assert.ok(state.currentTrack.id.length > 0);
  });

  it('2. Volume adjustment via step (+5% / -5%) operates accurately and clamps bounds', () => {
    youtubeMusicService.setVolume(60);
    assert.strictEqual(youtubeMusicService.getState().volume, 60);

    // Increase by 5%
    youtubeMusicService.adjustVolume(5);
    assert.strictEqual(youtubeMusicService.getState().volume, 65);

    // Increase by another 10%
    youtubeMusicService.adjustVolume(10);
    assert.strictEqual(youtubeMusicService.getState().volume, 75);

    // Decrease by 5%
    youtubeMusicService.adjustVolume(-5);
    assert.strictEqual(youtubeMusicService.getState().volume, 70);

    // Upper boundary test: cannot exceed 100%
    youtubeMusicService.setVolume(98);
    youtubeMusicService.adjustVolume(5);
    assert.strictEqual(youtubeMusicService.getState().volume, 100);

    // Further increase stays capped at 100%
    youtubeMusicService.adjustVolume(15);
    assert.strictEqual(youtubeMusicService.getState().volume, 100);

    // Lower boundary test: cannot go below 0%
    youtubeMusicService.setVolume(3);
    youtubeMusicService.adjustVolume(-5);
    assert.strictEqual(youtubeMusicService.getState().volume, 0);

    // Further decrease stays clamped at 0%
    youtubeMusicService.adjustVolume(-20);
    assert.strictEqual(youtubeMusicService.getState().volume, 0);
  });

  it('3. Mute and Unmute behaviors: zero volume mutes, and unmute restores previous valid volume', () => {
    // Set to 60%
    youtubeMusicService.setVolume(60);
    assert.strictEqual(youtubeMusicService.getState().isMuted, false);
    assert.strictEqual(youtubeMusicService.getState().volume, 60);

    // Toggle mute
    youtubeMusicService.toggleMute();
    let state = youtubeMusicService.getState();
    assert.strictEqual(state.isMuted, true);
    assert.strictEqual(state.previousVolume, 60);

    // Toggle unmute -> should restore 60%
    youtubeMusicService.toggleMute();
    state = youtubeMusicService.getState();
    assert.strictEqual(state.isMuted, false);
    assert.strictEqual(state.volume, 60);

    // Setting volume to 0 directly triggers mute
    youtubeMusicService.setVolume(0);
    state = youtubeMusicService.getState();
    assert.strictEqual(state.isMuted, true);
    assert.strictEqual(state.volume, 0);

    // Increasing volume via adjustVolume(+5) un-mutes automatically
    youtubeMusicService.adjustVolume(5);
    state = youtubeMusicService.getState();
    assert.strictEqual(state.isMuted, false);
    assert.strictEqual(state.volume, 5);
  });

  it('4. Audio continuity: changing volume or muting does NOT alter isPlaying state', () => {
    // Case A: Playing
    youtubeMusicService.play();
    assert.strictEqual(youtubeMusicService.getState().isPlaying, true);

    // Change volume while playing
    youtubeMusicService.setVolume(45);
    assert.strictEqual(youtubeMusicService.getState().isPlaying, true, 'Volume change while playing must preserve playback');

    youtubeMusicService.adjustVolume(10);
    assert.strictEqual(youtubeMusicService.getState().isPlaying, true, 'adjustVolume must not pause audio');

    youtubeMusicService.toggleMute();
    assert.strictEqual(youtubeMusicService.getState().isPlaying, true, 'Mute must not pause playback');

    youtubeMusicService.toggleMute();
    assert.strictEqual(youtubeMusicService.getState().isPlaying, true, 'Unmute must not pause playback');

    // Case B: Paused
    youtubeMusicService.pause();
    assert.strictEqual(youtubeMusicService.getState().isPlaying, false);

    youtubeMusicService.setVolume(80);
    assert.strictEqual(youtubeMusicService.getState().isPlaying, false, 'Volume change while paused must stay paused');

    youtubeMusicService.adjustVolume(-5);
    assert.strictEqual(youtubeMusicService.getState().isPlaying, false, 'adjustVolume while paused must stay paused');

    youtubeMusicService.toggleMute();
    assert.strictEqual(youtubeMusicService.getState().isPlaying, false, 'Muting while paused must stay paused');
  });

  it('5. Event subscriber notifications: listeners receive immediate and synchronized state updates', () => {
    let notifiedState: any = null;
    let callCount = 0;

    const unsubscribe = youtubeMusicService.subscribe((state) => {
      notifiedState = state;
      callCount++;
    });

    // Initial subscribe call
    assert.ok(notifiedState !== null);
    assert.strictEqual(callCount, 1);

    // Changing volume fires listener
    youtubeMusicService.setVolume(55);
    assert.strictEqual(notifiedState.volume, 55);
    assert.strictEqual(callCount, 2);

    // Toggling play fires listener
    youtubeMusicService.play();
    assert.strictEqual(notifiedState.isPlaying, true);
    assert.strictEqual(callCount, 3);

    // Unsubscribe stops notifications
    unsubscribe();
    youtubeMusicService.setVolume(85);
    assert.strictEqual(notifiedState.volume, 55, 'Detached listener must not be called after unsubscribe');
  });

  it('6. Track selection and playlist navigation preserve volume and playback settings', () => {
    youtubeMusicService.setVolume(65);
    youtubeMusicService.play();

    const trackB = CURATED_FOCUS_TRACKS[1];
    youtubeMusicService.loadTrack(trackB, true);

    const state = youtubeMusicService.getState();
    assert.strictEqual(state.currentTrack.id, trackB.id);
    assert.strictEqual(state.volume, 65, 'Volume must be preserved across track changes');
    assert.strictEqual(state.isPlaying, true, 'Playback must continue on new track if requested');
  });

});
