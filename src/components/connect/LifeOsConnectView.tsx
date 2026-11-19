import React, { useState, useEffect } from 'react';
import { 
  Globe, Users, MessageSquare, Building, User, 
  Sparkles, Award, Clock, Edit3, Share2, Shield, 
  Search, Bell, Settings, ArrowLeft 
} from 'lucide-react';
import { connectApi, SocialUser } from '../../lib/connectApiClient';
import { SocialFeedView } from './SocialFeedView';
import { ExplorePeopleView } from './ExplorePeopleView';
import { FriendsManagerView } from './FriendsManagerView';
import { DirectMessagesView } from './DirectMessagesView';
import { CommunitiesView } from './CommunitiesView';
import { UserProfileModal } from './UserProfileModal';
import { EditProfileModal } from './EditProfileModal';
import { toast } from '../../lib/toast';

export function LifeOsConnectView() {
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'friends' | 'messages' | 'communities'>('feed');
  const [myProfile, setMyProfile] = useState<SocialUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Modals and cross-view navigations
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<{ id: string; name: string } | null>(null);

  // Badge counters
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const fetchProfileAndCounters = async () => {
    try {
      setLoadingProfile(true);
      const [profileRes, requestsRes, convsRes] = await Promise.allSettled([
        connectApi.getMyProfile(),
        connectApi.listPendingRequests(),
        connectApi.listConversations()
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
        setMyProfile(profileRes.value.profile || null);
      }
      if (requestsRes.status === 'fulfilled' && requestsRes.value?.success) {
        const received = Array.isArray(requestsRes.value?.requests?.received)
          ? requestsRes.value.requests.received
          : [];
        setPendingRequestsCount(received.length);
      }
      if (convsRes.status === 'fulfilled' && convsRes.value?.success) {
        const convList = Array.isArray(convsRes.value?.conversations)
          ? convsRes.value.conversations
          : [];
        const totalUnread = convList.reduce((sum, c) => sum + (c?.unreadCount || 0), 0);
        setUnreadMessagesCount(totalUnread);
      }
    } catch {
      // Ignore background fetch errors
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfileAndCounters();
  }, []);

  const handleOpenChat = (targetUserId: string) => {
    setActiveChatUserId(targetUserId);
    setActiveTab('messages');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative 3D Ambient Blur */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div 
              onClick={() => {
                if (myProfile?.id) setSelectedProfileUserId(myProfile.id);
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center font-black text-2xl text-white shadow-inner shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            >
              {myProfile?.avatar ? (
                <img src={myProfile.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                myProfile?.name?.charAt(0).toUpperCase() || 'OS'
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{myProfile?.name || 'Bảng Tin Cộng Đồng'}</h1>
                {myProfile?.championCount && myProfile.championCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/90 text-amber-950 font-black text-[11px] shadow-xs flex items-center gap-1">
                    👑 Top 1 Tuần ({myProfile.championCount}x)
                  </span>
                ) : null}
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                {myProfile?.bio || 'Mạng xã hội học tập & phát triển bản thân. Kết nối bạn bè, chia sẻ mục tiêu, cùng nhau tiến bộ!'}
              </p>
              <div className="flex items-center gap-4 mt-2.5 text-xs font-semibold text-emerald-200">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-white" />
                  {myProfile?.totalStudyMinutes || 0} phút tích lũy
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {myProfile?.weeklyStudyMinutes || 0} phút tuần này
                </span>
                {myProfile?.location && (
                  <span>📍 {myProfile.location}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (myProfile?.id) setSelectedProfileUserId(myProfile.id);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Hồ sơ công khai</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setSelectedCommunity(null);
            setActiveTab('feed');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeTab === 'feed' && !selectedCommunity
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Bảng Tin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeTab === 'explore'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Khám Phá Người Dùng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeTab === 'friends'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bạn Bè</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeTab === 'messages'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Trò Chuyện Riêng</span>
          {unreadMessagesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('communities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            activeTab === 'communities'
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Cộng Đồng</span>
        </button>

        {selectedCommunity && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold ml-auto shrink-0">
            <span>🏛️ Đang xem: {selectedCommunity.name}</span>
            <button
              type="button"
              onClick={() => setSelectedCommunity(null)}
              className="p-1 hover:text-rose-500 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Views */}
      <main>
        {activeTab === 'feed' && (
          <SocialFeedView
            currentUserId={myProfile?.id}
            onOpenProfile={userId => setSelectedProfileUserId(userId)}
            communityId={selectedCommunity?.id}
          />
        )}

        {activeTab === 'explore' && (
          <ExplorePeopleView
            currentUserId={myProfile?.id}
            onOpenProfile={userId => setSelectedProfileUserId(userId)}
            onOpenChat={handleOpenChat}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsManagerView
            currentUserId={myProfile?.id}
            onOpenProfile={userId => setSelectedProfileUserId(userId)}
            onOpenChat={handleOpenChat}
          />
        )}

        {activeTab === 'messages' && (
          <DirectMessagesView
            currentUserId={myProfile?.id}
            initialTargetUserId={activeChatUserId}
            onOpenProfile={userId => setSelectedProfileUserId(userId)}
            onClearInitialTarget={() => setActiveChatUserId(null)}
          />
        )}

        {activeTab === 'communities' && (
          <CommunitiesView
            currentUserId={myProfile?.id}
            onSelectCommunityFeed={(id, name) => {
              setSelectedCommunity({ id, name });
              setActiveTab('feed');
            }}
          />
        )}
      </main>

      {/* Profile Detail Modal */}
      {selectedProfileUserId && (
        <UserProfileModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && myProfile && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          initialProfile={myProfile}
          onClose={() => setShowEditProfileModal(false)}
          onProfileUpdated={() => {
            fetchProfileAndCounters();
            setShowEditProfileModal(false);
          }}
        />
      )}
    </div>
  );
}
