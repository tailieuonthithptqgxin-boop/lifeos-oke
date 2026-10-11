import React, { useState, useMemo } from 'react';
import { 
  School, Plus, Settings2, Award, TrendingUp, Target, Search, BookOpen, Edit3, Calculator 
} from 'lucide-react';
import { 
  AcademicProfile, 
  calculateSemesterAnalytics, 
  calculateCumulativeGpa, 
  calculateSubjectAnalytics 
} from '../../lib/gradeEngine';

interface MyGradesTabProps {
  profile: AcademicProfile;
  subjects?: any[];
  onOpenSubjectDetail: (sub: any) => void;
  onOpenForecastForSubject: (subId: string) => void;
  onNewSubject: () => void;
  onOpenProfileSettings: () => void;
  onOpenSemesterModal: () => void;
  onChangeCurrentSemester: (semId: string) => void;
}

export function MyGradesTab({
  profile,
  subjects = [],
  onOpenSubjectDetail,
  onOpenForecastForSubject,
  onNewSubject,
  onOpenProfileSettings,
  onOpenSemesterModal,
  onChangeCurrentSemester
}: MyGradesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'improving' | 'at_risk' | 'insufficient_data'>('all');

  const currentSemester = (profile?.semesters || []).find((s: any) => s.id === profile?.currentSemesterId) || (profile?.semesters || [])[0] || {
    id: 'default',
    name: 'Học kỳ 1 (2024 - 2025)',
    year: '2024 - 2025',
    targetGpa: 8.0
  };

  // Subjects in current semester
  const semesterSubjects = (subjects || []).filter((s: any) => {
    const rec = profile?.subjectGrades?.[s.id];
    return !rec || !rec.semesterId || rec.semesterId === currentSemester.id;
  });

  const subjectIds = (semesterSubjects || []).map((s: any) => s.id);
  const allSubjectIds = (subjects || []).map((s: any) => s.id);

  // Analytics
  const semAnalytics = useMemo(() => {
    return calculateSemesterAnalytics(profile, currentSemester.id, subjectIds);
  }, [profile, currentSemester.id, subjects]);

  const cumulative = useMemo(() => {
    return calculateCumulativeGpa(profile, allSubjectIds);
  }, [profile, subjects]);

  const targetGpa = currentSemester.targetGpa || profile?.targetOverallGpa || 8.0;
  const gpaProgress = targetGpa > 0 ? Math.min(Math.round((semAnalytics.gpa / targetGpa) * 100), 100) : 0;

  // Filtered list
  const displayedSubjects = semesterSubjects.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const a = semAnalytics.subjectsAnalytics.find((item: any) => item.subjectId === s.id);
    return a ? a.status === statusFilter : statusFilter === 'insufficient_data';
  });

  return (
    <div className="space-y-6">
      {/* ACADEMIC PROFILE BANNER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
              <School className="w-3.5 h-3.5" />
              {profile?.environment === 'DAI_HOC' ? 'Đại học (Tín chỉ)' : profile?.environment === 'THPT' ? 'THPT (Thông tư 22)' : 'Hệ Tùy chỉnh'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Thang {profile?.scaleMax || 10}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Điểm qua môn: {profile?.passingScore || 5.0}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{profile?.schoolName || 'Chưa đặt trường'}</span>
            <span className="text-slate-400 font-normal">•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-base">{profile?.programName || 'Khối/Lớp'}</span>
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hồ sơ điểm cá nhân độc lập — dữ liệu nền tảng cho việc tính GPA, quản lý tiến độ và mô phỏng dự báo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Semester pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(profile?.semesters || []).map((sem: any) => (
              <button
                key={sem.id}
                type="button"
                onClick={() => onChangeCurrentSemester(sem.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  sem.id === currentSemester.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sem.name}
              </button>
            ))}
            <button
              type="button"
              onClick={onOpenSemesterModal}
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Thêm học kỳ mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenProfileSettings}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" /> Cài đặt hồ sơ
          </button>
        </div>
      </div>

      {/* KPI DASHBOARD SUMMARY ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Semester GPA */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Điểm TB Học kỳ ({currentSemester.name?.split('(')[0]?.trim() || 'Kỳ này'})</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {semAnalytics.gpa > 0 ? semAnalytics.gpa.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-400">/{profile.scaleMax}</span>
          </div>
          <div className="text-xs flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Mục tiêu: <strong className="text-blue-600">{targetGpa.toFixed(1)}</strong></span>
            <span>{semAnalytics.gradedCredits}/{semAnalytics.totalCredits} TC</span>
          </div>
        </div>

        {/* Card 2: Cumulative GPA */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Điểm TB Tích lũy (Toàn khóa)</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {cumulative.gpa > 0 ? cumulative.gpa.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-400">/{profile.scaleMax}</span>
          </div>
          <div className="text-xs flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Tổng cộng: <strong>{cumulative.totalCredits} TC</strong></span>
            <span>{cumulative.totalSubjects} môn học</span>
          </div>
        </div>

        {/* Card 3: Target Progress */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Tiến độ Mục tiêu Kỳ</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {gpaProgress}%
            </span>
            <span className="text-xs font-semibold text-slate-400">hoàn thành</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all ${
                gpaProgress >= 90 ? 'bg-emerald-500' : gpaProgress >= 70 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${gpaProgress}%` }}
            />
          </div>
        </div>

        {/* Card 4: Status Count Chips */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold">
            Tổng hợp môn học trong kỳ ({semesterSubjects.length})
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'good' ? 'all' : 'good')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'good' ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span>🟢 Đạt tốt</span>
              <span>{semAnalytics.goodCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'improving' ? 'all' : 'improving')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'improving' ? 'bg-amber-200 dark:bg-amber-900 text-amber-900' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
              }`}
            >
              <span>🟡 Cần nỗ lực</span>
              <span>{semAnalytics.improvingCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'at_risk' ? 'all' : 'at_risk')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'at_risk' ? 'bg-rose-200 dark:bg-rose-900 text-rose-900' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span>🔴 Nguy cơ</span>
              <span>{semAnalytics.atRiskCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'insufficient_data' ? 'all' : 'insufficient_data')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'insufficient_data' ? 'bg-slate-300 dark:bg-slate-700 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>⚪ Chưa có điểm</span>
              <span>{semAnalytics.insufficientCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBJECT GRADES TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
        {/* Table Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm môn học theo tên hoặc mã môn..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
              >
                Xóa lọc
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNewSubject}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Thêm Môn học mới
          </button>
        </div>

        {displayedSubjects.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">Chưa có môn học nào phù hợp với bộ lọc trong kỳ này.</p>
            <button
              type="button"
              onClick={onNewSubject}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer"
            >
              Thêm môn học ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] font-bold">
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3 text-center">Tín chỉ / Hệ số</th>
                  <th className="py-3 px-3">Điểm quá trình hiện tại</th>
                  <th className="py-3 px-3 text-center">Mục tiêu</th>
                  <th className="py-3 px-3 text-center">Dự báo</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {displayedSubjects.map((sub: any) => {
                  const record = profile.subjectGrades?.[sub.id];
                  const analytics = record
                    ? calculateSubjectAnalytics(record, profile.scaleMax, profile.passingScore)
                    : null;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color || '#3b82f6' }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{sub.name}</div>
                            {sub.code && (
                              <span className="text-[10px] font-mono text-slate-400">{sub.code}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Credits */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          {record?.credits || 1} {profile.environment === 'DAI_HOC' ? 'TC' : 'HS'}
                        </span>
                      </td>

                      {/* Current Grade & Progress */}
                      <td className="py-3.5 px-3">
                        {analytics && analytics.completedWeight > 0 ? (
                          <div className="space-y-1">
                            <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                              {analytics.currentWeightedGrade.toFixed(1)}{' '}
                              <span className="text-[11px] font-normal text-slate-400">/{profile.scaleMax}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Đã có {analytics.completedWeight}% trọng số
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Chưa có điểm</span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {record?.targetGrade || sub.targetGrade || 8.0}
                      </td>

                      {/* Projected */}
                      <td className="py-3.5 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                        {analytics && analytics.completedWeight > 0 ? analytics.projectedGrade.toFixed(1) : '--'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${analytics?.statusColor || 'bg-slate-100 text-slate-600'}`}>
                          {analytics?.statusLabel || 'Chưa có điểm'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenSubjectDetail(sub)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Nhập điểm & Chi tiết môn học"
                          >
                            <Edit3 className="w-3 h-3" /> Chi tiết & Điểm
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenForecastForSubject(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition cursor-pointer"
                            title="Mô phỏng tại Grade Forecast"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
