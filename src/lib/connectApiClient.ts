import { apiCall } from './apiClient';

export interface SocialUser {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  location?: string | null;
  interests?: string[];
  learningLanguages?: string[];
  learningGoals?: string[];
  personalIntro?: string | null;
  totalStudyMinutes?: number;
  weeklyStudyMinutes?: number;
  championCount?: number;
  createdAt?: string;
  friendsCount?: number;
  postsCount?: number;
  friendshipStatus?: 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'BLOCKED' | 'SELF';
  canMessage?: boolean;
  messagePermission?: string;
  locationVisibility?: string;
  learningGoalsVisibility?: string;
  profileVisibility?: string;
}

export interface SocialPost {
  id: string;
  content: string;
  images: string[];
  tags: string[];
  lifeOsShareType?: string | null;
  lifeOsShareData?: any;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  isPinned?: boolean;
  isAnonymous?: boolean;
  anonymousNickname?: string | null;
  poll?: { question: string; options: Array<{ id: string; text: string; votes: string[] }> } | null;
  meetSession?: any;
  achievementCard?: any;
  status?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string | null;
    avatar?: string | null;
    championCount?: number;
    isAnonymous?: boolean;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
    avatar?: string | null;
  } | null;
  myReaction?: string | null;
}

export interface CommunityChannelItem {
  id: string;
  communityId: string;
  name: string;
  description?: string | null;
  type: 'ANNOUNCEMENT' | 'GENERAL' | 'STUDY' | 'CUSTOM';
  isPrivate: boolean;
  createdAt: string;
}

export interface CommunityChatMessageItem {
  id: string;
  communityId: string;
  channelId: string;
  senderId: string;
  content: string;
  images: string[];
  replyToId?: string | null;
  isPinned: boolean;
  reactions?: Record<string, string[]> | null;
  meetData?: any;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    username?: string | null;
    avatar?: string | null;
    championCount?: number;
  };
}

export interface CommunityMeetItem {
  id: string;
  roomCode: string;
  communityId: string;
  hostId: string;
  title: string;
  description?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  isInstant: boolean;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  requireApproval: boolean;
  allowMembersDirect: boolean;
  activeParticipants?: any[];
  waitingParticipants?: any[];
  notes?: string | null;
  pomodoroState?: any;
  createdAt: string;
  endedAt?: string | null;
  host: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export interface PostCommentItem {
  id: string;
  postId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string | null;
    avatar?: string | null;
    championCount?: number;
  };
}

export interface SocialCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar?: string | null;
  coverImage?: string | null;
  category: string;
  privacy: 'PUBLIC' | 'PRIVATE' | 'APPROVAL_REQUIRED';
  memberCount: number;
  postCount: number;
  createdAt: string;
  isMember?: boolean;
  membershipRole?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' | null;
}

export interface DirectConversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    username?: string | null;
    avatar?: string | null;
    totalStudyMinutes?: number;
    championCount?: number;
  };
  lastMessageText?: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface DirectMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  clientTempId?: string | null;
}

export const connectApi = {
  // Profiles
  getMyProfile: () => apiCall<{ success: boolean; profile: SocialUser }>('/api/connect/profile/me'),
  updateMyProfile: (data: Partial<SocialUser>) =>
    apiCall<{ success: boolean; profile: SocialUser; message: string }>('/api/connect/profile/me', 'PUT', data),
  getUserPublicProfile: (userId: string) =>
    apiCall<{ success: boolean; profile: SocialUser }>('/api/connect/profile/' + userId),
  exploreUsers: (params?: { query?: string; language?: string; interest?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('query', params.query);
    if (params?.language) qs.set('language', params.language);
    if (params?.interest) qs.set('interest', params.interest);
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiCall<{ success: boolean; users: SocialUser[] }>('/api/connect/explore?' + qs.toString());
  },

  // Friends
  listFriends: (search?: string) => {
    const qs = search ? '?search=' + encodeURIComponent(search) : '';
    return apiCall<{ success: boolean; friends: SocialUser[] }>('/api/connect/friends' + qs);
  },
  listPendingRequests: () =>
    apiCall<{ success: boolean; requests: { received: any[]; sent: any[] } }>('/api/connect/friends/requests'),
  sendFriendRequest: (targetUserId: string) =>
    apiCall<{ success: boolean; status: string; message: string }>('/api/connect/friends/request/' + targetUserId, 'POST'),
  acceptFriendRequest: (targetUserId: string) =>
    apiCall<{ success: boolean; status: string; message: string }>('/api/connect/friends/accept/' + targetUserId, 'POST'),
  declineOrCancelFriendRequest: (targetUserId: string) =>
    apiCall<{ success: boolean; status: string; message: string }>('/api/connect/friends/request/' + targetUserId, 'DELETE'),
  removeFriend: (friendId: string) =>
    apiCall<{ success: boolean; status: string; message: string }>('/api/connect/friends/' + friendId, 'DELETE'),
  getMutualFriends: (targetUserId: string) =>
    apiCall<{ success: boolean; mutualFriends: any[] }>('/api/connect/friends/mutual/' + targetUserId),

  // Messaging
  listConversations: () =>
    apiCall<{ success: boolean; conversations: DirectConversation[] }>('/api/connect/messages/conversations'),
  getOrCreateConversation: (targetUserId: string) =>
    apiCall<{ success: boolean; conversation: any }>('/api/connect/messages/conversations', 'POST', { targetUserId }),
  listMessages: (conversationId: string, cursor?: string) => {
    const qs = cursor ? '?cursor=' + encodeURIComponent(cursor) : '';
    return apiCall<{ success: boolean; messages: DirectMessageItem[]; nextCursor: string | null }>(
      '/api/connect/messages/conversations/' + conversationId + qs
    );
  },
  sendMessage: (conversationId: string, content: string, clientTempId?: string) =>
    apiCall<{ success: boolean; message: DirectMessageItem }>(
      '/api/connect/messages/conversations/' + conversationId,
      'POST',
      { content, clientTempId }
    ),
  markAsRead: (conversationId: string) =>
    apiCall<{ success: boolean }>('/api/connect/messages/conversations/' + conversationId + '/read', 'POST'),

  // Feed
  listPosts: (params?: { communityId?: string; authorId?: string; cursor?: string }) => {
    const qs = new URLSearchParams();
    if (params?.communityId) qs.set('communityId', params.communityId);
    if (params?.authorId) qs.set('authorId', params.authorId);
    if (params?.cursor) qs.set('cursor', params.cursor);
    return apiCall<{ success: boolean; posts: SocialPost[]; nextCursor: string | null }>('/api/connect/posts?' + qs.toString());
  },
  createPost: (data: {
    content: string;
    images?: string[];
    tags?: string[];
    communityId?: string;
    lifeOsShareType?: string;
    lifeOsShareData?: any;
    isAnonymous?: boolean;
    anonymousNickname?: string;
    poll?: any;
    meetSession?: any;
    achievementCard?: any;
  }) =>
    apiCall<{ success: boolean; post: SocialPost; message: string; isPendingApproval?: boolean }>('/api/connect/posts', 'POST', data),
  deletePost: (postId: string) =>
    apiCall<{ success: boolean }>('/api/connect/posts/' + postId, 'DELETE'),
  toggleReaction: (postId: string, type = 'LIKE') =>
    apiCall<{ success: boolean; myReaction: string | null; likes: number }>('/api/connect/posts/' + postId + '/react', 'POST', { type }),
  votePoll: (postId: string, optionId: string) =>
    apiCall<{ success: boolean; poll: any }>('/api/connect/posts/' + postId + '/poll/vote', 'POST', { optionId }),
  pinPost: (postId: string) =>
    apiCall<{ success: boolean; isPinned: boolean; message: string }>('/api/connect/posts/' + postId + '/pin', 'POST'),
  editPost: (postId: string, content: string) =>
    apiCall<{ success: boolean; post: any; message: string }>('/api/connect/posts/' + postId, 'PUT', { content }),
  listComments: (postId: string) =>
    apiCall<{ success: boolean; comments: PostCommentItem[] }>('/api/connect/posts/' + postId + '/comments'),
  addComment: (postId: string, content: string, parentId?: string) =>
    apiCall<{ success: boolean; comment: PostCommentItem }>('/api/connect/posts/' + postId + '/comments', 'POST', { content, parentId }),
  deleteComment: (commentId: string) =>
    apiCall<{ success: boolean }>('/api/connect/posts/comments/' + commentId, 'DELETE'),

  // Communities
  listCommunities: (params?: { search?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    return apiCall<{ success: boolean; communities: SocialCommunity[] }>('/api/connect/communities?' + qs.toString());
  },
  createCommunity: (data: { name: string; description: string; category?: string; privacy?: string; avatar?: string; coverImage?: string }) =>
    apiCall<{ success: boolean; community: SocialCommunity; message: string }>('/api/connect/communities', 'POST', data),
  getCommunityDetails: (communityId: string) =>
    apiCall<{ success: boolean; community: any }>('/api/connect/communities/' + communityId + '/details'),
  updateCommunitySettings: (communityId: string, data: any) =>
    apiCall<{ success: boolean; community: any; message: string }>('/api/connect/communities/' + communityId + '/settings', 'PUT', data),
  joinCommunity: (communityId: string) =>
    apiCall<{ success: boolean; status: string; message: string }>('/api/connect/communities/' + communityId + '/join', 'POST'),
  leaveCommunity: (communityId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/leave', 'POST'),
  listCommunityMembers: (communityId: string) =>
    apiCall<{ success: boolean; members: any[] }>('/api/connect/communities/' + communityId + '/members'),
  listPendingMembers: (communityId: string) =>
    apiCall<{ success: boolean; pending: any[] }>('/api/connect/communities/' + communityId + '/pending-members'),
  approveMember: (communityId: string, targetUserId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/pending-members/' + targetUserId + '/approve', 'POST'),
  rejectMember: (communityId: string, targetUserId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/pending-members/' + targetUserId + '/reject', 'POST'),
  listPendingPosts: (communityId: string) =>
    apiCall<{ success: boolean; posts: any[] }>('/api/connect/communities/' + communityId + '/pending-posts'),
  approvePost: (communityId: string, postId: string) =>
    apiCall<{ success: boolean; post: any; message: string }>('/api/connect/communities/' + communityId + '/pending-posts/' + postId + '/approve', 'POST'),
  rejectPost: (communityId: string, postId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/pending-posts/' + postId + '/reject', 'POST'),
  listAllMembers: (communityId: string) =>
    apiCall<{ success: boolean; members: any[] }>('/api/connect/communities/' + communityId + '/all-members'),
  updateMemberRole: (communityId: string, targetUserId: string, role: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/members/' + targetUserId + '/role', 'PUT', { role }),
  toggleMuteMember: (communityId: string, targetUserId: string, isMuted: boolean) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/members/' + targetUserId + '/mute', 'PUT', { isMuted }),
  kickMember: (communityId: string, targetUserId: string, ban = false) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/communities/' + communityId + '/members/' + targetUserId + '/kick?ban=' + ban, 'DELETE'),

  // Multi-Channel Group Chat
  listChannels: (communityId: string) =>
    apiCall<{ success: boolean; channels: CommunityChannelItem[] }>('/api/connect/communities/' + communityId + '/channels'),
  createChannel: (communityId: string, data: { name: string; description?: string; type?: string; isPrivate?: boolean }) =>
    apiCall<{ success: boolean; channel: CommunityChannelItem; message: string }>('/api/connect/communities/' + communityId + '/channels', 'POST', data),
  listChannelMessages: (communityId: string, channelId: string, cursor?: string) => {
    const qs = cursor ? '?cursor=' + encodeURIComponent(cursor) : '';
    return apiCall<{ success: boolean; messages: CommunityChatMessageItem[]; nextCursor: string | null }>(
      '/api/connect/communities/' + communityId + '/channels/' + channelId + '/messages' + qs
    );
  },
  sendChannelMessage: (communityId: string, channelId: string, data: { content: string; images?: string[]; replyToId?: string; meetData?: any }) =>
    apiCall<{ success: boolean; message: CommunityChatMessageItem }>(
      '/api/connect/communities/' + communityId + '/channels/' + channelId + '/messages',
      'POST',
      data
    ),
  togglePinChannelMessage: (communityId: string, messageId: string) =>
    apiCall<{ success: boolean; isPinned: boolean; message: string }>(
      '/api/connect/communities/' + communityId + '/messages/' + messageId + '/pin',
      'POST'
    ),
  toggleChannelMessageReaction: (communityId: string, messageId: string, emoji: string) =>
    apiCall<{ success: boolean; reactions: Record<string, string[]> }>(
      '/api/connect/communities/' + communityId + '/messages/' + messageId + '/react',
      'POST',
      { emoji }
    ),
  deleteChannelMessage: (communityId: string, messageId: string) =>
    apiCall<{ success: boolean; message: string }>(
      '/api/connect/communities/' + communityId + '/messages/' + messageId,
      'DELETE'
    ),

  // Live Meet & Study Sessions
  createMeet: (communityId: string, data: { title: string; description?: string; scheduledDate?: string; scheduledTime?: string; isInstant?: boolean; requireApproval?: boolean; allowMembersDirect?: boolean }) =>
    apiCall<{ success: boolean; meet: CommunityMeetItem; message: string }>('/api/connect/communities/' + communityId + '/meets', 'POST', data),
  listMeets: (communityId: string) =>
    apiCall<{ success: boolean; meets: CommunityMeetItem[] }>('/api/connect/communities/' + communityId + '/meets'),
  getMeetByCode: (roomCode: string) =>
    apiCall<{ success: boolean; meet: any }>('/api/connect/meets/' + roomCode),
  joinMeet: (roomCode: string) =>
    apiCall<{ success: boolean; status: 'IN_MEET' | 'WAITING'; meet?: any; message?: string }>('/api/connect/meets/' + roomCode + '/join', 'POST'),
  approveWaitingParticipant: (roomCode: string, targetUserId: string) =>
    apiCall<{ success: boolean; meet: any; message: string }>('/api/connect/meets/' + roomCode + '/waiting/' + targetUserId + '/approve', 'POST'),
  rejectWaitingParticipant: (roomCode: string, targetUserId: string) =>
    apiCall<{ success: boolean; meet: any; message: string }>('/api/connect/meets/' + roomCode + '/waiting/' + targetUserId + '/reject', 'POST'),
  approveAllWaiting: (roomCode: string) =>
    apiCall<{ success: boolean; meet: any; count: number; message: string }>('/api/connect/meets/' + roomCode + '/waiting/approve-all', 'POST'),
  updateMeetControls: (roomCode: string, controls: any) =>
    apiCall<{ success: boolean; meet: any }>('/api/connect/meets/' + roomCode + '/controls', 'POST', controls),
  registerMeetReminder: (roomCode: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/meets/' + roomCode + '/reminder', 'POST'),
  heartbeatMeet: (roomCode: string, minutes = 1) =>
    apiCall<{ success: boolean; totalStudyMinutes?: number; streakDays?: number }>('/api/connect/meets/' + roomCode + '/heartbeat', 'POST', { minutes }),

  // Admin Hub
  getAdminCommunitiesStats: () =>
    apiCall<{
      success: boolean;
      totalCommunities: number;
      totalLiveMeets: number;
      totalPosts: number;
      totalMessages: number;
      communities: any[];
      liveMeets: any[];
    }>('/api/connect/admin/stats'),
  adminDeleteCommunity: (communityId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/admin/communities/' + communityId, 'DELETE'),

  // Safety & Moderation
  blockUser: (targetUserId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/block/' + targetUserId, 'POST'),
  unblockUser: (targetUserId: string) =>
    apiCall<{ success: boolean; message: string }>('/api/connect/block/' + targetUserId, 'DELETE'),
  getBlockedUsers: () =>
    apiCall<{ success: boolean; blockedUsers: any[] }>('/api/connect/blocks'),
  submitReport: (data: { targetType: string; targetId: string; reason: string; details?: string }) =>
    apiCall<{ success: boolean; reportId: string; message: string }>('/api/connect/report', 'POST', data)
};
