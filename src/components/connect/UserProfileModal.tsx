import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  MessageSquare,
  Shield,
  MapPin,
  BookOpen,
  Target,
  Sparkles,
  Award,
  Clock,
  AlertTriangle,
  Heart,
  Flag
} from 'lucide-react';
import { SocialUser, connectApi } from '../../lib/connectApiClient';
import { soundEngine } from '../../lib/soundEngine';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onOpenChat?: (userId: string) => void;
}

export function UserProfileModal({ userId, onClose, onOpenChat }: UserProfileModalProps) {
  const [profile, setProfile] = useState<SocialUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Quấy rối hoặc phát ngôn thù địch');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    connectApi.getUserPublicProfile(userId)
      .then(res => {
        if (res.success && res.profile) {
          setProfile(res.profile);
        }
      })
      .catch(err => {
        console.error('Failed to load public profile:', err);
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (!userId) return null;

  const handleFriendAction = async () => {
    if (!profile) return;
    setIsActionLoading(true);
    soundEngine.playPop();
    try {
      if (profile.friendshipStatus === 'NONE') {
        const res = await connectApi.sendFriendRequest(profile.id);
        if (res.success) {
          setProfile(p => p ? { ...p, friendshipStatus: 'REQUEST_SENT' } : null);
        }
      } else if (profile.friendshipStatus === 'REQUEST_RECEIVED') {
        const res = await connectApi.acceptFriendRequest(profile.id);
        if (res.success) {
          setProfile(p => p ? { ...p, friendshipStatus: 'FRIENDS', friendsCount: (p.friendsCount || 0) + 1 } : null);
        }
      } else if (profile.friendshipStatus === 'REQUEST_SENT') {
        const res = await connectApi.declineOrCancelFriendRequest(profile.id);
        if (res.success) {
          setProfile(p => p ? { ...p, friendshipStatus: 'NONE' } : null);
        }
      } else if (profile.friendshipStatus === 'FRIENDS') {
        if (window.confirm(`Bạn có chắc muốn hủy kết bạn với ${profile.name}?`)) {
          const res = await connectApi.removeFriend(profile.id);
          if (res.success) {
            setProfile(p => p ? { ...p, friendshipStatus: 'NONE', friendsCount: Math.max(0, (p.friendsCount || 1) - 1) } : null);
          }
        }
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;
    if (window.confirm(`Bạn có chắc muốn chặn ${profile.name}? Người này sẽ không thể nhắn tin hay thấy bài viết của bạn.`)) {
      try {
        await connectApi.blockUser(profile.id);
        soundEngine.playPop();
        onClose();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi chặn người dùng.');
      }
    }
  };

  const handleSubmitReport = async () => {
    if (!profile) return;
    try {
      await connectApi.submitReport({
        targetType: 'USER',
        targetId: profile.id,
        reason: reportReason,
        details: reportDetails
      });
      soundEngine.playSuccess();
      alert('Báo cáo của bạn đã được ghi nhận. Cảm ơn bạn đã giữ gìn cộng đồng!');
      setShowReportModal(false);
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi báo cáo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Cover Photo */}
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-800 shrink-0">
          {profile?.coverImage && (
            <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/50 hover:bg-slate-950/80 text-white backdrop-blur-md transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 -mt-16 sm:-mt-20 relative z-10 flex-1">
          {/* Avatar and Top Actions */}
          <div className="flex items-end justify-between gap-4">
            <div className="relative">
              <img
                src={profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=8B5CF6&color=fff`}
                alt={profile?.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-white dark:ring-[#0F172A] shadow-xl bg-slate-100 dark:bg-slate-800"
              />
              {(profile?.championCount || 0) > 0 && (
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md flex items-center gap-0.5">
                  👑 x{profile?.championCount}
                </span>
              )}
            </div>

            {/* Friendship & Chat Buttons */}
            {profile && profile.friendshipStatus !== 'SELF' && (
              <div className="flex items-center gap-2">
                {profile.friendshipStatus === 'FRIENDS' && onOpenChat && profile.canMessage && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat(profile.id);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Nhắn tin</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleFriendAction}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    profile.friendshipStatus === 'FRIENDS'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600'
                      : profile.friendshipStatus === 'REQUEST_SENT'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : profile.friendshipStatus === 'REQUEST_RECEIVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30'
                  }`}
                >
                  {profile.friendshipStatus === 'FRIENDS' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Bạn bè</span>
                    </>
                  ) : profile.friendshipStatus === 'REQUEST_SENT' ? (
                    <span>Đã gửi lời mời (Hủy)</span>
                  ) : profile.friendshipStatus === 'REQUEST_RECEIVED' ? (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Chấp nhận lời mời</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Kết bạn</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Name & Bio */}
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{profile?.name}</span>
            </h3>
            {profile?.username && (
              <p className="text-xs text-slate-400 font-mono">@{profile.username}</p>
            )}
            {profile?.bio && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Social Stats Strip */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-center">
            <div>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{profile?.friendsCount || 0}</div>
              <div className="text-[10px] text-slate-400 font-medium">Bạn bè</div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-violet-600 dark:text-violet-400">{profile?.postsCount || 0}</div>
              <div className="text-[10px] text-slate-400 font-medium">Bài viết</div>
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">{Math.round((profile?.totalStudyMinutes || 0) / 60)}h</div>
              <div className="text-[10px] text-slate-400 font-medium">Giờ học tích lũy</div>
            </div>
          </div>

          {/* Location */}
          {profile?.location && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{profile.location}</span>
            </div>
          )}

          {/* Learning Languages */}
          {profile?.learningLanguages && profile.learningLanguages.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                Ngôn ngữ đang học
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.learningLanguages.map((lang, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {profile?.interests && profile.interests.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sở thích & Chủ đề
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((int, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40">
                    #{int}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Learning Goals */}
          {profile?.learningGoals && profile.learningGoals.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                Mục tiêu học tập công khai
              </span>
              <div className="space-y-1">
                {profile.learningGoals.map((goal, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-white/5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{goal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Safety & Moderation Actions */}
          {profile && profile.friendshipStatus !== 'SELF' && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Báo cáo vi phạm</span>
              </button>
              <button
                type="button"
                onClick={handleBlockUser}
                className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Chặn người dùng này</span>
              </button>
            </div>
          )}
        </div>

        {/* Report Modal Popup */}
        {showReportModal && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col justify-center space-y-4 animate-in fade-in duration-150">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Báo cáo người dùng {profile?.name}</span>
            </h4>
            <div className="space-y-2 text-xs">
              <label className="text-slate-300 font-semibold block">Lý do báo cáo:</label>
              <select
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="Quấy rối hoặc phát ngôn thù địch">Quấy rối hoặc phát ngôn thù địch</option>
                <option value="Spam hoặc lừa đảo">Spam hoặc lừa đảo</option>
                <option value="Tài khoản giả mạo">Tài khoản giả mạo</option>
                <option value="Nội dung không phù hợp">Nội dung không phù hợp</option>
              </select>

              <label className="text-slate-300 font-semibold block pt-2">Chi tiết thêm (tùy chọn):</label>
              <textarea
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                placeholder="Mô tả cụ thể hành vi vi phạm..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
