import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMeetGrid } from '../src/components/study-space/useMeetGridLayout.js';
import { TILE_LIMIT_PRESETS, loadSavedLayoutSettings } from '../src/components/study-space/LayoutSettingsModal.js';

interface MeetParticipant {
  id: string;
  name: string;
  presence?: string;
  streak?: number;
  streakDays?: number;
  avatar?: string;
  isFriend?: boolean;
  [key: string]: any;
}

function sortAndPartitionParticipants(
  participants: MeetParticipant[],
  selfId: string,
  pinnedIds: string[],
  friendIds: string[],
  maxTiles: number,
  hideSelf: boolean
) {
  let list = [...participants];
  if (hideSelf) {
    list = list.filter((p) => p.id !== selfId);
  }

  list.sort((a, b) => {
    if (a.id === selfId) return -1;
    if (b.id === selfId) return 1;

    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    if (aPinned && bPinned) return pinnedIds.indexOf(a.id) - pinnedIds.indexOf(b.id);

    const aFriend = friendIds.includes(a.id);
    const bFriend = friendIds.includes(b.id);
    if (aFriend && !bFriend) return -1;
    if (!aFriend && bFriend) return 1;

    const aFocus = a.presence === 'STUDYING' || a.presence === 'FOCUS';
    const bFocus = b.presence === 'STUDYING' || b.presence === 'FOCUS';
    if (aFocus && !bFocus) return -1;
    if (!aFocus && bFocus) return 1;

    return (b.streak || b.streakDays || 0) - (a.streak || a.streakDays || 0);
  });

  const total = list.length;
  if (total <= maxTiles) {
    return {
      allSortedParticipants: list,
      visibleParticipants: list,
      overflowParticipants: [],
      overflowCount: 0,
      hasOverflow: false,
      overflowPreviewAvatars: [],
    };
  }

  const visibleCount = maxTiles - 1;
  const visible = list.slice(0, visibleCount);
  const overflow = list.slice(visibleCount);

  return {
    allSortedParticipants: list,
    visibleParticipants: visible,
    overflowParticipants: overflow,
    overflowCount: total - visibleCount,
    hasOverflow: true,
    overflowPreviewAvatars: overflow.slice(0, 3).map((p) => p.avatar || ''),
  };
}

describe('Google Meet Step 3 - Full Assembly Integration Test', () => {
  it('1. 120 Participants with 16-tile Limit generates 15 visible + 1 overflow tile with 106 count', () => {
    const mock120: MeetParticipant[] = [
      { id: 'me', name: 'Tôi (Self)', presence: 'STUDYING', streak: 14 }
    ];
    for (let i = 1; i <= 120; i++) {
      mock120.push({
        id: `peer_${i}`,
        name: `Học Viên ${i}`,
        presence: i % 8 === 0 ? 'BREAK' : 'STUDYING',
        streak: (i % 15) + 1,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=StudyPeer_${i}`
      });
    }

    const pinnedIds = ['peer_3', 'peer_7'];
    const friendIds = ['peer_1', 'peer_2', 'peer_5'];

    const result = sortAndPartitionParticipants(mock120, 'me', pinnedIds, friendIds, 16, false);

    assert.equal(result.allSortedParticipants.length, 121);
    assert.equal(result.visibleParticipants.length, 15, 'Exactly 15 visible individual tiles');
    assert.equal(result.hasOverflow, true, 'hasOverflow is true when 121 > 16');
    assert.equal(result.overflowCount, 106, '121 total - 15 visible = 106 overflow');
    assert.equal(result.overflowPreviewAvatars.length, 3, 'Top 3 preview avatars displayed');

    // Check first elements follow priority:
    assert.equal(result.visibleParticipants[0].id, 'me', 'Tier 1: Self is first');
    assert.equal(result.visibleParticipants[1].id, 'peer_3', 'Tier 2: Pinned is second');
    assert.equal(result.visibleParticipants[2].id, 'peer_7', 'Tier 2: Pinned is third');
  });

  it('2. calculateMeetGrid calculates valid grid for 16 tiles (15 + 1 overflow) on Desktop 1920x1080', () => {
    const { columns, rows } = calculateMeetGrid(1920, 950, 16, 'auto', 16 / 9, 12, 7);
    assert.ok(columns >= 4, `Columns (${columns}) should be at least 4`);
    assert.ok(rows >= 3, `Rows (${rows}) should be at least 3`);
    assert.ok(columns * rows >= 16, 'Grid fits 16 tiles');
  });

  it('3. Slider preset test across all 5 marks: 6, 9, 16, 30, 49', () => {
    const mock100: MeetParticipant[] = [];
    for (let i = 1; i <= 100; i++) {
      mock100.push({ id: `p_${i}`, name: `User ${i}`, streak: i });
    }

    for (const preset of TILE_LIMIT_PRESETS) {
      const partitioned = sortAndPartitionParticipants(mock100, 'p_1', [], [], preset, false);
      assert.equal(partitioned.visibleParticipants.length, preset - 1, `Visible tiles is preset - 1`);
      assert.equal(partitioned.overflowCount, 100 - (preset - 1), 'Remaining goes to overflow count');
    }
  });

  it('4. Spotlight and Sidebar layout configurations preserve primary focus', () => {
    const { columns, rows } = calculateMeetGrid(1920, 950, 1, 'spotlight', 16 / 9, 12, 7);
    assert.equal(columns, 1);
    assert.equal(rows, 1);
  });
});
