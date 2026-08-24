import { User, KpiTask, LateRuleConfig, SelfAssessmentDoc, WorkflowSubmission, EvaluationPeriodConfig, DEPARTMENTS, WeeklySchedule } from '../types';
import { DEFAULT_LATE_CONFIG, evaluateTaskKpi } from './kpiLogic';

const STORAGE_KEYS = {
  USERS: 'kpi_admin_users_v6',
  TASKS: 'kpi_admin_tasks_v5',
  CONFIG: 'kpi_admin_late_config_v1',
  DOCS: 'kpi_admin_self_docs_v2',
  WORKFLOW: 'kpi_admin_workflow_subs_v4',
  PERIOD: 'kpi_admin_period_config_v1',
};

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    fullName: 'Quản trị viên Hệ thống',
    position: 'Quản trị hệ thống',
    department: 'Lãnh đạo',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'admin',
    password: 'admin123',
    role: 'ADMIN',
    email: 'admin@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_truyen_dt',
    fullName: 'Đào Trọng Truyền',
    position: 'Cục trưởng',
    department: 'Lãnh đạo',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'truyen.dt',
    password: '123456',
    role: 'PROVINCE_LEADER',
    email: 'truyen.dt@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_phu_dx',
    fullName: 'Đỗ Xuân Phú',
    position: 'Phó Cục trưởng',
    department: 'Lãnh đạo',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'phu.dx',
    password: '123456',
    role: 'PROVINCE_LEADER',
    email: 'phu.dx@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_thao_nth',
    fullName: 'Nguyễn Thị Hoài Thảo',
    position: 'Phó Cục trưởng',
    department: 'Lãnh đạo',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'thao.nth',
    password: '123456',
    role: 'PROVINCE_LEADER',
    email: 'thao.nth@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_minh_nd',
    fullName: 'Nguyễn Duy Minh',
    position: 'Phó Cục trưởng',
    department: 'Lãnh đạo',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'minh.nd',
    password: '123456',
    role: 'PROVINCE_LEADER',
    email: 'minh.nd@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_thang_bv',
    fullName: 'Bùi Văn Thắng',
    position: 'Nhân viên',
    department: 'Phòng Thống kê Tổng hợp',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'thang.bv',
    password: '123456',
    role: 'STAFF',
    email: 'thang.bv@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_long_vv',
    fullName: 'Vũ Văn Long',
    position: 'Trưởng phòng',
    department: 'Phòng TCHC',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'long.vv',
    password: '123456',
    role: 'DEPT_HEAD',
    email: 'long.vv@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_mai_ht',
    fullName: 'Hoàng Thị Mai',
    position: 'Trưởng phòng',
    department: 'Phòng Thống kê TMDV & Giá',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'mai.ht',
    password: '123456',
    role: 'DEPT_HEAD',
    email: 'mai.ht@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_ha_lt',
    fullName: 'Lê Thị Thu Hà',
    position: 'Trưởng phòng',
    department: 'Phòng Thống kê NN&XH',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'ha.lt',
    password: '123456',
    role: 'DEPT_HEAD',
    email: 'ha.lt@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_anh_nv',
    fullName: 'Nguyễn Văn Anh',
    position: 'Chi cục trưởng',
    department: 'Thống kê cơ sở Phố Hiến',
    workUnit: 'Thống kê cơ sở Phố Hiến',
    username: 'anh.nv',
    password: '123456',
    role: 'DEPT_HEAD',
    email: 'anh.nv@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_lan_nt',
    fullName: 'Nguyễn Thị Lan',
    position: 'Thống kê viên',
    department: 'Phòng Thống kê Tổng hợp',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'lan.nt',
    password: '123456',
    role: 'STAFF',
    email: 'lan.nt@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_thanh_nv',
    fullName: 'Nguyễn Văn Thành',
    position: 'Thống kê viên',
    department: 'Phòng Thống kê TMDV & Giá',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'thanh.nv',
    password: '123456',
    role: 'STAFF',
    email: 'thanh.nv@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_linh_pm',
    fullName: 'Phạm Mai Linh',
    position: 'Chuyên viên',
    department: 'Phòng TCHC',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'linh.pm',
    password: '123456',
    role: 'STAFF',
    email: 'linh.pm@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_dung_pt',
    fullName: 'Phan Thị Dung',
    position: 'Thống kê viên',
    department: 'Phòng Thống kê NN&XH',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'dung.pt',
    password: '123456',
    role: 'STAFF',
    email: 'dung.pt@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_hoa_tt',
    fullName: 'Trần Thị Hoa',
    position: 'Thống kê viên',
    department: 'Thống kê cơ sở Phố Hiến',
    workUnit: 'Thống kê cơ sở Phố Hiến',
    username: 'hoa.tt',
    password: '123456',
    role: 'STAFF',
    email: 'hoa.tt@hungyen.gso.gov.vn',
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

export const INITIAL_TASKS: KpiTask[] = [];

export const INITIAL_DOCS: SelfAssessmentDoc[] = [];

// Helper functions for storage
export function getStoredUsers(): User[] {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  let parsed: User[] = [];
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    parsed = INITIAL_USERS;
  } else {
    try {
      parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        parsed = INITIAL_USERS;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      }
    } catch {
      parsed = INITIAL_USERS;
    }
  }

  // Ensure every user has username, password and role
  const normalized = parsed.map((u, idx) => {
    let username = u.username;
    if (!username) {
      const parts = (u.fullName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim().split(/\s+/);
      if (parts.length > 1) {
        const last = parts[parts.length - 1];
        const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
        username = `${last}.${initials}`;
      } else {
        username = `user_${idx + 1}`;
      }
    }
    
    let role = u.role;
    const pos = (u.position || '').toLowerCase();
    const dept = (u.department || '').toLowerCase();
    
    if (u.username === 'admin' || role === 'ADMIN') {
      role = 'ADMIN';
    } else if (
      dept.includes('lãnh đạo') || 
      pos.includes('cục trưởng') || 
      pos.includes('phó cục trưởng') || 
      pos.includes('lãnh đạo cục') ||
      pos.includes('ban lãnh đạo')
    ) {
      role = 'PROVINCE_LEADER';
    } else if (
      pos.includes('trưởng phòng') || 
      pos.includes('phó trưởng phòng') || 
      pos.includes('chi cục trưởng') || 
      pos.includes('phó chi cục trưởng') || 
      pos.includes('phụ trách') || 
      pos.includes('trưởng')
    ) {
      role = 'DEPT_HEAD';
    } else if (!role) {
      role = 'STAFF';
    }

    return {
      ...u,
      username,
      password: u.password || '123456',
      role
    };
  });

  return normalized;
}


function safeSetItem(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      alert('Dữ liệu quá lớn, vượt quá giới hạn bộ nhớ cục bộ (5MB). Vui lòng xóa bớt một số dữ liệu hoặc chia nhỏ file để tiếp tục lưu.');
    }
  }
}

export function saveUsers(users: User[]): void {
  safeSetItem(STORAGE_KEYS.USERS, users);
}

export function getStoredTasks(): KpiTask[] {
  const data = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TASKS;
  }
}

export function saveTasks(tasks: KpiTask[]): void {
  safeSetItem(STORAGE_KEYS.TASKS, tasks);
}

export function getStoredLateConfig(): LateRuleConfig {
  const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_LATE_CONFIG));
    return DEFAULT_LATE_CONFIG;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_LATE_CONFIG;
  }
}

export function saveLateConfig(config: LateRuleConfig): void {
  safeSetItem(STORAGE_KEYS.CONFIG, config);
  // Re-evaluate stored tasks when rule changes.
  // QUAN TRỌNG: chỉ cập nhật scoreCalculated và daysLate theo quy tắc mới,
  // KHÔNG override status gốc từ Excel — status là nguồn sự thật duy nhất.
  const tasks = getStoredTasks();
  const updatedTasks = tasks.map(task => {
    const evalRes = evaluateTaskKpi(task, config);
    return {
      ...task,
      // Giữ nguyên status gốc, chỉ cập nhật điểm và số ngày trễ
      scoreCalculated: evalRes.scoreCalculated,
      daysLate: evalRes.daysLate,
    };
  });
  saveTasks(updatedTasks);
}

export const INITIAL_SUBMISSIONS: WorkflowSubmission[] = [];

export const INITIAL_PERIOD_CONFIG: EvaluationPeriodConfig = {
  periodName: 'Kỳ đánh giá Quý IV/2025 & Cả năm 2025',
  isLocked: false,
  periods: [
    'Năm công tác 2025-2026',
    'Quý IV năm 2025',
    'Quý I năm 2026',
    'Quý II năm 2026',
    'Quý III năm 2026',
    'Tháng 12 năm 2025',
    'Tháng 11 năm 2025',
    'Tháng 10 năm 2025',
  ],
};

export function getStoredDocs(): SelfAssessmentDoc[] {
  const data = localStorage.getItem(STORAGE_KEYS.DOCS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(INITIAL_DOCS));
    return INITIAL_DOCS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DOCS;
  }
}

export function saveDocs(docs: SelfAssessmentDoc[]): void {
  safeSetItem(STORAGE_KEYS.DOCS, docs);
}

export function getStoredSubmissions(): WorkflowSubmission[] {
  const data = localStorage.getItem(STORAGE_KEYS.WORKFLOW);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.WORKFLOW, JSON.stringify(INITIAL_SUBMISSIONS));
    return INITIAL_SUBMISSIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export function saveSubmissions(subs: WorkflowSubmission[]): void {
  safeSetItem(STORAGE_KEYS.WORKFLOW, subs);
}

export function getStoredPeriodConfig(): EvaluationPeriodConfig {
  const data = localStorage.getItem(STORAGE_KEYS.PERIOD);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(INITIAL_PERIOD_CONFIG));
    return INITIAL_PERIOD_CONFIG;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_PERIOD_CONFIG;
  }
}

export function savePeriodConfig(cfg: EvaluationPeriodConfig): void {
  safeSetItem(STORAGE_KEYS.PERIOD, cfg);
}

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.DOCS);
  localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
  localStorage.removeItem(STORAGE_KEYS.PERIOD);
  localStorage.removeItem('kpi_admin_forms_v1');
  localStorage.removeItem('kpi_admin_task_catalog_v1');
  localStorage.removeItem('kpi_admin_meetings_v1');
  localStorage.removeItem(WEEKLY_SCHEDULE_KEY);
  
  // Seed back initial
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_LATE_CONFIG));
  localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(INITIAL_DOCS));
  localStorage.setItem(STORAGE_KEYS.WORKFLOW, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(INITIAL_PERIOD_CONFIG));
  localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(INITIAL_WEEKLY_SCHEDULES));
}

export const INITIAL_MEETINGS: any[] = [];

export function getStoredMeetings(): any[] {
  try {
    const raw = localStorage.getItem('kpi_admin_meetings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Silently ignore localStorage read errors
  }
  return [];
}
export function saveMeetings(meetings: any[]): void {
  try {
    localStorage.setItem('kpi_admin_meetings_v1', JSON.stringify(meetings));
  } catch {
    // Silently ignore localStorage write errors
  }
}

// Weekly Schedule Storage
const WEEKLY_SCHEDULE_KEY = 'kpi_admin_weekly_schedule_v1';

// Demo data for 2 weeks (current week + next week)
function generateDemoWeeklySchedules(): WeeklySchedule[] {
  const now = new Date();
  const currentWeekStart = new Date(now);
  const day = currentWeekStart.getDay();
  const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
  currentWeekStart.setDate(diff);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  
  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  
  const nextWeekEndDate = new Date(nextWeekStart);
  nextWeekEndDate.setDate(nextWeekEndDate.getDate() + 6);
  nextWeekEndDate.setHours(23, 59, 59, 999);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const demo: WeeklySchedule[] = [
    // ========== TUẦN HIỆN TẠI ==========
    // Lãnh đạo Cục - Tuần này
    {
      id: 'ws_demo_1',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Đào Trọng Truyền',
      userPosition: 'Cục trưởng',
      dayOfWeek: 0,
      date: formatDate(new Date(currentWeekStart.getTime() + 0 * 86400000)),
      taskName: 'Họp BCH, Họp giao ban tháng',
      taskType: 'Họp',
      location: 'Trụ sở chính',
      notes: 'Họp định kỳ 8h00',
      status: 'Đã hoàn thành',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_2',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Đào Trọng Truyền',
      userPosition: 'Cục trưởng',
      dayOfWeek: 2,
      date: formatDate(new Date(currentWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Họp UBND tỉnh',
      taskType: 'Họp',
      location: 'P207 UBND tỉnh',
      notes: 'Họp 13h30',
      status: 'Đang thực hiện',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_3',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Đỗ Xuân Phú',
      userPosition: 'Phó Cục trưởng',
      dayOfWeek: 1,
      date: formatDate(new Date(currentWeekStart.getTime() + 1 * 86400000)),
      taskName: 'Họp Đảng ủy Khối DN',
      taskType: 'Họp',
      location: 'HT Đảng ủy Khối',
      notes: 'Họp 8h00',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_4',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Thị Hoài Thảo',
      userPosition: 'Phó Cục trưởng',
      dayOfWeek: 2,
      date: formatDate(new Date(currentWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Dự Lễ kỷ niệm ngày thành lập CAND',
      taskType: 'Công tác',
      location: 'HT Công an tỉnh',
      notes: '8h00',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_5',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Duy Minh',
      userPosition: 'Phó Cục trưởng',
      dayOfWeek: 3,
      date: formatDate(new Date(currentWeekStart.getTime() + 3 * 86400000)),
      taskName: 'Công tác kiểm tra cơ sở',
      taskType: 'Công tác',
      location: 'Thống kê cơ sở Phố Hiến',
      notes: 'Kiểm tra định kỳ',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Phòng Thống kê Tổng hợp - Tuần này
    {
      id: 'ws_demo_6',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê Tổng hợp',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Bùi Văn Thắng',
      userPosition: 'Nhân viên',
      dayOfWeek: 1,
      date: formatDate(new Date(currentWeekStart.getTime() + 1 * 86400000)),
      taskName: 'Công tác kiểm tra cơ sở',
      taskType: 'Công tác',
      location: 'Thống kê cơ sở Phố Hiến',
      notes: 'Kiểm tra định kỳ',
      status: 'Đang thực hiện',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_7',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê Tổng hợp',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Thị Lan',
      userPosition: 'Thống kê viên',
      dayOfWeek: 2,
      date: formatDate(new Date(currentWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Làm việc tại cơ sở',
      taskType: 'Làm việc tại cơ quan',
      location: 'Trụ sở chính',
      notes: 'Báo cáo tháng',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_8',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê Tổng hợp',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Bùi Văn Thắng',
      userPosition: 'Nhân viên',
      dayOfWeek: 4,
      date: formatDate(new Date(currentWeekStart.getTime() + 4 * 86400000)),
      taskName: 'Đào tạo nghiệp vụ phần mềm mới',
      taskType: 'Đào tạo',
      location: 'Trung tâm đào tạo',
      notes: 'Đào tạo 8h-17h',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Phòng TCHC - Tuần này
    {
      id: 'ws_demo_9',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng TCHC',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Vũ Văn Long',
      userPosition: 'Trưởng phòng',
      dayOfWeek: 0,
      date: formatDate(new Date(currentWeekStart.getTime() + 0 * 86400000)),
      taskName: 'Họp định kỳ phòng',
      taskType: 'Họp',
      location: 'Phòng họp TCHC',
      notes: 'Họp 8h30',
      status: 'Đã hoàn thành',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_10',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng TCHC',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Phạm Mai Linh',
      userPosition: 'Chuyên viên',
      dayOfWeek: 3,
      date: formatDate(new Date(currentWeekStart.getTime() + 3 * 86400000)),
      taskName: 'Công tác tuyển dụng',
      taskType: 'Công tác',
      location: 'Trường Đại học Thống kê',
      notes: 'Tuyển sinh năm 2025',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Phòng TMDV & Giá - Tuần này
    {
      id: 'ws_demo_11',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê TMDV & Giá',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Hoàng Thị Mai',
      userPosition: 'Trưởng phòng',
      dayOfWeek: 1,
      date: formatDate(new Date(currentWeekStart.getTime() + 1 * 86400000)),
      taskName: 'Họp ngành TMDV',
      taskType: 'Họp',
      location: 'Sở Công Thương',
      notes: 'Họp 9h00',
      status: 'Đã hoàn thành',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_12',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê TMDV & Giá',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Văn Thành',
      userPosition: 'Thống kê viên',
      dayOfWeek: 4,
      date: formatDate(new Date(currentWeekStart.getTime() + 4 * 86400000)),
      taskName: 'Khảo sát giá tiêu dùng',
      taskType: 'Công tác',
      location: 'Chợ đầu mối',
      notes: 'Khảo sát 7h-11h',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Phòng NN&XH - Tuần này
    {
      id: 'ws_demo_13',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê NN&XH',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Lê Thị Thu Hà',
      userPosition: 'Trưởng phòng',
      dayOfWeek: 2,
      date: formatDate(new Date(currentWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Họp phối hợp Sở Nông nghiệp',
      taskType: 'Họp',
      location: 'Sở NN&PTNT',
      notes: 'Họp 10h00',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_14',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Phòng Thống kê NN&XH',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Phan Thị Dung',
      userPosition: 'Thống kê viên',
      dayOfWeek: 5,
      date: formatDate(new Date(currentWeekStart.getTime() + 5 * 86400000)),
      taskName: 'Điều tra hộ gia đình',
      taskType: 'Công tác',
      location: 'Huyện Văn Giang',
      notes: 'Điều tra 40 hộ',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Thống kê cơ sở Phố Hiến - Tuần này
    {
      id: 'ws_demo_15',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Thống kê cơ sở Phố Hiến',
      workUnit: 'Thống kê cơ sở Phố Hiến',
      userName: 'Nguyễn Văn Anh',
      userPosition: 'Chi cục trưởng',
      dayOfWeek: 0,
      date: formatDate(new Date(currentWeekStart.getTime() + 0 * 86400000)),
      taskName: 'Họp chi cục',
      taskType: 'Họp',
      location: 'Phòng họp cơ sở',
      notes: 'Họp 8h00',
      status: 'Đã hoàn thành',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_16',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Thống kê cơ sở Phố Hiến',
      workUnit: 'Thống kê cơ sở Phố Hiến',
      userName: 'Trần Thị Hoa',
      userPosition: 'Thống kê viên',
      dayOfWeek: 2,
      date: formatDate(new Date(currentWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Làm việc tại cơ sở',
      taskType: 'Làm việc tại cơ quan',
      location: 'Thống kê cơ sở Phố Hiến',
      notes: 'Báo cáo quý',
      status: 'Đang thực hiện',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_17',
      weekStartDate: formatDate(currentWeekStart),
      weekEndDate: formatDate(weekEndDate),
      department: 'Thống kê cơ sở Phố Hiến',
      workUnit: 'Thống kê cơ sở Phố Hiến',
      userName: 'Nguyễn Văn Anh',
      userPosition: 'Chi cục trưởng',
      dayOfWeek: 4,
      date: formatDate(new Date(currentWeekStart.getTime() + 4 * 86400000)),
      taskName: 'Công tác kiểm tra doanh nghiệp',
      taskType: 'Công tác',
      location: 'KCN Pho Noi',
      notes: 'Kiểm tra 5 doanh nghiệp',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // ========== TUẦN TIẾP THEO ==========
    // Lãnh đạo Cục - Tuần sau
    {
      id: 'ws_demo_18',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Đào Trọng Truyền',
      userPosition: 'Cục trưởng',
      dayOfWeek: 0,
      date: formatDate(new Date(nextWeekStart.getTime() + 0 * 86400000)),
      taskName: 'Họp BCH định kỳ tuần',
      taskType: 'Họp',
      location: 'Trụ sở chính',
      notes: 'Họp 8h00',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_19',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Đỗ Xuân Phú',
      userPosition: 'Phó Cục trưởng',
      dayOfWeek: 1,
      date: formatDate(new Date(nextWeekStart.getTime() + 1 * 86400000)),
      taskName: 'Công tác công tác tỉnh láng giềng',
      taskType: 'Công tác',
      location: 'Thống kê tỉnh Hải Dương',
      notes: 'Trao đổi kinh nghiệm',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_20',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Thị Hoài Thảo',
      userPosition: 'Phó Cục trưởng',
      dayOfWeek: 2,
      date: formatDate(new Date(nextWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Họp đào tạo cán bộ',
      taskType: 'Đào tạo',
      location: 'Học viện Hành chính',
      notes: 'Đào tạo 2 ngày',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_21',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Lãnh đạo',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Duy Minh',
      userPosition: 'Phó Cục trưởng',
      dayOfWeek: 3,
      date: formatDate(new Date(nextWeekStart.getTime() + 3 * 86400000)),
      taskName: 'Kiểm tra cơ sở huyện',
      taskType: 'Công tác',
      location: 'Thống kê cơ sở Mỹ Hào',
      notes: 'Kiểm tra định kỳ',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Phòng Tổng hợp - Tuần sau
    {
      id: 'ws_demo_22',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Phòng Thống kê Tổng hợp',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Bùi Văn Thắng',
      userPosition: 'Nhân viên',
      dayOfWeek: 1,
      date: formatDate(new Date(nextWeekStart.getTime() + 1 * 86400000)),
      taskName: 'Họp tổng hợp báo cáo quý',
      taskType: 'Họp',
      location: 'Phòng họp A',
      notes: 'Họp 9h00',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_23',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Phòng Thống kê Tổng hợp',
      workUnit: 'Thống kê tỉnh Hưng Yên',
      userName: 'Nguyễn Thị Lan',
      userPosition: 'Thống kê viên',
      dayOfWeek: 3,
      date: formatDate(new Date(nextWeekStart.getTime() + 3 * 86400000)),
      taskName: 'Công tác thu thập dữ liệu',
      taskType: 'Công tác',
      location: 'Các cơ sở huyện',
      notes: 'Thu thập dữ liệu GDDP',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    
    // Thống kê cơ sở Phố Hiến - Tuần sau
    {
      id: 'ws_demo_24',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Thống kê cơ sở Phố Hiến',
      workUnit: 'Thống kê cơ sở Phố Hiến',
      userName: 'Nguyễn Văn Anh',
      userPosition: 'Chi cục trưởng',
      dayOfWeek: 0,
      date: formatDate(new Date(nextWeekStart.getTime() + 0 * 86400000)),
      taskName: 'Họp chi cục tuần',
      taskType: 'Họp',
      location: 'Phòng họp cơ sở',
      notes: 'Họp 8h00',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
    {
      id: 'ws_demo_25',
      weekStartDate: formatDate(nextWeekStart),
      weekEndDate: formatDate(nextWeekEndDate),
      department: 'Thống kê cơ sở Phố Hiến',
      workUnit: 'Thống kê cơ sở Phố Hiến',
      userName: 'Trần Thị Hoa',
      userPosition: 'Thống kê viên',
      dayOfWeek: 2,
      date: formatDate(new Date(nextWeekStart.getTime() + 2 * 86400000)),
      taskName: 'Đào tạo nghiệp vụ mới',
      taskType: 'Đào tạo',
      location: 'Trung tâm đào tạo tỉnh',
      notes: 'Đào tạo phần mềm mới',
      status: 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'demo_seed'
    },
  ];
  
  return demo;
}

export const INITIAL_WEEKLY_SCHEDULES: WeeklySchedule[] = generateDemoWeeklySchedules();

export function getStoredWeeklySchedules(): WeeklySchedule[] {
  try {
    const raw = localStorage.getItem(WEEKLY_SCHEDULE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Silently ignore localStorage read errors
  }
  return [];
}

export function saveWeeklySchedules(schedules: WeeklySchedule[]): void {
  try {
    localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(schedules));
  } catch {
    // Silently ignore localStorage write errors
  }
}
