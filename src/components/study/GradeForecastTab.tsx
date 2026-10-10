import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { 
  Calculator, GraduationCap, Layers, Check, Sliders, RotateCcw, AlertTriangle, 
  Target, Trash2, Plus, Settings2, Save, TrendingUp, CheckCircle2, Sparkles 
} from 'lucide-react';
import { 
  EducationEnvironment, 
  GradeComponent, 
  GradingSchema, 
  AcademicProfile,
  GRADE_PRESETS, 
  solveForecast, 
  generateScenarios, 
  validateGradingSchema, 
  normalizeWeights, 
  generateNaturalFormula, 
  getTotalWeight 
} from '../../lib/gradeEngine';

interface GradeForecastTabProps {
  onNewSubject: () => void;
  preselectedSubjectId?: string;
  profile?: AcademicProfile;
  onCommitScoreToProfile?: (subId: string, score: number) => void;
}

export function GradeForecastTab({
  onNewSubject,
  preselectedSubjectId,
  profile,
  onCommitScoreToProfile
}: GradeForecastTabProps) {
  const { subjects = [] } = useAppStore();
  const [selectedSubId, setSelectedSubId] = useState(preselectedSubjectId || subjects[0]?.id || '');
  const [targetScore, setTargetScore] = useState<number>(8.0);
  const [newScoreInput, setNewScoreInput] = useState<{ [compId: string]: string }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync if preselected subject changes
  useEffect(() => {
    if (preselectedSubjectId) {
      setSelectedSubId(preselectedSubjectId);
    }
  }, [preselectedSubjectId]);

  const sub = subjects.find((s: any) => s.id === selectedSubId) || subjects[0];

  // Helper to get initial schema for a subject
  const getInitialSchema = (subjectId: string): GradingSchema => {
    if (profile?.subjectGrades?.[subjectId]?.schema) {
      return JSON.parse(JSON.stringify(profile.subjectGrades[subjectId].schema));
    }
    if (typeof window !== 'undefined' && subjectId) {
      const saved = localStorage.getItem(`lifeos_grade_schema_${subjectId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved schema:', e);
        }
      }
    }
    return JSON.parse(JSON.stringify(GRADE_PRESETS.THPT.schema));
  };

  const [schema, setSchema] = useState<GradingSchema>(() => getInitialSchema(selectedSubId));

  // Sync schema and target when selected subject changes
  useEffect(() => {
    if (sub) {
      if (sub.targetGrade) {
        setTargetScore(Number(sub.targetGrade));
      }
      const loaded = getInitialSchema(sub.id);
      setSchema(loaded);
    }
  }, [selectedSubId, profile]);

  // Persist schema to localStorage
  const updateSchema = (updater: (prev: GradingSchema) => GradingSchema) => {
    setSchema(prev => {
      const next = updater(prev);
      if (typeof window !== 'undefined' && sub?.id) {
        localStorage.setItem(`lifeos_grade_schema_${sub.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Switch preset
  const handleSelectPreset = (env: EducationEnvironment) => {
    const preset = GRADE_PRESETS[env];
    if (preset) {
      const newSchema = JSON.parse(JSON.stringify(preset.schema));
      updateSchema(() => newSchema);
      if (newSchema.scaleMax === 100 && targetScore <= 10) {
        setTargetScore(80);
      } else if (newSchema.scaleMax === 10 && targetScore > 10) {
        setTargetScore(8.0);
      }
    }
  };

  // Component management
  const handleAddComponent = () => {
    updateSchema(prev => {
      const id = 'comp_' + Date.now();
      const newComp: GradeComponent = {
        id,
        name: `Cột điểm ${prev.components.length + 1}`,
        shortCode: `C${prev.components.length + 1}`,
        weight: 10,
        scores: [],
        isTargetExam: false
      };
      return {
        ...prev,
        environment: 'CUSTOM',
        components: [...prev.components, newComp]
      };
    });
  };

  const handleRemoveComponent = (id: string) => {
    if (schema.components.length <= 1) return;
    updateSchema(prev => {
      const remaining = prev.components.filter(c => c.id !== id);
      if (!remaining.some(c => c.isTargetExam) && remaining.length > 0) {
        remaining[remaining.length - 1].isTargetExam = true;
      }
      return {
        ...prev,
        environment: 'CUSTOM',
        components: remaining
      };
    });
  };

  const handleUpdateComponent = (id: string, updates: Partial<GradeComponent>) => {
    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const handleSetTargetComponent = (id: string) => {
    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => ({
        ...c,
        isTargetExam: c.id === id
      }))
    }));
  };

  const handleAddScoreToComponent = (compId: string) => {
    const valStr = newScoreInput[compId]?.trim();
    if (!valStr) return;
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > schema.scaleMax) return;

    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          return { ...c, scores: [...c.scores, val] };
        }
        return c;
      })
    }));

    setNewScoreInput(prev => ({ ...prev, [compId]: '' }));
  };

  const handleRemoveScoreFromComponent = (compId: string, scoreIndex: number) => {
    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          const nextScores = [...c.scores];
          nextScores.splice(scoreIndex, 1);
          return { ...c, scores: nextScores };
        }
        return c;
      })
    }));
  };

  const handleNormalizeWeights = () => {
    updateSchema(prev => ({
      ...prev,
      components: normalizeWeights(prev.components)
    }));
  };

  // Find target component
  const targetComp = schema.components.find(c => c.isTargetExam) || schema.components[schema.components.length - 1];
  const targetCompId = targetComp?.id || '';

  // Calculations & Validations
  const totalWeight = getTotalWeight(schema.components);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;
  const validationIssues = validateGradingSchema(schema);
  const forecastResult = solveForecast(schema, targetScore, targetCompId);
  const scenarios = generateScenarios(schema, targetCompId, targetScore);
  const naturalFormula = generateNaturalFormula(schema);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-7 space-y-7">
      {/* Simulation Notice Banner */}
      <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-900 dark:text-purple-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            <strong>Chế độ mô phỏng What-If:</strong> Thử nghiệm các mức điểm thi và trọng số mà không làm thay đổi điểm thật trong hồ sơ <strong>"Điểm của tôi"</strong>.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Mô phỏng & Dự báo Điểm số (Grade Forecast)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống tính điểm đa môi trường (THPT, Đại học, Thực hành, Hệ 100) — dự báo chính xác điểm số cần đạt để đạt mục tiêu.
          </p>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Môn học:</span>
            <select
              value={selectedSubId}
              onChange={e => setSelectedSubId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <GraduationCap className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-sm">Bạn cần thêm ít nhất một môn học để sử dụng công cụ dự báo điểm.</p>
          <button
            type="button"
            onClick={onNewSubject}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Thêm Môn học ngay
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {/* TIER 1: ENVIRONMENT PRESETS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" /> 1. Chọn Môi trường Đào tạo (Template có sẵn)
              </label>
              <span className="text-[11px] text-slate-400">Tự động cấu hình chuẩn theo quy định</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {(Object.keys(GRADE_PRESETS) as EducationEnvironment[]).map(envKey => {
                const preset = GRADE_PRESETS[envKey];
                const isActive = schema.environment === envKey;
                return (
                  <button
                    key={envKey}
                    type="button"
                    onClick={() => handleSelectPreset(envKey)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between mb-1">
                      <span>{preset.name.split('(')[0].trim()}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIER 2: FORMULA BUILDER & COMPONENT CUSTOMIZER */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-500" /> 2. Cấu trúc Điểm & Trọng số (Tùy chỉnh linh hoạt)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Thêm bớt cột điểm, nhập các bài kiểm tra đã có, và chọn 1 bài thi làm mục tiêu dự báo.
                </p>
              </div>

              {/* Weight balance badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isWeightValid
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  Tổng trọng số: {totalWeight.toFixed(0)}%
                  {isWeightValid ? ' ✓' : ' ⚠️'}
                </span>

                {!isWeightValid && (
                  <button
                    type="button"
                    onClick={handleNormalizeWeights}
                    className="px-2 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/40 transition cursor-pointer flex items-center gap-1"
                    title="Tự động chia lại tỷ lệ để tổng trọng số tròn 100%"
                  >
                    <RotateCcw className="w-3 h-3" /> Chuẩn hóa 100%
                  </button>
                )}
              </div>
            </div>

            {/* Validation issue alert if any */}
            {validationIssues.filter(i => i.type === 'error').length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationIssues.filter(i => i.type === 'error')[0].message}</span>
              </div>
            )}

            {/* Component Cards / Rows */}
            <div className="space-y-3">
              {schema.components.map((comp) => {
                const compAverage = comp.scores.length > 0
                  ? (comp.scores.reduce((a, b) => a + b, 0) / comp.scores.length).toFixed(1)
                  : null;

                return (
                  <div
                    key={comp.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      comp.isTargetExam
                        ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Component Identity & Target Toggle */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={e => handleUpdateComponent(comp.id, { name: e.target.value })}
                          className="px-2.5 py-1 text-xs font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 min-w-[150px]"
                          placeholder="Tên thành phần"
                        />

                        {/* Target badge/selector */}
                        <button
                          type="button"
                          onClick={() => handleSetTargetComponent(comp.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                            comp.isTargetExam
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/50'
                          }`}
                          title="Chọn thành phần này làm bài thi cần dự báo điểm"
                        >
                          <Target className="w-3 h-3" />
                          {comp.isTargetExam ? 'Đang là đích dự báo' : 'Chọn làm đích'}
                        </button>

                        {/* Weight Slider & Input */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Trọng số:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={comp.weight}
                            onChange={e => handleUpdateComponent(comp.id, { weight: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-12 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-[11px] font-semibold text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Right: Scores Chips & Add Score */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Display existing scores */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {comp.scores.map((score, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              {score}
                              <button
                                type="button"
                                onClick={() => handleRemoveScoreFromComponent(comp.id, sIdx)}
                                className="text-blue-600 dark:text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                                title="Xóa điểm này"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* New Score Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={schema.scaleMax}
                            value={newScoreInput[comp.id] || ''}
                            onChange={e => setNewScoreInput(prev => ({ ...prev, [comp.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddScoreToComponent(comp.id);
                              }
                            }}
                            placeholder={`0-${schema.scaleMax}`}
                            className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddScoreToComponent(comp.id)}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                            title="Thêm điểm vào cột này"
                          >
                            + Điểm
                          </button>
                        </div>

                        {/* Average indicator */}
                        {compAverage && (
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pl-1">
                            (TB: <span className="text-slate-700 dark:text-slate-200 font-bold">{compAverage}</span>)
                          </span>
                        )}

                        {/* Delete component button */}
                        {schema.components.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ml-1"
                            title="Xóa loại điểm này"
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

            {/* Actions: Add Component + Natural Formula Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddComponent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer self-start"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm loại điểm mới
              </button>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                {showAdvanced ? 'Ẩn tùy chọn nâng cao' : 'Tùy chọn nâng cao (Thang điểm / Công thức tự do)'}
              </button>
            </div>

            {/* Real-time Natural Formula Preview */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400 shrink-0">Công thức trực quan:</span>
              <span className="font-mono text-[11px] sm:text-xs text-slate-800 dark:text-slate-200">{naturalFormula}</span>
            </div>

            {/* TIER 3: ADVANCED MODE (COLLAPSIBLE) */}
            {showAdvanced && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Cấu hình nâng cao & Thang điểm
                  </span>
                  <span className="text-[11px] text-slate-400">Dành cho các hệ đào tạo đặc thù</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Thang điểm tối đa
                    </label>
                    <select
                      value={schema.scaleMax}
                      onChange={e => updateSchema(prev => ({ ...prev, scaleMax: parseInt(e.target.value) || 10 }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    >
                      <option value="10">Thang điểm 10 (Việt Nam)</option>
                      <option value="100">Thang điểm 100 (Quốc tế/Percentage)</option>
                      <option value="4">Thang điểm 4 (GPA Tín chỉ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Điểm tối thiểu qua môn
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={schema.passingScore}
                      onChange={e => updateSchema(prev => ({ ...prev, passingScore: parseFloat(e.target.value) || 5.0 }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Phương thức tính
                    </label>
                    <select
                      value={schema.calculationMethod}
                      onChange={e => updateSchema(prev => ({ ...prev, calculationMethod: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    >
                      <option value="weighted_average">Trung bình trọng số (Chuẩn)</option>
                      <option value="custom_formula">Công thức biểu thức tự do</option>
                    </select>
                  </div>
                </div>

                {schema.calculationMethod === 'custom_formula' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Biểu thức công thức (Sử dụng mã cột: {schema.components.map(c => c.shortCode).join(', ')})
                    </label>
                    <input
                      type="text"
                      value={schema.customFormula || ''}
                      onChange={e => updateSchema(prev => ({ ...prev, customFormula: e.target.value }))}
                      placeholder="Ví dụ: (TX * 0.2) + (GK * 0.3) + (CK * 0.5)"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FORECAST & WHAT-IF SIMULATION SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Goal Target Input & Solver Hero Card (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Target score selector */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Điểm tổng kết mục tiêu
                  </label>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {targetScore} / {schema.scaleMax}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={schema.scaleMax === 100 ? 40 : 1}
                    max={schema.scaleMax}
                    step={schema.scaleMax === 100 ? 1 : 0.1}
                    value={targetScore}
                    onChange={e => setTargetScore(parseFloat(e.target.value) || 0)}
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    step={schema.scaleMax === 100 ? 1 : 0.1}
                    min="1"
                    max={schema.scaleMax}
                    value={targetScore}
                    onChange={e => setTargetScore(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>

              {/* Backward Solver Hero Result */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Dự báo điểm cần đạt
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      forecastResult.difficulty === 'already_safe'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : forecastResult.difficulty === 'easy'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : forecastResult.difficulty === 'moderate'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : forecastResult.difficulty === 'hard'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {forecastResult.difficulty === 'already_safe'
                      ? 'An toàn 🎉'
                      : forecastResult.difficulty === 'easy'
                      ? 'Dễ dàng 👍'
                      : forecastResult.difficulty === 'moderate'
                      ? 'Khả thi 🎯'
                      : forecastResult.difficulty === 'hard'
                      ? 'Thách thức cao 🔥'
                      : 'Không khả thi ⚠️'}
                  </span>
                </div>

                <div className="text-center py-2 space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Bài thi <span className="font-bold text-slate-800 dark:text-slate-100">{forecastResult.targetComponent.name}</span> cần tối thiểu:
                  </div>

                  {forecastResult.difficulty === 'already_safe' ? (
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      0.0 <span className="text-sm font-medium text-slate-400">/{schema.scaleMax} (Đã đủ điểm)</span>
                    </div>
                  ) : forecastResult.isAchievable ? (
                    <div className="text-4xl font-black text-blue-600 dark:text-blue-400">
                      {forecastResult.requiredScore.toFixed(1)}{' '}
                      <span className="text-base font-normal text-slate-400">/{schema.scaleMax}</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
                      {forecastResult.requiredScore.toFixed(1)}{' '}
                      <span className="text-sm font-normal text-slate-400">/{schema.scaleMax} (Vượt khung)</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 leading-relaxed px-2">
                    {forecastResult.advice}
                  </p>
                </div>

                {/* Commit Score to Real Profile Button */}
                {onCommitScoreToProfile && forecastResult.isAchievable && forecastResult.difficulty !== 'already_safe' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có muốn lưu điểm ${forecastResult.requiredScore.toFixed(1)} vào bài thi "${forecastResult.targetComponent.name}" của môn "${sub?.name}" trong hồ sơ Điểm của tôi?`)) {
                          onCommitScoreToProfile(sub?.id, forecastResult.requiredScore);
                        }
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu điểm {forecastResult.requiredScore.toFixed(1)} này vào hồ sơ thật
                    </button>
                  </div>
                )}

                {/* Stat pills */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block">Điểm quá trình đã có:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {forecastResult.currentComponentsAverage > 0
                        ? `${forecastResult.currentComponentsAverage.toFixed(1)} / ${schema.scaleMax}`
                        : 'Chưa có điểm'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block">Điểm tối đa có thể đạt:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {forecastResult.maxPossibleGrade.toFixed(1)} / {schema.scaleMax}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* WHAT-IF SCENARIO MATRIX (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Ma trận Kịch bản Mô phỏng (What-If Simulation)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Nếu bài thi <span className="font-semibold text-purple-600 dark:text-purple-400">{forecastResult.targetComponent.name}</span> được các mức điểm khác nhau:
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] font-bold">
                      <th className="py-2.5 px-3">Điểm {forecastResult.targetComponent.shortCode || 'Thi'}</th>
                      <th className="py-2.5 px-3">Điểm Tổng kết</th>
                      <th className="py-2.5 px-3">Xếp loại</th>
                      <th className="py-2.5 px-3 text-right">Mục tiêu ({targetScore})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {scenarios.map((sc, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          sc.passedTarget
                            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {sc.examScore.toFixed(schema.scaleMax === 100 ? 0 : 1)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                          {sc.finalGrade.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sc.colorClass}`}>
                            {sc.classification}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {sc.passedTarget ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              Chưa đạt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span>💡 Thay đổi trọng số hoặc nhập điểm số ở trên để xem ma trận tự động tính lại.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
