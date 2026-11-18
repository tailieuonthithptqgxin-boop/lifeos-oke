import React, { useState, useEffect } from 'react';
import { 
  Building, Users, Plus, Search, Shield, Globe, Lock, 
  ArrowRight, Check, X, RefreshCw, MessageSquare, Sparkles 
} from 'lucide-react';
import { connectApi, SocialCommunity } from '../../lib/connectApiClient';
import { toast } from '../../lib/toast';
import { ImageUploadZone } from '../common/ImageUploadZone';
import { GroupWorkspaceView } from './GroupWorkspaceView';

interface CommunitiesViewProps {
  currentUserId?: string;
  onSelectCommunityFeed: (communityId: string, communityName: string) => void;
}

const CATEGORIES = [
  'Tất cả',
  'Ngoại ngữ & Du học',
  'Lập trình & Tech',
  'Năng suất & Kỷ luật',
  'Đọc sách & Tri thức',
  'Sự nghiệp & Khởi nghiệp'
];

export function CommunitiesView({ currentUserId, onSelectCommunityFeed }: CommunitiesViewProps) {
  const [selectedWorkspaceCommunityId, setSelectedWorkspaceCommunityId] = useState<string | null>(null);
  const [communities, setCommunities] = useState<SocialCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'Ngoại ngữ & Du học',
    privacy: 'PUBLIC' as 'PUBLIC' | 'PRIVATE' | 'APPROVAL_REQUIRED',
    avatar: '',
    coverImage: ''
  });
  const [creating, setCreating] = useState(false);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      const res = await connectApi.listCommunities({
        search: search.trim() || undefined,
        category: selectedCategory !== 'Tất cả' ? selectedCategory : undefined
      });
      if (res.success) {
        setCommunities(res.communities);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải danh sách cộng đồng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCommunities();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const handleJoin = async (communityId: string) => {
    try {
      setActionLoadingId(communityId);
      const res = await connectApi.joinCommunity(communityId);
      if (res.success) {
        toast.show(res.message || 'Tham gia cộng đồng thành công!', 'success');
        setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, isMember: true, memberCount: c.memberCount + 1 } : c));
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tham gia', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLeave = async (communityId: string) => {
    if (!window.confirm('Bạn có chắc muốn rời khỏi cộng đồng này?')) return;
    try {
      setActionLoadingId(communityId);
      const res = await connectApi.leaveCommunity(communityId);
      if (res.success) {
        toast.show('Đã rời khỏi cộng đồng', 'info');
        setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, isMember: false, memberCount: Math.max(0, c.memberCount - 1) } : c));
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi khi rời cộng đồng', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.description.trim()) {
      toast.show('Vui lòng điền đầy đủ tên và giới thiệu nhóm', 'warning');
      return;
    }

    try {
      setCreating(true);
      const res = await connectApi.createCommunity({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        privacy: createForm.privacy,
        avatar: createForm.avatar.trim() || undefined,
        coverImage: createForm.coverImage.trim() || undefined
      });

      if (res.success) {
        toast.show('Tạo cộng đồng thành công!', 'success');
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          description: '',
          category: 'Ngoại ngữ & Du học',
          privacy: 'PUBLIC',
          avatar: '',
          coverImage: ''
        });
        loadCommunities();
      }
    } catch (err: any) {
      toast.show(err.message || 'Không thể tạo cộng đồng', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (selectedWorkspaceCommunityId) {
    return (
      <GroupWorkspaceView
        communityId={selectedWorkspaceCommunityId}
        onBack={() => {
          setSelectedWorkspaceCommunityId(null);
          loadCommunities();
        }}
        onOpenProfile={userId => onSelectCommunityFeed(userId, '')}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-500" />
            <span>Cộng Đồng Học Tập LifeOS</span>
          </h3>
          <p className="text-xs text-slate-400">Tham gia không gian thảo luận chuyên sâu cùng những người có chung định hướng.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo cộng đồng mới</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên cộng đồng..."
            className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Đang tải danh sách cộng đồng...</div>
      ) : communities.length === 0 ? (
        <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Building className="w-10 h-10 mx-auto text-slate-400" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Chưa có cộng đồng nào trong mục này</h4>
          <p className="text-xs text-slate-400">Hãy là người sáng lập cộng đồng đầu tiên để kết nối các bạn bè cùng sở thích!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {communities.map(comm => {
            const isActing = actionLoadingId === comm.id;
            return (
              <div
                key={comm.id}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Cover */}
                  <div className="h-24 bg-gradient-to-r from-teal-600 to-indigo-600 relative">
                    {comm.coverImage && (
                      <img src={comm.coverImage} alt="cover" className="w-full h-full object-cover opacity-70" />
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                      {comm.privacy === 'PUBLIC' ? <Globe className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                      <span>{comm.privacy === 'PUBLIC' ? 'Công khai' : 'Kín'}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-5 pt-0 pb-4">
                    <div className="-mt-7 w-14 h-14 rounded-2xl bg-slate-900 border-4 border-white dark:border-slate-900 shadow-md text-white font-bold text-lg flex items-center justify-center overflow-hidden">
                      {comm.avatar ? (
                        <img src={comm.avatar} alt={comm.name} className="w-full h-full object-cover" />
                      ) : (
                        comm.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-3">
                      {comm.name}
                    </h4>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {comm.category}
                    </span>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {comm.description}
                    </p>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        {comm.memberCount} thành viên
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        {comm.postCount} bài thảo luận
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkspaceCommunityId(comm.id)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <span>Vào không gian nhóm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {comm.isMember ? (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleLeave(comm.id)}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                      title="Rời nhóm"
                    >
                      Đã tham gia
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleJoin(comm.id)}
                      className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Tham gia
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-500" />
                <span>Tạo Cộng Đồng Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên cộng đồng *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Hội Luyện IELTS 8.0+, Dev Fullstack 2026..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mục tiêu & Giới thiệu cộng đồng *
                </label>
                <textarea
                  required
                  rows={3}
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Nêu rõ mục tiêu của nhóm, quy định học tập và các chủ đề thảo luận chính..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chuyên mục
                  </label>
                  <select
                    value={createForm.category}
                    onChange={e => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    {CATEGORIES.filter(c => c !== 'Tất cả').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quyền riêng tư
                  </label>
                  <select
                    value={createForm.privacy}
                    onChange={e => setCreateForm(prev => ({ ...prev, privacy: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="PUBLIC">Công khai (Ai cũng vào được)</option>
                    <option value="APPROVAL_REQUIRED">Cần phê duyệt thành viên</option>
                    <option value="PRIVATE">Kín (Chỉ người được mời)</option>
                  </select>
                </div>
              </div>

              <ImageUploadZone
                type="banner"
                label="Ảnh bìa nhóm / Banner (Tự động nén siêu nhẹ):"
                value={createForm.coverImage}
                onChange={url => setCreateForm(prev => ({ ...prev, coverImage: url }))}
                aspectRatio="video"
                folder="communities"
                helperText="Tải ảnh trực tiếp từ thiết bị, tự động nén tối ưu."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Đang tạo...' : 'Tạo cộng đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
