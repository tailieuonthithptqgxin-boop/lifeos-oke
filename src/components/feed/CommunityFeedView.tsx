import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Share2,
  Image as ImageIcon,
  Send,
  Heart,
  Trash2,
  Sparkles,
  Clock,
  X,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { triggerDelightCelebration } from '../../lib/celebrationEngine';

export interface FeedPost {
  id: string;
  userId: string;
  content: string;
  images: string[];
  likes: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
}

export function CommunityFeedView() {
  const { currentUser, language } = useAppStore();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPosts, setTotalPosts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Post Creator State
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Lightbox Modal for Full-size Image View
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // 4 Gen Z Reactive Micro-Reactions
  const [postReactions, setPostReactions] = useState<Record<string, string>>({});
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});

  const handleReaction = (postId: string, reactionKey: 'fire' | 'brain' | 'sympathy' | 'coffee', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentReaction = postReactions[postId];
    const isTogglingOff = currentReaction === reactionKey;

    setPostReactions((prev) => {
      const next = { ...prev };
      if (isTogglingOff) {
        delete next[postId];
      } else {
        next[postId] = reactionKey;
      }
      return next;
    });

    setReactionCounts((prev) => {
      const postCounts = { ...(prev[postId] || { fire: 0, brain: 0, sympathy: 0, coffee: 0 }) };
      if (currentReaction && postCounts[currentReaction] > 0) {
        postCounts[currentReaction] = Math.max(0, postCounts[currentReaction] - 1);
      }
      if (!isTogglingOff) {
        postCounts[reactionKey] = (postCounts[reactionKey] || 0) + 1;
      }
      return { ...prev, [postId]: postCounts };
    });

    if (!isTogglingOff) {
      triggerDelightCelebration(e.clientX, e.clientY);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cooldown countdown timer (10 seconds)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // 1. Fetch initial or refreshed posts
  const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const res = await apiCall<{
        success: boolean;
        posts: FeedPost[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasMore: boolean;
        };
      }>(`/api/posts?page=${pageNum}&limit=10`);

      if (res && res.success && Array.isArray(res.posts)) {
        if (append) {
          setPosts((prev) => [...prev, ...res.posts]);
        } else {
          setPosts(res.posts);
        }
        setPage(res.pagination.page);
        setHasMore(res.pagination.hasMore);
        setTotalPosts(res.pagination.total);
      }
    } catch (err: any) {
      console.warn('Failed to fetch community posts:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  // 2. Handle Image File Selection (Converts to Cloud / Data URL - Zero VPS disk storage)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage('Mỗi bài viết chỉ được đính kèm tối đa 4 hình ảnh.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

    filesToProcess.forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Dung lượng mỗi ảnh tối đa 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImages((prev) => {
            if (prev.length >= 4) return prev;
            return [...prev, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 3. Create Post Handler
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanContent = content.trim();
    if (!cleanContent) {
      setErrorMessage('Vui lòng nhập nội dung bài viết.');
      return;
    }

    if (cooldownSeconds > 0) {
      setErrorMessage(`Vui lòng đợi ${cooldownSeconds} giây trước khi đăng tiếp.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiCall<{ success: boolean; post: FeedPost }>('/api/posts', 'POST', {
        content: cleanContent,
        images
      });

      if (res && res.success && res.post) {
        setContent('');
        setImages([]);
        setSuccessMessage('Đăng bài thành công!');
        setCooldownSeconds(10); // Start 10s anti-spam cooldown
        setTimeout(() => setSuccessMessage(null), 3000);

        // Prepend new post to the top of the feed immediately
        setPosts((prev) => [res.post, ...prev]);
        setTotalPosts((c) => c + 1);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi đăng bài.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Like / Cheer Post
  const handleLikePost = async (postId: string) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
    );

    try {
      await apiCall(`/api/posts/${postId}/like`, 'POST');
    } catch (err) {
      console.warn('Like post error:', err);
    }
  };

  // 5. Delete Post Handler
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;

    try {
      await apiCall(`/api/posts/${postId}`, 'DELETE');
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotalPosts((c) => Math.max(0, c - 1));
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa bài viết.');
    }
  };

  // Helper: Format relative timestamp (5 phút trước, vừa xong...)
  const formatRelativeTime = (isoString: string) => {
    try {
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((Date.now() - past) / 1000);

      if (diffSec < 60) return 'Vừa xong';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay} ngày trước`;

      return new Date(isoString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150 p-4 sm:p-6 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-7 text-white border border-indigo-800/40 shadow-xl">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Bảng Tin Học Tập Cộng Đồng</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Chia Sẻ Tiến Độ & Lan Tỏa Động Lực
            </h1>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Cùng chia sẻ mục tiêu hoàn thành, hình ảnh bàn học hoặc những suy ngẫm hữu ích mỗi ngày.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0">
            <span className="text-[11px] text-indigo-200 font-medium">Tổng bài viết</span>
            <span className="text-2xl font-black text-emerald-400">{totalPosts}</span>
          </div>
        </div>
      </div>

      {/* Post Creator Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <img
            src={
              currentUser?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=10B981&color=fff`
            }
            alt={currentUser?.name || 'User'}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-1"
          />

          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= 1000) {
                  setContent(e.target.value);
                }
              }}
              placeholder="Hôm nay bạn đã học được điều gì mới? Chia sẻ tiến độ cùng cộng đồng nhé..."
              rows={3}
              className="w-full text-xs sm:text-sm p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
            />

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-in fade-in duration-100">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group"
                  >
                    <img
                      src={imgUrl}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Alert Messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Footer Toolbar: Add Images & Submit */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 4 || isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                  title="Thêm ảnh (tối đa 4 ảnh)"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  <span>Ảnh ({images.length}/4)</span>
                </button>

                <span
                  className={`text-[11px] ${
                    content.length >= 900 ? 'text-amber-500 font-bold' : 'text-slate-400'
                  }`}
                >
                  {content.length}/1000 ký tự
                </span>
              </div>

              <div className="flex items-center gap-2">
                {cooldownSeconds > 0 && (
                  <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3" /> Đợi {cooldownSeconds}s
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSubmitPost}
                  disabled={!content.trim() || isSubmitting || cooldownSeconds > 0}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span>Đang đăng...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Đăng bài</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Timeline Stream */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500 flex items-center justify-center mx-auto">
            <Share2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Chưa có bài viết nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy là người đầu tiên chia sẻ nhật ký học tập hoặc thành tựu của bạn đến cộng đồng!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isMyPost = post.userId === currentUser?.id;
            const canDelete = isMyPost || isAdmin;
            const postImages = post.images || [];

            return (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700/80"
              >
                {/* Post Author Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        post.user?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.name || 'User')}&background=6366F1&color=fff`
                      }
                      alt={post.user?.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {post.user?.name || 'Thành viên'}
                        </span>
                        {post.user?.role === 'SUPERADMIN' || post.user?.role === 'ADMIN' ? (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            Admin
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Xóa bài viết"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Content Text */}
                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {post.content}
                </div>

                {/* Modern Image Grid Layout (1 to 4 images) */}
                {postImages.length > 0 && (
                  <div
                    className={`rounded-2xl overflow-hidden gap-2 ${
                      postImages.length === 1
                        ? 'grid grid-cols-1'
                        : postImages.length === 2
                        ? 'grid grid-cols-2'
                        : postImages.length === 3
                        ? 'grid grid-cols-3'
                        : 'grid grid-cols-2'
                    }`}
                  >
                    {postImages.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setLightboxImageUrl(imgUrl)}
                        className={`relative rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-pointer group ${
                          postImages.length === 1 ? 'max-h-[420px]' : 'aspect-square'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Attachment ${imgIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Post Footer Actions with Gen Z Tactile Micro-Reactions */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* 4 Gen Z Micro-Reactions */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleReaction(post.id, 'fire', e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer btn-reaction-pop ${
                        postReactions[post.id] === 'fire'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      title="Thả cảm xúc: Cháy quá"
                    >
                      <span className="text-sm">🔥</span>
                      <span>Cháy quá</span>
                      {reactionCounts[post.id]?.fire ? (
                        <span className="text-[10px] font-black opacity-90">({reactionCounts[post.id].fire})</span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleReaction(post.id, 'brain', e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer btn-reaction-pop ${
                        postReactions[post.id] === 'brain'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-700 shadow-2xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      title="Thả cảm xúc: Xin vía"
                    >
                      <span className="text-sm">🧠</span>
                      <span>Xin vía</span>
                      {reactionCounts[post.id]?.brain ? (
                        <span className="text-[10px] font-black opacity-90">({reactionCounts[post.id].brain})</span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleReaction(post.id, 'sympathy', e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer btn-reaction-pop ${
                        postReactions[post.id] === 'sympathy'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-700 shadow-2xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      title="Thả cảm xúc: Đồng cảm"
                    >
                      <span className="text-sm">😭</span>
                      <span>Đồng cảm</span>
                      {reactionCounts[post.id]?.sympathy ? (
                        <span className="text-[10px] font-black opacity-90">({reactionCounts[post.id].sympathy})</span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleReaction(post.id, 'coffee', e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer btn-reaction-pop ${
                        postReactions[post.id] === 'coffee'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      title="Thả cảm xúc: Tiếp sức"
                    >
                      <span className="text-sm">☕</span>
                      <span>Tiếp sức</span>
                      {reactionCounts[post.id]?.coffee ? (
                        <span className="text-[10px] font-black opacity-90">({reactionCounts[post.id].coffee})</span>
                      ) : null}
                    </button>
                  </div>

                  {/* Standard Heart Like */}
                  <button
                    type="button"
                    onClick={() => handleLikePost(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${post.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span className="font-bold">{post.likes}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => fetchPosts(page + 1, true)}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? 'Đang tải thêm...' : 'Xem thêm bài viết cũ'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Enlarged view"
              className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
