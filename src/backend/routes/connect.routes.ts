import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../auth.middleware.js';
import { ConnectService } from '../services/connect.service.js';
import { ConnectMessagingService } from '../services/connectMessaging.service.js';
import { ConnectCommunityService } from '../services/connectCommunity.service.js';
import { ConnectMeetService } from '../services/connectMeet.service.js';

export const connectRouter = Router();

// ==========================================
// 1. PROFILES & PRIVACY
// ==========================================

// Get my own social profile
connectRouter.get('/profile/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await ConnectService.getMyProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ người dùng.' });
      return;
    }
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update my social profile & privacy settings
connectRouter.put('/profile/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await ConnectService.updateMyProfile(req.userId!, req.body);
    res.json({ success: true, profile: updated, message: 'Đã cập nhật hồ sơ thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get public profile of another user
connectRouter.get('/profile/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId;
    const profile = await ConnectService.getUserPublicProfile(req.userId!, targetUserId);
    if (!profile) {
      res.status(404).json({ success: false, error: 'Người dùng không tồn tại.' });
      return;
    }
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Search & Explore users
connectRouter.get('/explore', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { query, language, interest, limit } = req.query;
    const users = await ConnectService.searchAndExploreUsers(
      req.userId!,
      query ? String(query) : undefined,
      language ? String(language) : undefined,
      interest ? String(interest) : undefined,
      limit ? parseInt(String(limit), 10) : 24
    );
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. FRIEND SYSTEM
// ==========================================

// List accepted friends
connectRouter.get('/friends', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const friends = await ConnectService.listFriends(req.userId!, search ? String(search) : undefined);
    res.json({ success: true, friends });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List pending friend requests (both sent & received)
connectRouter.get('/friends/requests', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await ConnectService.listPendingRequests(req.userId!);
    res.json({ success: true, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send friend request
connectRouter.post('/friends/request/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.sendFriendRequest(req.userId!, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Accept friend request
connectRouter.post('/friends/accept/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.acceptFriendRequest(req.userId!, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Decline or cancel friend request
connectRouter.delete('/friends/request/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.declineOrCancelFriendRequest(req.userId!, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Remove friend
connectRouter.delete('/friends/:friendId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.removeFriend(req.userId!, req.params.friendId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Mutual friends
connectRouter.get('/friends/mutual/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const mutualFriends = await ConnectService.getMutualFriends(req.userId!, req.params.targetUserId);
    res.json({ success: true, mutualFriends });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. REAL-TIME DIRECT MESSAGING
// ==========================================

// SSE stream for incoming messages and read receipts
connectRouter.get('/messages/stream', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ event: 'connected', payload: { userId } })}\n\n`);

  const unsubscribe = ConnectMessagingService.subscribeUser(userId, (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {}
  });

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

// List conversations
connectRouter.get('/messages/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await ConnectMessagingService.listConversations(req.userId!);
    res.json({ success: true, conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get or Create conversation with target user
connectRouter.post('/messages/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      res.status(400).json({ success: false, error: 'Thiếu targetUserId.' });
      return;
    }
    const conv = await ConnectMessagingService.getOrCreateConversation(req.userId!, targetUserId);
    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List messages in a conversation
connectRouter.get('/messages/conversations/:conversationId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cursor, limit } = req.query;
    const result = await ConnectMessagingService.listMessages(
      req.params.conversationId,
      req.userId!,
      cursor ? String(cursor) : undefined,
      limit ? parseInt(String(limit), 10) : 40
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Send a direct message
connectRouter.post('/messages/conversations/:conversationId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { content, clientTempId } = req.body;
    const message = await ConnectMessagingService.sendDirectMessage(
      req.userId!,
      req.params.conversationId,
      content,
      clientTempId
    );
    res.json({ success: true, message });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Mark conversation as read
connectRouter.post('/messages/conversations/:conversationId/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMessagingService.markConversationAsRead(
      req.userId!,
      req.params.conversationId
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. SOCIAL FEED (Posts, Reactions, Comments)
// ==========================================

// List posts
connectRouter.get('/posts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { communityId, authorId, cursor, limit } = req.query;
    const result = await ConnectService.listPosts(req.userId!, {
      communityId: communityId ? String(communityId) : undefined,
      authorId: authorId ? String(authorId) : undefined,
      cursor: cursor ? String(cursor) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 15
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create post
connectRouter.post('/posts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const post = await ConnectService.createPost(req.userId!, req.body);
    res.json({ success: true, post, message: 'Đã đăng bài viết thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete post
connectRouter.delete('/posts/:postId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.deletePost(req.userId!, req.params.postId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle reaction
connectRouter.post('/posts/:postId/react', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body;
    const result = await ConnectService.toggleReaction(req.userId!, req.params.postId, type);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List comments of post
connectRouter.get('/posts/:postId/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const comments = await ConnectService.listComments(req.params.postId);
    res.json({ success: true, comments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add comment
connectRouter.post('/posts/:postId/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentId } = req.body;
    const comment = await ConnectService.addComment(req.userId!, req.params.postId, content, parentId);
    res.json({ success: true, comment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete comment
connectRouter.delete('/posts/comments/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.deleteComment(req.userId!, req.params.commentId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. COMMUNITIES
// ==========================================

// List communities
connectRouter.get('/communities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search, category } = req.query;
    const communities = await ConnectService.listCommunities(
      search ? String(search) : undefined,
      category ? String(category) : undefined,
      req.userId!
    );
    res.json({ success: true, communities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create community
connectRouter.post('/communities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const community = await ConnectService.createCommunity(req.userId!, req.body);
    res.json({ success: true, community, message: 'Đã tạo cộng đồng thành công.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Join community
connectRouter.post('/communities/:communityId/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.joinCommunity(req.userId!, req.params.communityId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Leave community
connectRouter.post('/communities/:communityId/leave', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.leaveCommunity(req.userId!, req.params.communityId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List members of community
connectRouter.get('/communities/:communityId/members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const members = await ConnectService.listCommunityMembers(req.params.communityId);
    res.json({ success: true, members });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. SAFETY & MODERATION
// ==========================================

// Block user
connectRouter.post('/block/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.blockUser(req.userId!, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Unblock user
connectRouter.delete('/block/:targetUserId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.unblockUser(req.userId!, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List blocked users
connectRouter.get('/blocks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const blockedUsers = await ConnectService.getBlockedUsers(req.userId!);
    res.json({ success: true, blockedUsers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit report
connectRouter.post('/report', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.submitReport(req.userId!, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. POST ENHANCEMENTS (Polls, Pin, Edit)
// ==========================================

// Vote on a poll
connectRouter.post('/posts/:postId/poll/vote', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      res.status(400).json({ success: false, error: 'Thiếu optionId.' });
      return;
    }
    const result = await ConnectService.votePoll(req.userId!, req.params.postId, optionId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle pin post
connectRouter.post('/posts/:postId/pin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.pinPost(req.userId!, req.params.postId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Edit post
connectRouter.put('/posts/:postId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Nội dung không được để trống.' });
      return;
    }
    const result = await ConnectService.editPost(req.userId!, req.params.postId, content);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. COMMUNITY DETAILS & ADVANCED ADMIN
// ==========================================

// Get community details
connectRouter.get('/communities/:communityId/details', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const details = await ConnectCommunityService.getCommunityDetails(req.userId!, req.params.communityId);
    res.json({ success: true, community: details });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update community settings
connectRouter.put('/communities/:communityId/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.updateSettings(req.userId!, req.params.communityId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List pending members
connectRouter.get('/communities/:communityId/pending-members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pending = await ConnectCommunityService.listPendingMembers(req.userId!, req.params.communityId);
    res.json({ success: true, pending });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Approve pending member
connectRouter.post('/communities/:communityId/pending-members/:targetUserId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.approveMember(req.userId!, req.params.communityId, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reject pending member
connectRouter.post('/communities/:communityId/pending-members/:targetUserId/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.rejectMember(req.userId!, req.params.communityId, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List pending posts
connectRouter.get('/communities/:communityId/pending-posts', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await ConnectCommunityService.listPendingPosts(req.userId!, req.params.communityId);
    res.json({ success: true, posts });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Approve pending post
connectRouter.post('/communities/:communityId/pending-posts/:postId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.approvePost(req.userId!, req.params.postId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reject pending post
connectRouter.post('/communities/:communityId/pending-posts/:postId/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.rejectPost(req.userId!, req.params.postId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List all members
connectRouter.get('/communities/:communityId/all-members', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const members = await ConnectCommunityService.listMembers(req.params.communityId);
    res.json({ success: true, members });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update member role (Owner only)
connectRouter.put('/communities/:communityId/members/:targetUserId/role', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const result = await ConnectCommunityService.updateMemberRole(req.userId!, req.params.communityId, req.params.targetUserId, role);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle mute member
connectRouter.put('/communities/:communityId/members/:targetUserId/mute', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { isMuted } = req.body;
    const result = await ConnectCommunityService.toggleMuteMember(req.userId!, req.params.communityId, req.params.targetUserId, isMuted);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Kick / Ban member
connectRouter.delete('/communities/:communityId/members/:targetUserId/kick', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ban = req.query.ban === 'true';
    const result = await ConnectCommunityService.kickMember(req.userId!, req.params.communityId, req.params.targetUserId, ban);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. MULTI-CHANNEL GROUP CHAT
// ==========================================

// List channels
connectRouter.get('/communities/:communityId/channels', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const channels = await ConnectCommunityService.listChannels(req.userId!, req.params.communityId);
    res.json({ success: true, channels });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Create channel
connectRouter.post('/communities/:communityId/channels', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.createChannel(req.userId!, req.params.communityId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List channel messages
connectRouter.get('/communities/:communityId/channels/:channelId/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cursor, limit } = req.query;
    const result = await ConnectCommunityService.listChannelMessages(
      req.userId!,
      req.params.communityId,
      req.params.channelId,
      cursor ? String(cursor) : undefined,
      limit ? parseInt(String(limit), 10) : 50
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Send channel message
connectRouter.post('/communities/:communityId/channels/:channelId/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.sendChannelMessage(
      req.userId!,
      req.params.communityId,
      req.params.channelId,
      req.body
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle pin message
connectRouter.post('/communities/:communityId/messages/:messageId/pin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.togglePinMessage(req.userId!, req.params.communityId, req.params.messageId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle message reaction
connectRouter.post('/communities/:communityId/messages/:messageId/react', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { emoji } = req.body;
    const result = await ConnectCommunityService.toggleMessageReaction(req.userId!, req.params.communityId, req.params.messageId, emoji);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete message
connectRouter.delete('/communities/:communityId/messages/:messageId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectCommunityService.deleteMessage(req.userId!, req.params.communityId, req.params.messageId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 10. LIVE MEET & STUDY SESSIONS
// ==========================================

// Create meet
connectRouter.post('/communities/:communityId/meets', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.createMeet(req.userId!, req.params.communityId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List meets in community
connectRouter.get('/communities/:communityId/meets', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const meets = await ConnectMeetService.listMeets(req.userId!, req.params.communityId);
    res.json({ success: true, meets });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get meet details by roomCode
connectRouter.get('/meets/:roomCode', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const meet = await ConnectMeetService.getMeetByCode(req.userId!, req.params.roomCode);
    res.json({ success: true, meet });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Join meet (or enter waiting room)
connectRouter.post('/meets/:roomCode/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.joinMeet(req.userId!, req.params.roomCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Host: Approve waiting participant
connectRouter.post('/meets/:roomCode/waiting/:targetUserId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.approveWaitingParticipant(req.userId!, req.params.roomCode, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Host: Reject waiting participant
connectRouter.post('/meets/:roomCode/waiting/:targetUserId/reject', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.rejectWaitingParticipant(req.userId!, req.params.roomCode, req.params.targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Host: Approve all waiting
connectRouter.post('/meets/:roomCode/waiting/approve-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.approveAllWaiting(req.userId!, req.params.roomCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Host / Participant controls
connectRouter.post('/meets/:roomCode/controls', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.updateMeetControls(req.userId!, req.params.roomCode, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Register reminder for meet
connectRouter.post('/meets/:roomCode/reminder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectMeetService.registerMeetReminder(req.userId!, req.params.roomCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Heartbeat & Study time sync
connectRouter.post('/meets/:roomCode/heartbeat', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { minutes } = req.body;
    const result = await ConnectMeetService.heartbeatMeet(req.userId!, req.params.roomCode, minutes || 1);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 11. ADMIN HUB (Groups & Meets stats)
// ==========================================

connectRouter.get('/admin/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.getAdminCommunitiesStats();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

connectRouter.delete('/admin/communities/:communityId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ConnectService.adminDeleteCommunity(req.params.communityId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

