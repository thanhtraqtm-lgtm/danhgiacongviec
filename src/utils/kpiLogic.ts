import { KpiTask, LateRuleConfig, TaskStatus } from '../types';

export const DEFAULT_LATE_CONFIG: LateRuleConfig = {
  nDaysThreshold: 5,
  deductRatioLate: 0.25,
  warningDays: 2,
};

export type EvaluationClassification = 'XuatSac' | 'Tot' | 'HoanThanh' | 'KhongHoanThanh';

export interface EvaluationResult {
  totalScore: number;
  classification: EvaluationClassification;
  classificationLabel: string;
  isUnder100Percent: boolean;
  quantityPct: number;
  qualityPct: number;
  timelinePct: number;
  taskExecutionScore: number;
  generalCriteriaScore: number;
}

/**
 * Normalize an arbitrary status string (from Excel import, form input, etc.)
 * to one of the canonical TaskStatus values:
 *   'Hoàn thành' | 'Hoàn thành trễ hạn' | 'Chưa hoàn thành' | 'Chưa hoàn thành trễ hạn'
 */
export function normalizeTaskStatus(raw: string | undefined | null): TaskStatus {
  if (!raw) return 'Chưa hoàn thành';
  const s = (raw || '')
    .normalize('NFC')
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!s) return 'Chưa hoàn thành';

  const noAccent = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'd');

  const hasChua = s.includes('chưa') || s.includes('chua') || noAccent.includes('chua');
  const hasTre = s.includes('trễ') || s.includes('tre') || noAccent.includes('tre') || s.includes('muộn') || s.includes('muon');
  const hasHoanThanh = s.includes('hoàn thành') || s.includes('hoan thanh') || noAccent.includes('hoan thanh');

  if (hasChua && hasTre) return 'Chưa hoàn thành trễ hạn';
  if (s === 'tre han' || s === 'trễ hạn' || s === 'tre' || s === 'chua xong tre' || s === 'chtt' || s === 'chtt ') {
    return 'Chưa hoàn thành trễ hạn';
  }

  if (
    hasChua ||
    s.includes('chưa xong') || s.includes('chua xong') ||
    s === 'đang làm' || s === 'dang lam' || s === 'đang xử lý' || s === 'dang xu ly' ||
    s === 'in progress' || s === 'pending' || s === 'chua' || s === 'cht'
  ) {
    return 'Chưa hoàn thành';
  }

  if (hasHoanThanh && hasTre) return 'Hoàn thành trễ hạn';
  if (/^htt\b/.test(s) || s === 'ht tre' || s === 'ht tre han' || s === 'hoan thanh tre') {
    return 'Hoàn thành trễ hạn';
  }
  if ((s.includes('đã') || s.includes('da ')) && hasHoanThanh && hasTre) {
    return 'Hoàn thành trễ hạn';
  }

  if (
    hasHoanThanh ||
    s.includes('đã hoàn thành') || s.includes('da hoan thanh') ||
    s === 'ht' || s === 'xong' || s === 'đã xong' || s === 'da xong' ||
    s === 'done' || s === 'complete' || s === 'completed' || s === 'finished' ||
    s.includes('đúng hạn') || s.includes('dung han') || noAccent.includes('dung han')
  ) {
    return 'Hoàn thành';
  }

  return 'Chưa hoàn thành';
}

/**
 * Computes individual task KPI status and score based on deadline rule:
 * - Completed on time: full score
 * - Completed late <= nDaysThreshold: -25% score
 * - Completed late > nDaysThreshold: 0 score
 * - Not completed, not late: full score (still in progress)
 * - Not completed, late <= nDaysThreshold: -25% score
 * - Not completed, late > nDaysThreshold: 0 score
 */
export function evaluateTaskKpi(
  task: Partial<KpiTask>,
  config: LateRuleConfig = DEFAULT_LATE_CONFIG
): { status: TaskStatus; scoreCalculated: number; daysLate: number } {
  const weight = task.weight ?? 100;
  const planStr = task.planDeadline;
  const actualStr = task.actualDeadline;

  if (!planStr) {
    return { status: actualStr ? 'Hoàn thành' : 'Chưa hoàn thành', scoreCalculated: weight, daysLate: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const comparisonDate = actualStr || todayStr;

  const planDate = new Date(planStr);
  const actualOrTodayDate = new Date(comparisonDate);
  planDate.setHours(0, 0, 0, 0);
  actualOrTodayDate.setHours(0, 0, 0, 0);

  const daysLate = Math.floor((actualOrTodayDate.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24));

  if (actualStr) {
    if (daysLate <= 0) {
      return { status: 'Hoàn thành', scoreCalculated: weight, daysLate: 0 };
    } else {
      let score = weight;
      if (daysLate <= config.nDaysThreshold) {
        score = Math.max(0, weight - (weight * config.deductRatioLate));
      } else {
        score = 0;
      }
      return { status: 'Hoàn thành trễ hạn', scoreCalculated: Number(score.toFixed(1)), daysLate };
    }
  } else {
    if (daysLate <= 0) {
      return { status: 'Chưa hoàn thành', scoreCalculated: weight, daysLate: 0 };
    } else {
      let score = weight;
      if (daysLate <= config.nDaysThreshold) {
        score = Math.max(0, weight - (weight * config.deductRatioLate));
      } else {
        score = 0;
      }
      return { status: 'Chưa hoàn thành trễ hạn', scoreCalculated: Number(score.toFixed(1)), daysLate };
    }
  }
}

/**
 * Classification label mapping
 */
export function getClassificationLabel(classification: EvaluationClassification): string {
  switch (classification) {
    case 'XuatSac': return 'Hoàn thành xuất sắc nhiệm vụ';
    case 'Tot': return 'Hoàn thành tốt nhiệm vụ';
    case 'HoanThanh': return 'Hoàn thành nhiệm vụ';
    case 'KhongHoanThanh': return 'Không hoàn thành nhiệm vụ';
    default: return 'Không xác định';
  }
}

/**
 * Determine classification based on total score (100-point scale)
 * Per Nghị định 335/2025/NĐ-CP Điều 20
 */
export function classifyByScore(totalScore: number): EvaluationClassification {
  if (totalScore >= 90) return 'XuatSac';
  if (totalScore >= 70) return 'Tot';
  if (totalScore >= 50) return 'HoanThanh';
  return 'KhongHoanThanh';
}

/**
 * Main evaluation function implementing quy định:
 * - Công thức: (a + b + c) / 3 cho công chức, (a+b+c+d+đ+e)/6 cho lãnh đạo
 * - a = % số lượng, b = % chất lượng, c = % tiến độ
 * - Điểm nhiệm vụ = taskExecutionScore / 100 * 70
 * - Tổng điểm = Điểm nhiệm vụ (70%) + Điểm tiêu chí chung (30%)
 * - QUAN TRỌNG: Nếu quantityPct < 100% → tự động "Không hoàn thành nhiệm vụ" (<50đ)
 */
export function evaluateOverallKPI(
  quantityPct: number,
  qualityPct: number,
  timelinePct: number,
  generalCriteriaScore: number,
  isLeader: boolean = false,
  dPct?: number,
  ddPct?: number,
  ePct?: number
): EvaluationResult {
  const taskExecutionScore = isLeader && dPct !== undefined && ddPct !== undefined && ePct !== undefined
    ? (quantityPct + qualityPct + timelinePct + dPct + ddPct + ePct) / 6
    : (quantityPct + qualityPct + timelinePct) / 3;

  const weightedTask70 = (taskExecutionScore / 100) * 70;
  let totalScore = weightedTask70 + generalCriteriaScore;

  // Quy định Điều 7: Hoàn thành dưới 100% nhiệm vụ → "Không hoàn thành nhiệm vụ"
  const isUnder100Percent = quantityPct < 100;
  if (isUnder100Percent) {
    totalScore = Math.min(totalScore, 49);
  }

  const classification = classifyByScore(totalScore);

  return {
    totalScore: Number(totalScore.toFixed(2)),
    classification,
    classificationLabel: getClassificationLabel(classification),
    isUnder100Percent,
    quantityPct: Number(quantityPct.toFixed(2)),
    qualityPct: Number(qualityPct.toFixed(2)),
    timelinePct: Number(timelinePct.toFixed(2)),
    taskExecutionScore: Number(taskExecutionScore.toFixed(2)),
    generalCriteriaScore: Number(generalCriteriaScore.toFixed(2)),
  };
}

/**
 * Compute conversion factor per Danh mục công việc (File 5)
 * Hệ số quy đổi = Điểm chấm / 5
 */
export function computeConversionFactor(evalScore: number): number {
  return Number((evalScore / 5).toFixed(2));
}