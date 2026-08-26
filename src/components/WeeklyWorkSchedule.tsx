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
  BarChart3
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
  'Thống kê cơ sở Phố Hiến',
  'Thống kê cơ sở Như Quỳnh',
  'Thống kê cơ sở Yên Mỹ',
  'Thống kê cơ sở Mỹ Hào',
  'Thống kê cơ sở Khoái Châu',
  'Thống kê cơ sở Lương Bằng',
  'Thống kê cơ sở Hoàng Hoa Thám',
];

const VUNG2_UNITS = [
  'Thống kê cơ sở Quỳnh Phụ',
  'Thống kê cơ sở Hưng Hà',
  'Thống kê cơ sở Đông Hưng',
  'Thống kê cơ sở Thái Thụy',
  'Thống kê cơ sở Tiền Hải',
  'Thống kê cơ sở Kiến Xương',
  'Thống kê cơ sở Vũ Thư',
];

const PHONG_UNITS = [
  'Phòng Thống kê Tổng hợp',
  'Phòng TCHC',
  'Phòng Thống kê TMDV & Giá',
  'Phòng Thống kê CNXD',
  'Phòng Thống kê NN&XH',
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
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const getStatsForUnit = useCallback((unitName: string, unitMembers: UserType[]) => {
    const allSchedules = getSchedulesForUnit(unitName, unitMembers);
    const nonOffice = allSchedules.filter(s => s.taskType !== 'Làm việc tại cơ quan');
    return {
      total: nonOffice.length,
      unfinished: nonOffice.filter(s => s.status === 'Chưa bắt đầu').length,
      completed: nonOffice.filter(s => s.status === 'Đã hoàn thành').length,
    };
  }, [getSchedulesForUnit]);

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
    setSelectedUnit(schedule.userName);
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
      ...PHONG_UNITS.map(name => ({ name, getMembers: (n: string) => users.filter(u => u.department === n) })),
      ...VUNG1_UNITS.map(name => ({ name, getMembers: (n: string) => users.filter(u => u.department === n || u.workUnit === n) })),
      ...VUNG2_UNITS.map(name => ({ name, getMembers: (n: string) => users.filter(u => u.department === n || u.workUnit === n) })),
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

  // ===== UNIT CONFIGS =====
  const leaderUnits = useMemo(() => 
    DEFAULT_LEADERS.map((l) => ({
      id: `leader_${l.name}`,
      name: l.name,
      position: l.position,
      color: LEADER_COLOR,
      members: users.filter(u => u.fullName === l.name),
      stats: getStatsForUnit(l.name, users.filter(u => u.fullName === l.name)),
      allSchedules: getSchedulesForUnit(l.name, users.filter(u => u.fullName === l.name))
    }))
  , [users, getStatsForUnit, getSchedulesForUnit]);

  const phongUnits = useMemo(() => 
    PHONG_UNITS.map((name) => ({
      id: `phong_${name}`,
      name,
      color: PHONG_COLOR,
      members: users.filter(u => u.department === name),
      stats: getStatsForUnit(name, users.filter(u => u.department === name)),
      allSchedules: getSchedulesForUnit(name, users.filter(u => u.department === name))
    }))
  , [users, getStatsForUnit, getSchedulesForUnit]);

  const vung1Units = useMemo(() => 
    VUNG1_UNITS.map((name) => ({
      id: `vung1_${name}`,
      name,
      color: VUNG1_COLOR,
      members: users.filter(u => u.department === name || u.workUnit === name),
      stats: getStatsForUnit(name, users.filter(u => u.department === name || u.workUnit === name)),
      allSchedules: getSchedulesForUnit(name, users.filter(u => u.department === name || u.workUnit === name))
    }))
  , [users, getStatsForUnit, getSchedulesForUnit]);

  const vung2Units = useMemo(() => 
    VUNG2_UNITS.map((name) => ({
      id: `vung2_${name}`,
      name,
      color: VUNG2_COLOR,
      members: users.filter(u => u.department === name || u.workUnit === name),
      stats: getStatsForUnit(name, users.filter(u => u.department === name || u.workUnit === name)),
      allSchedules: getSchedulesForUnit(name, users.filter(u => u.department === name || u.workUnit === name))
    }))
  , [users, getStatsForUnit, getSchedulesForUnit]);

  // ===== SIDEBAR ITEM =====
  const SidebarItem = ({ 
    unit, 
    isActive, 
    onClick,
    type = 'leader',
    key
  }: { 
    unit: typeof leaderUnits[0]; 
    isActive: boolean;
    onClick: () => void;
    type?: 'leader' | 'phong' | 'vung1' | 'vung2';
    key?: React.Key;
  }) => {
    const iconMap = {
      leader: UsersIcon,
      phong: Building,
      vung1: Building2,
      vung2: Building2
    };
    const Icon = iconMap[type];

    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
          isActive 
            ? `bg-${type === 'leader' ? 'green' : type === 'phong' ? 'blue' : type === 'vung1' ? 'teal' : 'pink'}-600 text-white shadow-lg`
            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
        style={{ borderLeft: `4px solid ${unit.color}` }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : unit.color }}>
          <Icon className="w-4 h-4" style={{ color: isActive ? 'white' : unit.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{unit.name}</p>
          {unit.position && <p className="text-[11px] truncate opacity-75">{unit.position}</p>}
          <p className="text-[11px] font-bold mt-1">{unit.stats.total} việc</p>
        </div>
        {isActive && <ChevronRight className="w-4 h-4" />}
      </button>
    );
  };

  // ===== STAT CARD =====
  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-lg shadow-sm min-h-[50px]" style={{ backgroundColor: color }}>
      <span className="text-[11px] font-medium truncate text-center text-white/90 leading-tight max-w-full">{label}</span>
      <span className="text-lg font-bold tracking-normal mt-0.5 leading-none text-white">{value}</span>
    </div>
  );

  // ===== DETAIL TABLE =====
  const DetailTable = ({ 
    schedules, 
    unitName, 
    unitMembers,
    unitColor 
  }: { 
    schedules: WeeklySchedule[];
    unitName: string;
    unitMembers: UserType[];
    unitColor: string;
  }) => {
    // COMPLETELY HIDE "Làm việc tại cơ quan" - only show if week has ONLY that
    const nonOfficeSchedules = schedules.filter(s => s.taskType !== 'Làm việc tại cơ quan');
    const hasOnlyOfficeWork = schedules.length > 0 && nonOfficeSchedules.length === 0;
    const displaySchedules = hasOnlyOfficeWork ? schedules : nonOfficeSchedules;

    if (displaySchedules.length === 0) {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-center">
          <span className="text-xs italic text-slate-400">— Không có công việc khác ngoài làm việc tại cơ quan —</span>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300 w-8">STT</th>
              <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Họ và tên</th>
              <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Chức vụ</th>
              <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Nội dung</th>
              <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Thời gian</th>
              <th className="px-2 py-1.5 text-left font-semibold text-slate-700 dark:text-slate-300">Địa điểm</th>
            </tr>
          </thead>
          <tbody>
            {displaySchedules.map((s, idx) => (
              <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer`}
                  onClick={() => handleMatrixCellClick(unitName, unitMembers, s.dayOfWeek, s.notes?.includes('Chiều') ? 'Chiều' : 'Sáng')}>
                <td className="px-2 py-1.5 text-slate-500 font-mono">{idx + 1}</td>
                <td className="px-2 py-1.5 font-medium text-slate-900 dark:text-slate-100">{s.userName}</td>
                <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">{s.userPosition || '—'}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold`} style={{backgroundColor: TASK_TYPE_COLORS[s.taskType as keyof typeof TASK_TYPE_COLORS] + '20', color: TASK_TYPE_COLORS[s.taskType as keyof typeof TASK_TYPE_COLORS]}}>
                      {s.taskType}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{s.taskName}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs"><Clock className="w-2.5 h-2.5" />{s.date} ({DAY_LABELS_SHORT[s.dayOfWeek]})</span>
                    <span className="flex items-center gap-1 text-xs font-medium"><Clock className="w-2.5 h-2.5" />{s.notes?.includes('Chiều') ? 'Chiều' : 'Sáng'}</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">{s.location || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ===== LEADER MATRIX =====
  const LeaderMatrixView = () => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Table className="w-5 h-5 text-[#2d6e3e]" />
            <span>Ma trận Lịch Lãnh đạo: {leaderUnits.length} người × 7 ngày × 2 buổi</span>
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={filterTaskType}
              onChange={(e) => setFilterTaskType(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="Họp">Họp</option>
              <option value="Công tác">Công tác</option>
              <option value="Đào tạo">Đào tạo</option>
              <option value="Khác">Khác</option>
              <option value="Làm việc tại cơ quan">Làm việc tại cơ quan</option>
            </select>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded w-40 placeholder:text-slate-400"
            />
            <button onClick={exportToExcel} className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-[#2d6e3e] hover:bg-[#1e4d2b] text-white rounded border border-slate-300 transition-colors whitespace-nowrap">
              <FileSpreadsheet className="w-3 h-3" />
              Xuất Excel
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full min-w-max text-xs">
            <thead>
              <tr className="bg-[#006097] text-white sticky top-0 z-10">
                <th className="px-3 py-2 text-left font-medium w-24 border-r border-[#004d7a] sticky left-0 z-20 bg-[#006097]">Ngày / Buổi</th>
                {leaderUnits.map((unit) => (
                  <th key={unit.id} className={`px-2 py-2 text-center font-medium border-r border-[#004d7a] sticky left-[96px] z-10`} style={{ minWidth: '200px', backgroundColor: unit.color + '20' }}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: unit.color }} />
                      <span className="font-bold truncate max-w-[160px]">{unit.name}</span>
                    </div>
                    <div className="text-[10px] opacity-80">{unit.position}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDates.map((date, dayIndex) => (
                <React.Fragment key={dayIndex}>
                  {SESSIONS.map((session, sessionIdx) => (
                    <tr key={session} className={`border-b border-slate-200 dark:border-slate-800 ${sessionIdx === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''}`}>
                      <td className={`px-3 py-2 font-medium text-left border-r border-slate-200 dark:border-slate-800 sticky left-0 z-20 bg-white dark:bg-slate-900 ${sessionIdx === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''}`}>
                        <div className="flex flex-col items-start">
                          {sessionIdx === 0 && (
                            <span className="text-[10px] text-slate-400">
                              {date.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })}
                            </span>
                          )}
                          <span className="font-medium">{DAY_LABELS_SHORT[dayIndex]}</span>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded ${session === 'Sáng' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'}`}>
                            {session}
                          </span>
                        </div>
                      </td>
                      {leaderUnits.map((unit) => {
                        const targetDate = weekDates[dayIndex].toISOString().split('T')[0];
                        const memberNames = new Set(unit.members.map(m => m.fullName));
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
                        const count = daySchedules.length;
                        const hasMeeting = daySchedules.some(s => s.taskType === 'Họp');
                        const hasBusiness = daySchedules.some(s => s.taskType === 'Công tác');
                        const hasTraining = daySchedules.some(s => s.taskType === 'Đào tạo');
                        const hasOffice = daySchedules.some(s => s.taskType === 'Làm việc tại cơ quan');
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                          <td 
                            key={unit.id} 
                            className={`px-2 py-2 border-r border-slate-200 dark:border-slate-800 min-h-[80px] ${sessionIdx === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''} ${isToday ? 'ring-2 ring-sky-400/50' : ''} ${count > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''} hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors relative cursor-pointer`}
                            onClick={() => handleMatrixCellClick(unit.name, unit.members, dayIndex, session)}
                          >
                            {count > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {hasMeeting && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200">Họp</span>}
                                {hasBusiness && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200">Công tác</span>}
                                {hasTraining && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200">Đào tạo</span>}
                                {hasOffice && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200">Cơ quan</span>}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-3 pr-2">
                              {count > 0 ? daySchedules.map((s, i) => (
                                <div key={i} className="mb-0.5 flex items-start gap-1 relative">
                                  <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${{
                                    'Đã hoàn thành': 'bg-emerald-500',
                                    'Đang thực hiện': 'bg-sky-500',
                                    'Chưa bắt đầu': 'bg-amber-500',
                                    'Hủy': 'bg-rose-500',
                                  }[s.status] || 'bg-slate-400'}`} />
                                  <span className="truncate flex-1">{s.taskName}</span>
                                  <div className="flex gap-0.5">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleEditClick(s); }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20" 
                                      title="Sửa"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (confirm('Bạn có chắc muốn xóa lịch công tác này?')) {
                                          onDeleteSchedule(s.id);
                                          addToast('success', 'Đã xóa', 'Lịch công tác đã được xóa thành công');
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20" 
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )) : (
                                <span className="text-slate-300 dark:text-slate-600 italic">—</span>
                              )}
                            </div>
                            {count > 0 && (
                              <div className="absolute bottom-1 right-1 flex gap-0.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700">
                                  {count}
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
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
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
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

        {/* ===== MAIN LAYOUT: SIDEBAR + MATRIX ===== */}
        <div className="flex gap-3">
          
          {/* ===== LEFT SIDEBAR ===== */}
          <aside className={`w-72 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col ${!sidebarOpen ? 'hidden md:block' : 'block'} md:block`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FilterIcon className="w-5 h-5 text-[#2d6e3e]" />
                <span>Bộ lọc đơn vị</span>
              </h3>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              
              {/* LÃNH ĐẠO */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 px-2">LÃNH ĐẠO (4 người)</p>
                {leaderUnits.map((unit) => (
                  <SidebarItem
                    key={unit.id}
                    unit={unit}
                    isActive={selectedLeader === unit.id}
                    onClick={() => setSelectedLeader(selectedLeader === unit.id ? null : unit.id)}
                    type="leader"
                  />
                ))}
              </div>

              {/* PHÒNG BAN */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 px-2">PHÒNG BAN (5 phòng)</p>
                {phongUnits.map((unit) => (
                  <SidebarItem
                    key={unit.id}
                    unit={unit}
                    isActive={selectedUnit === unit.id}
                    onClick={() => setSelectedUnit(selectedUnit === unit.id ? null : unit.id)}
                    type="phong"
                  />
                ))}
              </div>

              {/* VÙNG 1 */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 px-2">VÙNG 1 (7 cơ sở)</p>
                {vung1Units.map((unit) => (
                  <SidebarItem
                    key={unit.id}
                    unit={unit}
                    isActive={selectedUnit === unit.id}
                    onClick={() => setSelectedUnit(selectedUnit === unit.id ? null : unit.id)}
                    type="vung1"
                  />
                ))}
              </div>

              {/* VÙNG 2 */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 px-2">VÙNG 2 (7 cơ sở)</p>
                {vung2Units.map((unit) => (
                  <SidebarItem
                    key={unit.id}
                    unit={unit}
                    isActive={selectedUnit === unit.id}
                    onClick={() => setSelectedUnit(selectedUnit === unit.id ? null : unit.id)}
                    type="vung2"
                  />
                ))}
              </div>

            </div>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <main className="flex-1 min-w-0 flex flex-col">
            
            {/* ===== MATRIX ===== */}
            <div className="flex-1 min-h-0">
              <LeaderMatrixView />
            </div>

            {/* ===== DETAIL TABLES (Bottom) ===== */}
            <div className="mt-3 space-y-3">
              
              {/* SELECTED LEADER DETAIL */}
              {selectedLeader && leaderUnits.find(u => u.id === selectedLeader) && (
                <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs overflow-hidden" style={{ borderTop: `3px solid ${LEADER_COLOR}` }}>
                  <div className="bg-[#87af89] text-white text-[12px] font-semibold py-2 px-4 flex items-center justify-between">
                    <span className="flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Chi tiết Lãnh đạo</span>
                    <button onClick={() => setSelectedLeader(null)} className="p-1 hover:bg-white/20 rounded">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <DetailTable 
                    schedules={leaderUnits.find(u => u.id === selectedLeader)!.allSchedules} 
                    unitName={selectedLeader}
                    unitMembers={leaderUnits.find(u => u.id === selectedLeader)!.members}
                    unitColor={LEADER_COLOR}
                  />
                </div>
              )}

              {/* SELECTED UNIT DETAIL */}
              {selectedUnit && (
                <>
                  {phongUnits.find(u => u.id === selectedUnit) && (
                    <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs overflow-hidden" style={{ borderTop: `3px solid ${PHONG_COLOR}` }}>
                      <div className="bg-[#87af89] text-white text-[12px] font-semibold py-2 px-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Building className="w-4 h-4" /> Chi tiết Phòng ban</span>
                        <button onClick={() => setSelectedUnit(null)} className="p-1 hover:bg-white/20 rounded">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <DetailTable 
                        schedules={phongUnits.find(u => u.id === selectedUnit)!.allSchedules} 
                        unitName={selectedUnit}
                        unitMembers={phongUnits.find(u => u.id === selectedUnit)!.members}
                        unitColor={PHONG_COLOR}
                      />
                    </div>
                  )}
                  {vung1Units.find(u => u.id === selectedUnit) && (
                    <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs overflow-hidden" style={{ borderTop: `3px solid ${VUNG1_COLOR}` }}>
                      <div className="bg-[#87af89] text-white text-[12px] font-semibold py-2 px-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Chi tiết Vùng 1</span>
                        <button onClick={() => setSelectedUnit(null)} className="p-1 hover:bg-white/20 rounded">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <DetailTable 
                        schedules={vung1Units.find(u => u.id === selectedUnit)!.allSchedules} 
                        unitName={selectedUnit}
                        unitMembers={vung1Units.find(u => u.id === selectedUnit)!.members}
                        unitColor={VUNG1_COLOR}
                      />
                    </div>
                  )}
                  {vung2Units.find(u => u.id === selectedUnit) && (
                    <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs overflow-hidden" style={{ borderTop: `3px solid ${VUNG2_COLOR}` }}>
                      <div className="bg-[#87af89] text-white text-[12px] font-semibold py-2 px-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Chi tiết Vùng 2</span>
                        <button onClick={() => setSelectedUnit(null)} className="p-1 hover:bg-white/20 rounded">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <DetailTable 
                        schedules={vung2Units.find(u => u.id === selectedUnit)!.allSchedules} 
                        unitName={selectedUnit}
                        unitMembers={vung2Units.find(u => u.id === selectedUnit)!.members}
                        unitColor={VUNG2_COLOR}
                      />
                    </div>
                  )}
                </>
              )}

            </div>

          </main>

        </div>

      </div>
    </div>
  );
};