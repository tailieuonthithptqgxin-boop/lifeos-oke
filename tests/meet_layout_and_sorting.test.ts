import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper function implementing the core math of useMeetGridLayout for pure testing
function calculateMeetGrid(
  W: number,
  H: number,
  tileCount: number,
  mode: 'auto' | 'tiled' | 'spotlight' | 'sidebar' = 'auto',
  aspectRatio: number = 16 / 9,
  gap: number = 8,
  maxColumns: number = 7
) {
  if (tileCount <= 0 || W <= 0 || H <= 0) {
    return { columns: 1, rows: 1, tileWidth: W, tileHeight: H };
  }

  if (mode === 'spotlight') {
    return { columns: 1, rows: 1, tileWidth: W, tileHeight: H };
  }

  if (mode === 'sidebar') {
    return { columns: 1, rows: tileCount, tileWidth: W, tileHeight: Math.floor(H / tileCount) };
  }

  let bestCols = 1;
  let bestRows = 1;
  let maxArea = 0;
  let bestTileW = 0;
  let bestTileH = 0;

  const maxCandidateCols = Math.min(tileCount, maxColumns, 8);

  for (let c = 1; c <= maxCandidateCols; c++) {
    const r = Math.ceil(tileCount / c);
    const totalGapW = (c - 1) * gap;
    const totalGapH = (r - 1) * gap;

    const availW = (W - totalGapW) / c;
    const availH = (H - totalGapH) / r;

    if (availW <= 0 || availH <= 0) continue;

    let tileW: number;
    let tileH: number;

    if (availW / availH > aspectRatio) {
      tileH = availH;
      tileW = tileH * aspectRatio;
    } else {
      tileW = availW;
      tileH = tileW / aspectRatio;
    }

    const area = tileW * tileH;
    if (area > maxArea) {
      maxArea = area;
      bestCols = c;
      bestRows = r;
      bestTileW = tileW;
      bestTileH = tileH;
    }
  }

  return {
    columns: bestCols,
    rows: bestRows,
    tileWidth: Math.round(bestTileW),
    tileHeight: Math.round(bestTileH),
  };
}

// Helper sorting function implementing useSortedParticipants logic for testing
function sortAndPartitionParticipants(
  participants: any[],
  pinnedIds: string[],
  friendIds: Set<string>,
  maxTiles: number,
  options: { selfId?: string; hideSelf?: boolean; searchQuery?: string } = {}
) {
  const { selfId, hideSelf = false, searchQuery = '' } = options;
  const query = searchQuery.trim().toLowerCase();

  const filtered = query
    ? participants.filter((p) => (p.name || '').toLowerCase().includes(query))
    : [...participants];

  let selfItem: any = null;
  const nonSelfList: any[] = [];

  for (const p of filtered) {
    if (p.isSelf || (selfId && p.id === selfId)) {
      selfItem = p;
    } else {
      nonSelfList.push(p);
    }
  }

  const nonSelfMap = new Map<string, any>();
  for (const p of nonSelfList) {
    nonSelfMap.set(p.id, p);
  }

  const tierPinned: any[] = [];
  for (const pId of pinnedIds.slice(0, 6)) {
    const match = nonSelfMap.get(pId);
    if (match) {
      tierPinned.push(match);
      nonSelfMap.delete(pId);
    }
  }

  const tierFriends: any[] = [];
  const tierFocusing: any[] = [];
  const tierOthers: any[] = [];

  for (const p of nonSelfMap.values()) {
    const isFriend = p.isFriend || friendIds.has(p.id);
    const isFocusing = p.presence === 'FOCUS' || p.presence === 'STUDYING';

    if (isFriend) {
      tierFriends.push(p);
    } else if (isFocusing) {
      tierFocusing.push(p);
    } else {
      tierOthers.push(p);
    }
  }

  const combined: any[] = [];
  if (selfItem && !hideSelf) {
    combined.push(selfItem);
  }
  combined.push(...tierPinned, ...tierFriends, ...tierFocusing, ...tierOthers);

  const limit = Math.max(1, maxTiles);
  const total = combined.length;

  if (total <= limit) {
    return {
      visible: combined,
      overflow: [],
      overflowCount: 0,
      hasOverflow: false,
      allSorted: combined,
    };
  }

  const visibleSlots = limit - 1;
  const visible = combined.slice(0, visibleSlots);
  const overflow = combined.slice(visibleSlots);

  return {
    visible,
    overflow,
    overflowCount: total - visibleSlots,
    hasOverflow: true,
    allSorted: combined,
  };
}

describe('Google Meet Layout Engine & Sorting Suite (Bước 1)', () => {
  it('1. Grid Calculation: Adapts columns and rows across standard resolutions', () => {
    // 1920x1080 (16:9 widescreen) for 6 tiles -> should be 3 cols x 2 rows
    const res6 = calculateMeetGrid(1920, 1080, 6);
    assert.equal(res6.columns, 3);
    assert.equal(res6.rows, 2);

    // 1920x1080 for 16 tiles -> should be 4 cols x 4 rows
    const res16 = calculateMeetGrid(1920, 1080, 16);
    assert.equal(res16.columns, 4);
    assert.equal(res16.rows, 4);

    // 1920x1080 for 49 tiles -> should be 7 cols x 7 rows
    const res49 = calculateMeetGrid(1920, 1080, 49, 'auto', 16 / 9, 8, 7);
    assert.equal(res49.columns, 7);
    assert.equal(res49.rows, 7);
  });

  it('2. Layout Modes: Spotlight and Sidebar behaviors', () => {
    const spotlight = calculateMeetGrid(1280, 720, 16, 'spotlight');
    assert.equal(spotlight.columns, 1);
    assert.equal(spotlight.rows, 1);

    const sidebar = calculateMeetGrid(320, 720, 5, 'sidebar');
    assert.equal(sidebar.columns, 1);
    assert.equal(sidebar.rows, 5);
  });

  it('3. Priority Sorting: Enforces Self -> Pinned -> Friends -> Focusing -> Others', () => {
    const participants = [
      { id: 'user_other', name: 'Other User', presence: 'BREAK' },
      { id: 'user_focus', name: 'Focus User', presence: 'STUDYING' },
      { id: 'user_self', name: 'My Self', isSelf: true },
      { id: 'user_pinned', name: 'Pinned User', presence: 'BREAK' },
      { id: 'user_friend', name: 'Friend User', presence: 'BREAK' },
    ];

    const pinnedIds = ['user_pinned'];
    const friendIds = new Set(['user_friend']);

    const { allSorted } = sortAndPartitionParticipants(participants, pinnedIds, friendIds, 16, {
      selfId: 'user_self',
    });

    assert.equal(allSorted[0].id, 'user_self');    // 1. Self
    assert.equal(allSorted[1].id, 'user_pinned');  // 2. Pinned
    assert.equal(allSorted[2].id, 'user_friend');  // 3. Friend
    assert.equal(allSorted[3].id, 'user_focus');   // 4. Focusing
    assert.equal(allSorted[4].id, 'user_other');   // 5. Other
  });

  it('4. Overflow Calculation: 120 users on 16 tiles yields 15 visible + 105 in overflow tile', () => {
    const mock120 = Array.from({ length: 120 }, (_, i) => ({
      id: `u_${i + 1}`,
      name: `Student ${i + 1}`,
      presence: i % 2 === 0 ? 'STUDYING' : 'BREAK',
      isSelf: i === 0,
    }));

    const result = sortAndPartitionParticipants(mock120, [], new Set(), 16);

    assert.equal(result.hasOverflow, true);
    assert.equal(result.visible.length, 15);       // 15 rendered + 1 overflow slot = 16 tiles
    assert.equal(result.overflowCount, 105);       // Exactly 105 remaining in "+105 người khác"
    assert.equal(result.overflow.length, 105);
  });

  it('5. Hide Self toggle: When true, omits self from grid', () => {
    const participants = [
      { id: 'u_self', name: 'My Self', isSelf: true },
      { id: 'u_1', name: 'Student 1' },
      { id: 'u_2', name: 'Student 2' },
    ];

    const result = sortAndPartitionParticipants(participants, [], new Set(), 16, {
      hideSelf: true,
      selfId: 'u_self',
    });

    assert.equal(result.visible.some((p: any) => p.id === 'u_self'), false);
    assert.equal(result.visible.length, 2);
  });
});
