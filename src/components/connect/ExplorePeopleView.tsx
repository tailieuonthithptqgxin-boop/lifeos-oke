import React, { useState, useEffect } from 'react';
import { 
  Search, UserPlus, UserCheck, Clock, MessageSquare, 
  Sparkles, Globe, Filter, Check, X, Shield, Award 
} from 'lucide-react';
import { connectApi, SocialUser } from '../../lib/connectApiClient';
import { toast } from '../../lib/toast';

interface ExplorePeopleViewProps {
  currentUserId?: string;
  onOpenProfile: (userId: string) => void;
  onOpenChat: (userId: string) => void;
}

const COMMON_LANGUAGES = ['Tất cả', 'Tiếng Anh', 'Tiếng Nhật', 'Tiếng Trung', 'Tiếng Hàn', 'Tiếng Đức'];
const COMMON_INTERESTS = ['Tất cả', 'Lập trình', 'IELTS', 'Năng suất', 'Đọc sách', 'Thiết kế', 'Khởi nghiệp'];

export function ExplorePeopleView({ currentUserId, onOpenProfile, onOpenChat }: ExplorePeopleViewProps) {
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('Tất cả');
  const [selectedInterest, setSelectedInterest] = useState('Tất cả');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await connectApi.exploreUsers({
        query: searchQuery.trim() || undefined,
        language: selectedLanguage !== 'Tất cả' ? selectedLanguage : undefined,
        interest: selectedInterest !== 'Tất cả' ? selectedInterest : undefined,
        limit: 40
      });
      if (res && res.success) {
        setUsers(Array.isArray(res.users) ? res.users : []);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tìm kiếm bạn bè', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLanguage, selectedInterest]);

  const handleSendFriendRequest = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      const res = await connectApi.sendFriendRequest(targetUserId);
      if (res.success) {
        toast.show(res.message || 'Đã gửi lời mời kết bạn!', 'success');
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, friendshipStatus: res.status as any } : u));
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể gửi lời mời', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      const res = await connectApi.acceptFriendRequest(targetUserId);
      if (res.success) {
        toast.show('Đã chấp nhận kết bạn!', 'success');
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, friendshipStatus: 'FRIENDS' } : u));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi chấp nhận', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (targetUserId: string) => {
    try {
      setActionLoadingId(targetUserId);
      const res = await connectApi.declineOrCancelFriendRequest(targetUserId);
      if (res.success) {
        toast.show('Đã hủy lời mời', 'info');
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, friendshipStatus: 'NONE' } : u));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi hủy lời mời', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Search & Filter Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hiển thị hoặc @username..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Ngôn ngữ:
            </span>
            {COMMON_LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedLanguage === lang
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Sở thích:
            </span>
            {COMMON_INTERESTS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedInterest(item)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedInterest === item
                    ? 'bg-indigo-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Users */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400">Đang tìm kiếm thành viên LifeOS phù hợp...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Globe className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Không tìm thấy người dùng phù hợp</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc lọc theo các ngôn ngữ, sở thích khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map(user => {
            const isSelf = user.id === currentUserId;
            const status = user.friendshipStatus;
            const isActing = actionLoadingId === user.id;

            return (
              <div
                key={user.id}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Cover & Avatar Header */}
                <div>
                  <div className="h-20 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 relative">
                    {user.coverImage && (
                      <img src={user.coverImage} alt="cover" className="w-full h-full object-cover opacity-60" />
                    )}
                    {user.championCount && user.championCount > 0 ? (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-black text-amber-300 border border-amber-400/40 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>{user.championCount}x Quán quân</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="px-5 pt-0 pb-4 relative">
                    <div 
                      onClick={() => onOpenProfile(user.id)}
                      className="-mt-10 w-16 h-16 rounded-2xl bg-slate-900 border-4 border-white dark:border-slate-900 shadow-md text-white font-black text-xl flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="mt-3">
                      <h4 
                        onClick={() => onOpenProfile(user.id)}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-emerald-500 cursor-pointer transition-colors"
                      >
                        {user.name}
                      </h4>
                      {user.username && (
                        <p className="text-xs text-slate-400 font-medium">@{user.username}</p>
                      )}
                    </div>

                    {user.bio && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    )}

                    {/* Stats pill */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{user.totalStudyMinutes || 0} phút học</span>
                      </div>
                      {user.location && (
                        <span>📍 {user.location}</span>
                      )}
                    </div>

                    {/* Languages & Interests */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {user.learningLanguages?.slice(0, 3).map((l, idx) => (
                        <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          🗣️ {l}
                        </span>
                      ))}
                      {user.interests?.slice(0, 2).map((i, idx) => (
                        <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          🏷️ {i}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="px-5 pb-5 pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(user.id)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Xem hồ sơ
                  </button>

                  {!isSelf && (
                    <>
                      {status === 'FRIENDS' ? (
                        <button
                          type="button"
                          onClick={() => onOpenChat(user.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          title="Nhắn tin trò chuyện"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Nhắn tin</span>
                        </button>
                      ) : status === 'REQUEST_SENT' ? (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleCancelRequest(user.id)}
                          className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center gap-1 hover:bg-amber-500/20 transition-all cursor-pointer"
                          title="Hủy lời mời kết bạn"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Đã gửi</span>
                        </button>
                      ) : status === 'REQUEST_RECEIVED' ? (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleAcceptRequest(user.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Đồng ý</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleSendFriendRequest(user.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Kết bạn</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
