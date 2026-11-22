import { useMemo, useState, useCallback } from 'react';

export interface MeetParticipant {
  id: string;
  name: string;
  avatar?: string;
  studyGoal?: string;
  goal?: string;
  presence?: 'STUDYING' | 'FOCUS' | 'BREAK' | 'AWAY' | 'IDLE';
  presenceState?: 'STUDYING' | 'IN_MEET' | 'AWAY';
  streakDays?: number;
  streak?: number;
  isFriend?: boolean;
  isSelf?: boolean;
  isPinned?: boolean;
  joinedAt?: number;
  audioLevel?: number;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  [key: string]: any;
}

export interface UseSortedParticipantsOptions {
  selfId?: string;
  hideSelf?: boolean;
  searchQuery?: string;
  maxPins?: number; // Default 6
}

export interface UseSortedParticipantsResult {
  visibleParticipants: MeetParticipant[];
  overflowParticipants: MeetParticipant[];
  overflowCount: number;
  hasOverflow: boolean;
  overflowPreviewAvatars: string[];
  allSortedParticipants: MeetParticipant[];
  pinnedIds: string[];
  togglePin: (id: string) => boolean;
  isPinned: (id: string) => boolean;
  canPinMore: boolean;
  selfParticipant: MeetParticipant | null;
  totalCount: number;
}

/**
 * Smart Auto-Sorting & Priority Partitioning Hook for Google Meet Co-Study Hall
 * 
 * Orders 100+ concurrent participants by 5 strict priority tiers:
 * 1. Current user (Self) - toggleable via hideSelf
 * 2. User-pinned members (Max 6)
 * 3. Mutual Friends (isFriend === true)
 * 4. Actively focusing members (presence === 'FOCUS' | 'STUDYING')
 * 5. Remaining members (ordered by streak)
 * 
 * When total members > maxTiles, seamlessly carves out (maxTiles - 1) slots
 * so the last slot displays the Google Meet "+N others" overflow tile.
 */
export function useSortedParticipants(
  participants: MeetParticipant[] = [],
  initialPinnedIds: string[] = [],
  friendIds: string[] | Set<string> = new Set(),
  maxTiles: number = 16,
  options: UseSortedParticipantsOptions = {}
): UseSortedParticipantsResult {
  const {
    selfId,
    hideSelf = false,
    searchQuery = '',
    maxPins = 6,
  } = options;

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    return (initialPinnedIds || []).slice(0, maxPins);
  });

  const friendIdSet = useMemo(() => {
    if (friendIds instanceof Set) return friendIds;
    return new Set(friendIds || []);
  }, [friendIds]);

  const pinnedIdSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  // Toggle Pin action (max 6 pins)
  const togglePin = useCallback((id: string): boolean => {
    let success = false;
    setPinnedIds((prev) => {
      if (prev.includes(id)) {
        success = true;
        return prev.filter((pId) => pId !== id);
      }
      if (prev.length >= maxPins) {
        success = false;
        return prev;
      }
      success = true;
      return [...prev, id];
    });
    return success;
  }, [maxPins]);

  const isPinned = useCallback((id: string) => pinnedIdSet.has(id), [pinnedIdSet]);
  const canPinMore = pinnedIds.length < maxPins;

  // Filter & Sort Logic
  const {
    allSortedParticipants,
    visibleParticipants,
    overflowParticipants,
    overflowCount,
    hasOverflow,
    overflowPreviewAvatars,
    selfParticipant,
  } = useMemo(() => {
    // 0. Search query filter
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? participants.filter((p) => {
          const nameMatch = p.name?.toLowerCase().includes(query);
          const goalMatch = (p.goal || p.studyGoal)?.toLowerCase().includes(query);
          return nameMatch || goalMatch;
        })
      : [...participants];

    // Identify Self
    let selfItem: MeetParticipant | null = null;
    const nonSelfList: MeetParticipant[] = [];

    for (const p of filtered) {
      if (p.isSelf || (selfId && p.id === selfId)) {
        selfItem = p;
      } else {
        nonSelfList.push(p);
      }
    }

    // Partition non-self participants into 4 tiers
    const tierPinned: MeetParticipant[] = [];
    const tierFriends: MeetParticipant[] = [];
    const tierFocusing: MeetParticipant[] = [];
    const tierOthers: MeetParticipant[] = [];

    // To preserve pinning order, map pinnedIds first
    const nonSelfMap = new Map<string, MeetParticipant>();
    for (const p of nonSelfList) {
      nonSelfMap.set(p.id, p);
    }

    // 1. Pinned tier (respecting user's pin sequence)
    for (const pId of pinnedIds) {
      const match = nonSelfMap.get(pId);
      if (match) {
        tierPinned.push(match);
        nonSelfMap.delete(pId);
      }
    }

    // 2. Classify remaining into Friends, Focusing, Others
    for (const p of nonSelfMap.values()) {
      const isFriend = p.isFriend || friendIdSet.has(p.id);
      const isFocusing =
        p.presence === 'STUDYING' ||
        p.presence === 'FOCUS' ||
        p.presenceState === 'STUDYING';

      if (isFriend) {
        tierFriends.push(p);
      } else if (isFocusing) {
        tierFocusing.push(p);
      } else {
        tierOthers.push(p);
      }
    }

    // Sort within tiers (by streak descending, then name)
    const compareStreakAndName = (a: MeetParticipant, b: MeetParticipant) => {
      const streakA = a.streakDays ?? a.streak ?? 0;
      const streakB = b.streakDays ?? b.streak ?? 0;
      if (streakB !== streakA) return streakB - streakA;
      return (a.name || '').localeCompare(b.name || '');
    };

    tierFriends.sort(compareStreakAndName);
    tierFocusing.sort(compareStreakAndName);
    tierOthers.sort(compareStreakAndName);

    // Combine all in strict priority order:
    // [Self (if not hidden)] -> [Pinned] -> [Friends] -> [Focusing] -> [Others]
    const combined: MeetParticipant[] = [];
    if (selfItem && !hideSelf) {
      combined.push(selfItem);
    }
    combined.push(...tierPinned, ...tierFriends, ...tierFocusing, ...tierOthers);

    // Grid Slicing with Overflow Tile logic
    const limit = Math.max(1, maxTiles);
    const total = combined.length;

    if (total <= limit) {
      return {
        allSortedParticipants: combined,
        visibleParticipants: combined,
        overflowParticipants: [],
        overflowCount: 0,
        hasOverflow: false,
        overflowPreviewAvatars: [],
        selfParticipant: selfItem,
      };
    }

    // When total > limit: reserve 1 slot for "+N others" overflow tile
    const visibleSlots = limit - 1;
    const visible = combined.slice(0, visibleSlots);
    const overflow = combined.slice(visibleSlots);
    const count = total - visibleSlots;

    const previewAvatars = overflow
      .slice(0, 3)
      .map((p) => p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`);

    return {
      allSortedParticipants: combined,
      visibleParticipants: visible,
      overflowParticipants: overflow,
      overflowCount: count,
      hasOverflow: true,
      overflowPreviewAvatars: previewAvatars,
      selfParticipant: selfItem,
    };
  }, [participants, selfId, hideSelf, searchQuery, pinnedIds, friendIdSet, maxTiles]);

  return {
    visibleParticipants,
    overflowParticipants,
    overflowCount,
    hasOverflow,
    overflowPreviewAvatars,
    allSortedParticipants,
    pinnedIds,
    togglePin,
    isPinned,
    canPinMore,
    selfParticipant,
    totalCount: participants.length,
  };
}
