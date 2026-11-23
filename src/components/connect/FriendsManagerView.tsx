import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, UserMinus, UserX, MessageSquare, 
  Search, Shield, Check, X, Clock, RefreshCw, Award 
} from 'lucide-react';
import { connectApi, SocialUser } from '../../lib/connectApiClient';
import { toast } from '../../lib/toast';
import { onFriendRequestReceived, onFriendRequestAccepted } from '../../lib/socketClient';

interface FriendsManagerViewProps {
  currentUserId?: string;
  onOpenProfile: (userId: string) => void;
  onOpenChat: (userId: string) => void;
}

export function FriendsManagerView({ currentUserId, onOpenProfile, onOpenChat }: FriendsManagerViewProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent' | 'blocked'>('friends');
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'friends') {
        const res = await connectApi.listFriends(search.trim() || undefined);
        if (res && res.success) setFriends(Array.isArray(res.friends) ? res.friends : []);
      } else if (activeTab === 'received' || activeTab === 'sent') {
        const res = await connectApi.listPendingRequests();
        if (res && res.success) {
          setReceivedRequests(Array.isArray(res.requests?.received) ? res.requests.received : []);
          setSentRequests(Array.isArray(res.requests?.sent) ? res.requests.sent : []);
        }
      } else if (activeTab === 'blocked') {
        const res = await connectApi.getBlockedUsers();
        if (res && res.success) setBlockedUsers(Array.isArray(res.blockedUsers) ? res.blockedUsers : []);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải danh sách bạn bè', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Real-time Friend Request & Acceptance Cross-Sync over Socket.io
  useEffect(() => {
    const unsubReq = onFriendRequestReceived((data) => {
      toast.show(`Bạn có lời mời kết bạn mới từ ${data.senderName || 'một người dùng'}!`, 'info');
      loadData();
    });

    const unsubAcc = onFriendRequestAccepted((data) => {
      toast.show(`${data.friendName || 'Một người dùng'} đã chấp nhận lời mời kết bạn!`, 'success');
      loadData();
    });

    return () => {
      unsubReq();
      unsubAcc();
    };
  }, []);

  const handleAccept = async (targetUserId: string) => {
    try {
      setActingId(targetUserId);
      const res = await connectApi.acceptFriendRequest(targetUserId);
      if (res.success) {
        toast.show('Đã chấp nhận lời mời kết bạn!', 'success');
        setReceivedRequests(prev => prev.filter(r => r.id !== targetUserId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi chấp nhận', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleDeclineOrCancel = async (targetUserId: string) => {
    try {
      setActingId(targetUserId);
      const res = await connectApi.declineOrCancelFriendRequest(targetUserId);
      if (res.success) {
        toast.show('Đã hủy lời mời', 'info');
        setReceivedRequests(prev => prev.filter(r => r.id !== targetUserId));
        setSentRequests(prev => prev.filter(r => r.id !== targetUserId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi hủy', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn hủy kết bạn với ${name}?`)) return;
    try {
      setActingId(friendId);
      const res = await connectApi.removeFriend(friendId);
      if (res.success) {
        toast.show(`Đã hủy kết bạn với ${name}`, 'info');
        setFriends(prev => prev.filter(f => f.id !== friendId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi hủy kết bạn', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleUnblock = async (targetUserId: string) => {
    try {
      setActingId(targetUserId);
      const res = await connectApi.unblockUser(targetUserId);
      if (res.success) {
        toast.show('Đã bỏ chặn người dùng', 'success');
        setBlockedUsers(prev => prev.filter(b => b.id !== targetUserId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi bỏ chặn', 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Bạn bè ({friends.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'received'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Lời mời đã nhận</span>
            {receivedRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {receivedRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Đã gửi ({sentRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'blocked'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Đã chặn
          </button>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer mr-2"
          title="Tải lại"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Friends Tab Content */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Lọc danh sách bạn bè theo tên..."
              className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Đang tải danh sách bạn bè...</div>
          ) : friends.length === 0 ? (
            <div className="p-10 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-400" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Chưa có bạn bè nào</h4>
              <p className="text-xs text-slate-400">Hãy sang tab "Khám Phá" để kết bạn và cùng nhau nâng cao năng suất!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map(friend => (
                <div
                  key={friend.id}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div 
                    onClick={() => onOpenProfile(friend.id)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {friend.name}
                        </span>
                        {friend.championCount && friend.championCount > 0 ? (
                          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {friend.username ? `@${friend.username}` : `${friend.totalStudyMinutes || 0} phút học`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenChat(friend.id)}
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                      title="Nhắn tin"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={actingId === friend.id}
                      onClick={() => handleRemoveFriend(friend.id, friend.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Hủy kết bạn"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Received Requests Tab */}
      {activeTab === 'received' && (
        <div className="space-y-3">
          {receivedRequests.length === 0 ? (
            <div className="p-10 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
              Không có lời mời kết bạn nào đang chờ duyệt.
            </div>
          ) : (
            receivedRequests.map(user => (
              <div
                key={user.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs"
              >
                <div 
                  onClick={() => onOpenProfile(user.id)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">{user.name}</h5>
                    <p className="text-[11px] text-slate-400">{user.bio || 'Muốn kết bạn cùng học với bạn'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={actingId === user.id}
                    onClick={() => handleAccept(user.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Chấp nhận</span>
                  </button>
                  <button
                    type="button"
                    disabled={actingId === user.id}
                    onClick={() => handleDeclineOrCancel(user.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sent Requests Tab */}
      {activeTab === 'sent' && (
        <div className="space-y-3">
          {sentRequests.length === 0 ? (
            <div className="p-10 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
              Bạn chưa gửi lời mời kết bạn nào.
            </div>
          ) : (
            sentRequests.map(user => (
              <div
                key={user.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs"
              >
                <div 
                  onClick={() => onOpenProfile(user.id)}
                  className="flex items-center gap-3 cursor-pointer min-w-0"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">{user.name}</h5>
                    <p className="text-[11px] text-slate-400">Đang chờ người dùng phản hồi...</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actingId === user.id}
                  onClick={() => handleDeclineOrCancel(user.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy lời mời
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Blocked Tab */}
      {activeTab === 'blocked' && (
        <div className="space-y-3">
          {blockedUsers.length === 0 ? (
            <div className="p-10 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
              Danh sách chặn trống.
            </div>
          ) : (
            blockedUsers.map(b => (
              <div
                key={b.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    <UserX className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">{b.name}</h5>
                    <p className="text-[11px] text-slate-400">Đã bị chặn tương tác và nhắn tin</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={actingId === b.id}
                  onClick={() => handleUnblock(b.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Bỏ chặn
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
