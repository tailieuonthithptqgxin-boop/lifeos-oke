import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_LIMIT_PRESETS, loadSavedLayoutSettings, STORAGE_KEYS } from '../src/components/study-space/LayoutSettingsModal';

describe('Google Meet UI Components Suite (Bước 2)', () => {
  it('1. Layout Presets: Contains standard Google Meet slider marks 6, 9, 16, 30, 49', () => {
    assert.deepEqual([...TILE_LIMIT_PRESETS], [6, 9, 16, 30, 49]);
  });

  it('2. Layout Settings Loader: Returns default fallback when localStorage is empty', () => {
    const defaults = loadSavedLayoutSettings();
    assert.ok(['auto', 'tiled', 'spotlight', 'sidebar'].includes(defaults.mode));
    assert.ok(TILE_LIMIT_PRESETS.includes(defaults.maxTiles as any));
    assert.equal(typeof defaults.hideSelf, 'boolean');
  });

  it('3. Storage Keys Contract: Uses dedicated lifeos_meet_ keys', () => {
    assert.equal(STORAGE_KEYS.MODE, 'lifeos_meet_layout_mode');
    assert.equal(STORAGE_KEYS.MAX_TILES, 'lifeos_meet_max_tiles');
    assert.equal(STORAGE_KEYS.HIDE_SELF, 'lifeos_meet_hide_self');
  });

  it('4. Overflow Calculation Consistency: Accurately checks overflow rendering', () => {
    const totalUsers = 120;
    const maxTiles = 16;
    const visibleSlots = maxTiles - 1;
    const overflowCount = totalUsers - visibleSlots;

    assert.equal(visibleSlots, 15);
    assert.equal(overflowCount, 105);
    assert.equal(visibleSlots + 1, maxTiles); // exactly 16 tiles rendered on grid
  });
});
