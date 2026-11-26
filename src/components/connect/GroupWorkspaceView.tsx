import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, Users, MessageSquare, Plus, Search, Shield, Globe, Lock, 
  ArrowRight, ArrowLeft, Check, X, RefreshCw, Sparkles, Send, Trash2, 
  Tag, Image as ImageIcon, Award, Clock, Flame, Heart, ThumbsUp, 
  Coffee, Brain, Frown, Pin, Edit3, Share2, Video, Mic, MicOff, 
  PhoneOff, Play, Pause, RotateCcw, Bell, Copy, CheckCircle2, 
  AlertCircle, VolumeX, UserPlus, UserX, Crown, Settings, Calendar, 
  Hash, Radio, ExternalLink, MessageCircle, BarChart3, HelpCircle
} from 'lucide-react';
import { 
  connectApi, SocialPost, CommunityChannelItem, CommunityChatMessageItem, 
  CommunityMeetItem, PostCommentItem 
} from '../../lib/connectApiClient';
import { toast } from '../../lib/toast';
import { compressAndUploadImage, validateImageFile, formatBytes } from '../../lib/imageCompressor';
import { useAppStore } from '../../lib/store';

interface GroupWorkspaceViewProps {
  communityId: string;
  onBack: () => void;
  onOpenProfile: (userId: string) => void;
}

export function GroupWorkspaceView({ communityId, onBack, onOpenProfile }: GroupWorkspaceViewProps) {
  const { currentUser } = useAppStore();

  // Active top tab (Mobile-first sticky switcher)
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'meets' | 'admin'>('feed');

  // Community details
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Join modal / pending state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinAnswer, setJoinAnswer] = useState('');
  const [joining, setJoining] = useState(false);

  // Load Community Details
  const loadCommunity = async () => {
    try {
      setLoading(true);
      const res = await connectApi.getCommunityDetails(communityId);
      if (res.success) {
        setCommunity(res.community);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải thông tin nhóm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity();
  }, [communityId]);

  // Join Community
  const handleJoin = async () => {
    try {
      setJoining(true);
      const res = await connectApi.joinCommunity(communityId);
      if (res.success) {
        toast.show(res.message || 'Thao tác thành công!', 'success');
        setShowJoinModal(false);
        loadCommunity();
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tham gia', 'error');
    } finally {
      setJoining(false);
    }
  };

  if (loading && !community) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Đang tải không gian nhóm...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold">Không tìm thấy nhóm</h3>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isOwner = community.membershipRole === 'OWNER';
  const isMod = community.membershipRole === 'MODERATOR' || isOwner;
  const isMember = community.isMember;
  const totalPending = (community.pendingMembersCount || 0) + (community.pendingPostsCount || 0);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24">
      {/* 1. GROUP HEADER CARD */}
      <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Cover Banner */}
        <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
          {community.coverImage && (
            <img 
              src={community.coverImage} 
              alt={community.name} 
              className="w-full h-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={onBack}
            className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
        </div>

        {/* Group Info Body */}
        <div className="p-4 sm:p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-3 sm:gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-lg shrink-0 border-2 border-white dark:border-slate-700">
                {community.avatar ? (
                  <img src={community.avatar} alt={community.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black">
                    {community.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {community.name}
                  </h1>
                  {community.privacy === 'PUBLIC' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Globe className="w-3 h-3" />
                      Công khai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Lock className="w-3 h-3" />
                      Nhóm Kín (Phải duyệt)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                  <span>👥 {community.memberCount} thành viên</span>
                  <span>•</span>
                  <span>📝 {community.postCount} bài viết</span>
                  {community.meetsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-rose-500 font-bold flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        {community.meetsCount} Meet đang Live
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {isMember ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                    {isOwner ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>{isOwner ? 'Chủ Nhóm' : (isMod ? 'Quản Trị Viên (Mod)' : 'Đã tham gia')}</span>
                  </span>
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Bạn có chắc muốn rời khỏi nhóm này không?')) {
                          await connectApi.leaveCommunity(communityId);
                          toast.show('Đã rời khỏi nhóm', 'info');
                          loadCommunity();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer"
                    >
                      Rời nhóm
                    </button>
                  )}
                </div>
              ) : community.membershipStatus === 'PENDING' ? (
                <span className="px-4 py-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang chờ duyệt vào nhóm</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joining}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{community.privacy === 'PUBLIC' ? 'Tham gia nhóm' : 'Xin vào nhóm'}</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            {community.description}
          </p>
        </div>

        {/* 2. STICKY MOBILE-FIRST HORIZONTAL TABS */}
        <div className="flex items-center gap-2 border-t border-slate-200/80 dark:border-slate-800 px-4 py-2 bg-slate-50/80 dark:bg-slate-900/80 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>📰 Bảng Tin Nhóm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>💬 Hộp Chat Đa Kênh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
              activeTab === 'meets'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>🎥 Phòng Meet & Lịch Hẹn</span>
            {community.meetsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          {isMod && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer relative ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-500" />
              <span>🛡️ Quản Trị Nhóm</span>
              {totalPending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {totalPending}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 3. TAB CONTENTS */}
      <div>
        {activeTab === 'feed' && (
          <GroupFeedTab 
            communityId={communityId} 
            communityName={community.name}
            isMember={isMember}
            isMod={isMod}
            requirePostApproval={community.requirePostApproval}
            currentUserId={currentUser?.id}
            onOpenProfile={onOpenProfile}
          />
        )}

        {activeTab === 'chat' && (
          <GroupChatTab 
            communityId={communityId} 
            isMember={isMember}
            isMod={isMod}
            isMuted={community.isMuted}
            currentUserId={currentUser?.id}
            onOpenProfile={onOpenProfile}
          />
        )}

        {activeTab === 'meets' && (
          <GroupMeetTab 
            communityId={communityId} 
            communityName={community.name}
            isMember={isMember}
            isMod={isMod}
            currentUserId={currentUser?.id}
          />
        )}

        {activeTab === 'admin' && isMod && (
          <GroupAdminTab 
            community={community} 
            onRefresh={loadCommunity}
          />
        )}
      </div>
    </div>
  );
}

// ==============================================================
// TAB 1: GROUP FEED (Đăng bài đa năng, Poll, Meet, Gen Z reactions)
// ==============================================================
function GroupFeedTab({ 
  communityId, 
  communityName, 
  isMember, 
  isMod, 
  requirePostApproval, 
  currentUserId,
  onOpenProfile
}: { 
  communityId: string; 
  communityName: string; 
  isMember: boolean; 
  isMod: boolean;
  requirePostApproval: boolean;
  currentUserId?: string;
  onOpenProfile: (userId: string) => void;
}) {
  const { currentUser } = useAppStore();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer
  const [content, setContent] = useState(() => localStorage.getItem(`lifeos_draft_group_post_${communityId}`) || '');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [submitting, setSubmitting] = useState(false);

  // Comments & Replies
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, PostCommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyParentId, setReplyParentId] = useState<Record<string, string | null>>({});

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem(`lifeos_draft_group_post_${communityId}`, content);
  }, [content, communityId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await connectApi.listPosts({ communityId });
      if (res && res.success) {
        setPosts(Array.isArray(res.posts) ? res.posts : []);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải bài viết nhóm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [communityId]);

  // Image Upload (<60KB Canvas Compression)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const val = validateImageFile(file);
    if (!val.valid) {
      toast.show(val.error || 'Ảnh không hợp lệ', 'error');
      return;
    }
    try {
      setIsCompressing(true);
      const res = await compressAndUploadImage(file, 'post', { maxDimension: 1200, targetMaxKB: 60 });
      setPostImages(prev => [...prev, res.url]);
      toast.show(`Ảnh đã nén còn ${formatBytes(res.compressedSize)} (giảm ${res.reductionPercent}%)`, 'success');
    } catch (err: any) {
      toast.show('Lỗi nén ảnh', 'error');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Submit Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && postImages.length === 0 && !showPollBuilder) {
      toast.show('Vui lòng nhập nội dung bài viết', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      let pollData = null;
      if (showPollBuilder && pollQuestion.trim()) {
        const cleanOptions = pollOptions.filter(o => o.trim().length > 0);
        if (cleanOptions.length < 2) {
          toast.show('Cuộc bình chọn cần ít nhất 2 lựa chọn', 'warning');
          setSubmitting(false);
          return;
        }
        pollData = {
          question: pollQuestion.trim(),
          options: cleanOptions.map((opt, i) => ({ id: `opt_${Date.now()}_${i}`, text: opt.trim(), votes: [] }))
        };
      }

      const res = await connectApi.createPost({
        content: content.trim(),
        images: postImages,
        communityId,
        isAnonymous,
        anonymousNickname: isAnonymous ? `Capybara Ẩn Danh #${Math.floor(Math.random() * 900 + 100)}` : undefined,
        poll: pollData
      });

      if (res.success) {
        if (res.isPendingApproval) {
          toast.show('Bài viết đã được gửi vào hàng chờ Ban quản trị duyệt.', 'info');
        } else {
          toast.show('Đã đăng bài viết thành công!', 'success');
          setPosts(prev => [res.post, ...prev]);
        }
        setContent('');
        setPostImages([]);
        setIsAnonymous(false);
        setShowPollBuilder(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        localStorage.removeItem(`lifeos_draft_group_post_${communityId}`);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi khi đăng bài', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Vote Poll
  const handleVotePoll = async (postId: string, optionId: string) => {
    try {
      const res = await connectApi.votePoll(postId, optionId);
      if (res.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, poll: res.poll } : p));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi bình chọn', 'error');
    }
  };

  // Toggle Reaction (4 Gen Z Reactions + Like/Love)
  const handleReaction = async (postId: string, type: string) => {
    try {
      const res = await connectApi.toggleReaction(postId, type);
      if (res.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, myReaction: res.myReaction, likes: res.likes } : p));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi thả cảm xúc', 'error');
    }
  };

  // Pin Post
  const handlePinPost = async (postId: string) => {
    try {
      const res = await connectApi.pinPost(postId);
      if (res.success) {
        toast.show(res.message, 'success');
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: res.isPinned } : p).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi ghim bài', 'error');
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này không?')) return;
    try {
      const res = await connectApi.deletePost(postId);
      if (res.success) {
        toast.show('Đã xóa bài viết', 'info');
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể xóa', 'error');
    }
  };

  // Toggle comments
  const toggleComments = async (postId: string) => {
    const isExpanded = !!expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));
    if (!isExpanded && !commentsMap[postId]) {
      try {
        const res = await connectApi.listComments(postId);
        if (res.success) {
          setCommentsMap(prev => ({ ...prev, [postId]: res.comments }));
        }
      } catch (err: any) {
        toast.show('Lỗi tải bình luận', 'error');
      }
    }
  };

  // Add Comment / Nested Reply
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    try {
      const parentId = replyParentId[postId] || undefined;
      const res = await connectApi.addComment(postId, text, parentId);
      if (res.success) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.comment]
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setReplyParentId(prev => ({ ...prev, [postId]: null }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        toast.show('Đã gửi bình luận!', 'success');
      }
    } catch (err: any) {
      toast.show('Lỗi gửi bình luận', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Post Composer Card */}
      {isMember ? (
        <form onSubmit={handleCreatePost} className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          {requirePostApproval && !isMod && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Nhóm này đang bật chế độ kiểm duyệt: Bài đăng sẽ được gửi tới Ban quản trị phê duyệt trước khi hiển thị.</span>
            </div>
          )}

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Chia sẻ điều gì đó với nhóm ${communityName}...`}
            rows={3}
            className="w-full text-xs sm:text-sm bg-transparent border-0 outline-none resize-none placeholder-slate-400 text-slate-900 dark:text-white"
          />

          {/* Attached Images Preview */}
          {postImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {postImages.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                  <img src={img} alt="Đính kèm" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPostImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Poll Builder Drawer */}
          {showPollBuilder && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Tạo cuộc Bình chọn (Poll)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPollBuilder(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Hủy
                </button>
              </div>
              <input
                type="text"
                placeholder="Câu hỏi bình chọn (Ví dụ: Giờ học nhóm tối nay?)"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
              />
              <div className="space-y-1.5">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder={`Lựa chọn ${idx + 1}`}
                      value={opt}
                      onChange={e => {
                        const val = e.target.value;
                        setPollOptions(prev => prev.map((item, i) => i === idx ? val : item));
                      }}
                      className="flex-1 text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPollOptions(prev => [...prev, ''])}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Thêm phương án bình chọn
                </button>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Photo Upload */}
              <label className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Ảnh (&lt;60KB)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageSelect} 
                  disabled={isCompressing} 
                  className="hidden" 
                />
              </label>

              {/* Poll Button */}
              <button
                type="button"
                onClick={() => setShowPollBuilder(prev => !prev)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">Bình chọn</span>
              </button>

              {/* Anonymous Toggle */}
              <button
                type="button"
                onClick={() => setIsAnonymous(prev => !prev)}
                className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  isAnonymous 
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Bật chế độ ẩn danh (Avatar & Tên giả lập)"
              >
                <HelpCircle className="w-4 h-4 text-purple-500" />
                <span>Ẩn danh {isAnonymous && '✓'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || isCompressing}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang gửi...' : 'Đăng bài'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center space-y-2">
          <Lock className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Bạn cần tham gia nhóm để đăng bài viết và tham gia thảo luận.
          </p>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Đang tải bài viết...</div>
      ) : posts.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Chưa có bài viết nào trong nhóm này. Hãy là người đầu tiên chia sẻ!</p>
        </div>
      ) : (
        posts.map(post => (
          <div 
            key={post.id}
            className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all space-y-3.5 ${
              post.isPinned 
                ? 'border-indigo-400 dark:border-indigo-600 shadow-md ring-1 ring-indigo-400/20' 
                : 'border-slate-200/80 dark:border-slate-800 shadow-xs'
            }`}
          >
            {/* Pinned Header Badge */}
            {post.isPinned && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl w-fit">
                <Pin className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
                <span>ĐÃ GHIM LÊN ĐẦU NHÓM</span>
              </div>
            )}

            {/* Author info & Actions */}
            <div className="flex items-center justify-between">
              <div 
                onClick={() => !post.isAnonymous && onOpenProfile(post.user.id)}
                className={`flex items-center gap-2.5 ${!post.isAnonymous ? 'cursor-pointer hover:opacity-80' : ''}`}
              >
                <img 
                  src={post.user.avatar || 'https://ui-avatars.com/api/?name=User'} 
                  alt={post.user.name} 
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {post.user.name}
                    {post.isAnonymous && (
                      <span className="text-[10px] font-normal text-purple-500 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.2 rounded-md">
                        Ẩn danh
                      </span>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Pin / Delete / Share menu */}
              <div className="flex items-center gap-1">
                {isMod && (
                  <button
                    type="button"
                    onClick={() => handlePinPost(post.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={post.isPinned ? 'Bỏ ghim' : 'Ghim bài'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${post.isPinned ? 'fill-indigo-600 text-indigo-600' : ''}`} />
                  </button>
                )}
                {(post.user.id === currentUserId || isMod) && (
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Xóa bài viết"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const refCode = currentUser?.referralCode || 'PROMO';
                    const link = `${window.location.origin}/?tab=connect&post=${post.id}&ref=${refCode}`;
                    navigator.clipboard.writeText(link);
                    toast.show('Đã sao chép link bài viết kèm mã giới thiệu ?ref=' + refCode, 'success');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Chia sẻ link bài viết"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Post Content */}
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>

            {/* Post Images */}
            {post.images && post.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden max-h-72">
                {post.images.map((img, i) => (
                  <img key={i} src={img} alt="Ảnh bài viết" className="w-full h-full object-cover max-h-72 rounded-xl" />
                ))}
              </div>
            )}

            {/* Live Poll Widget */}
            {post.poll && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  {post.poll.question}
                </h5>
                {(() => {
                  const totalVotes = post.poll.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);
                  return (
                    <div className="space-y-1.5">
                      {post.poll.options.map((opt: any) => {
                        const count = opt.votes?.length || 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const hasVoted = currentUserId && opt.votes?.includes(currentUserId);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleVotePoll(post.id, opt.id)}
                            className={`w-full relative overflow-hidden rounded-xl p-2.5 text-left border transition-all text-xs flex items-center justify-between cursor-pointer ${
                              hasVoted
                                ? 'border-indigo-500 bg-indigo-500/10 font-bold text-indigo-700 dark:text-indigo-300'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <div 
                              className="absolute left-0 top-0 bottom-0 bg-indigo-500/15 dark:bg-indigo-500/20 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                            <span className="relative z-10">{opt.text} {hasVoted && '✓'}</span>
                            <span className="relative z-10 text-[11px] font-bold text-slate-500">{pct}% ({count})</span>
                          </button>
                        );
                      })}
                      <p className="text-[10px] text-slate-400 pt-1 text-right">Tổng cộng: {totalVotes} phiếu bầu</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Meet Session Card */}
            {post.meetSession && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                      {post.meetSession.isInstant ? '🔴 MEET ĐANG TRỰC TIẾP' : '📅 LỊCH HẸN MEET'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                    {post.meetSession.title}
                  </h5>
                  <p className="text-[10px] text-slate-500">
                    Host: {post.meetSession.hostName} • Phòng: {post.meetSession.roomCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/?tab=connect&room=${post.meetSession.roomCode}`);
                    toast.show(`Đã sao chép link phòng: ${post.meetSession.roomCode}`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                >
                  Vào phòng
                </button>
              </div>
            )}

            {/* Reaction Bar (4 Gen Z Reactions: 🔥 Cháy quá, 🧠 Xin vía, 😭 Đồng cảm, ☕ Tiếp sức) */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {[
                  { type: 'FIRE', emoji: '🔥', label: 'Cháy quá' },
                  { type: 'BRAIN', emoji: '🧠', label: 'Xin vía' },
                  { type: 'CRY', emoji: '😭', label: 'Đồng cảm' },
                  { type: 'COFFEE', emoji: '☕', label: 'Tiếp sức' },
                ].map(r => {
                  const isSelected = post.myReaction === r.type;
                  return (
                    <button
                      key={r.type}
                      type="button"
                      onClick={() => handleReaction(post.id, r.type)}
                      className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 scale-105' 
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="hidden sm:inline text-[11px]">{r.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => toggleComments(post.id)}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{post.commentsCount || 0} bình luận</span>
              </button>
            </div>

            {/* Multi-Level Comments Drawer */}
            {expandedComments[post.id] && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Comments List */}
                <div className="space-y-2">
                  {(commentsMap[post.id] || []).map(comment => (
                    <div key={comment.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {comment.user.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{comment.content}</p>
                    </div>
                  ))}
                </div>

                {/* Comment Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Viết câu trả lời..."
                    value={commentInputs[post.id] || ''}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComment(post.id);
                      }
                    }}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 outline-none text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddComment(post.id)}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ==============================================================
// TAB 2: MULTI-CHANNEL GROUP CHAT (Discord + Zalo style)
// ==============================================================
function GroupChatTab({ 
  communityId, 
  isMember, 
  isMod, 
  isMuted,
  currentUserId,
  onOpenProfile
}: { 
  communityId: string; 
  isMember: boolean; 
  isMod: boolean; 
  isMuted: boolean;
  currentUserId?: string;
  onOpenProfile: (userId: string) => void;
}) {
  const [channels, setChannels] = useState<CommunityChannelItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [messages, setMessages] = useState<CommunityChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New message input (Auto-save draft per channel)
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityChatMessageItem | null>(null);
  const [chatImages, setChatImages] = useState<string[]>([]);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 100% PRIVATE: If not member, lock out completely
  if (!isMember) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <Lock className="w-10 h-10 text-indigo-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Hộp Chat Bảo Mật Của Nhóm</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Những người chưa tham gia nhóm hoặc đang ở trạng thái chờ duyệt không thể truy cập hoặc đọc tin nhắn bên trong. Hãy tham gia nhóm để trò chuyện.
        </p>
      </div>
    );
  }

  // Load Channels
  const loadChannels = async () => {
    try {
      setLoading(true);
      const res = await connectApi.listChannels(communityId);
      if (res && res.success && Array.isArray(res.channels) && res.channels.length > 0) {
        setChannels(res.channels);
        if (!activeChannelId) {
          // Default to general or first channel
          const general = res.channels.find(c => c.type === 'GENERAL') || res.channels[0];
          setActiveChannelId(general.id);
        }
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải kênh chat', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [communityId]);

  // Load Messages for active channel
  const loadMessages = async () => {
    if (!activeChannelId) return;
    try {
      const res = await connectApi.listChannelMessages(communityId, activeChannelId);
      if (res && res.success) {
        setMessages(Array.isArray(res.messages) ? res.messages : []);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải tin nhắn', 'error');
    }
  };

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 3.5s for real-time responsiveness
    const timer = setInterval(loadMessages, 3500);
    return () => clearInterval(timer);
  }, [activeChannelId]);

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && chatImages.length === 0) return;

    try {
      const res = await connectApi.sendChannelMessage(communityId, activeChannelId, {
        content: text.trim(),
        images: chatImages,
        replyToId: replyTo?.id
      });
      if (res.success) {
        setMessages(prev => [...prev, res.message]);
        setText('');
        setChatImages([]);
        setReplyTo(null);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi gửi tin nhắn', 'error');
    }
  };

  // Create Channel (Owner/Mod only)
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const res = await connectApi.createChannel(communityId, {
        name: newChannelName.trim(),
        type: 'CUSTOM'
      });
      if (res.success) {
        toast.show('Đã tạo kênh mới thành công!', 'success');
        setChannels(prev => [...prev, res.channel]);
        setActiveChannelId(res.channel.id);
        setShowNewChannelModal(false);
        setNewChannelName('');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tạo kênh', 'error');
    }
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const isAnnouncementOnly = activeChannel?.type === 'ANNOUNCEMENT' && !isMod;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[560px]">
      {/* 1. CHANNELS HORIZONTAL SLIDER */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 overflow-x-auto scrollbar-none shrink-0">
        {channels.map(c => {
          const isActive = c.id === activeChannelId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChannelId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span>{c.name}</span>
            </button>
          );
        })}

        {isMod && (
          <button
            type="button"
            onClick={() => setShowNewChannelModal(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kênh mới</span>
          </button>
        )}
      </div>

      {/* 2. CHAT MESSAGES BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-xs text-slate-400 py-8">Đang tải tin nhắn...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-12 space-y-2">
            <Hash className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p>Chào mừng bạn đến với {activeChannel?.name || 'kênh chat'}!</p>
            <p className="text-[10px]">Hãy gửi lời chào đầu tiên tới các thành viên.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div 
                key={msg.id}
                className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <img 
                  src={msg.sender.avatar || 'https://ui-avatars.com/api/?name=User'} 
                  alt={msg.sender.name}
                  onClick={() => onOpenProfile(msg.sender.id)}
                  className="w-7 h-7 rounded-xl object-cover shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700" 
                />
                <div className={`space-y-1 max-w-[78%] ${isMe ? 'items-end' : ''}`}>
                  {!isMe && (
                    <span className="text-[10px] font-bold text-slate-500 block">
                      {msg.sender.name}
                    </span>
                  )}

                  {/* Message Bubble */}
                  <div 
                    className={`p-3 rounded-2xl text-xs leading-relaxed space-y-2 ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs'
                    }`}
                  >
                    {/* Meet Card Inside Chat */}
                    {msg.meetData && (
                      <div className="p-2.5 rounded-xl bg-black/20 border border-white/20 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300">
                          <Radio className="w-3 h-3 animate-pulse text-rose-400" />
                          <span>LỊCH HẸN MEET TRỰC TUYẾN</span>
                        </div>
                        <h5 className="font-bold text-xs">{msg.meetData.title}</h5>
                        <p className="text-[10px] opacity-80">Mã phòng: {msg.meetData.roomCode}</p>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Chat Images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden pt-1">
                        {msg.images.map((im, idx) => (
                          <img key={idx} src={im} alt="Ảnh chat" className="w-full h-24 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message timestamp & quick reactions */}
                  <div className={`flex items-center gap-1.5 text-[9px] text-slate-400 ${isMe ? 'justify-end' : ''}`}>
                    <span>{new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(msg)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-500 cursor-pointer"
                    >
                      Trả lời
                    </button>
                    {(isMe || isMod) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('Xóa tin nhắn này?')) {
                            await connectApi.deleteChannelMessage(communityId, msg.id);
                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-500 cursor-pointer"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Quote Bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
          <span className="text-indigo-700 dark:text-indigo-300 font-semibold truncate">
            Đang trả lời {replyTo.sender.name}: "{replyTo.content.substring(0, 40)}..."
          </span>
          <button type="button" onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. INPUT BAR */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        {isMuted ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-xs font-bold text-center">
            Bạn đang bị Ban quản trị tạm khóa quyền gửi tin nhắn trong nhóm.
          </div>
        ) : isAnnouncementOnly ? (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold text-center">
            🔒 Kênh Thông Báo chỉ cho phép Quản trị viên gửi tin nhắn để tránh trôi tin.
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Nhắn tin vào ${activeChannel?.name || 'kênh'}...`}
              value={text}
              onChange={e => setText(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-0 outline-none text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={!text.trim() && chatImages.length === 0}
              className="p-2.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Create Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              Tạo Kênh Chat Con Mới
            </h4>
            <input
              type="text"
              placeholder="Tên kênh (VD: thảo-luận-ielts-reading)"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewChannelModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateChannel}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Tạo kênh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================
// TAB 3: LIVE MEET & WAITING ROOM (Discord / Google Meet)
// ==============================================================
function GroupMeetTab({ 
  communityId, 
  communityName, 
  isMember, 
  isMod, 
  currentUserId 
}: { 
  communityId: string; 
  communityName: string; 
  isMember: boolean; 
  isMod: boolean; 
  currentUserId?: string; 
}) {
  const { currentUser } = useAppStore();
  const [meets, setMeets] = useState<CommunityMeetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Meet In-Room State
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(() => localStorage.getItem(`lifeos_active_meet_${communityId}`));
  const [meetData, setMeetData] = useState<any>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  // In-Meet Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [sharedNotes, setSharedNotes] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Form
  const [createForm, setCreateForm] = useState({
    title: '',
    isInstant: true,
    scheduledDate: '',
    scheduledTime: '',
    requireApproval: true,
    allowMembersDirect: true
  });
  const [creating, setCreating] = useState(false);

  const loadMeets = async () => {
    try {
      setLoading(true);
      const res = await connectApi.listMeets(communityId);
      if (res && res.success) {
        setMeets(Array.isArray(res.meets) ? res.meets : []);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải danh sách Meet', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeets();
  }, [communityId]);

  // Join Meet
  const handleJoinMeet = async (roomCode: string) => {
    try {
      const res = await connectApi.joinMeet(roomCode);
      if (res.success) {
        setActiveRoomCode(roomCode);
        localStorage.setItem(`lifeos_active_meet_${communityId}`, roomCode);
        if (res.status === 'WAITING') {
          setIsWaiting(true);
          toast.show('Bạn đang ở Phòng Chờ. Đang đợi Host duyệt cho bạn vào...', 'info');
        } else {
          setIsWaiting(false);
          setMeetData(res.meet);
          setSharedNotes(res.meet?.notes || '');
          toast.show('Đã vào phòng Meet!', 'success');
        }
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi vào phòng Meet', 'error');
    }
  };

  // Poll Meet state when active
  useEffect(() => {
    if (!activeRoomCode) return;
    const fetchState = async () => {
      try {
        const res = await connectApi.getMeetByCode(activeRoomCode);
        if (res.success) {
          setMeetData(res.meet);
          setSharedNotes(res.meet.notes || '');
          if (res.meet.isInside) {
            setIsWaiting(false);
          } else if (res.meet.isWaiting) {
            setIsWaiting(true);
          }
          if (res.meet.status === 'ENDED') {
            toast.show('Buổi Meet đã kết thúc.', 'info');
            handleLeaveMeet();
          }
        }
      } catch (err) {}
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [activeRoomCode]);

  // Heartbeat logging study minutes every 30s
  useEffect(() => {
    if (!activeRoomCode || isWaiting) return;
    const hb = setInterval(async () => {
      try {
        await connectApi.heartbeatMeet(activeRoomCode, 0.5);
      } catch {}
    }, 30000);
    return () => clearInterval(hb);
  }, [activeRoomCode, isWaiting]);

  // Leave Meet
  const handleLeaveMeet = () => {
    setActiveRoomCode(null);
    setMeetData(null);
    setIsWaiting(false);
    localStorage.removeItem(`lifeos_active_meet_${communityId}`);
  };

  // Create Meet
  const handleCreateMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.show('Vui lòng nhập tiêu đề Meet', 'warning');
      return;
    }
    try {
      setCreating(true);
      const res = await connectApi.createMeet(communityId, createForm);
      if (res.success) {
        toast.show('Đã tạo phòng Meet thành công!', 'success');
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          isInstant: true,
          scheduledDate: '',
          scheduledTime: '',
          requireApproval: true,
          allowMembersDirect: true
        });
        loadMeets();
        if (createForm.isInstant) {
          handleJoinMeet(res.meet.roomCode);
        }
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tạo phòng Meet', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Host: Approve waiting participant
  const handleApprove = async (targetUserId: string) => {
    if (!activeRoomCode) return;
    try {
      const res = await connectApi.approveWaitingParticipant(activeRoomCode, targetUserId);
      if (res.success) {
        toast.show(res.message, 'success');
        setMeetData(res.meet);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi duyệt', 'error');
    }
  };

  // Host: Approve all waiting
  const handleApproveAll = async () => {
    if (!activeRoomCode) return;
    try {
      const res = await connectApi.approveAllWaiting(activeRoomCode);
      if (res.success) {
        toast.show(res.message, 'success');
        setMeetData(res.meet);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi duyệt tất cả', 'error');
    }
  };

  // Host: Controls
  const handleHostControl = async (controls: any) => {
    if (!activeRoomCode) return;
    try {
      const res = await connectApi.updateMeetControls(activeRoomCode, controls);
      if (res.success) {
        setMeetData(res.meet);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi điều khiển phòng', 'error');
    }
  };

  // Save Shared Notes (Debounced)
  const handleNotesChange = (newNotes: string) => {
    setSharedNotes(newNotes);
    handleHostControl({ notes: newNotes });
  };

  // Register reminder
  const handleRegisterReminder = async (roomCode: string) => {
    try {
      const res = await connectApi.registerMeetReminder(roomCode);
      if (res.success) {
        toast.show(res.message, 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi đăng ký nhắc hẹn', 'error');
    }
  };

  // 1. IN ACTIVE MEET ROOM VIEW
  if (activeRoomCode && meetData) {
    const isHost = meetData.hostId === currentUserId;
    const activeList = Array.isArray(meetData.activeParticipants) ? (meetData.activeParticipants as any[]) : [];
    const waitingList = Array.isArray(meetData.waitingParticipants) ? (meetData.waitingParticipants as any[]) : [];

    // LOBBY / WAITING ROOM
    if (isWaiting) {
      return (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ⏳ Phòng Chờ (Waiting Lobby)
            </h3>
            <p className="text-xs text-slate-500">
              Đang chờ Người tổ chức ({meetData.host?.name || 'Host'}) duyệt cho bạn vào phòng "{meetData.title}"...
            </p>
          </div>
          <button
            type="button"
            onClick={handleLeaveMeet}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
          >
            Rời phòng chờ
          </button>
        </div>
      );
    }

    // INSIDE LIVE MEET
    return (
      <div className="rounded-3xl bg-slate-950 text-white p-4 sm:p-6 space-y-4 shadow-xl border border-slate-800">
        {/* Meet Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                {meetData.title}
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {meetData.roomCode}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Host: {meetData.host?.name} • {activeList.length} người đang tham gia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const link = `${window.location.origin}/?tab=connect&room=${meetData.roomCode}&ref=${currentUser?.referralCode || 'PROMO'}`;
                navigator.clipboard.writeText(link);
                toast.show('Đã sao chép link mời Meet kèm mã giới thiệu!', 'success');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Link mời</span>
            </button>

            <button
              type="button"
              onClick={handleLeaveMeet}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Rời Meet</span>
            </button>
          </div>
        </div>

        {/* HOST WAITING ROOM NOTIFICATION BANNER */}
        {isHost && waitingList.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-bold text-amber-300">
                Có {waitingList.length} người đang ở phòng chờ xin vào!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApproveAll}
                className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                ✅ Duyệt tất cả
              </button>
            </div>
          </div>
        )}

        {/* Video / Avatar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {activeList.map((p: any) => (
            <div key={p.userId} className="relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-3 overflow-hidden group">
              <img 
                src={p.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)} 
                alt={p.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500" 
              />
              <span className="text-xs font-bold mt-2 truncate max-w-full flex items-center gap-1">
                {p.name}
                {p.isHost && <Crown className="w-3 h-3 text-amber-400" />}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-1 ${p.isMuted ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                {p.isMuted ? 'Đã tắt mic' : 'Đang mở mic'}
              </span>

              {/* Host actions on participant */}
              {isHost && !p.isHost && (
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleHostControl({ toggleMuteUser: p.userId })}
                    className="p-1 rounded-lg bg-black/60 hover:bg-slate-700 text-white"
                    title="Tắt/Bật mic thành viên"
                  >
                    <VolumeX className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHostControl({ kickUser: p.userId })}
                    className="p-1 rounded-lg bg-black/60 hover:bg-rose-600 text-white"
                    title="Mời ra khỏi phòng"
                  >
                    <UserX className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Synchronized Pomodoro Bar */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              🍅 Đồng hồ Pomodoro Chung:
            </span>
            <span className="text-sm font-mono font-bold">
              {meetData.pomodoroState?.mode === 'focus' ? '🎯 Tập trung' : '☕ Nghỉ giải lao'}
            </span>
          </div>
          {isHost && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleHostControl({ pomodoroAction: meetData.pomodoroState?.isRunning ? 'pause' : 'start' })}
                className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold cursor-pointer"
              >
                {meetData.pomodoroState?.isRunning ? 'Tạm dừng' : 'Bắt đầu'}
              </button>
              <button
                type="button"
                onClick={() => handleHostControl({ pomodoroAction: 'switch' })}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Đổi hiệp
              </button>
            </div>
          )}
        </div>

        {/* Shared Collaborative Notes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              📝 Bảng Ghi Chú & Tài Liệu Chung Thời Gian Thực
            </label>
            <span className="text-[10px] text-slate-500">Mọi thành viên đều có thể nhập</span>
          </div>
          <textarea
            value={sharedNotes}
            onChange={e => handleNotesChange(e.target.value)}
            rows={4}
            placeholder="Ghi chú kiến thức, bài tập hoặc tài liệu buổi học tại đây..."
            className="w-full text-xs p-3 rounded-2xl bg-slate-900 border border-slate-800 outline-none text-slate-100 placeholder-slate-500"
          />
        </div>

        {/* In-Meet Control Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !isMicOn;
              setIsMicOn(next);
              handleHostControl({ selfMute: !next });
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              isMicOn ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>{isMicOn ? 'Mic: Đang bật' : 'Mic: Đã tắt'}</span>
          </button>

          {isHost && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kết thúc buổi Meet cho tất cả thành viên?')) {
                  handleHostControl({ endMeet: true });
                }
              }}
              className="px-4 py-2 rounded-2xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold cursor-pointer transition-all"
            >
              🛑 Kết thúc Meet cho tất cả
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. MEETS LIST VIEW
  return (
    <div className="space-y-4">
      {/* Top Action Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-500" />
            Phòng Học Nhóm & Live Meet Trực Tuyến
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mt-0.5">
            Cùng học trực tuyến có kiểm soát phòng chờ, đồng bộ đồng hồ Pomodoro và nhắc lịch qua Gmail.
          </p>
        </div>

        {isMember && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tổ chức Meet</span>
          </button>
        )}
      </div>

      {/* List Meets */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Đang tải lịch Meet...</div>
      ) : meets.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Chưa có lịch Meet nào trong nhóm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {meets.map(m => (
            <div 
              key={m.id}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {m.status === 'LIVE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        ĐANG LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        <Calendar className="w-3 h-3" />
                        {m.scheduledDate} lúc {m.scheduledTime}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h4>
                  <p className="text-[10px] text-slate-500">Host: {m.host.name} • Mã: {m.roomCode}</p>
                </div>
              </div>

              {m.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300">{m.description}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => handleRegisterReminder(m.roomCode)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nhắc hẹn (Gmail)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleJoinMeet(m.roomCode)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Vào phòng
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Meet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateMeet} className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-500" />
                Tổ Chức Meet Học Nhóm
              </h4>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề phòng Meet *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ôn thi JLPT N2 • Deep Work 90 phút"
                  value={createForm.title}
                  onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Mode switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({ ...prev, isInstant: true }))}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    createForm.isInstant
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ⚡ Mở Meet ngay lập tức
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm(prev => ({ ...prev, isInstant: false }))}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    !createForm.isInstant
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  📅 Lên lịch hẹn
                </button>
              </div>

              {!createForm.isInstant && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Ngày diễn ra</label>
                    <input
                      type="date"
                      value={createForm.scheduledDate}
                      onChange={e => setCreateForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Giờ bắt đầu</label>
                    <input
                      type="time"
                      value={createForm.scheduledTime}
                      onChange={e => setCreateForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Waiting room toggles */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Bật phòng chờ duyệt (Waiting Room)
                  </span>
                  <input
                    type="checkbox"
                    checked={createForm.requireApproval}
                    onChange={e => setCreateForm(prev => ({ ...prev, requireApproval: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cho phép thành viên nhóm vào thẳng
                  </span>
                  <input
                    type="checkbox"
                    checked={createForm.allowMembersDirect}
                    onChange={e => setCreateForm(prev => ({ ...prev, allowMembersDirect: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-500"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {creating ? 'Đang tạo...' : 'Tạo phòng Meet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ==============================================================
// TAB 4: GROUP ADMIN (Facebook Groups style: Duyệt mem, Duyệt bài, Phân quyền)
// ==============================================================
function GroupAdminTab({ community, onRefresh }: { community: any; onRefresh: () => void }) {
  const [adminSection, setAdminSection] = useState<'pending_members' | 'pending_posts' | 'members' | 'settings'>('pending_members');

  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Settings form
  const [settings, setSettings] = useState({
    requirePostApproval: community.requirePostApproval || false,
    privacy: community.privacy || 'PUBLIC',
    name: community.name || '',
    description: community.description || ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, postsRes, allRes] = await Promise.all([
        connectApi.listPendingMembers(community.id),
        connectApi.listPendingPosts(community.id),
        connectApi.listAllMembers(community.id)
      ]);
      if (membersRes && membersRes.success) setPendingMembers(Array.isArray(membersRes.pending) ? membersRes.pending : []);
      if (postsRes && postsRes.success) setPendingPosts(Array.isArray(postsRes.posts) ? postsRes.posts : []);
      if (allRes && allRes.success) setAllMembers(Array.isArray(allRes.members) ? allRes.members : []);
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải dữ liệu quản trị', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [community.id]);

  // Approve member
  const handleApproveMember = async (userId: string) => {
    try {
      const res = await connectApi.approveMember(community.id, userId);
      if (res.success) {
        toast.show(res.message, 'success');
        setPendingMembers(prev => prev.filter(m => m.user.id !== userId));
        onRefresh();
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi duyệt', 'error');
    }
  };

  // Reject member
  const handleRejectMember = async (userId: string) => {
    try {
      const res = await connectApi.rejectMember(community.id, userId);
      if (res.success) {
        toast.show(res.message, 'success');
        setPendingMembers(prev => prev.filter(m => m.user.id !== userId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi từ chối', 'error');
    }
  };

  // Approve post
  const handleApprovePost = async (postId: string) => {
    try {
      const res = await connectApi.approvePost(community.id, postId);
      if (res.success) {
        toast.show(res.message, 'success');
        setPendingPosts(prev => prev.filter(p => p.id !== postId));
        onRefresh();
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi duyệt bài', 'error');
    }
  };

  // Reject post
  const handleRejectPost = async (postId: string) => {
    try {
      const res = await connectApi.rejectPost(community.id, postId);
      if (res.success) {
        toast.show(res.message, 'success');
        setPendingPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi từ chối bài', 'error');
    }
  };

  // Role / Mute / Kick
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await connectApi.updateMemberRole(community.id, userId, newRole);
      if (res.success) {
        toast.show(res.message, 'success');
        setAllMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi đổi vai trò', 'error');
    }
  };

  const handleMuteChange = async (userId: string, isMuted: boolean) => {
    try {
      const res = await connectApi.toggleMuteMember(community.id, userId, isMuted);
      if (res.success) {
        toast.show(res.message, 'success');
        setAllMembers(prev => prev.map(m => m.userId === userId ? { ...m, isMuted } : m));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi cấm chat', 'error');
    }
  };

  const handleKickMember = async (userId: string, ban = false) => {
    if (!window.confirm(ban ? 'Chặn vĩnh viễn thành viên này?' : 'Mời thành viên này ra khỏi nhóm?')) return;
    try {
      const res = await connectApi.kickMember(community.id, userId, ban);
      if (res.success) {
        toast.show(res.message, 'success');
        setAllMembers(prev => prev.filter(m => m.userId !== userId));
        onRefresh();
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi kick thành viên', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await connectApi.updateCommunitySettings(community.id, settings);
      if (res.success) {
        toast.show(res.message, 'success');
        onRefresh();
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi lưu cài đặt', 'error');
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Sub tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setAdminSection('pending_members')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-all ${
            adminSection === 'pending_members'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Duyệt thành viên ({pendingMembers.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminSection('pending_posts')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-all ${
            adminSection === 'pending_posts'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Duyệt bài đăng ({pendingPosts.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminSection('members')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-all ${
            adminSection === 'members'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Danh sách thành viên ({allMembers.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminSection('settings')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-all ${
            adminSection === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Cài đặt nhóm
        </button>
      </div>

      {/* 1. PENDING MEMBERS */}
      {adminSection === 'pending_members' && (
        <div className="space-y-3">
          {pendingMembers.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Không có yêu cầu tham gia nào đang chờ duyệt.</p>
          ) : (
            pendingMembers.map(m => (
              <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <img src={m.user.avatar || 'https://ui-avatars.com/api/?name=User'} alt={m.user.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{m.user.name}</h5>
                    <p className="text-[10px] text-slate-400">
                      Gửi yêu cầu: {new Date(m.joinedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproveMember(m.user.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    ✅ Phê duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectMember(m.user.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 text-xs font-bold hover:bg-rose-200 cursor-pointer"
                  >
                    ❌ Từ chối
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. PENDING POSTS */}
      {adminSection === 'pending_posts' && (
        <div className="space-y-3">
          {pendingPosts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Không có bài viết nào đang chờ duyệt.</p>
          ) : (
            pendingPosts.map(p => (
              <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{p.user.name}</span>
                  <span className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">{p.content}</p>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleApprovePost(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    ✅ Duyệt đăng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectPost(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 text-xs font-bold hover:bg-rose-200 cursor-pointer"
                  >
                    ❌ Từ chối
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. MEMBERS MANAGEMENT */}
      {adminSection === 'members' && (
        <div className="space-y-2">
          {allMembers.map(m => (
            <div key={m.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <img src={m.user.avatar || 'https://ui-avatars.com/api/?name=User'} alt={m.user.name} className="w-8 h-8 rounded-xl object-cover" />
                <div>
                  <h5 className="text-xs font-bold flex items-center gap-1.5">
                    {m.user.name}
                    {m.role === 'OWNER' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    {m.role === 'MODERATOR' && <Shield className="w-3 h-3 text-indigo-500" />}
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    {m.role === 'OWNER' ? 'Chủ nhóm' : m.role === 'MODERATOR' ? 'Quản trị viên phụ (Mod)' : 'Thành viên'}
                    {m.isMuted && ' • 🔇 Đang bị cấm chat'}
                  </span>
                </div>
              </div>

              {m.role !== 'OWNER' && (
                <div className="flex items-center gap-1.5">
                  {m.role === 'MODERATOR' ? (
                    <button
                      type="button"
                      onClick={() => handleRoleChange(m.user.id, 'MEMBER')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Bỏ Mod
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRoleChange(m.user.id, 'MODERATOR')}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100"
                    >
                      👑 Cấp Mod
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleMuteChange(m.user.id, !m.isMuted)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950"
                  >
                    {m.isMuted ? '🔊 Gỡ cấm chat' : '🔇 Cấm chat'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKickMember(m.user.id, false)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Mời ra
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. SETTINGS */}
      {adminSection === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-4 max-w-lg">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tên nhóm</label>
            <input
              type="text"
              value={settings.name}
              onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Mô tả nhóm</label>
            <textarea
              value={settings.description}
              onChange={e => setSettings(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Kiểm duyệt bài viết trước khi hiển thị (Duyệt bài)
              </span>
              <input
                type="checkbox"
                checked={settings.requirePostApproval}
                onChange={e => setSettings(prev => ({ ...prev, requirePostApproval: e.target.checked }))}
                className="w-4 h-4 rounded text-indigo-600"
              />
            </label>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Quyền riêng tư nhóm
              </label>
              <select
                value={settings.privacy}
                onChange={e => setSettings(prev => ({ ...prev, privacy: e.target.value }))}
                className="w-full text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <option value="PUBLIC">🔓 Nhóm Công Khai (Ai cũng vào được)</option>
                <option value="APPROVAL_REQUIRED">🔒 Nhóm Kín (Phải duyệt mới được vào)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
          >
            Lưu cài đặt nhóm
          </button>
        </form>
      )}
    </div>
  );
}
