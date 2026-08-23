import { User, KpiTask, LateRuleConfig, SelfAssessmentDoc, WorkflowSubmission, EvaluationPeriodConfig, DEPARTMENTS } from '../types';
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
    position: 'Trưởng phòng',
    department: 'Phòng Thống kê Tổng hợp',
    workUnit: 'Thống kê tỉnh Hưng Yên',
    username: 'thang.bv',
    password: '123456',
    role: 'DEPT_HEAD',
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
  localStorage.removeItem('kpi_admin_task_catalog_v1'); // Also clear custom forms
  localStorage.removeItem('kpi_admin_meetings_v1');
  
  // Seed back initial
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_LATE_CONFIG));
  localStorage.setItem(STORAGE_KEYS.DOCS, JSON.stringify(INITIAL_DOCS));
  localStorage.setItem(STORAGE_KEYS.WORKFLOW, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(INITIAL_PERIOD_CONFIG));
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
