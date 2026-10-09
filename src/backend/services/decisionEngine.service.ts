export interface DecisionCriterionInput {
  id: string;
  name: string;
  weight: number; // 1-10
  type?: 'benefit' | 'cost';
  isMustHave?: boolean;
  isDealBreaker?: boolean;
}

export interface DecisionOptionInput {
  id: string;
  name: string;
  description?: string;
  cost?: number;
  pros?: string;
  cons?: string;
  criterionScores?: Record<string, number>; // criterionId -> score (1-10)
  riskLevel?: number; // 1-10
  expectedReturn?: number;
}

export interface DecisionRiskInput {
  id: string;
  optionId: string;
  description: string;
  probability: number; // 1-5
  severity: number; // 1-5
  mitigation?: string;
}

export interface DecisionScenarioInput {
  id: string;
  name: string;
  probability: number; // 0-1
  impactMultiplier: number;
}

export interface DecisionAnalysisResult {
  rankedOptions: Array<{
    optionId: string;
    optionName: string;
    weightedScore: number;
    riskScore: number;
    netScore: number;
    passesConstraints: boolean;
    violatedConstraints: string[];
    costBenefitRatio: number;
  }>;
  recommendedOptionId: string | null;
  matrix: Array<{
    optionId: string;
    scores: Record<string, number>;
  }>;
  summary: string;
}

export class DecisionEngineService {
  /**
   * Evaluate a multi-criteria decision matrix with weights, constraints, and risk scores.
   * All calculations run deterministically on the backend with mathematical rigor.
   */
  static evaluateDecision(payload: {
    criteria: DecisionCriterionInput[];
    options: DecisionOptionInput[];
    risks?: DecisionRiskInput[];
    scenarios?: DecisionScenarioInput[];
  }): DecisionAnalysisResult {
    const { criteria = [], options = [], risks = [] } = payload;

    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 1), 0) || 1;

    const rankedOptions = options.map(option => {
      let weightedSum = 0;
      const violatedConstraints: string[] = [];
      const scores = option.criterionScores || {};

      criteria.forEach(crit => {
        const rawScore = scores[crit.id] ?? 5; // default scale 1-10

        // Check Must-Have / Deal-Breaker constraints
        if (crit.isMustHave && rawScore < 5) {
          violatedConstraints.push(`Không đạt tiêu chí bắt buộc: "${crit.name}" (Điểm: ${rawScore}/10)`);
        }
        if (crit.isDealBreaker && rawScore < 3) {
          violatedConstraints.push(`Vi phạm điều kiện loại trừ: "${crit.name}" (Điểm: ${rawScore}/10)`);
        }

        const normalizedScore = crit.type === 'cost' ? (11 - rawScore) : rawScore;
        weightedSum += normalizedScore * (crit.weight || 1);
      });

      const weightedScore = parseFloat((weightedSum / totalWeight).toFixed(2));

      // Calculate Option Risk Score from attached risks
      const optionRisks = risks.filter(r => r.optionId === option.id);
      let calculatedRisk = 0;
      if (optionRisks.length > 0) {
        calculatedRisk = optionRisks.reduce((sum, r) => sum + (r.probability * r.severity), 0) / (optionRisks.length * 25);
      } else {
        calculatedRisk = ((option.riskLevel || 3) / 10);
      }
      const riskScore = parseFloat((calculatedRisk * 10).toFixed(2));

      // Net score accounts for risk penalty
      const passesConstraints = violatedConstraints.length === 0;
      const penalty = passesConstraints ? 0 : 5;
      const netScore = Math.max(0, parseFloat((weightedScore - (riskScore * 0.25) - penalty).toFixed(2)));

      const cost = option.cost || 1;
      const costBenefitRatio = parseFloat((netScore / (cost > 0 ? Math.log10(cost + 10) : 1)).toFixed(3));

      return {
        optionId: option.id,
        optionName: option.name,
        weightedScore,
        riskScore,
        netScore,
        passesConstraints,
        violatedConstraints,
        costBenefitRatio
      };
    });

    // Sort descending by net score
    rankedOptions.sort((a, b) => b.netScore - a.netScore);

    const eligible = rankedOptions.filter(o => o.passesConstraints);
    const recommendedOptionId = eligible.length > 0 ? eligible[0].optionId : (rankedOptions[0]?.optionId || null);

    const recommendedOption = rankedOptions.find(o => o.optionId === recommendedOptionId);
    let summary = '';
    if (recommendedOption) {
      if (recommendedOption.passesConstraints) {
        summary = `Lựa chọn tối ưu nhất theo ma trận trọng số là "${recommendedOption.optionName}" với điểm tổng hợp ${recommendedOption.netScore}/10, rủi ro đánh giá ${recommendedOption.riskScore}/10 và thỏa mãn toàn bộ tiêu chí cốt lõi.`;
      } else {
        summary = `Cảnh báo: Lựa chọn "${recommendedOption.optionName}" đạt điểm cao nhất nhưng có điều kiện ràng buộc chưa thỏa mãn (${recommendedOption.violatedConstraints.join(', ')}).`;
      }
    } else {
      summary = 'Chưa có đủ phương án hoặc tiêu chí để tính toán ma trận quyết định.';
    }

    const matrix = options.map(o => ({
      optionId: o.id,
      scores: o.criterionScores || {}
    }));

    return {
      rankedOptions,
      recommendedOptionId,
      matrix,
      summary
    };
  }
}
