import React, { useState } from 'react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Save,
  Globe,
  Lock,
  Users,
  MapPin,
  BookOpen,
  Target,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { SocialUser, connectApi } from '../../lib/connectApiClient';
import { soundEngine } from '../../lib/soundEngine';
import { ImageUploadZone } from '../common/ImageUploadZone';

interface EditProfileModalProps {
  initialProfile: SocialUser;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updated: SocialUser) => void;
}

export function EditProfileModal({
  initialProfile,
  isOpen,
  onClose,
  onProfileUpdated
}: EditProfileModalProps) {
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [avatar, setAvatar] = useState(initialProfile.avatar || '');
  const [coverImage, setCoverImage] = useState(initialProfile.coverImage || '');
  const [location, setLocation] = useState(initialProfile.location || '');
  const [personalIntro, setPersonalIntro] = useState(initialProfile.personalIntro || '');

  // Arrays
  const [interestsInput, setInterestsInput] = useState((initialProfile.interests || []).join(', '));
  const [languagesInput, setLanguagesInput] = useState((initialProfile.learningLanguages || []).join(', '));
  const [goalsInput, setGoalsInput] = useState((initialProfile.learningGoals || []).join(', '));

  // Privacy toggles
  const [profileVisibility, setProfileVisibility] = useState<'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'>(
    (initialProfile.profileVisibility as any) || 'PUBLIC'
  );
  const [locationVisibility, setLocationVisibility] = useState<'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'>(
    (initialProfile.locationVisibility as any) || 'PRIVATE'
  );
  const [learningGoalsVisibility, setLearningGoalsVisibility] = useState<'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE'>(
    (initialProfile.learningGoalsVisibility as any) || 'PUBLIC'
  );
  const [messagePermission, setMessagePermission] = useState<'EVERYONE' | 'FRIENDS_ONLY' | 'NO_ONE'>(
    (initialProfile.messagePermission as any) || 'EVERYONE'
  );

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    soundEngine.playPop();

    const parseCommaList = (str: string) =>
      str.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = await connectApi.updateMyProfile({
        bio,
        avatar,
        coverImage,
        location,
        personalIntro,
        interests: parseCommaList(interestsInput),
        learningLanguages: parseCommaList(languagesInput),
        learningGoals: parseCommaList(goalsInput),
        profileVisibility,
        locationVisibility,
        learningGoalsVisibility,
        messagePermission
      });

      if (res.success && res.profile) {
        soundEngine.playSuccess();
        onProfileUpdated({
          ...initialProfile,
          ...res.profile
        });
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span>Chỉnh Sửa Hồ Sơ Cá Nhân</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Avatar and Cover Direct Upload (100% Client Compressed) */}
          <div className="space-y-4">
            <ImageUploadZone
              type="avatar"
              label="Ảnh đại diện cá nhân (Tự động nén siêu nhẹ ~10KB):"
              value={avatar}
              onChange={setAvatar}
              aspectRatio="square"
              folder="avatars"
              helperText="Được cắt chuẩn 200x200px, nén WebP/JPEG tiết kiệm dung lượng."
            />

            <ImageUploadZone
              type="banner"
              label="Ảnh bìa hồ sơ (Tự động tối ưu khung ngang):"
              value={coverImage}
              onChange={setCoverImage}
              aspectRatio="video"
              folder="banners"
              helperText="Tối ưu tỷ lệ ngang, hiển thị sắc nét trên cả điện thoại và máy tính."
            />
          </div>

          {/* Bio & Intro */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tiểu sử ngắn (Bio - hiển thị trên thẻ kết nối):
              </label>
              <input
                type="text"
                maxLength={160}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="VD: Đam mê học ngoại ngữ, thói quen dậy sớm 5:00 AM..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Vị trí / Thành phố (Location):
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="VD: Hà Nội, Việt Nam / Tokyo, Japan"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Giới thiệu chi tiết (Personal Introduction):
              </label>
              <textarea
                rows={3}
                value={personalIntro}
                onChange={e => setPersonalIntro(e.target.value)}
                placeholder="Chia sẻ về hành trình phát triển bản thân, phương pháp học tập của bạn..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* Interests, Languages & Goals */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Ngôn ngữ đang học (phân cách bằng dấu phẩy):
              </label>
              <input
                type="text"
                value={languagesInput}
                onChange={e => setLanguagesInput(e.target.value)}
                placeholder="VD: Tiếng Anh, Tiếng Nhật (JLPT N2), Tiếng Trung (HSK 4)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Sở thích & Chủ đề quan tâm (phân cách bằng dấu phẩy):
              </label>
              <input
                type="text"
                value={interestsInput}
                onChange={e => setInterestsInput(e.target.value)}
                placeholder="VD: Lập trình, Đọc sách, Pomodoro, Thể hình, Thiết kế"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mục tiêu học tập công khai (phân cách bằng dấu phẩy):
              </label>
              <input
                type="text"
                value={goalsInput}
                onChange={e => setGoalsInput(e.target.value)}
                placeholder="VD: Chinh phục 1000 từ vựng JLPT, Hoàn thành 50 phiên Deep Work"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* Privacy Settings (Quyền Riêng Tư Mặc Định) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Thiết Lập Quyền Riêng Tư & An Toàn</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">Ai có thể thấy vị trí của bạn:</label>
                <select
                  value={locationVisibility}
                  onChange={e => setLocationVisibility(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs"
                >
                  <option value="PRIVATE">Chỉ mình tôi (Riêng tư)</option>
                  <option value="FRIENDS_ONLY">Chỉ bạn bè</option>
                  <option value="PUBLIC">Công khai với mọi người</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">Ai có thể gửi tin nhắn cho bạn:</label>
                <select
                  value={messagePermission}
                  onChange={e => setMessagePermission(e.target.value as any)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs"
                >
                  <option value="EVERYONE">Tất cả mọi người</option>
                  <option value="FRIENDS_ONLY">Chỉ bạn bè</option>
                  <option value="NO_ONE">Không ai (Tắt nhận tin)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
