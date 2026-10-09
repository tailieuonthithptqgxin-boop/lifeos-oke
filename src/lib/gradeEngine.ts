// ==============================================================================
// GRADE CALCULATION & FORECAST ENGINE (UNIVERSAL EDUCATIONAL SYSTEM)
// ==============================================================================
// Supports multiple education environments: THPT, Đại học, Thực hành, Hệ 100 & Tùy chỉnh.
// Extensible schema-driven architecture with 3-tier UX (Presets -> Visual Builder -> Advanced Formula).

export type EducationEnvironment = 'THPT' | 'DAI_HOC' | 'THUC_HANH' | 'HE_100' | 'CUSTOM';

export interface GradeComponent {
  id: string;
  name: string;
  shortCode: string;
  weight: number; // percentage (0 - 100)
  scores: number[]; // can contain multiple columns (e.g. 3 tests in regular assessment)
  isTargetExam?: boolean; // the component we solve/forecast for (e.g. Final Exam)
}

export interface GradingSchema {
  environment: EducationEnvironment;
  scaleMax: number; // 10, 100, or 4
  passingScore: number;
  components: GradeComponent[];
  calculationMethod: 'weighted_average' | 'custom_formula';
  customFormula?: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
}

export interface ForecastResult {
  targetGrade: number;
  targetComponent: GradeComponent;
  requiredScore: number;
  isAchievable: boolean;
  difficulty: 'already_safe' | 'easy' | 'moderate' | 'hard' | 'impossible';
  maxPossibleGrade: number;
  currentAccumulatedGrade: number;
  currentComponentsAverage: number;
  advice: string;
  naturalFormula: string;
  scaleMax: number;
}

export interface ScenarioItem {
  examScore: number;
  finalGrade: number;
  classification: string;
  passedTarget: boolean;
  colorClass: string;
}

// ------------------------------------------------------------------------------
// PRESETS (TEMPLATES CHO ĐA SỐ NGƯỜI DÙNG)
// ------------------------------------------------------------------------------

export const GRADE_PRESETS: Record<EducationEnvironment, { name: string; description: string; schema: GradingSchema }> = {
  THPT: {
    name: 'THPT (Thông tư 22 / Bộ GD&ĐT)',
    description: 'Thường xuyên 20% (nhiều cột điểm), Giữa kỳ 30%, Cuối kỳ 50% (thang điểm 10).',
    schema: {
      environment: 'THPT',
      scaleMax: 10,
      passingScore: 5.0,
      calculationMethod: 'weighted_average',
      components: [
        {
          id: 'comp_thpt_tx',
          name: 'Đánh giá thường xuyên',
          shortCode: 'TX',
          weight: 20,
          scores: [8.0, 7.5, 8.5],
          isTargetExam: false
        },
        {
          id: 'comp_thpt_gk',
          name: 'Đánh giá giữa kỳ (GK)',
          shortCode: 'GK',
          weight: 30,
          scores: [7.5],
          isTargetExam: false
        },
        {
          id: 'comp_thpt_ck',
          name: 'Đánh giá cuối kỳ (CK)',
          shortCode: 'CK',
          weight: 50,
          scores: [],
          isTargetExam: true
        }
      ]
    }
  },
  DAI_HOC: {
    name: 'Đại học (Tín chỉ chuẩn 4 cột)',
    description: 'Chuyên cần 10%, Bài tập/Thảo luận 20%, Thi giữa kỳ 20%, Thi cuối kỳ 50%.',
    schema: {
      environment: 'DAI_HOC',
      scaleMax: 10,
      passingScore: 4.0,
      calculationMethod: 'weighted_average',
      components: [
        {
          id: 'comp_dh_cc',
          name: 'Chuyên cần & Thái độ',
          shortCode: 'CC',
          weight: 10,
          scores: [10],
          isTargetExam: false
        },
        {
          id: 'comp_dh_bt',
          name: 'Bài tập & Thảo luận',
          shortCode: 'BT',
          weight: 20,
          scores: [8.0],
          isTargetExam: false
        },
        {
          id: 'comp_dh_gk',
          name: 'Thi Giữa kỳ',
          shortCode: 'GK',
          weight: 20,
          scores: [7.0],
          isTargetExam: false
        },
        {
          id: 'comp_dh_ck',
          name: 'Thi Cuối kỳ',
          shortCode: 'CK',
          weight: 50,
          scores: [],
          isTargetExam: true
        }
      ]
    }
  },
  THUC_HANH: {
    name: 'Đồ án & Thực hành Lab',
    description: 'Thực hành Lab 30%, Báo cáo đồ án 30%, Vấn đáp & Bảo vệ 40%.',
    schema: {
      environment: 'THUC_HANH',
      scaleMax: 10,
      passingScore: 5.0,
      calculationMethod: 'weighted_average',
      components: [
        {
          id: 'comp_lab',
          name: 'Thực hành / Lab',
          shortCode: 'LAB',
          weight: 30,
          scores: [8.5],
          isTargetExam: false
        },
        {
          id: 'comp_report',
          name: 'Báo cáo đồ án',
          shortCode: 'BC',
          weight: 30,
          scores: [8.0],
          isTargetExam: false
        },
        {
          id: 'comp_defense',
          name: 'Bảo vệ cuối kỳ',
          shortCode: 'BV',
          weight: 40,
          scores: [],
          isTargetExam: true
        }
      ]
    }
  },
  HE_100: {
    name: 'Thang điểm 100 (Quốc tế / Online)',
    description: 'Quizzes 20%, Midterm Project 30%, Final Capstone 50% (thang 100).',
    schema: {
      environment: 'HE_100',
      scaleMax: 100,
      passingScore: 50,
      calculationMethod: 'weighted_average',
      components: [
        {
          id: 'comp_100_quiz',
          name: 'Quizzes & Homework',
          shortCode: 'QZ',
          weight: 20,
          scores: [85, 90],
          isTargetExam: false
        },
        {
          id: 'comp_100_mid',
          name: 'Midterm Project',
          shortCode: 'MID',
          weight: 30,
          scores: [78],
          isTargetExam: false
        },
        {
          id: 'comp_100_fin',
          name: 'Final Capstone',
          shortCode: 'FIN',
          weight: 50,
          scores: [],
          isTargetExam: true
        }
      ]
    }
  },
  CUSTOM: {
    name: 'Tùy chỉnh linh hoạt',
    description: 'Tự do thêm/bớt cột điểm và phân bổ trọng số theo ý bạn.',
    schema: {
      environment: 'CUSTOM',
      scaleMax: 10,
      passingScore: 5.0,
      calculationMethod: 'weighted_average',
      components: [
        {
          id: 'comp_cust_1',
          name: 'Điểm quá trình',
          shortCode: 'QT',
          weight: 40,
          scores: [7.5],
          isTargetExam: false
        },
        {
          id: 'comp_cust_2',
          name: 'Điểm kết thúc',
          shortCode: 'KT',
          weight: 60,
          scores: [],
          isTargetExam: true
        }
      ]
    }
  }
};

// ------------------------------------------------------------------------------
// HELPER CALCULATIONS
// ------------------------------------------------------------------------------

/** Calculate average of scores in a single component */
export function calculateComponentAverage(component: GradeComponent): number | null {
  const validScores = (component.scores || []).filter(s => typeof s === 'number' && !isNaN(s));
  if (validScores.length === 0) return null;
  const sum = validScores.reduce((acc, val) => acc + val, 0);
  return Number((sum / validScores.length).toFixed(2));
}

/** Check total weight sum */
export function getTotalWeight(components: GradeComponent[]): number {
  return Number((components || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0).toFixed(1));
}

/** Auto-normalize component weights to sum exactly to 100% */
export function normalizeWeights(components: GradeComponent[]): GradeComponent[] {
  const total = getTotalWeight(components);
  if (total <= 0) return components;
  return components.map(c => ({
    ...c,
    weight: Number(((c.weight / total) * 100).toFixed(1))
  }));
}

/** Generate user-friendly natural Vietnamese formula description */
export function generateNaturalFormula(schema: GradingSchema): string {
  if (schema.calculationMethod === 'custom_formula' && schema.customFormula) {
    return `Công thức tùy biến: ${schema.customFormula}`;
  }

  const parts = schema.components.map(c => {
    const isMulti = c.scores.length > 1;
    const namePart = isMulti ? `${c.shortCode} trung bình` : c.shortCode;
    return `(${namePart} × ${c.weight}%)`;
  });

  return `Điểm tổng kết = ${parts.join(' + ')}`;
}

/** Validate schema and produce friendly messages */
export function validateGradingSchema(schema: GradingSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const totalWeight = getTotalWeight(schema.components);
  if (Math.abs(totalWeight - 100) > 0.5) {
    issues.push({
      type: 'warning',
      field: 'weights',
      message: `Tổng trọng số hiện tại là ${totalWeight}%. Để tính toán chính xác nhất, tổng trọng số nên bằng 100%.`
    });
  }

  const targetComps = schema.components.filter(c => c.isTargetExam);
  if (targetComps.length === 0) {
    issues.push({
      type: 'error',
      field: 'target',
      message: 'Vui lòng chọn 1 loại điểm để làm mốc dự báo (thường là bài thi Cuối kỳ).'
    });
  } else if (targetComps.length > 1) {
    issues.push({
      type: 'warning',
      field: 'target',
      message: 'Hiện có nhiều hơn 1 cột được đánh dấu làm mốc dự báo. Hệ thống sẽ dự báo cho cột đầu tiên.'
    });
  }

  // Check scores range
  for (const comp of schema.components) {
    for (const score of comp.scores) {
      if (score < 0 || score > schema.scaleMax) {
        issues.push({
          type: 'error',
          field: comp.id,
          message: `Điểm ${score} ở phần "${comp.name}" không hợp lệ (phải từ 0 đến ${schema.scaleMax}).`
        });
      }
    }
  }

  return issues;
}

// ------------------------------------------------------------------------------
// CORE FORECAST & SCENARIO ENGINE
// ------------------------------------------------------------------------------

/**
 * Solve for required score in target component to achieve targetGrade
 */
export function solveForecast(
  schema: GradingSchema,
  targetGrade: number,
  targetComponentId?: string
): ForecastResult {
  const scaleMax = schema.scaleMax || 10;
  const targetComp = 
    schema.components.find(c => c.id === targetComponentId) ||
    schema.components.find(c => c.isTargetExam) ||
    schema.components[schema.components.length - 1];

  if (!targetComp) {
    throw new Error('Không tìm thấy thành phần điểm cần dự báo');
  }

  // Weight ratio of the target component
  const targetWeightRatio = (targetComp.weight || 0) / 100;

  // Other components accumulated weighted contribution
  let otherWeightedSum = 0;
  let otherWeightTotal = 0;
  let otherScoresSum = 0;
  let otherComponentsCount = 0;

  for (const comp of schema.components) {
    if (comp.id === targetComp.id) continue;
    const avg = calculateComponentAverage(comp);
    const effectiveAvg = avg !== null ? avg : 0;
    const wRatio = (comp.weight || 0) / 100;
    otherWeightedSum += effectiveAvg * wRatio;
    otherWeightTotal += wRatio;
    if (avg !== null) {
      otherScoresSum += avg;
      otherComponentsCount++;
    }
  }

  const currentComponentsAverage = otherComponentsCount > 0 
    ? Number((otherScoresSum / otherComponentsCount).toFixed(2)) 
    : 0;

  // If target weight is 0 or invalid, cannot solve
  if (targetWeightRatio <= 0) {
    return {
      targetGrade,
      targetComponent: targetComp,
      requiredScore: 0,
      isAchievable: false,
      difficulty: 'impossible',
      maxPossibleGrade: Number(otherWeightedSum.toFixed(2)),
      currentAccumulatedGrade: Number(otherWeightedSum.toFixed(2)),
      currentComponentsAverage,
      advice: 'Trọng số của cột điểm này bằng 0%, không thể dự báo điểm.',
      naturalFormula: generateNaturalFormula(schema),
      scaleMax
    };
  }

  // Mathematical backward resolution:
  // TargetGrade = otherWeightedSum + (RequiredScore * targetWeightRatio)
  // => RequiredScore = (TargetGrade - otherWeightedSum) / targetWeightRatio
  const requiredRaw = (targetGrade - otherWeightedSum) / targetWeightRatio;
  const requiredScore = Number(requiredRaw.toFixed(1));

  // Maximum possible final grade if user scores full marks (scaleMax) on this exam
  const maxPossibleGrade = Number((otherWeightedSum + scaleMax * targetWeightRatio).toFixed(2));

  // Determine difficulty level & coaching advice
  let difficulty: ForecastResult['difficulty'] = 'moderate';
  let isAchievable = true;
  let advice = '';

  if (requiredScore <= 0) {
    difficulty = 'already_safe';
    isAchievable = true;
    advice = `Điểm quá trình của bạn đã rất xuất sắc! Ngay cả khi làm bài thi này 0 điểm, bạn vẫn an toàn đạt hoặc vượt mục tiêu ${targetGrade}.`;
  } else if (requiredScore <= scaleMax * 0.65) {
    difficulty = 'easy';
    isAchievable = true;
    advice = `Mục tiêu ${targetGrade} hoàn toàn trong tầm tay! Chỉ cần đạt ${requiredScore}/${scaleMax} ở bài ${targetComp.name} là bạn sẽ cán đích an toàn.`;
  } else if (requiredScore <= scaleMax * 0.85) {
    difficulty = 'moderate';
    isAchievable = true;
    advice = `Cần ${requiredScore}/${scaleMax}. Hãy duy trì kế hoạch ôn tập đều đặn, luyện tập đề mẫu để đạt kết quả tốt nhất.`;
  } else if (requiredScore <= scaleMax) {
    difficulty = 'hard';
    isAchievable = true;
    advice = `Thử thách cao! Cần đạt ${requiredScore}/${scaleMax} ở bài ${targetComp.name}. Đòi hỏi sự tập trung tối đa và bứt phá điểm số!`;
  } else {
    difficulty = 'impossible';
    isAchievable = false;
    advice = `Mục tiêu ${targetGrade} vượt quá khả năng thực tế (cần ${requiredScore}/${scaleMax}). Với điểm quá trình hiện tại, điểm tổng kết tối đa bạn có thể đạt là ${maxPossibleGrade}/${scaleMax}.`;
  }

  return {
    targetGrade,
    targetComponent: targetComp,
    requiredScore: Math.max(0, requiredScore),
    isAchievable,
    difficulty,
    maxPossibleGrade,
    currentAccumulatedGrade: Number(otherWeightedSum.toFixed(2)),
    currentComponentsAverage,
    advice,
    naturalFormula: generateNaturalFormula(schema),
    scaleMax
  };
}

/**
 * Generate forward What-If Scenario Matrix
 * Given different scores in the target component (e.g. 5, 6, 7, 8, 9, 10),
 * what will the final grade be?
 */
export function generateScenarios(
  schema: GradingSchema,
  targetComponentId?: string,
  targetGrade?: number
): ScenarioItem[] {
  const scaleMax = schema.scaleMax || 10;
  const targetComp = 
    schema.components.find(c => c.id === targetComponentId) ||
    schema.components.find(c => c.isTargetExam) ||
    schema.components[schema.components.length - 1];

  if (!targetComp) return [];

  const targetWeightRatio = (targetComp.weight || 0) / 100;

  let otherWeightedSum = 0;
  for (const comp of schema.components) {
    if (comp.id === targetComp.id) continue;
    const avg = calculateComponentAverage(comp) || 0;
    otherWeightedSum += avg * ((comp.weight || 0) / 100);
  }

  // Create sample score steps
  const steps: number[] = scaleMax === 100
    ? [50, 60, 70, 75, 80, 85, 90, 95, 100]
    : [4.0, 5.0, 6.0, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

  return steps.map(score => {
    const finalGrade = Number((otherWeightedSum + score * targetWeightRatio).toFixed(2));
    const passed = targetGrade !== undefined ? finalGrade >= targetGrade : finalGrade >= schema.passingScore;

    let classification = 'Trung bình';
    let colorClass = 'text-slate-600 bg-slate-50 dark:bg-slate-800';

    if (scaleMax === 10) {
      if (finalGrade >= 9.0) {
        classification = 'Xuất sắc';
        colorClass = 'text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300';
      } else if (finalGrade >= 8.0) {
        classification = 'Giỏi';
        colorClass = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300';
      } else if (finalGrade >= 6.5) {
        classification = 'Khá';
        colorClass = 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300';
      } else if (finalGrade >= 5.0) {
        classification = 'Trung bình';
        colorClass = 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300';
      } else {
        classification = 'Chưa đạt';
        colorClass = 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300';
      }
    } else {
      if (finalGrade >= 90) {
        classification = 'A (Xuất sắc)';
        colorClass = 'text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300';
      } else if (finalGrade >= 80) {
        classification = 'B (Giỏi)';
        colorClass = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300';
      } else if (finalGrade >= 70) {
        classification = 'C (Khá)';
        colorClass = 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300';
      } else if (finalGrade >= 50) {
        classification = 'D (Trung bình)';
        colorClass = 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300';
      } else {
        classification = 'F (Chưa đạt)';
        colorClass = 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300';
      }
    }

    return {
      examScore: score,
      finalGrade,
      classification,
      passedTarget: passed,
      colorClass
    };
  });
}

// ------------------------------------------------------------------------------
// PERSONAL ACADEMIC PROFILE & GRADE MANAGEMENT LAYER
// ------------------------------------------------------------------------------

export type SubjectGradeStatus = 'good' | 'improving' | 'at_risk' | 'insufficient_data';

export interface AcademicSemester {
  id: string;
  name: string; // e.g. "Học kỳ 1 (2024 - 2025)"
  year: string; // e.g. "2024 - 2025"
  isCurrent?: boolean;
  targetGpa?: number;
}

export interface SubjectGradeRecord {
  subjectId: string;
  semesterId: string;
  credits: number; // Tín chỉ / Hệ số môn học (1-5)
  schema: GradingSchema;
  targetGrade: number;
  notes?: string;
  updatedAt?: string;
}

export interface AcademicProfile {
  id: string;
  userId: string;
  environment: EducationEnvironment;
  schoolName: string;
  programName: string;
  scaleMax: number;
  passingScore: number;
  targetOverallGpa: number;
  semesters: AcademicSemester[];
  currentSemesterId: string;
  subjectGrades: Record<string, SubjectGradeRecord>;
}

export interface SubjectAnalytics {
  subjectId: string;
  currentWeightedGrade: number; // Điểm quá trình dựa trên các thành phần đã có điểm
  completedWeight: number; // Tổng % trọng số đã có điểm
  projectedGrade: number; // Điểm dự báo nếu bài thi cuối đạt targetGrade
  requiredTargetScore: number; // Điểm cần đạt ở bài thi cuối để đạt targetGrade
  isAchievable: boolean;
  status: SubjectGradeStatus;
  statusLabel: string;
  statusColor: string;
  actionAdvice: string;
}

export interface SemesterAnalytics {
  semesterId: string;
  semesterName: string;
  gpa: number;
  targetGpa: number;
  totalCredits: number;
  gradedCredits: number;
  passedCredits: number;
  goodCount: number;
  improvingCount: number;
  atRiskCount: number;
  insufficientCount: number;
  subjectsAnalytics: SubjectAnalytics[];
}

export function calculateSubjectAnalytics(
  record: SubjectGradeRecord,
  scaleMax: number = 10,
  passingScore: number = 5.0
): SubjectAnalytics {
  const schema = record.schema;
  let completedWeight = 0;
  let weightedEarned = 0;

  for (const comp of schema.components) {
    if (comp.scores && comp.scores.length > 0) {
      const avg = calculateComponentAverage(comp) || 0;
      completedWeight += comp.weight || 0;
      weightedEarned += avg * ((comp.weight || 0) / 100);
    }
  }

  // Điểm quá trình quy đổi trên thang điểm
  const currentWeightedGrade = completedWeight > 0
    ? Number((weightedEarned / (completedWeight / 100)).toFixed(2))
    : 0;

  // Giải bài toán dự báo với bài thi mục tiêu
  const targetComp = schema.components.find(c => c.isTargetExam) || schema.components[schema.components.length - 1];
  const forecast = solveForecast(schema, record.targetGrade, targetComp?.id);

  // Điểm dự báo tổng kết (nếu bài cuối đạt targetGrade hoặc điểm trung bình hiện tại)
  const targetWeightRatio = ((targetComp?.weight || 0) / 100);
  const projectedGrade = Number(
    (weightedEarned + (record.targetGrade || currentWeightedGrade || passingScore) * targetWeightRatio).toFixed(2)
  );

  // Xác định trạng thái
  let status: SubjectGradeStatus = 'insufficient_data';
  let statusLabel = 'Chưa có điểm';
  let statusColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let actionAdvice = 'Môn học chưa có điểm đánh giá nào. Hãy nhập điểm các bài kiểm tra đầu tiên.';

  if (completedWeight > 0) {
    if (forecast.difficulty === 'impossible' || (currentWeightedGrade < passingScore && completedWeight >= 50)) {
      status = 'at_risk';
      statusLabel = 'Nguy cơ không đạt';
      statusColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      actionAdvice = `Cần nỗ lực cao độ! Bạn cần tối thiểu ${forecast.requiredScore.toFixed(1)}/${scaleMax} ở bài ${targetComp?.name || 'cuối kỳ'} để đạt mục tiêu.`;
    } else if (forecast.difficulty === 'already_safe' || currentWeightedGrade >= record.targetGrade) {
      status = 'good';
      statusLabel = 'Đang đạt tốt';
      statusColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      actionAdvice = `Phong độ xuất sắc! Bạn đang duy trì mức điểm an toàn và hoàn toàn làm chủ mục tiêu.`;
    } else if (currentWeightedGrade >= passingScore) {
      status = 'improving';
      statusLabel = 'Cần nỗ lực thêm';
      statusColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      actionAdvice = `Bạn cần khoảng ${forecast.requiredScore.toFixed(1)}/${scaleMax} ở bài ${targetComp?.name || 'cuối kỳ'} để cán mốc mục tiêu ${record.targetGrade}.`;
    } else {
      status = 'at_risk';
      statusLabel = 'Cảnh báo điểm';
      statusColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      actionAdvice = `Điểm quá trình đang dưới mức an toàn. Hãy tập trung ôn tập để gỡ điểm.`;
    }
  }

  return {
    subjectId: record.subjectId,
    currentWeightedGrade,
    completedWeight,
    projectedGrade,
    requiredTargetScore: forecast.requiredScore,
    isAchievable: forecast.isAchievable,
    status,
    statusLabel,
    statusColor,
    actionAdvice
  };
}

export function calculateSemesterAnalytics(
  profile: AcademicProfile,
  semesterId: string,
  subjectIdsInSemester: string[]
): SemesterAnalytics {
  const semester = profile.semesters.find(s => s.id === semesterId) || {
    id: semesterId,
    name: 'Học kỳ hiện tại',
    year: '2024 - 2025',
    targetGpa: 8.0
  };

  const records = subjectIdsInSemester
    .map(id => profile.subjectGrades[id])
    .filter(Boolean);

  let totalWeightedGrade = 0;
  let totalCredits = 0;
  let gradedCredits = 0;
  let passedCredits = 0;
  let goodCount = 0;
  let improvingCount = 0;
  let atRiskCount = 0;
  let insufficientCount = 0;

  const subjectsAnalytics: SubjectAnalytics[] = [];

  for (const record of records) {
    const cred = record.credits || 1;
    totalCredits += cred;

    const analytics = calculateSubjectAnalytics(record, profile.scaleMax, profile.passingScore);
    subjectsAnalytics.push(analytics);

    if (analytics.completedWeight > 0) {
      gradedCredits += cred;
      totalWeightedGrade += analytics.currentWeightedGrade * cred;
      if (analytics.currentWeightedGrade >= profile.passingScore) {
        passedCredits += cred;
      }
    }

    if (analytics.status === 'good') goodCount++;
    else if (analytics.status === 'improving') improvingCount++;
    else if (analytics.status === 'at_risk') atRiskCount++;
    else insufficientCount++;
  }

  const gpa = gradedCredits > 0
    ? Number((totalWeightedGrade / gradedCredits).toFixed(2))
    : 0;

  return {
    semesterId,
    semesterName: semester.name,
    gpa,
    targetGpa: semester.targetGpa || profile.targetOverallGpa || 8.0,
    totalCredits,
    gradedCredits,
    passedCredits,
    goodCount,
    improvingCount,
    atRiskCount,
    insufficientCount,
    subjectsAnalytics
  };
}

export function calculateCumulativeGpa(
  profile: AcademicProfile,
  allSubjectIds: string[]
): { gpa: number; totalCredits: number; totalSubjects: number } {
  let totalWeightedGrade = 0;
  let totalGradedCredits = 0;
  let totalCredits = 0;

  for (const id of allSubjectIds) {
    const record = profile.subjectGrades[id];
    if (record) {
      const cred = record.credits || 1;
      totalCredits += cred;
      const analytics = calculateSubjectAnalytics(record, profile.scaleMax, profile.passingScore);
      if (analytics.completedWeight > 0) {
        totalGradedCredits += cred;
        totalWeightedGrade += analytics.currentWeightedGrade * cred;
      }
    }
  }

  return {
    gpa: totalGradedCredits > 0 ? Number((totalWeightedGrade / totalGradedCredits).toFixed(2)) : 0,
    totalCredits,
    totalSubjects: allSubjectIds.length
  };
}

export function createDefaultAcademicProfile(
  userId: string,
  defaultEnv: EducationEnvironment = 'THPT'
): AcademicProfile {
  const preset = GRADE_PRESETS[defaultEnv] || GRADE_PRESETS.THPT;
  const initialSemesterId = 'sem_default_1';

  return {
    id: `profile_${userId || 'current'}`,
    userId: userId || 'current',
    environment: defaultEnv,
    schoolName: defaultEnv === 'DAI_HOC' ? 'Trường Đại học' : 'Trường THPT',
    programName: defaultEnv === 'DAI_HOC' ? 'Hệ Tín chỉ' : 'Khối 12',
    scaleMax: preset.schema.scaleMax || 10,
    passingScore: preset.schema.passingScore || 5.0,
    targetOverallGpa: preset.schema.scaleMax === 100 ? 80 : 8.0,
    semesters: [
      {
        id: initialSemesterId,
        name: 'Học kỳ 1 (2024 - 2025)',
        year: '2024 - 2025',
        isCurrent: true,
        targetGpa: preset.schema.scaleMax === 100 ? 80 : 8.0
      },
      {
        id: 'sem_default_2',
        name: 'Học kỳ 2 (2024 - 2025)',
        year: '2024 - 2025',
        isCurrent: false,
        targetGpa: preset.schema.scaleMax === 100 ? 85 : 8.5
      }
    ],
    currentSemesterId: initialSemesterId,
    subjectGrades: {}
  };
}
