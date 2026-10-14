import React, { useState, useMemo } from 'react';
import { X, Sparkles, Plus, Trash2, Calculator, Check } from 'lucide-react';
import { 
  AcademicProfile, 
  GradingSchema, 
  GradeComponent, 
  SubjectGradeRecord, 
  GRADE_PRESETS,
  calculateSubjectAnalytics,
  getTotalWeight
} from '../../lib/gradeEngine';

interface SubjectGradeDetailModalProps {
  subject: any;
  record?: SubjectGradeRecord;
  profile: AcademicProfile;
  onClose: () => void;
  onSaveRecord: (updates: Partial<SubjectGradeRecord>) => void;
  onOpenForecast: () => void;
}

export function SubjectGradeDetailModal({
  subject,
  record,
  profile,
  onClose,
  onSaveRecord,
  onOpenForecast
}: SubjectGradeDetailModalProps) {
  const defaultSchema = useMemo(() => {
    return JSON.parse(JSON.stringify(GRADE_PRESETS[profile.environment || 'THPT'].schema));
  }, [profile.environment]);

  const [schema, setSchema] = useState<GradingSchema>(() => {
    return record?.schema ? JSON.parse(JSON.stringify(record.schema)) : defaultSchema;
  });

  const [credits, setCredits] = useState<number>(record?.credits || 1);
  const [targetGrade, setTargetGrade] = useState<number>(record?.targetGrade || subject.targetGrade || 8.0);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(record?.semesterId || profile.currentSemesterId);
  const [newScoreInput, setNewScoreInput] = useState<{ [compId: string]: string }>({});

  const analytics = useMemo(() => {
    const currentRec: SubjectGradeRecord = {
      subjectId: subject.id,
      semesterId: selectedSemesterId,
      credits,
      schema,
      targetGrade
    };
    return calculateSubjectAnalytics(currentRec, profile.scaleMax, profile.passingScore);
  }, [subject.id, selectedSemesterId, credits, schema, targetGrade, profile]);

  const handleAddScore = (compId: string) => {
    const valStr = newScoreInput[compId]?.trim();
    if (!valStr) {
      return alert('Vui lòng nhập điểm số cần thêm!');
    }
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > profile.scaleMax) {
      return alert(`Điểm phải nằm trong khoảng từ 0 đến ${profile.scaleMax}`);
    }

    setSchema(prev => ({
      ...prev,
      components: (prev?.components || []).map(c => {
        if (c.id === compId) {
          return { ...c, scores: [...(c.scores || []), val] };
        }
        return c;
      })
    }));

    setNewScoreInput(prev => ({ ...prev, [compId]: '' }));
  };

  const handleRemoveScore = (compId: string, sIdx: number) => {
    setSchema(prev => ({
      ...prev,
      components: (prev?.components || []).map(c => {
        if (c.id === compId) {
          const nextScores = [...(c.scores || [])];
          nextScores.splice(sIdx, 1);
          return { ...c, scores: nextScores };
        }
        return c;
      })
    }));
  };

  const handleAddComponent = () => {
    const id = 'comp_' + Date.now();
    const newComp: GradeComponent = {
      id,
      name: `Cột điểm ${schema.components.length + 1}`,
      shortCode: `C${schema.components.length + 1}`,
      weight: 10,
      scores: [],
      isTargetExam: false
    };
    setSchema(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
  };

  const handleRemoveComponent = (id: string) => {
    if (schema.components.length <= 1) return;
    setSchema(prev => {
      const remaining = prev.components.filter(c => c.id !== id);
      if (!remaining.some(c => c.isTargetExam) && remaining.length > 0) {
        remaining[remaining.length - 1].isTargetExam = true;
      }
      return { ...prev, components: remaining };
    });
  };

  const handleSaveAndClose = () => {
    onSaveRecord({
      semesterId: selectedSemesterId,
      credits: Number(credits) || 1,
      targetGrade: Number(targetGrade) || 8.0,
      schema
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: subject.color || '#3b82f6' }}
            />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                {subject.name} {subject.code ? `(${subject.code})` : ''}
              </h3>
              <p className="text-xs text-slate-400">
                Quản lý hồ sơ điểm thật • Cập nhật các cột kiểm tra và điểm số thực tế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick config bar: Semester, Credits, Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Học kỳ
              </label>
              <select
                value={selectedSemesterId}
                onChange={e => setSelectedSemesterId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                {(profile?.semesters || []).map((sem: any) => (
                  <option key={sem.id} value={sem.id}>{sem.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Số tín chỉ / Hệ số môn
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={credits}
                onChange={e => setCredits(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Điểm mục tiêu (1 - {profile?.scaleMax || 10})
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max={profile?.scaleMax || 10}
                value={targetGrade}
                onChange={e => setTargetGrade(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600 dark:text-blue-400 text-center"
              />
            </div>
          </div>

          {/* Actionable Coaching Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Đánh giá tình trạng môn học
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${analytics.statusColor}`}>
                {analytics.statusLabel}
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {analytics.actionAdvice}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-blue-100 dark:border-blue-900/40 text-slate-500">
              <span>Điểm quá trình: <strong className="text-blue-600 dark:text-blue-400">{analytics.completedWeight > 0 ? analytics.currentWeightedGrade.toFixed(1) : '--'}</strong></span>
              <span>Đã hoàn thành: <strong className="text-slate-800 dark:text-slate-200">{analytics.completedWeight}%</strong> trọng số</span>
              <span>Dự báo tổng kết: <strong className="text-purple-600 dark:text-purple-400">{analytics.projectedGrade.toFixed(1)}</strong></span>
            </div>
          </div>

          {/* Grade Components and Scores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Các thành phần điểm & Điểm thực tế đã có
              </h4>
              <span className="text-[11px] text-slate-400">
                Tổng trọng số: {getTotalWeight(schema?.components || []).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-3">
              {(schema?.components || []).map((comp) => {
                const compScores = comp.scores || [];
                const compAvg = compScores.length > 0
                  ? (compScores.reduce((a, b) => a + b, 0) / compScores.length).toFixed(1)
                  : null;

                return (
                  <div
                    key={comp.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      comp.isTargetExam
                        ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Component Identity */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={e => {
                            const val = e.target.value;
                            setSchema(prev => ({
                              ...prev,
                              components: prev.components.map(c => c.id === comp.id ? { ...c, name: val } : c)
                            }));
                          }}
                          className="px-2 py-1 text-xs font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500 min-w-[140px]"
                        />

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-xs font-bold">
                          <span className="text-[10px] text-slate-400">Trọng số:</span>
                          <input
                            type="number"
                            value={comp.weight}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setSchema(prev => ({
                                ...prev,
                                components: prev.components.map(c => c.id === comp.id ? { ...c, weight: val } : c)
                              }));
                            }}
                            className="w-10 text-center bg-transparent border-none text-blue-600 dark:text-blue-400 font-bold"
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>

                        {comp.isTargetExam && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white">
                            Đích dự báo
                          </span>
                        )}
                      </div>

                      {/* Right: Real Scores chips & Add Score */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Scores chips */}
                        <div className="flex flex-wrap items-center gap-1">
                          {(comp.scores || []).map((score, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              {score}
                              <button
                                type="button"
                                onClick={() => handleRemoveScore(comp.id, sIdx)}
                                className="text-blue-600 hover:text-rose-600 ml-0.5 cursor-pointer"
                                title="Xóa con điểm này"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Input & add score */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={profile.scaleMax}
                            value={newScoreInput[comp.id] || ''}
                            onChange={e => setNewScoreInput(prev => ({ ...prev, [comp.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddScore(comp.id);
                              }
                            }}
                            placeholder={`0-${profile.scaleMax}`}
                            className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddScore(comp.id)}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                          >
                            + Điểm
                          </button>
                        </div>

                        {compAvg && (
                          <span className="text-[11px] font-semibold text-slate-400 pl-1">
                            (TB: <span className="font-bold text-slate-800 dark:text-slate-200">{compAvg}</span>)
                          </span>
                        )}

                        {schema.components.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Xóa cột điểm này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddComponent}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm loại điểm mới cho môn này
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenForecast}
            className="w-full sm:w-auto px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" /> Mở sang Grade Forecast để mô phỏng What-If
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Lưu Hồ Sơ Điểm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
