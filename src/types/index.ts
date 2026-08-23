export const DEPARTMENTS = [
  'Lãnh đạo',
  'Phòng Thống kê Tổng hợp',
  'Phòng TCHC',
  'Phòng Thống kê TMDV & Giá',
  'Phòng Thống kê CNXD',
  'Phòng Thống kê NN&XH',
  'Thống kê cơ sở Phố Hiến',
  'Thống kê cơ sở Như Quỳnh',
  'Thống kê cơ sở Yên Mỹ',
  'Thống kê cơ sở Mỹ Hào',
  'Thống kê cơ sở Khoái Châu',
  'Thống kê cơ sở Lương Bằng',
  'Thống kê cơ sở Hoàng Hoa Thám',
  'Thống kê cơ sở Quỳnh Phụ',
  'Thống kê cơ sở Hưng Hà',
  'Thống kê cơ sở Đông Hưng',
  'Thống kê cơ sở Thái Thụy',
  'Thống kê cơ sở Tiền Hải',
  'Thống kê cơ sở Kiến Xương',
  'Thống kê cơ sở Vũ Thư',
] as const;

export type Department = typeof DEPARTMENTS[number] | string;

export interface User {
  id: string;
  fullName: string;
  birthYear?: string;
  joinDate?: string;
  position: string;
  workUnit?: string;
  department: Department | string;
  jobDescription?: string;
  phone?: string;
  email?: string;
  username: string;
  password?: string;
  createdAt: string;
  role?: 'STAFF' | 'DEPT_HEAD' | 'PROVINCE_LEADER' | 'ADMIN';
  isFirstLogin?: boolean;
  passwordChanged?: boolean;
}

export type TaskStatus = 'Chưa hoàn thành' | 'Chưa hoàn thành trễ hạn' | 'Hoàn thành' | 'Hoàn thành trễ hạn';

export interface KpiTask {
  id: string;
  userName: string; // Người/ đơn vị chủ trì
  taskName: string; // Tên công việc
  jobType?: string; // Loại công việc (Kế hoạch tổng cục, Phát sinh, Kế hoạch đơn vị...)
  coopUnit?: string; // Đơn vị phối hợp
  assignedDate?: string; // Ngày giao việc (DD/MM/YYYY)
  planDeadline: string; // Hạn hoàn thành (YYYY-MM-DD or DD/MM/YYYY)
  actualDeadline?: string; // Hạn thực tế
  weight: number; // Trọng số/Điểm số
  scoreCalculated?: number;
  status: TaskStatus | string; // Tình trạng
  lateReason?: string; // Lý do trễ hạn
  daysLate?: number;
  department?: string;
  notes?: string;
  customFields?: Record<string, string | number>;
  categoryGroup?: number;
  maxScore?: number;
  conversionFactor?: number;
  taskGroup?: string;
  detailTask?: string;
}

export interface ColumnMappingConfig {
  userNameCol: string;
  taskNameCol: string;
  planDeadlineCol: string;
  actualDeadlineCol: string;
  weightCol: string;
  customCols: { id: string; label: string; mappedCol: string }[];
}

export interface LateRuleConfig {
  nDaysThreshold: number; // Mặc định 5 ngày
  deductRatioLate: number; // Mặc định 0.25 (25%)
  warningDays: number; // Mặc định 2 ngày
}

export interface SelfAssessmentDoc {
  id: string;
  fileName: string;
  userName: string;
  uploadDate: string;
  extractedContent: string;
  wordCount: number;
  userId?: string;
  periodId?: string;
  status?: string;
  docType?: string;
  createdAt?: string;
}

export type UserRole = 'STAFF' | 'DEPT_HEAD' | 'PROVINCE_LEADER';

export type SubmissionStatus = 'DRAFT' | 'PENDING_DEPT' | 'APPROVED_DEPT' | 'PENDING_PROVINCE' | 'APPROVED_FINAL' | 'REJECTED' | 'RECALLED';

export interface SelfEvalCriterion {
  id: string;
  categoryName: string;
  targetDescription: string;
  plannedDeadline: string;
  actualStatus: string;
  selfScore: number;
  maxScore: number;
}

export interface WorkflowSubmission {
  id: string;
  userId: string;
  userName: string;
  userPosition: string;
  department: string;
  period: string; // e.g. "Kỳ đánh giá Quý IV/2025"
  selfScoreTotal: number;
  criteria: SelfEvalCriterion[];
  selfExplanation?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  // Dept Head review
  deptHeadName?: string;
  deptHeadComment?: string;
  deptHeadScore?: number;
  deptApprovedAt?: string;
  deptHeadId?: string;
  // Province Leader review
  provinceLeaderName?: string;
  provinceLeaderComment?: string;
  finalScore?: number;
  finalApprovedAt?: string;
  provinceLeaderId?: string;
  // Attachments
  attachedFileName?: string;
  selfAssessmentFileUrl?: string; // URL to uploaded self-assessment file
  selfAssessmentFileName?: string;
  // Recall/Retract
  recalledAt?: string;
  recalledBy?: string;
  // Recalculation
  recalculatedAt?: string;
  recalculatedBy?: string;
  // Version for tracking
  version?: number;
}

export interface EvaluationPeriodConfig {
  periodName: string;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  periods?: string[]; // Danh sách các kỳ đã tạo (lưu localStorage)
}

export interface TaskCatalogItem {
  id: string;
  stt: string;
  taskGroup: string; // Nhiệm vụ chính
  detailTask: string; // Công việc chi tiết
  outputProduct: string; // Sản phẩm đầu ra
  categoryGroup: number; // Phân nhóm (1, 2, 3, 4, 5)
  maxScore: number; // Khung điểm tối đa
  evaluatedScore: number; // Điểm chấm
  conversionFactor: number; // Hệ số quy đổi
  notes?: string;
}

export type ActiveTab = 
  | 'dashboard'
  | 'users_list'
  | 'org_chart'
  | 'kpi_tasks'
  | 'kpi_catalog'
  | 'kpi_catalog_lookup'
  | 'kpi_assign'
  | 'kpi_late_rules'
  | 'kpi_rules_doc'
  | 'self_eval_30'
  | 'self_eval_70'
  | 'self_eval_workflow'
  | 'eval_list'
  | 'eval_results'
  | 'eval_lock'
  | 'meeting_register'
  | 'meeting_calendar';


export interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: 'google_meet' | 'offline' | 'polycom' | 'hybrid';
  startDate: string; // ISO string
  endDate: string; // ISO string
  repeat: boolean;
  googleMeetLink?: string;
  attendees: string[]; // emails
  reminders: { type: 'notification' | 'email'; minutesBefore: number }[];
  attachments: { name: string; url: string }[];
  createdAt: string;
}
