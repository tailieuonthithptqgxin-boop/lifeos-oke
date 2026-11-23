import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;
let currentSubscribedUserId: string | null = null;

/**
 * Returns the singleton Socket.io client instance.
 * Reuses the underlying WebSocket / polling transport across the entire SPA.
 */
export function getGlobalSocket(): Socket {
  if (globalSocket) {
    return globalSocket;
  }

  // Connect to the same origin host (works seamlessly behind Nginx, Cloudflare, and local)
  globalSocket = io({
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  globalSocket.on('connect', () => {
    // If we have an active user ID, re-subscribe immediately upon connect/reconnect
    if (currentSubscribedUserId) {
      globalSocket?.emit('user:subscribe', currentSubscribedUserId);
    }
  });

  return globalSocket;
}

/**
 * Binds the global socket to a specific logged-in user so they can receive
 * private real-time events (friend requests, direct mentions, study room invites).
 */
export function subscribeUserSocket(userId: string | null | undefined): void {
  const socket = getGlobalSocket();
  if (!userId) {
    if (currentSubscribedUserId) {
      socket.emit('user:unsubscribe', currentSubscribedUserId);
      currentSubscribedUserId = null;
    }
    return;
  }

  if (currentSubscribedUserId === userId) return;

  if (currentSubscribedUserId) {
    socket.emit('user:unsubscribe', currentSubscribedUserId);
  }

  currentSubscribedUserId = userId;
  if (socket.connected) {
    socket.emit('user:subscribe', userId);
  }
}

/**
 * Helper listener for real-time Social Feed posts (Zero-F5 live cross-sync)
 */
export function onFeedPostCreated(callback: (post: any) => void): () => void {
  const socket = getGlobalSocket();
  socket.on('feed:post_created', callback);
  return () => {
    socket.off('feed:post_created', callback);
  };
}

/**
 * Helper listener for incoming real-time friend requests
 */
export function onFriendRequestReceived(callback: (data: any) => void): () => void {
  const socket = getGlobalSocket();
  socket.on('connect:friend_request', callback);
  return () => {
    socket.off('connect:friend_request', callback);
  };
}

/**
 * Helper listener for real-time friend request acceptance
 */
export function onFriendRequestAccepted(callback: (data: any) => void): () => void {
  const socket = getGlobalSocket();
  socket.on('connect:friend_accepted', callback);
  return () => {
    socket.off('connect:friend_accepted', callback);
  };
}
