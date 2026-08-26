import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Edit2,
  Save,
  Trash2,
  X,
  MapPin,
  Clock,
  Briefcase,
  BookOpen,
  GraduationCap,
  MoreHorizontal,
  Building,
  Users,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  BarChart2,
  XCircle,
  ChevronDown,
  Eye,
  Maximize2,
  Calendar,
  CalendarDays,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Layout,
  Grid,
  Table,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Minimize2,
  Maximize,
  Building2,
  User,
  Users as UsersIcon,
  List,
  ClipboardList,
  Menu,
  X as XIcon,
  Filter as FilterIcon,
  BarChart3,
  Check,
  ExternalLink
} from 'lucide-react';
import { WeeklySchedule, User as UserType, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';

const STATUSES = ['Đã hoàn thành', 'Đang thực hiện', 'Chưa bắt đầu', 'Hủy'] as const;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SESSIONS = ['Sáng', 'Chiều'];

const STATUS_ICONS = {
  'Đã hoàn thành': '✓',
  'Đang thực hiện': '📝',
  'Chưa bắt đầu': '○',
  'Hủy': '✕',
};

const TASK_TYPE_COLORS = {
  'Họp': '#3b82f6',
  'Công tác': '#10b981',
  'Làm việc tại cơ quan': '#f59e0b',
  'Đào tạo': '#ef4444',
  'Khác': '#8b5cf6',
};

const LEADER_COLOR = '#2d6e3e';
const PHONG_COLOR = '#3b82f6';
const VUNG1_COLOR = '#0d9488';
const VUNG2_COLOR = '#ec4899';

type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

interface DrillDownData {
  unitName: string;
  unitMembers: UserType[];
  dayIndex: number;
  session: string;
  schedules: WeeklySchedule[];
}

interface MatrixCellData {
  dayIndex: number;
  session: string;
  leaderName: string;
  content: string;
  taskType: string;
  location: string;
  dateStr?: string;
}

const DEFAULT_LEADERS = [
  { name: 'Đào Trọng Truyền', position: 'Trưởng Thống kê', department: 'Lãnh đạo' },
  { name: 'Đào Thị Hiếu', position: 'Phó Trưởng Thống kê', department: 'Lãnh đạo' },
  { name: 'Vũ Tuấn Hùng', position: 'Phó Trưởng Thống kê', department: 'Lãnh đạo' },
  { name: 'Phạm Văn Tự', position: 'Phó Trưởng Thống kê', department: 'Lãnh đạo' },
];

const VUNG1_UNITS = [
  'Phố Hiến',
  'Như Quỳnh',
  'Yên Mỹ',
  'Mỹ Hào',
  'Khoái Châu',
  'Lương Bằng',
  'Hoàng Hoa Thám',
];

const VUNG2_UNITS = [
  'Quỳnh Phụ',
  'Hưng Hà',
  'Đông Hưng',
  'Thái Thụy',
  'Tiền Hải',
  'Kiến Xương',
  'Vũ Thư',
];

const PHONG_UNITS = [
  { short: 'P. Tổng hợp', full: 'Phòng Thống kê Tổng hợp', count: 12 },
  { short: 'Phòng TCHC', full: 'Phòng TCHC', count: 0 },
  { short: 'P. TMDV & Giá', full: 'Phòng Thống kê TMDV & Giá', count: 0 },
  { short: 'P. CNXD', full: 'Phòng Thống kê CNXD', count: 0 },
  { short: 'P. NN&XH', full: 'Phòng Thống kê NN&XH', count: 0 },
];

export const WeeklyWorkSchedule: React.FC<{
  schedules: WeeklySchedule[];
  users: UserType[];
  onAddSchedule: (schedule: WeeklySchedule) => void;
  onUpdateSchedule: (schedule: WeeklySchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}> = ({
  schedules,
  users,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  addToast
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [filterTaskType, setFilterTaskType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<WeeklySchedule>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weekStartDate = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentWeekStart]);

  const weekEndDate = useMemo(() => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStartDate]);

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStartDate]);

  const getSchedulesForUnit = useCallback((unitName: string, unitMembers: UserType[]) => {
    const memberNames = new Set(unitMembers.map(m => m.fullName));
    return schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      if (scheduleDate < weekStartDate || scheduleDate > weekEndDate) return false;
      if (!memberNames.has(s.userName)) return false;
      if (filterTaskType !== 'ALL' && s.taskType !== filterTaskType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTask = s.taskName?.toLowerCase().includes(q);
        const matchUser = s.userName?.toLowerCase().includes(q);
        const matchNotes = s.notes?.toLowerCase().includes(q);
        const matchLocation = s.location?.toLowerCase().includes(q);
        if (!matchTask && !matchUser && !matchNotes && !matchLocation) return false;
      }
      return true;
    }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [schedules, weekStartDate, weekEndDate, filterTaskType, searchQuery]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    setDrillDown(null);
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    setDrillDown(null);
  };

  const handleThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
    setDrillDown(null);
  };

  const handleEditClick = (schedule: WeeklySchedule) => {
    setShowAddForm(true);
    setAddForm(schedule);
  };

  const handleSaveEdit = (scheduleId: string) => {
    if (!addForm.taskName?.trim() || !addForm.userName?.trim() || !addForm.date) {
      addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    onUpdateSchedule({ ...(schedules.find(s => s.id === scheduleId) as WeeklySchedule), ...addForm });
    setShowAddForm(false);
    setAddForm({});
    addToast('success', 'Thành công', 'Đã cập nhật lịch công tác');
  };

  const handleAddSchedule = () => {
    if (!addForm.taskName?.trim() || !addForm.userName?.trim() || !addForm.date) {
      addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    const newSchedule: WeeklySchedule = {
      id: 'ws_' + Date.now(),
      weekStartDate: weekStartDate.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      department: addForm.department || '',
      workUnit: addForm.workUnit || '',
      userName: addForm.userName || '',
      userPosition: addForm.userPosition || '',
      dayOfWeek: addForm.dayOfWeek ?? 0,
      date: addForm.date || '',
      taskName: addForm.taskName || '',
      taskType: (addForm.taskType as WeeklySchedule['taskType']) || 'Công tác',
      location: addForm.location || '',
      notes: addForm.notes || '',
      status: (addForm.status as WeeklySchedule['status']) || 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'current_user',
    };
    onAddSchedule(newSchedule);
    setShowAddForm(false);
    setAddForm({});
    addToast('success', 'Thành công', 'Đã thêm lịch công tác mới');
  };

  const openAddForm = (dayIndex?: number, unitName?: string) => {
    const initialForm: Partial<WeeklySchedule> = {
      date: dayIndex !== undefined ? weekDates[dayIndex].toISOString().split('T')[0] : weekDates[0]?.toISOString().split('T')[0],
      dayOfWeek: dayIndex ?? 0,
      taskType: 'Công tác',
      status: 'Chưa bắt đầu',
    };
    if (unitName) {
      const unitUsers = users.filter(u => {
        if (DEFAULT_LEADERS.some(l => l.name === unitName)) return u.fullName === unitName;
        return u.department === unitName || u.workUnit === unitName;
      });
      if (unitUsers[0]) {
        initialForm.userName = unitUsers[0].fullName;
        initialForm.userPosition = unitUsers[0].position;
        initialForm.department = unitUsers[0].department;
        initialForm.workUnit = unitUsers[0].workUnit;
      }
    }
    setAddForm(initialForm);
    setShowAddForm(true);
  };

  const handleMatrixCellClick = (unitName: string, unitMembers: UserType[], dayIndex: number, session: string) => {
    const targetDate = weekDates[dayIndex].toISOString().split('T')[0];
    const memberNames = new Set(unitMembers.map(m => m.fullName));
    const daySchedules = schedules.filter(s => {
      if (s.date !== targetDate) return false;
      if (!memberNames.has(s.userName)) return false;
      if (filterTaskType !== 'ALL' && s.taskType !== filterTaskType) return false;
      const sessionMatch = s.notes?.includes('Chiều') ? 'Chiều' : 'Sáng';
      if (sessionMatch !== session) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTask = s.taskName?.toLowerCase().includes(q);
        const matchUser = s.userName?.toLowerCase().includes(q);
        const matchNotes = s.notes?.toLowerCase().includes(q);
        const matchLocation = s.location?.toLowerCase().includes(q);
        if (!matchTask && !matchUser && !matchNotes && !matchLocation) return false;
      }
      return true;
    });
    
    if (daySchedules.length > 0) {
      setDrillDown({ unitName, unitMembers, dayIndex, session, schedules: daySchedules });
    } else {
      openAddForm(dayIndex, unitName);
    }
  };

  const downloadTemplate = useCallback(() => {
    const headers = [
      'Đối tượng (Lãnh đạo/Phòng ban/Cơ sở)',
      'Nhân sự thực hiện',
      'Chức vụ',
      'Ngày (YYYY-MM-DD)',
      'Thứ (0-6)',
      'Buổi (Sáng/Chiều)',
      'Tên công việc',
      'Loại công việc',
      'Địa điểm',
      'Ghi chú',
      'Trạng thái'
    ];

    const sampleData = [
      [
        'Lãnh đạo Cục',
        'Đào Trọng Truyền',
        'Trưởng Thống kê',
        weekDates[0]?.toISOString().split('T')[0] || '',
        '0',
        'Sáng',
        'Họp triển khai kế hoạch quý',
        'Họp',
        'Phòng họp A',
        'Họp định kỳ',
        'Chưa bắt đầu'
      ],
      [
        'Phòng Thống kê Tổng hợp',
        'Bùi Văn Thắng',
        'Nhân viên',
        weekDates[1]?.toISOString().split('T')[0] || '',
        '1',
        'Chiều',
        'Công tác kiểm tra cơ sở',
        'Công tác',
        'Thống kê cơ sở Phố Hiến',
        'Kiểm tra định kỳ',
        'Chưa bắt đầu'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mẫu lịch tuần');
    XLSX.writeFile(wb, `Mau_Lich_Tuan_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', 'Đã tải file mẫu về máy');
  }, [weekDates, addToast]);

  const downloadMatrixTemplate = useCallback(() => {
    const headers = [
      'Ngày',
      'Buổi',
      ...DEFAULT_LEADERS.map(l => `${l.name}\n(${l.position})`)
    ];

    const sampleData: string[][] = [];
    weekDates.forEach((date, dayIndex) => {
      SESSIONS.forEach((session, sessionIndex) => {
        const row: string[] = [];
        row.push(sessionIndex === 0 ? `Thứ ${dayIndex + 2} (${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})` : '');
        row.push(session);
        DEFAULT_LEADERS.forEach(() => {
          row.push(sessionIndex === 0 ? 'Làm việc cơ quan' : '');
        });
        sampleData.push(row);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 8 },
      ...DEFAULT_LEADERS.map(() => ({ wch: 35 }))
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch Công Tác Lãnh Đạo');
    XLSX.writeFile(wb, `Mau_Lich_Ma_Tran_Lanh_Dao_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', 'Đã tải file mẫu ma trận về máy');
  }, [weekDates, addToast]);

  const exportToExcel = useCallback(() => {
    if (schedules.length === 0) {
      addToast('warning', 'Cảnh báo', 'Không có dữ liệu để xuất');
      return;
    }

    const headers = [
      'Đối tượng',
      'Nhân sự',
      'Chức vụ',
      'Ngày',
      'Thứ',
      'Buổi',
      'Tên công việc',
      'Loại công việc',
      'Địa điểm',
      'Ghi chú',
      'Trạng thái'
    ];

    const allUnitConfigs = [
      { name: 'Lãnh đạo', getMembers: (n: string) => users.filter(u => DEFAULT_LEADERS.some(l => l.name === n && l.name === u.fullName)) },
      ...PHONG_UNITS.map(p => ({ name: p.full, getMembers: (n: string) => users.filter(u => u.department === p.full) })),
      ...VUNG1_UNITS.map(name => ({ name: `Thống kê cơ sở ${name}`, getMembers: (n: string) => users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`) })),
      ...VUNG2_UNITS.map(name => ({ name: `Thống kê cơ sở ${name}`, getMembers: (n: string) => users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`) })),
    ];

    const data = allUnitConfigs.flatMap(({ name, getMembers }) => {
      const members = getMembers(name);
      return weekDates.flatMap((date, dayIndex) => {
        const daySchedules = schedules.filter(s => {
          if (s.date !== date.toISOString().split('T')[0]) return false;
          if (!members.some(m => m.fullName === s.userName)) return false;
          return true;
        });
        if (daySchedules.length === 0) return [];
        return daySchedules.map(s => [
          name,
          s.userName,
          s.userPosition || '',
          s.date,
          DAY_LABELS[s.dayOfWeek],
          s.notes?.includes('Chiều') ? 'Chiều' : 'Sáng',
          s.taskName,
          s.taskType,
          s.location || '',
          s.notes || '',
          s.status
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch công tác tuần');
    XLSX.writeFile(wb, `Lich_Cong_Tac_Tuan_${weekStartDate.toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', `Đã xuất ${data.length} bản ghi ra Excel`);
  }, [schedules, users, weekDates, weekStartDate, addToast]);

  const parseMatrixFormat = useCallback((jsonData: string[][]) => {
    if (jsonData.length < 2) return null;
    const headers = jsonData[0] as string[];
    if (!headers[0]?.toLowerCase().includes('ngày') || !headers[1]?.toLowerCase().includes('buổi')) return null;
    
    const leaderNames = headers.slice(2).map(h => h.split('\n')[0].split('(')[0].trim());
    const rows = jsonData.slice(1);
    const result: MatrixCellData[] = [];
    let currentDayIndex = -1;
    let currentDateStr = '';
    
    rows.forEach((row) => {
      const dayCell = row[0]?.toString().trim();
      const session = row[1]?.toString().trim() || '';
      
      if (dayCell) {
        const dayMatch = dayCell.match(/Thứ\s*(\d+)/);
        if (dayMatch) {
          currentDayIndex = parseInt(dayMatch[1]) - 2;
        }
        const dateMatch = dayCell.match(/\((\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\)/);
        if (dateMatch) {
          currentDateStr = dateMatch[1];
        }
      }
      
      if (currentDayIndex >= 0 && currentDayIndex < 7 && SESSIONS.includes(session)) {
        leaderNames.forEach((leaderName, leaderIdx) => {
          const content = row[leaderIdx + 2]?.toString().trim() || '';
          if (content && content !== '—' && content !== '') {
            result.push({
              dayIndex: currentDayIndex,
              session,
              leaderName,
              content,
              taskType: content.includes('Họp') ? 'Họp' : content.includes('Đào tạo') ? 'Đào tạo' : 'Công tác',
              location: content.includes('📍') || content.includes('') ? content.split(/[📍]/).pop()?.trim() : '',
              dateStr: currentDateStr
            });
          }
        });
      }
    });
    
    return result.length > 0 ? result : null;
  }, []);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const matrixData = parseMatrixFormat(jsonData as string[][]);
        
        if (matrixData) {
          const newSchedules: WeeklySchedule[] = [];
          let addedCount = 0;
          
          matrixData.forEach((cell) => {
            const leader = DEFAULT_LEADERS.find(l => l.name === cell.leaderName);
            if (!leader) return;
            const matchedUser = users.find(u => u.fullName === leader.name);
            
            let date: string;
            if (cell.dateStr) {
              const parts = cell.dateStr.split('/');
              if (parts.length >= 2) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2] ? parts[2] : new Date().getFullYear().toString();
                date = `${year}-${month}-${day}`;
              } else {
                date = weekDates[cell.dayIndex]?.toISOString().split('T')[0] || '';
              }
            } else {
              date = weekDates[cell.dayIndex]?.toISOString().split('T')[0] || '';
            }
            if (!date) return;
            
            const tasks = cell.content.split(/[;\n]/).map(t => t.trim()).filter(Boolean);
            tasks.forEach((taskContent) => {
              newSchedules.push({
                id: 'ws_' + Date.now() + '_' + addedCount++,
                weekStartDate: weekStartDate.toISOString(),
                weekEndDate: weekEndDate.toISOString(),
                department: leader.department,
                workUnit: matchedUser?.workUnit || '',
                userName: leader.name,
                userPosition: leader.position,
                dayOfWeek: cell.dayIndex,
                date,
                taskName: taskContent,
                taskType: cell.taskType as WeeklySchedule['taskType'],
                location: cell.location,
                notes: `Buổi: ${cell.session}`,
                status: 'Chưa bắt đầu' as WeeklySchedule['status'],
                createdAt: new Date().toISOString(),
                createdBy: 'import_matrix',
              });
            });
          });
          
          if (newSchedules.length === 0) {
            addToast('warning', 'Cảnh báo', 'Không tìm thấy dữ liệu hợp lệ trong file ma trận');
            return;
          }
          
          newSchedules.forEach(s => onAddSchedule(s));
          addToast('success', 'Nhập thành công (Ma trận)', `Đã nhập ${newSchedules.length} lịch công tác từ file ma trận`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as string[][];

        const colMap: Record<string, number> = {};
        headers.forEach((h, i) => {
          const normalized = h.toLowerCase().trim();
          if (normalized.includes('đối tượng') || normalized.includes('tổ chức') || normalized.includes('phòng') || normalized.includes('lãnh đạo')) colMap.orgUnit = i;
          else if (normalized.includes('nhân sự') || normalized.includes('thực hiện') || normalized.includes('người')) colMap.userName = i;
          else if (normalized.includes('chức vụ') || normalized.includes('chức danh') || normalized.includes('position')) colMap.userPosition = i;
          else if (normalized.includes('ngày') || normalized.includes('date')) colMap.date = i;
          else if (normalized.includes('thứ') || normalized.includes('dayofweek')) colMap.dayOfWeek = i;
          else if (normalized.includes('buổi')) colMap.session = i;
          else if (normalized.includes('tên công việc') || normalized.includes('taskname') || normalized.includes('nội dung')) colMap.taskName = i;
          else if (normalized.includes('loại') || normalized.includes('tasktype')) colMap.taskType = i;
          else if (normalized.includes('địa điểm') || normalized.includes('location')) colMap.location = i;
          else if (normalized.includes('ghi chú') || normalized.includes('notes') || normalized.includes('note')) colMap.notes = i;
          else if (normalized.includes('trạng thái') || normalized.includes('status')) colMap.status = i;
        });

        const newSchedules: WeeklySchedule[] = [];
        let errorCount = 0;
        let mismatchCount = 0;

        rows.forEach((row, rowIndex) => {
          const orgUnitName = row[colMap.orgUnit]?.toString().trim() || '';
          const userName = row[colMap.userName]?.toString().trim() || '';
          const userPosition = row[colMap.userPosition]?.toString().trim() || '';
          const date = row[colMap.date]?.toString().trim() || '';
          const dayOfWeek = parseInt(row[colMap.dayOfWeek]?.toString().trim() || '0', 10);
          const session = row[colMap.session]?.toString().trim() || '';
          const taskName = row[colMap.taskName]?.toString().trim() || '';
          const taskType = row[colMap.taskType]?.toString().trim() || 'Công tác';
          const location = row[colMap.location]?.toString().trim() || '';
          const notes = row[colMap.notes]?.toString().trim() || '';
          const status = row[colMap.status]?.toString().trim() || 'Chưa bắt đầu';

          if (!taskName || !userName || !date || !orgUnitName) {
            errorCount++;
            return;
          }

          const matchedUser = users.find(u => u.fullName.toLowerCase() === userName.toLowerCase());
          if (!matchedUser) {
            mismatchCount++;
            return;
          }

          newSchedules.push({
            id: 'ws_' + Date.now() + '_' + rowIndex,
            weekStartDate: weekStartDate.toISOString(),
            weekEndDate: weekEndDate.toISOString(),
            department: matchedUser.department || '',
            workUnit: matchedUser.workUnit || '',
            userName,
            userPosition: matchedUser.position,
            dayOfWeek: isNaN(dayOfWeek) ? 0 : dayOfWeek,
            date,
            taskName,
            taskType: ['Công tác', 'Họp', 'Đào tạo', 'Khác', 'Làm việc tại cơ quan'].includes(taskType) ? taskType as any : 'Công tác',
            location,
            notes: notes + (session ? ` | Buổi: ${session}` : ''),
            status: STATUSES.includes(status as any) ? status as any : 'Chưa bắt đầu',
            createdAt: new Date().toISOString(),
            createdBy: 'import_excel',
          });
        });

        if (mismatchCount > 0) {
          addToast('error', 'Lỗi dữ liệu không khớp', `${mismatchCount} dòng bị bỏ qua: Tên nhân sự không tồn tại trong hệ thống.`);
        }

        if (newSchedules.length === 0) {
          addToast('error', 'Lỗi', 'Không có dữ liệu hợp lệ để nhập');
          return;
        }

        newSchedules.forEach(s => onAddSchedule(s));
        addToast('success', 'Nhập thành công', `Đã nhập ${newSchedules.length} lịch công tác${errorCount > 0 ? ` (bỏ qua ${errorCount} dòng lỗi)` : ''}`);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error('Import error:', err);
        addToast('error', 'Lỗi đọc file', 'File Excel không hợp lệ hoặc bị lỗi định dạng');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [users, weekDates, weekStartDate, weekEndDate, onAddSchedule, addToast, parseMatrixFormat]);

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  // ===== SECTION DATA =====
  const leaderUnits = useMemo(() => 
    DEFAULT_LEADERS.map((l) => ({
      id: `leader_${l.name}`,
      name: l.name,
      position: l.position,
      color: LEADER_COLOR,
      members: users.filter(u => u.fullName === l.name),
      allSchedules: schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
               s.userName === l.name && s.taskType !== 'Làm việc tại cơ quan';
      })
    }))
  , [users, weekStartDate, weekEndDate]);

  const phongUnits = useMemo(() => 
    PHONG_UNITS.map((p) => ({
      id: `phong_${p.full}`,
      name: p.short,
      fullName: p.full,
      color: PHONG_COLOR,
      members: users.filter(u => u.department === p.full),
      allSchedules: schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
               users.some(u => u.department === p.full && u.fullName === s.userName) && 
               s.taskType !== 'Làm việc tại cơ quan';
      })
    }))
  , [users, weekStartDate, weekEndDate]);

  const vung1Units = useMemo(() => 
    VUNG1_UNITS.map((name) => ({
      id: `vung1_${name}`,
      name,
      fullName: `Thống kê cơ sở ${name}`,
      color: VUNG1_COLOR,
      members: users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`),
      allSchedules: schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
               users.some(u => (u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`) && u.fullName === s.userName) && 
               s.taskType !== 'Làm việc tại cơ quan';
      })
    }))
  , [users, weekStartDate, weekEndDate]);

  const vung2Units = useMemo(() => 
    VUNG2_UNITS.map((name) => ({
      id: `vung2_${name}`,
      name,
      fullName: `Thống kê cơ sở ${name}`,
      color: VUNG2_COLOR,
      members: users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`),
      allSchedules: schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
               users.some(u => (u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`) && u.fullName === s.userName) && 
               s.taskType !== 'Làm việc tại cơ quan';
      })
    }))
  , [users, weekStartDate, weekEndDate]);

  // ===== BLOCK COMPONENT =====
  const SectionBlock = ({ 
    title, 
    subtitle,
    icon, 
    headerColor,
    units,
    color,
    type
  }: { 
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    headerColor: string;
    units: Array<{id: string; name: string; fullName?: string; position?: string; color: string; members: UserType[]; allSchedules: WeeklySchedule[]}>;
    color: string;
    type: 'leader' | 'phong' | 'vung1' | 'vung2';
  }) => {
    const totalUnits = units.length;
    const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

    return (
      <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden" style={{ borderTop: `3px solid ${headerColor}` }}>
        {/* Block Header */}
        <div className="bg-[#87af89] text-white text-[12px] font-semibold py-2 px-4 flex items-center justify-between min-h-[40px]">
          <span className="flex items-center gap-2 truncate">{icon} {title}</span>
          <span className="text-[10px] opacity-90 whitespace-nowrap">{subtitle}</span>
        </div>

        {/* Status Cards Row - Flexible width based on content */}
        <div className="p-3 bg-[#f5f9f6] border-b border-[#c6d8c8] flex flex-wrap gap-2 items-center min-h-[60px]">
          {units.map((unit, idx) => (
            <div 
              key={unit.id}
              className="flex items-center justify-center px-3 py-2 rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-all"
              style={{ backgroundColor: unit.color }}
              onClick={() => openAddForm(undefined, unit.fullName || unit.name)}
            >
              <span className="font-medium text-white/90 leading-tight whitespace-nowrap">
                {unit.name + (unit.position ? ` (${unit.position})` : '')}
              </span>
              <span className="ml-2 font-bold text-white text-lg">{unit.allSchedules.length} VIỆC</span>
            </div>
          ))}
          <div className="flex-1" />
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg shadow-sm transition-colors whitespace-nowrap border border-slate-200 dark:border-slate-700"
            onClick={() => openAddForm(undefined, units[0]?.fullName || units[0]?.name)}
          >
            <Plus className="w-3.5 h-3.5" style={{ color: color }} />
            <span>+ Thêm lịch</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 200 }}>
          <div className="bg-white border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            {/* Green sub-header */}
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-700 dark:text-green-300" />
                </div>
                <span className="font-semibold text-green-800 dark:text-green-200 text-sm">
                  Lịch công tác ngoài: {units[0]?.fullName || units[0]?.name} / 0 buổi
                </span>
              </div>
              <button 
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors whitespace-nowrap"
                onClick={() => openAddForm(undefined, units[0]?.fullName || units[0]?.name)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm lịch</span>
              </button>
            </div>

            {/* Central white panel */}
            <div className="bg-white border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-700 dark:text-green-300" />
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-2">
                Cả tuần làm việc tại cơ quan
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                Không có lịch công tác ngoài, kiểm tra cơ sở hoặc hội họp ngoại khóa trong tuần này.
              </p>
              <button 
                onClick={() => openAddForm(undefined, units[0]?.fullName || units[0]?.name)}
                className="inline-flex items-center gap-1 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 font-medium text-sm underline"
              >
                <ExternalLink className="w-4 h-4" />
                <span>+ Bấm vào đây nếu muốn thêm lịch công tác ngoài</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  if (drillDown) {
    const { unitName, unitMembers, dayIndex, session, schedules: drillSchedules } = drillDown;
    const date = weekDates[dayIndex];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setDrillDown(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{unitName}</h3>
                <p className="text-xs text-slate-500">{DAY_LABELS[dayIndex]}, {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - Buổi {session} ({drillSchedules.length} lịch)</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg" onClick={() => setDrillDown(null)}>Đóng</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {drillSchedules.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Không có lịch công tác</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drillSchedules.map((schedule, idx) => (
                  <div key={schedule.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{backgroundColor: TASK_TYPE_COLORS[schedule.taskType as keyof typeof TASK_TYPE_COLORS] + '20', color: TASK_TYPE_COLORS[schedule.taskType as keyof typeof TASK_TYPE_COLORS]}}>
                            {schedule.taskType}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{schedule.taskName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${{
                            'Đã hoàn thành': 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300',
                            'Đang thực hiện': 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300',
                            'Chưa bắt đầu': 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300',
                            'Hủy': 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300',
                          }[schedule.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300'}`}>
                            {STATUS_ICONS[schedule.status as keyof typeof STATUS_ICONS]} {schedule.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{schedule.date} ({DAY_LABELS[schedule.dayOfWeek]})</span>
                          <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" />{schedule.userName}</span>
                          {schedule.userPosition && <span>{schedule.userPosition}</span>}
                          {schedule.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{schedule.location}</span>}
                          {schedule.workUnit && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{schedule.workUnit}</span>}
                        </div>
                        {schedule.notes && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700/50 p-2 rounded border border-slate-200/50 dark:border-slate-700">{schedule.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { handleEditClick(schedule); setDrillDown(null); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa lịch công tác này?')) {
                            onDeleteSchedule(schedule.id);
                            addToast('success', 'Đã xóa', 'Lịch công tác đã được xóa thành công');
                          }
                        }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (showAddForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Thêm lịch công tác mới</h3>
            <button onClick={() => { setShowAddForm(false); setAddForm({}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nhân sự</label>
              <input
                type="text"
                value={addForm.userName || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, userName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Chức vụ</label>
              <input
                type="text"
                value={addForm.userPosition || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, userPosition: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ngày</label>
              <input
                type="date"
                value={addForm.date || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, date: e.target.value, dayOfWeek: new Date(e.target.value).getDay() }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tên công việc</label>
              <input
                type="text"
                value={addForm.taskName || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, taskName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Loại công việc</label>
              <select
                value={addForm.taskType || 'Công tác'}
                onChange={(e) => setAddForm(prev => ({ ...prev, taskType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Công tác">Công tác</option>
                <option value="Họp">Họp</option>
                <option value="Đào tạo">Đào tạo</option>
                <option value="Khác">Khác</option>
                <option value="Làm việc tại cơ quan">Làm việc tại cơ quan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Địa điểm</label>
              <input
                type="text"
                value={addForm.location || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ghi chú</label>
              <textarea
                value={addForm.notes || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAddSchedule} className="flex-1 px-4 py-2 bg-[#2d6e3e] hover:bg-[#1e4d2b] text-white rounded-lg font-medium">Thêm</button>
              <button onClick={() => { setShowAddForm(false); setAddForm({}); }} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium">Hủy</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3ef] p-2 font-sans">
      <div className="w-full mx-auto space-y-4">
        
        {/* ===== TOP HEADER ===== */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#2d6e3e]" />
                <span>Lịch Công tác tuần</span>
              </h2>
              
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <CalendarIcon className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={currentWeekStart.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const selected = new Date(e.target.value);
                    const day = selected.getDay();
                    const diff = selected.getDate() - day + (day === 0 ? -6 : 1);
                    setCurrentWeekStart(new Date(selected.setDate(diff)));
                  }}
                  className="bg-transparent border-none outline-none text-sm font-medium text-slate-800 dark:text-slate-200 w-auto min-w-[150px]"
                />
              </div>
              
              <div className="flex items-center gap-1">
                <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần trước">
                  <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[220px] text-center">
                  {formatWeekRange(weekStartDate)}
                </span>
                <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần sau">
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button onClick={handleThisWeek} className="ml-1 px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Tuần này
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={downloadMatrixTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors whitespace-nowrap" title="Tải mẫu ma trận">
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Mẫu lịch tuần</span>
              </button>
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-sm transition-colors whitespace-nowrap" title="Tải mẫu nhập liệu">
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Tải Lịch Tuần</span>
              </button>
              <button onClick={triggerFileImport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors whitespace-nowrap" title="Nhập từ Excel">
                <UploadIcon className="w-3.5 h-3.5" />
                <span>Nhập Excel</span>
              </button>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" />
              <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#2d6e3e] hover:bg-[#1e4d2b] text-white rounded-lg shadow-sm transition-colors whitespace-nowrap" title="Xuất Excel">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== 2x2 GRID LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* SECTION 1: BAN LÃNH ĐẠO */}
          <SectionBlock
            title="1. LỊCH CÔNG TÁC BAN LÃNH ĐẠO"
            subtitle="4 LÃNH ĐẠO"
            icon={<UsersIcon className="w-4 h-4" />}
            headerColor={LEADER_COLOR}
            units={leaderUnits}
            color={LEADER_COLOR}
            type="leader"
          />

          {/* SECTION 2: VÙNG 1 */}
          <SectionBlock
            title="2. LỊCH THỐNG KÊ CƠ SỞ VÙNG 1"
            subtitle="7 CƠ SỞ VÙNG 1"
            icon={<Building2 className="w-4 h-4" />}
            headerColor={VUNG1_COLOR}
            units={VUNG1_UNITS.map((name) => ({
              id: `vung1_${name}`,
              name,
              fullName: `Thống kê cơ sở ${name}`,
              color: VUNG1_COLOR,
              members: users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`),
              allSchedules: schedules.filter(s => {
                const scheduleDate = new Date(s.date);
                return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
                       users.some(u => (u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`) && u.fullName === s.userName) && 
                       s.taskType !== 'Làm việc tại cơ quan';
              })
            }))}
            color={VUNG1_COLOR}
            type="vung1"
          />

          {/* SECTION 3: 5 PHÒNG CHỨC NĂNG */}
          <SectionBlock
            title="3. LỊCH CÔNG TÁC 5 PHÒNG CHỨC NĂNG"
            subtitle="5 PHÒNG"
            icon={<Building className="w-4 h-4" />}
            headerColor={PHONG_COLOR}
            units={PHONG_UNITS.map((p) => ({
              id: `phong_${p.full}`,
              name: p.short,
              fullName: p.full,
              color: PHONG_COLOR,
              members: users.filter(u => u.department === p.full),
              allSchedules: schedules.filter(s => {
                const scheduleDate = new Date(s.date);
                return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
                       users.some(u => u.department === p.full && u.fullName === s.userName) && 
                       s.taskType !== 'Làm việc tại cơ quan';
              })
            }))}
            color={PHONG_COLOR}
            type="phong"
          />

          {/* SECTION 4: VÙNG 2 */}
          <SectionBlock
            title="4. LỊCH THỐNG KÊ CƠ SỞ VÙNG 2"
            subtitle="7 CƠ SỞ VÙNG 2"
            icon={<Building2 className="w-4 h-4" />}
            headerColor={VUNG2_COLOR}
            units={VUNG2_UNITS.map((name) => ({
              id: `vung2_${name}`,
              name,
              fullName: `Thống kê cơ sở ${name}`,
              color: VUNG2_COLOR,
              members: users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`),
              allSchedules: schedules.filter(s => {
                const scheduleDate = new Date(s.date);
                return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate && 
                       users.some(u => (u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`) && u.fullName === s.userName) && 
                       s.taskType !== 'Làm việc tại cơ quan';
              })
            }))}
            color={VUNG2_COLOR}
            type="vung2"
          />

        </div>

      </div>
    </div>
  );
};