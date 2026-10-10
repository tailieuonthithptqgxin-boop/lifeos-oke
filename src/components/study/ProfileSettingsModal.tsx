import React, { useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { AcademicProfile, EducationEnvironment } from '../../lib/gradeEngine';

interface ProfileSettingsModalProps {
  profile: AcademicProfile;
  onClose: () => void;
  onSaveProfile: (updates: Partial<AcademicProfile>) => void;
}

export function ProfileSettingsModal({ profile, onClose, onSaveProfile }: ProfileSettingsModalProps) {
  const [schoolName, setSchoolName] = useState(profile.schoolName || '');
  const [programName, setProgramName] = useState(profile.programName || '');
  const [environment, setEnvironment] = useState<EducationEnvironment>(profile.environment || 'THPT');
  const [scaleMax, setScaleMax] = useState<number>(profile.scaleMax || 10);
  const [passingScore, setPassingScore] = useState<number>(profile.passingScore || 5.0);
  const [targetOverallGpa, setTargetOverallGpa] = useState<number>(profile.targetOverallGpa || 8.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      schoolName: schoolName.trim(),
      programName: programName.trim(),
      environment,
      scaleMax: Number(scaleMax) || 10,
      passingScore: Number(passingScore) || 5.0,
      targetOverallGpa: Number(targetOverallGpa) || 8.0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600" /> Cài đặt Hồ sơ Học tập Cá nhân
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên trường / Cơ sở đào tạo
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="Ví dụ: THPT Chuyên hoặc Đại học Bách Khoa"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Khối / Lớp / Chương trình học
            </label>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="Ví dụ: Khối 12 hoặc Kỹ thuật phần mềm K21"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Môi trường giáo dục
              </label>
              <select
                value={environment}
                onChange={e => setEnvironment(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="THPT">THPT (Thông tư 22)</option>
                <option value="DAI_HOC">Đại học (Tín chỉ)</option>
                <option value="CUSTOM">Tùy chỉnh</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thang điểm tối đa
              </label>
              <input
                type="number"
                value={scaleMax}
                onChange={e => setScaleMax(parseFloat(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Điểm tối thiểu qua môn
              </label>
              <input
                type="number"
                step="0.1"
                value={passingScore}
                onChange={e => setPassingScore(parseFloat(e.target.value) || 5.0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mục tiêu GPA toàn khóa
              </label>
              <input
                type="number"
                step="0.1"
                value={targetOverallGpa}
                onChange={e => setTargetOverallGpa(parseFloat(e.target.value) || 8.0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Lưu Hồ sơ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
