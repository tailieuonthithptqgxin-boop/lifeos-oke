import React, { useState, useEffect } from 'react';
import { 
  Flame, Brain, Coffee, MessageCircle, Share2, 
  Send, Trash2, Tag, Image as ImageIcon, Award, 
  Sparkles, Clock, Globe, RefreshCw, X, ShieldAlert,
  BarChart2, Video, EyeOff, Pin, Edit3, Check, Plus
} from 'lucide-react';
import { connectApi, SocialPost, PostCommentItem, CommunityItem } from '../../lib/connectApiClient';
import { toast } from '../../lib/toast';
import { compressAndUploadImage, formatBytes, validateImageFile } from '../../lib/imageCompressor';
import { useAppStore } from '../../lib/store';
import { recordUserActivity } from '../../lib/globalUserSync';

interface SocialFeedViewProps {
  currentUserId?: string;
  onOpenProfile: (userId: string) => void;
  communityId?: string;
}

// 4 Signature Gen Z Reactions
const REACTION_TYPES = [
  { type: 'FIRE', label: 'Cháy quá', icon: '🔥', color: 'text-amber-500' },
  { type: 'BRAIN', label: 'Xin vía', icon: '🧠', color: 'text-purple-500' },
  { type: 'CRY', label: 'Đồng cảm', icon: '😭', color: 'text-blue-500' },
  { type: 'COFFEE', label: 'Tiếp sức', icon: '☕', color: 'text-amber-700' },
];

export function SocialFeedView({ currentUserId, onOpenProfile, communityId }: SocialFeedViewProps) {
  const { currentUser } = useAppStore();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  // Destination & Communities
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [targetCommunityId, setTargetCommunityId] = useState<string>(communityId || '');

  // Composer state
  const [newPostContent, setNewPostContent] = useState(() => localStorage.getItem('lifeos_feed_draft') || '');
  const [newPostTags, setNewPostTags] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  
  // 5 Formats attachments
  const [shareAchievementType, setShareAchievementType] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Editing state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Active comments drawer
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, PostCommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [replyParentId, setReplyParentId] = useState<Record<string, string | null>>({});

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem('lifeos_feed_draft', newPostContent);
  }, [newPostContent]);

  // Load user communities for destination selector
  useEffect(() => {
    connectApi.listCommunities().then(res => {
      if (res.success) {
        setCommunities(res.communities.filter(c => c.isMember || c.ownerId === currentUserId));
      }
    }).catch(() => {});
  }, [currentUserId]);

  const loadFeed = async (cursor?: string) => {
    try {
      if (!cursor) setLoading(true);
      const res = await connectApi.listPosts({
        communityId: communityId || undefined,
        authorId: filter === 'mine' ? currentUserId : undefined,
        cursor
      });
      if (res.success) {
        if (cursor) {
          setPosts(prev => [...prev, ...res.posts]);
        } else {
          setPosts(res.posts);
        }
        setNextCursor(res.nextCursor);
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tải bảng tin', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [filter, communityId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !shareAchievementType && !pollQuestion.trim()) {
      toast.show('Vui lòng nhập nội dung hoặc câu hỏi bình chọn', 'warning');
      return;
    }

    try {
      setCreating(true);
      const parsedTags = newPostTags
        .split(/[,\s#]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      let lifeOsData: any = null;
      if (shareAchievementType === 'STUDY_STREAK') {
        const streak = currentUser?.streakDays ?? 0;
        lifeOsData = {
          title: `🔥 Kỷ luật học tập ${streak} ngày liên tiếp`,
          desc: `Tôi đang duy trì chuỗi ${streak} ngày kỷ luật trên LifeOS!`,
          badge: currentUser?.badgeLevel || 'Tân Binh'
        };
      } else if (shareAchievementType === 'FOCUS_SESSION') {
        const mins = currentUser?.todayStudyMinutes ?? 25;
        lifeOsData = {
          title: '⏱️ Hoàn thành phiên Pomodoro sâu',
          desc: `Tập trung ${mins} phút không xao nhãng với LifeOS.`,
          badge: currentUser?.badgeLevel || 'Chiến Binh'
        };
      }

      // Format Poll payload
      let pollPayload = undefined;
      if (showPollBuilder && pollQuestion.trim()) {
        const validOptions = pollOptions.filter(o => o.trim().length > 0);
        if (validOptions.length < 2) {
          toast.show('Bình chọn cần ít nhất 2 phương án', 'warning');
          setCreating(false);
          return;
        }
        pollPayload = {
          question: pollQuestion.trim(),
          options: validOptions.map((opt, i) => ({ id: `opt-${i}`, text: opt.trim(), votes: 0 })),
          totalVotes: 0,
          userVotedOptionId: undefined
        };
      }

      const res = await connectApi.createPost({
        content: newPostContent.trim(),
        images: postImages,
        tags: parsedTags,
        communityId: targetCommunityId || communityId || undefined,
        lifeOsShareType: shareAchievementType,
        lifeOsShareData: lifeOsData,
        isAnonymous,
        poll: pollPayload
      });

      if (res.success) {
        if (res.status === 'PENDING_APPROVAL') {
          toast.show('Bài viết đã gửi đến Quản trị viên nhóm phê duyệt!', 'info');
        } else {
          toast.show('Đăng bài thành công!', 'success');
          setPosts(prev => [res.post, ...prev]);
        }
        recordUserActivity('community', 0);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lifeos:community-post-created', { detail: res.post }));
        }
        setNewPostContent('');
        setNewPostTags('');
        setPostImages([]);
        setShareAchievementType(null);
        setIsAnonymous(false);
        setShowPollBuilder(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        localStorage.removeItem('lifeos_feed_draft');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi khi đăng bài', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleVotePoll = async (postId: string, optionIndex: number) => {
    try {
      const res = await connectApi.votePoll(postId, optionIndex);
      if (res.success) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, poll: res.poll };
          }
          return p;
        }));
        toast.show('Đã ghi nhận bình chọn của bạn!', 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi bình chọn', 'error');
    }
  };

  const handlePinPost = async (postId: string) => {
    try {
      const res = await connectApi.pinPost(postId);
      if (res.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: res.isPinned } : p));
        toast.show(res.isPinned ? 'Đã ghim bài viết lên đầu!' : 'Đã bỏ ghim bài viết', 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi ghim bài', 'error');
    }
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await connectApi.editPost(postId, editContent.trim());
      if (res.success) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: res.post.content, updatedAt: res.post.updatedAt } : p));
        setEditingPostId(null);
        setEditContent('');
        toast.show('Đã cập nhật bài viết', 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi sửa bài viết', 'error');
    }
  };

  const handleSharePost = (postId: string) => {
    const refCode = currentUser?.referralCode || currentUser?.id || 'lifeos';
    const shareUrl = `${window.location.origin}/?tab=connect&postId=${postId}&ref=${refCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.show('Đã sao chép link kèm mã giới thiệu (Ref)!', 'success');
    }).catch(() => {
      toast.show(shareUrl, 'info');
    });
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    try {
      const res = await connectApi.toggleReaction(postId, reactionType);
      if (res.success) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              myReaction: res.myReaction,
              likes: res.likes
            };
          }
          return p;
        }));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi thả cảm xúc', 'error');
    }
  };

  const toggleComments = async (postId: string) => {
    const isCurrentlyExpanded = !!expandedPostComments[postId];
    setExpandedPostComments(prev => ({ ...prev, [postId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !commentsMap[postId]) {
      try {
        setLoadingComments(prev => ({ ...prev, [postId]: true }));
        const res = await connectApi.listComments(postId);
        if (res.success) {
          setCommentsMap(prev => ({ ...prev, [postId]: res.comments }));
        }
      } catch (err: any) {
        toast.show(err.message || 'Lỗi tải bình luận', 'error');
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const parentId = replyParentId[postId] || undefined;

    try {
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
      toast.show(err.message || 'Lỗi gửi bình luận', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này không?')) return;
    try {
      const res = await connectApi.deletePost(postId);
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        toast.show('Đã xóa bài viết', 'info');
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể xóa bài viết', 'error');
    }
  };

  const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.show(validation.error || 'Ảnh không hợp lệ', 'error');
      return;
    }

    try {
      setIsCompressingImage(true);
      const result = await compressAndUploadImage(file, 'post', { maxDimension: 1200, targetMaxKB: 60 });
      setPostImages(prev => [...prev, result.url]);
      toast.show(
        `Ảnh đã nén nhẹ: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)} (- ${result.reductionPercent}%)`,
        'success'
      );
    } catch (err: any) {
      console.error('Image compression error:', err);
      toast.show(err.message || 'Không thể xử lý ảnh từ thiết bị', 'error');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setPostImages(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Feed Filters */}
      <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tất cả bài viết
          </button>
          <button
            type="button"
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === 'mine'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Bài viết của tôi
          </button>
        </div>
        <button
          type="button"
          onClick={() => loadFeed()}
          className="p-2 text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="Làm mới bảng tin"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Post Composer (Facebook + Zalo + Discord Style) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-lg shadow-slate-200/30 dark:shadow-none space-y-4">
        {/* Destination Selector */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Nơi đăng:</span>
          <select
            value={targetCommunityId}
            onChange={e => setTargetCommunityId(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden"
          >
            <option value="">🌐 Bảng tin Cộng Đồng Chung</option>
            {communities.map(c => (
              <option key={c.id} value={c.id}>
                👥 {c.name} {c.isPrivate ? '(Nhóm kín)' : ''}
              </option>
            ))}
          </select>
          {isAnonymous && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] ml-auto">
              🎭 Chế độ Ẩn Danh
            </span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
            {isAnonymous ? '🎭' : (currentUser?.name?.charAt(0) || 'OS')}
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              rows={3}
              value={newPostContent}
              onChange={e => setNewPostContent(e.target.value)}
              placeholder={isAnonymous ? "Chia sẻ ẩn danh, tâm sự học tập..." : "Hôm nay bạn học được gì mới? Chia sẻ mục tiêu hoặc kinh nghiệm với mọi người..."}
              className="w-full bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-3 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
            />
          </div>
        </div>

        {/* 5 Rich Attachment Drawers */}
        {/* Poll Builder Drawer */}
        {showPollBuilder && (
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Tạo Cuộc Bình Chọn
              </span>
              <button
                type="button"
                onClick={() => setShowPollBuilder(false)}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              placeholder="Câu hỏi bình chọn (ví dụ: Tối nay mấy giờ học nhóm?)..."
              className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
            />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Phương án ${i + 1}...`}
                    className="flex-1 text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm phương án bình chọn
                </button>
              )}
            </div>
          </div>
        )}

        {/* LifeOS Achievement Sharing Pill */}
        {shareAchievementType && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Đang đính kèm thẻ thành tích: {shareAchievementType === 'STUDY_STREAK' ? 'Chuỗi ngày kỷ luật' : 'Phiên Pomodoro'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShareAchievementType(null)}
              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attached Images Preview */}
        {postImages.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {postImages.map((img, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-20 h-20">
                <img src={img} alt="attached" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full text-xs transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden File Input for Direct Device/Camera Upload */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/*"
          onChange={handleDirectImageUpload}
          className="hidden"
        />

        {/* Tags input */}
        <div className="flex items-center gap-2 text-xs">
          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={newPostTags}
            onChange={e => setNewPostTags(e.target.value)}
            placeholder="Hashtag: #english, #code, #ielts, #pomodoro"
            className="flex-1 min-h-[38px] bg-transparent border-0 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-hidden text-xs"
          />
        </div>

        {/* Composer Action Bar with 5 Rich Formats */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Nén ảnh <60KB */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isCompressingImage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              title="Tải ảnh nén nhẹ <60KB qua canvas"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isCompressingImage ? 'Đang nén...' : 'Ảnh <60KB'}</span>
            </button>

            {/* 2. Poll */}
            <button
              type="button"
              onClick={() => setShowPollBuilder(!showPollBuilder)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showPollBuilder ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Tạo cuộc bình chọn"
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
              <span>Bình chọn</span>
            </button>

            {/* 3. Thẻ thành tích */}
            <button
              type="button"
              onClick={() => {
                setShareAchievementType(prev => prev === 'STUDY_STREAK' ? 'FOCUS_SESSION' : prev === 'FOCUS_SESSION' ? null : 'STUDY_STREAK');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                shareAchievementType ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Khoe chuỗi streak hoặc phút học Pomodoro"
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Thành tích</span>
            </button>

            {/* 4. Ẩn danh */}
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAnonymous ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Bật/tắt chế độ đăng ẩn danh"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ẩn danh</span>
            </button>
          </div>

          <button
            type="button"
            disabled={creating || isCompressingImage}
            onClick={handleCreatePost}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer ml-auto"
          >
            {creating ? 'Đang đăng...' : 'Đăng Bài'}
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-8 text-xs text-slate-400">Đang tải bài viết...</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Globe className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Chưa có bài viết nào</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Hãy là người đầu tiên chia sẻ mục tiêu hoặc kinh nghiệm!</p>
          </div>
        ) : (
          posts.map(post => {
            const isMine = post.authorId === currentUserId;
            const isCommentsOpen = !!expandedPostComments[post.id];
            const comments = commentsMap[post.id] || [];

            return (
              <div
                key={post.id}
                className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border rounded-3xl p-5 shadow-xs space-y-4 ${
                  post.isPinned 
                    ? 'border-amber-400/50 dark:border-amber-500/30 bg-amber-500/5' 
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Pinned Banner */}
                {post.isPinned && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 pb-2 border-b border-amber-500/20">
                    <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Bài viết đã ghim</span>
                  </div>
                )}

                {/* Post Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => {
                        if (!post.isAnonymous && post.author?.id) onOpenProfile(post.author.id);
                      }}
                      className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300 overflow-hidden cursor-pointer shrink-0"
                    >
                      {post.isAnonymous ? (
                        <span>🎭</span>
                      ) : post.author?.avatar ? (
                        <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        post.author?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => {
                            if (!post.isAnonymous && post.author?.id) onOpenProfile(post.author.id);
                          }}
                          className="font-bold text-xs text-slate-900 dark:text-white cursor-pointer hover:underline"
                        >
                          {post.isAnonymous ? 'Người dùng Ẩn danh' : (post.author?.name || 'Vô danh')}
                        </span>
                        {post.community && (
                          <span className="text-[10px] text-slate-400">
                            trong <span className="font-bold text-emerald-600 dark:text-emerald-400">👥 {post.community.name}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Pin, Edit, Delete, Share */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSharePost(post.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Chia sẻ bài viết kèm mã giới thiệu (Ref)"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    {(isMine || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePinPost(post.id)}
                          className={`p-1.5 rounded-lg transition-colors ${post.isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:text-amber-500'}`}
                          title={post.isPinned ? 'Bỏ ghim' : 'Ghim bài viết'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPostId(post.id);
                              setEditContent(post.content);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg transition-colors"
                            title="Chỉnh sửa bài viết"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Xóa bài viết"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Post Content / Edit Mode */}
                {editingPostId === post.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-100"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(post.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-white"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                )}

                {/* Poll Section */}
                {post.poll && post.poll.options && (
                  <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                    <div className="font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4" />
                      <span>{post.poll.question}</span>
                    </div>
                    <div className="space-y-2">
                      {post.poll.options.map((opt: any, idx: number) => {
                        const total = post.poll.totalVotes || 0;
                        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                        const isVoted = post.poll.userVotedOptionId === opt.id;

                        return (
                          <button
                            key={opt.id || idx}
                            type="button"
                            onClick={() => handleVotePoll(post.id, idx)}
                            className={`w-full relative text-left p-2.5 rounded-xl border text-xs font-medium transition-all overflow-hidden cursor-pointer ${
                              isVoted 
                                ? 'border-purple-500 bg-purple-500/10 font-bold' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-purple-400'
                            }`}
                          >
                            <div 
                              className="absolute inset-y-0 left-0 bg-purple-500/15 pointer-events-none transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative z-10 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                {isVoted && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                <span>{opt.text}</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                {pct}% ({opt.votes})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      Tổng số phiếu: {post.poll.totalVotes || 0}
                    </div>
                  </div>
                )}

                {/* LifeOS Achievement Banner */}
                {post.lifeOsShareType && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/20 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{post.lifeOsShareData?.title || 'Thành tích LifeOS'}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {post.lifeOsShareData?.desc || 'Cột mốc học tập xuất sắc!'}
                      </p>
                    </div>
                    {post.lifeOsShareData?.badge && (
                      <span className="px-2 py-0.5 rounded-xl bg-white/80 dark:bg-slate-800 font-bold text-[10px] text-emerald-600 dark:text-emerald-300 shadow-xs border border-emerald-500/20">
                        {post.lifeOsShareData.badge}
                      </span>
                    )}
                  </div>
                )}

                {/* Attached Images */}
                {post.images && post.images.length > 0 && (
                  <div className={`grid ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 rounded-2xl overflow-hidden`}>
                    {post.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setViewingImageUrl(img)}
                        className="relative group cursor-zoom-in overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
                        title="Bấm để phóng to ảnh"
                      >
                        <img
                          src={img}
                          alt="Post content"
                          className="w-full h-48 sm:h-56 object-cover rounded-xl transition-transform duration-300 group-hover:scale-102"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="p-2 rounded-xl bg-slate-900/70 text-white text-xs font-semibold backdrop-blur-xs">
                            🔍 Phóng to
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.tags.map((tg, idx) => (
                      <span key={idx} className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                        #{tg}
                      </span>
                    ))}
                  </div>
                )}

                {/* 4 Signature Gen Z Reactions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1">
                    {REACTION_TYPES.map(r => {
                      const isSelected = post.myReaction === r.type;
                      return (
                        <button
                          key={r.type}
                          type="button"
                          onClick={() => handleReaction(post.id, r.type)}
                          className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-transform active:scale-90 cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800 font-bold scale-105 border border-slate-200 dark:border-slate-700'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 opacity-80 hover:opacity-100'
                          }`}
                          title={r.label}
                        >
                          <span className="text-base">{r.icon}</span>
                          <span className="hidden sm:inline text-[11px]">{r.label}</span>
                        </button>
                      );
                    })}
                    <span className="text-xs font-bold text-slate-500 ml-2">
                      {post.likes} lượt
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-500 p-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount} Bình luận</span>
                  </button>
                </div>

                {/* Comments Section Drawer */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
                    {/* Comment Input */}
                    <div className="space-y-1.5">
                      {replyParentId[post.id] && (
                        <div className="flex items-center justify-between text-[11px] text-emerald-600 font-bold px-1">
                          <span>Đang trả lời bình luận...</span>
                          <button
                            type="button"
                            onClick={() => setReplyParentId(prev => ({ ...prev, [post.id]: null }))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            Hủy trả lời
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder="Viết lời khích lệ hoặc thảo luận..."
                          className="flex-1 min-h-[40px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(post.id)}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {loadingComments[post.id] ? (
                      <p className="text-xs text-slate-400 text-center py-2">Đang tải bình luận...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!</p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {comments.map(c => (
                          <div 
                            key={c.id} 
                            className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 space-y-1 ${
                              c.parentId ? 'ml-6 border-l-2 border-l-emerald-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span 
                                onClick={() => { if (c.author?.id) onOpenProfile(c.author.id); }}
                                className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:underline"
                              >
                                {c.author?.name || 'Vô danh'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyParentId(prev => ({ ...prev, [post.id]: c.id }));
                                  }}
                                  className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer"
                                >
                                  Trả lời
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* High-Res Image Lightbox Modal */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setViewingImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={viewingImageUrl}
              alt="High resolution"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setViewingImageUrl(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
