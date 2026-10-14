import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Sparkles, Send, ThumbsUp, Star, Filter, 
  Lightbulb, Bug, HelpCircle, CheckCircle2, Clock, Check, 
  AlertCircle, ChevronRight, User, Heart, MessageCircle
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { triggerConfetti } from '../lib/confetti';
import { soundEngine } from '../lib/soundEngine';

export function FeedbackView() {
  const [activeTab, setActiveTab] = useState<'community' | 'submit' | 'my'>('community');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'Idea' | 'Bug' | 'Feature' | 'Experience' | 'General'>('Idea');
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Filter state for community
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const [pubRes, myRes] = await Promise.all([
        apiCall('/api/feedback/public'),
        apiCall('/api/feedback/my')
      ]);
      if (pubRes?.success) setFeedbacks(pubRes.feedbacks || []);
      if (myRes?.success) setMyFeedbacks(myRes.feedbacks || []);
    } catch (err) {
      console.error('Error loading feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      const res = await apiCall('/api/feedback', 'POST', {
        title,
        content,
        type,
        rating
      });

      if (res?.success) {
        soundEngine.playCelebration();
        triggerConfetti();
        setSubmitSuccess(true);
        setTitle('');
        setContent('');
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('community');
          loadFeedbacks();
        }, 2000);
      }
    } catch (err) {
      console.error('Submit feedback error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (feedbackId: string) => {
    try {
      soundEngine.playPop();
      const res = await apiCall(`/api/feedback/${feedbackId}/vote`, 'POST');
      if (res?.success) {
        setFeedbacks(prev => prev.map(f => {
          if (f.id === feedbackId) {
            return { ...f, hasVoted: res.hasVoted, upvotes: res.upvotes };
          }
          return f;
        }));
      }
    } catch (err) {
      console.error('Error voting feedback:', err);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterType === 'ALL') return true;
    return f.type === filterType;
  });

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'Idea':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Ý tưởng</span>;
      case 'Bug':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1"><Bug className="w-3 h-3" /> Báo lỗi</span>;
      case 'Feature':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Tính năng mới</span>;
      case 'Experience':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 inline-flex items-center gap-1"><Star className="w-3 h-3" /> Trải nghiệm</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Góp ý</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'New':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Mới gửi</span>;
      case 'Reviewing':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Đang xem xét</span>;
      case 'Planned':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Đã lên kế hoạch</span>;
      case 'In Progress':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Đang phát triển</span>;
      case 'Completed':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Đã hoàn thành ✨</span>;
      case 'Rejected':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Chưa phù hợp</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-28 overflow-x-hidden">
      {/* 1. Hero Header Fresh Green Unisex */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-600 p-4 sm:p-8 text-white shadow-xl border border-emerald-500/30 w-full min-w-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span>Cùng Xây Dựng LifeOS Tốt Hơn Mỗi Ngày</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Góp Ý & Đề Xuất Tính Năng
            </h1>
            <p className="text-sm sm:text-base text-emerald-100 font-medium">
              Tiếng nói của bạn định hình tương lai LifeOS. Hãy báo lỗi, chia sẻ ý tưởng hay bình chọn các tính năng bạn muốn thấy nhất!
            </p>
          </div>

          <button
            onClick={() => setActiveTab('submit')}
            className="px-6 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer btn-squishy shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Gửi Góp Ý Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'community'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Cộng đồng bình chọn ({feedbacks.length})
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Đóng góp ý kiến
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'my'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Góp ý của tôi ({myFeedbacks.length})
          </button>
        </div>

        {activeTab === 'community' && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {['ALL', 'Idea', 'Feature', 'Bug', 'Experience'].map((tKey) => (
              <button
                key={tKey}
                onClick={() => setFilterType(tKey)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === tKey
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tKey === 'ALL' ? 'Tất cả' : tKey === 'Idea' ? 'Ý tưởng' : tKey === 'Feature' ? 'Tính năng' : tKey === 'Bug' ? 'Lỗi' : 'Trải nghiệm'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: COMMUNITY WISHLIST & UPVOTES */}
      {activeTab === 'community' && (
        <div className="space-y-3">
          {filteredFeedbacks.length === 0 ? (
            <div className="card-cute rounded-3xl p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 space-y-2">
              <Lightbulb className="w-10 h-10 mx-auto text-purple-300 animate-pulse" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Chưa có góp ý nào trong mục này</p>
              <p className="text-xs">Hãy là người đầu tiên gửi ý tưởng đóng góp cho LifeOS!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeedbacks.map((f) => (
                <div 
                  key={f.id} 
                  className={`card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between gap-4 ${
                    f.isImportant 
                      ? 'border-purple-300 dark:border-purple-800 shadow-md ring-1 ring-purple-200 dark:ring-purple-900/50' 
                      : 'border-purple-100/70 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {getTypeBadge(f.type)}
                          {getStatusBadge(f.status)}
                          {f.isImportant && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              🔥 Ưu tiên cao
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white text-base">
                          {f.title}
                        </h3>
                      </div>

                      {/* Upvote Pill Button */}
                      <button
                        onClick={() => handleVote(f.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-2xl min-w-[3.25rem] transition-all cursor-pointer border ${
                          f.hasVoted
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-purple-50 dark:bg-slate-800 text-purple-600 dark:text-purple-300 border-purple-100 dark:border-slate-700 hover:bg-purple-100'
                        } btn-squishy`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs font-black mt-0.5">{f.upvotes || 0}</span>
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {f.content}
                    </p>

                    {/* Admin Response Box if replied */}
                    {f.adminReply && (
                      <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-slate-800/80 border border-purple-200/60 dark:border-purple-900/40 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Phản hồi từ Đội ngũ LifeOS:</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                          {f.adminReply}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50 dark:border-slate-800/60 pt-3">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Đóng góp bởi {f.user?.name || 'Thành viên'}
                    </span>
                    <span>{new Date(f.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMIT FORM */}
      {activeTab === 'submit' && (
        <div className="card-cute rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="space-y-1 border-b border-purple-50 dark:border-slate-800 pb-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>Gửi Góp Ý Cho Đội Ngũ Phát Triển</span>
            </h2>
            <p className="text-xs text-slate-500">
              Mọi ý kiến của bạn đều được ban quản trị đọc và phản hồi trực tiếp.
            </p>
          </div>

          {submitSuccess ? (
            <div className="p-8 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl border border-emerald-200 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 animate-bounce" />
              <h3 className="text-lg font-black">Cảm ơn bạn rất nhiều!</h3>
              <p className="text-xs">Góp ý của bạn đã được ghi nhận vào hệ thống.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Loại góp ý:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Idea', label: 'Ý tưởng mới', icon: Lightbulb },
                    { id: 'Feature', label: 'Tính năng', icon: Sparkles },
                    { id: 'Bug', label: 'Báo lỗi', icon: Bug },
                    { id: 'Experience', label: 'Trải nghiệm', icon: Star }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = type === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setType(item.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-purple-50/50 dark:bg-slate-800/50 border-purple-100/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-100/60'
                        } btn-squishy`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Tiêu đề tóm tắt:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Thêm widget ghi chú nhanh ngoài màn hình chính..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-purple-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Nội dung chi tiết & Đề xuất:
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hãy mô tả rõ hơn cách bạn muốn tính năng hoạt động hoặc chi tiết lỗi gặp phải..."
                  className="w-full px-4 py-3 rounded-2xl border border-purple-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Satisfaction Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Đánh giá mức độ hài lòng chung với LifeOS:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-500 ml-2">
                    {rating === 5 ? 'Tuyệt vời (5/5) 🌟' : rating === 4 ? 'Hài lòng (4/5) 😊' : `${rating}/5 sao`}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer btn-squishy disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Đang gửi góp ý...' : 'Gửi góp ý ngay ✨'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: MY FEEDBACKS */}
      {activeTab === 'my' && (
        <div className="space-y-3">
          {myFeedbacks.length === 0 ? (
            <div className="card-cute rounded-3xl p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-purple-300" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Bạn chưa gửi góp ý nào</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
              >
                Gửi góp ý đầu tiên của bạn ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myFeedbacks.map((f) => (
                <div key={f.id} className="card-cute rounded-3xl p-5 bg-white dark:bg-slate-900 border border-purple-100/70 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-50 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(f.type)}
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">{f.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(f.status)}
                      <span className="text-[11px] text-slate-400">{new Date(f.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {f.content}
                  </p>

                  {f.adminReply && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-slate-800/80 border border-purple-200/60 dark:border-purple-900/40 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Phản hồi từ Admin ({f.repliedBy || 'LifeOS'}):</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200">
                        {f.adminReply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
