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
  Circle,
  Activity,
  Layout
} from 'lucide-react';
import { WeeklySchedule, User, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface WeeklyWorkScheduleProps {
  schedules: WeeklySchedule[];
  users: User[];
  onAddSchedule: (schedule: WeeklySchedule) => void;
  onUpdateSchedule: (schedule: WeeklySchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

const STATUSES = ['Đã hoàn thành', 'Đang thực hiện', 'Chưa bắt đầu', 'Hủy'] as const;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const STATUS_ICONS = {
  'Đã hoàn thành': '✓',
  'Đang thực hiện': '📝',
  'Chưa bắt đầu': '○',
  'Hủy': '✕',
};

const STATUS_COLORS = {
  'Đã hoàn thành': '#10b981',
  'Đang thực hiện': '#0ea5e9',
  'Chưa bắt đầu': '#f59e0b',
  'Hủy': '#ef4444',
};

const TASK_TYPE_COLORS = {
  'Họp': '#3b82f6',
  'Công tác': '#10b981',
  'Làm việc tại cơ quan': '#f59e0b',
  'Đào tạo': '#ef4444',
  'Khác': '#8b5cf6',
};

// Subtle stripe colors for each weekday column (7 days)
const DAY_COLUMN_STRIPES = [
  'bg-blue-50/30 dark:bg-blue-950/10',   // Thứ 2
  'bg-green-50/30 dark:bg-green-950/10', // Thứ 3
  'bg-amber-50/30 dark:bg-amber-950/10', // Thứ 4
  'bg-orange-50/30 dark:bg-orange-950/10', // Thứ 5
  'bg-red-50/30 dark:bg-red-950/10',     // Thứ 6
  'bg-purple-50/30 dark:bg-purple-950/10', // Thứ 7
  'bg-slate-50/30 dark:bg-slate-950/10', // Chủ Nhật
];

const DAY_HEADER_COLORS = [
  'bg-blue-100 dark:bg-blue-900/30',   // Thứ 2
  'bg-green-100 dark:bg-green-900/30', // Thứ 3
  'bg-amber-100 dark:bg-amber-900/30', // Thứ 4
  'bg-orange-100 dark:bg-orange-900/30', // Thứ 5
  'bg-red-100 dark:bg-red-900/30',     // Thứ 6
  'bg-purple-100 dark:bg-purple-900/30', // Thứ 7
  'bg-slate-100 dark:bg-slate-900/30', // Chủ Nhật
];

type DrillDownType = 'baseUnits' | null;
type TimeFilter = 'week' | 'month' | 'quarter' | 'year';

interface OrgUnit {
  id: string;
  name: string;
  type: 'leader' | 'department' | 'baseUnit';
  members: User[];
  color: string;
}

interface DrillDownData {
  type: DrillDownType;
  name: string;
  schedules: WeeklySchedule[];
}

interface TimePeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

export const WeeklyWorkSchedule: React.FC<WeeklyWorkScheduleProps> = ({
  schedules,
  users,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  addToast
}) => {
  // State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [selectedWorkUnit, setSelectedWorkUnit] = useState<string>('ALL');
  const [filterTaskType, setFilterTaskType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeeklySchedule>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<WeeklySchedule>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [showTimeFilterModal, setShowTimeFilterModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for sidebar and inline editing
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    leader: true,
    department: true,
    baseUnit: true,
  });
  const [inlineEditingCell, setInlineEditingCell] = useState<{ unitId: string; dayIndex: number } | null>(null);
  const [inlineEditForm, setInlineEditForm] = useState<Partial<WeeklySchedule>>({});

  // Derive org units from actual user data (no hardcoding)
  const orgUnits = useMemo((): OrgUnit[] => {
    const leaderUsers = users.filter(u => 
      u.role === 'PROVINCE_LEADER' || 
      /cục trưởng|phó cục trưởng|giám đốc|phó giám đốc/i.test(u.position || '')
    );
    
    // Get unique departments from non-leader users
    const nonLeaderUsers = users.filter(u => !leaderUsers.includes(u));
    const deptMap = new Map<string, User[]>();
    
    nonLeaderUsers.forEach(u => {
      const dept = u.department || 'Chưa phân bổ';
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(u);
    });

    const units: OrgUnit[] = [];
    
    // Leaders group
    if (leaderUsers.length > 0) {
      units.push({
        id: 'leaders',
        name: 'Lãnh đạo Cục',
        type: 'leader',
        members: leaderUsers,
        color: '#2d6e3e'
      });
    }
    
    // Departments and Base Units
    deptMap.forEach((members, deptName) => {
      const isBaseUnit = deptName.startsWith('Thống kê cơ sở');
      units.push({
        id: `dept_${deptName}`,
        name: deptName,
        type: isBaseUnit ? 'baseUnit' : 'department',
        members,
        color: isBaseUnit ? '#0d9488' : '#3b82f6'
      });
    });
    
    return units;
  }, [users]);

  // Filter org units by selected group filter and work unit
  const filteredOrgUnits = useMemo(() => {
    let units = orgUnits;
    
    if (selectedGroupFilter !== 'ALL') {
      units = units.filter(u => u.type === selectedGroupFilter);
    }
    
    if (selectedWorkUnit !== 'ALL') {
      units = units.filter(u => 
        u.members.some(m => m.workUnit === selectedWorkUnit || m.department === selectedWorkUnit)
      );
    }
    
    return units;
  }, [orgUnits, selectedGroupFilter, selectedWorkUnit]);

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

  // Get schedules for a specific org unit and day
  const getSchedulesForUnitAndDay = useCallback((unit: OrgUnit, dayIndex: number) => {
    const targetDate = weekDates[dayIndex].toISOString().split('T')[0];
    const memberNames = new Set(unit.members.map(m => m.fullName));
    
    return schedules.filter(s => {
      if (s.date !== targetDate) return false;
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
    }).sort((a, b) => a.taskName.localeCompare(b.taskName));
  }, [schedules, weekDates, filterTaskType, searchQuery]);

  // Navigation
  const handlePrevWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    setSelectedDay(null);
    setDrillDown(null);
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    setSelectedDay(null);
    setDrillDown(null);
  };

  const handleThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
    const todayIndex = new Date().getDay();
    setSelectedDay(todayIndex === 0 ? 6 : todayIndex - 1);
    setDrillDown(null);
  };

  const handleEditClick = (schedule: WeeklySchedule) => {
    setEditingSchedule(schedule.id);
    setEditForm(schedule);
  };

  const handleSaveEdit = (scheduleId: string) => {
    if (!editForm.taskName?.trim() || !editForm.userName?.trim() || !editForm.date) {
      addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    onUpdateSchedule({ ...(schedules.find(s => s.id === scheduleId) as WeeklySchedule), ...editForm });
    setEditingSchedule(null);
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
      workUnit: addForm.workUnit || (selectedWorkUnit !== 'ALL' ? selectedWorkUnit : ''),
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

  const handleAddFormDateChange = (dayIndex: number) => {
    const date = weekDates[dayIndex].toISOString().split('T')[0];
    setAddForm(prev => ({ ...prev, date, dayOfWeek: dayIndex }));
  };

  const openAddForm = (dayIndex?: number, unitId?: string) => {
    const initialForm: Partial<WeeklySchedule> = {
      date: dayIndex !== undefined ? weekDates[dayIndex].toISOString().split('T')[0] : weekDates[0]?.toISOString().split('T')[0],
      dayOfWeek: dayIndex ?? 0,
      taskType: 'Công tác',
      status: 'Chưa bắt đầu',
    };
    if (selectedWorkUnit !== 'ALL') {
      initialForm.workUnit = selectedWorkUnit;
    }
    // Pre-select unit if provided
    if (unitId) {
      const unit = orgUnits.find(u => u.id === unitId);
      if (unit?.members[0]) {
        initialForm.userName = unit.members[0].fullName;
        initialForm.userPosition = unit.members[0].position;
        initialForm.department = unit.members[0].department;
        initialForm.workUnit = unit.members[0].workUnit;
      }
    }
    setAddForm(initialForm);
    setShowAddForm(true);
  };

  // Excel Export/Import
  const downloadTemplate = useCallback(() => {
    const headers = [
      'Đối tượng (Lãnh đạo/Phòng ban/Cơ sở)',
      'Nhân sự thực hiện',
      'Chức vụ',
      'Ngày (YYYY-MM-DD)',
      'Thứ (0-6)',
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
        'Cục trưởng',
        weekDates[0]?.toISOString().split('T')[0] || '',
        '0',
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
      'Tên công việc',
      'Loại công việc',
      'Địa điểm',
      'Ghi chú',
      'Trạng thái'
    ];

    const data = filteredOrgUnits.flatMap(unit => 
      weekDates.map((date, dayIndex) => {
        const daySchedules = getSchedulesForUnitAndDay(unit, dayIndex);
        if (daySchedules.length === 0) return null;
        return daySchedules.map(s => [
          unit.name,
          s.userName,
          s.userPosition || '',
          s.date,
          DAY_LABELS[s.dayOfWeek],
          s.taskName,
          s.taskType,
          s.location || '',
          s.notes || '',
          s.status
        ]);
      }).flat()
    ).filter(Boolean);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch công tác tuần');
    XLSX.writeFile(wb, `Lich_Cong_Tac_Tuan_${weekStartDate.toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', `Đã xuất ${data.length} bản ghi ra Excel`);
  }, [schedules, filteredOrgUnits, weekDates, getSchedulesForUnitAndDay, weekStartDate, addToast]);

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          addToast('error', 'Lỗi', 'File Excel không có dữ liệu');
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
          else if (normalized.includes('tên công việc') || normalized.includes('taskname') || normalized.includes('nội dung')) colMap.taskName = i;
          else if (normalized.includes('loại') || normalized.includes('tasktype')) colMap.taskType = i;
          else if (normalized.includes('địa điểm') || normalized.includes('location')) colMap.location = i;
          else if (normalized.includes('ghi chú') || normalized.includes('notes') || normalized.includes('note')) colMap.notes = i;
          else if (normalized.includes('trạng thái') || normalized.includes('status')) colMap.status = i;
        });

        // Build lookup for org units
        const orgUnitLookup = new Map<string, OrgUnit>();
        orgUnits.forEach(u => {
          orgUnitLookup.set(u.name.toLowerCase(), u);
          u.members.forEach(m => {
            orgUnitLookup.set(m.fullName.toLowerCase(), u);
          });
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
          const taskName = row[colMap.taskName]?.toString().trim() || '';
          const taskType = row[colMap.taskType]?.toString().trim() || 'Công tác';
          const location = row[colMap.location]?.toString().trim() || '';
          const notes = row[colMap.notes]?.toString().trim() || '';
          const status = row[colMap.status]?.toString().trim() || 'Chưa bắt đầu';

          if (!taskName || !userName || !date || !orgUnitName) {
            errorCount++;
            return;
          }

          // Validate org unit exists in system
          const matchedUnit = orgUnitLookup.get(orgUnitName.toLowerCase());
          if (!matchedUnit) {
            mismatchCount++;
            return;
          }

          // Validate user belongs to that unit
          const matchedUser = matchedUnit.members.find(m => m.fullName.toLowerCase() === userName.toLowerCase());
          if (!matchedUser) {
            mismatchCount++;
            return;
          }

          const finalWorkUnit = matchedUser.workUnit || '';
          const finalDept = matchedUser.department || '';

          newSchedules.push({
            id: 'ws_' + Date.now() + '_' + rowIndex,
            weekStartDate: weekStartDate.toISOString(),
            weekEndDate: weekEndDate.toISOString(),
            department: finalDept,
            workUnit: finalWorkUnit,
            userName,
            userPosition: matchedUser.position,
            dayOfWeek: isNaN(dayOfWeek) ? 0 : dayOfWeek,
            date,
            taskName,
            taskType: ['Công tác', 'Họp', 'Đào tạo', 'Khác', 'Làm việc tại cơ quan'].includes(taskType) ? taskType as any : 'Công tác',
            location,
            notes,
            status: STATUSES.includes(status as any) ? status as any : 'Chưa bắt đầu',
            createdAt: new Date().toISOString(),
            createdBy: 'import_excel',
          });
        });

        if (mismatchCount > 0) {
          addToast('error', 'Lỗi dữ liệu không khớp', 
            `${mismatchCount} dòng bị bỏ qua: Tên đơn vị/nhân sự không tồn tại trong hệ thống. Vui lòng kiểm tra file Excel.`);
        }

        if (newSchedules.length === 0) {
          addToast('error', 'Lỗi', 'Không có dữ liệu hợp lệ để nhập');
          return;
        }

        newSchedules.forEach(s => onAddSchedule(s));
        addToast('success', 'Nhập thành công', `Đã nhập ${newSchedules.length} lịch công tác từ Excel${errorCount > 0 ? ` (bỏ qua ${errorCount} dòng lỗi)` : ''}`);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error('Import error:', err);
        addToast('error', 'Lỗi đọc file', 'File Excel không hợp lệ hoặc bị lỗi định dạng');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [orgUnits, weekStartDate, weekEndDate, onAddSchedule, addToast]);

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  // Stats for footer dashboard
  const weekStats = useMemo(() => {
    const weekSchedules = schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate;
    });
    const total = weekSchedules.length;
    const completed = weekSchedules.filter(s => s.status === 'Đã hoàn thành').length;
    const inProgress = weekSchedules.filter(s => s.status === 'Đang thực hiện').length;
    const pending = weekSchedules.filter(s => s.status === 'Chưa bắt đầu').length;
    const cancelled = weekSchedules.filter(s => s.status === 'Hủy').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, cancelled, completionRate };
  }, [schedules, weekStartDate, weekEndDate]);

  // Chart data for task type breakdown by base unit
  const BASE_UNITS = orgUnits.filter(u => u.type === 'baseUnit');
  
  const getTaskTypeChartData = useCallback((taskTypeFilter: string) => {
    return BASE_UNITS.map(unit => {
      const unitSchedules = schedules.filter(s => {
        const scheduleDate = new Date(s.date);
        if (scheduleDate < weekStartDate || scheduleDate > weekEndDate) return false;
        return unit.members.some(m => m.fullName === s.userName);
      });
      const typeSchedules = taskTypeFilter === 'TOTAL' 
        ? unitSchedules 
        : unitSchedules.filter(s => s.taskType === taskTypeFilter);
      return { name: unit.name.replace('Thống kê cơ sở ', ''), value: typeSchedules.length };
    }).filter(d => d.value > 0);
  }, [schedules, BASE_UNITS, weekStartDate, weekEndDate]);

  const totalChartData = useMemo(() => getTaskTypeChartData('TOTAL'), [getTaskTypeChartData]);
  const meetingOnlineChartData = useMemo(() => getTaskTypeChartData('Họp'), [getTaskTypeChartData]);
  const meetingOfflineChartData = useMemo(() => getTaskTypeChartData('Công tác'), [getTaskTypeChartData]);
  const workAtOfficeChartData = useMemo(() => getTaskTypeChartData('Làm việc tại cơ quan'), [getTaskTypeChartData]);
  const businessTripChartData = useMemo(() => getTaskTypeChartData('Đào tạo'), [getTaskTypeChartData]);
  const otherChartData = useMemo(() => getTaskTypeChartData('Khác'), [getTaskTypeChartData]);

  const HorizontalBarChart = ({ data, title, color }: { 
    data: any[], 
    title: string,
    color: string
  }) => {
    if (data.length === 0) return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3 h-48 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Chưa có dữ liệu</span>
      </div>
    );

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3 h-48">
        <h4 className="font-medium text-slate-800 dark:text-slate-100 text-xs mb-2 truncate">{title}</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip 
              formatter={(value: number) => [value, 'lịch']}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Bar 
              dataKey="value" 
              fill={color} 
              name={title}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Drill-down Detail Modal
  if (drillDown) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setDrillDown(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{drillDown.name}</h3>
                <p className="text-xs text-slate-500">{drillDown.schedules.length} lịch công tác trong tuần</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg" onClick={() => setDrillDown(null)}>Đóng</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {drillDown.schedules.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Không có lịch công tác</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drillDown.schedules
                  .sort((a, b) => {
                    const dayA = parseInt(a.dayOfWeek?.toString() || '0');
                    const dayB = parseInt(b.dayOfWeek?.toString() || '0');
                    if (dayA !== dayB) return dayA - dayB;
                    return a.taskName.localeCompare(b.taskName);
                  })
                  .map((schedule, idx) => (
                    <div key={schedule.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {TASK_TYPE_COLORS[schedule.taskType as keyof typeof TASK_TYPE_COLORS] ? (
                                <span style={{backgroundColor: TASK_TYPE_COLORS[schedule.taskType as keyof typeof TASK_TYPE_COLORS] + '20', color: TASK_TYPE_COLORS[schedule.taskType as keyof typeof TASK_TYPE_COLORS]}} className="px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {schedule.taskType}
                                </span>
                              ) : (
                                schedule.taskType
                              )}
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
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{schedule.userName}</span>
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
  }

  // Inline Edit Form Component
  const InlineEditForm: React.FC<{
    unit: OrgUnit;
    dayIndex: number;
    date: Date;
    form: Partial<WeeklySchedule>;
    onChange: (form: Partial<WeeklySchedule>) => void;
    onSave: () => void;
    onCancel: () => void;
  }> = ({ unit, dayIndex, date, form, onChange, onSave, onCancel }) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') onSave();
      if (e.key === 'Escape') onCancel();
    };

    return (
      <div className="p-2 bg-white dark:bg-slate-800 rounded border-2 border-[#2d6e3e] shadow-lg animate-in slide-in-from-top-2" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-1 mb-2 text-xs">
          <span className="px-1.5 py-0.5 rounded bg-[#2d6e3e] text-white font-bold">
            {DAY_LABELS_SHORT[dayIndex]} {date.getDate()}/{date.getMonth() + 1}
          </span>
          <span className="text-slate-500">{unit.name}</span>
        </div>
        <div className="space-y-1.5">
          <select
            value={form.userName || ''}
            onChange={e => onChange({ ...form, userName: e.target.value, 
              userPosition: unit.members.find(m => m.fullName === e.target.value)?.position || '',
              department: unit.members.find(m => m.fullName === e.target.value)?.department || '',
              workUnit: unit.members.find(m => m.fullName === e.target.value)?.workUnit || ''
            })}
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          >
            <option value="">Chọn nhân sự...</option>
            {unit.members.map(m => (
              <option key={m.id} value={m.fullName}>{m.fullName} - {m.position}</option>
            ))}
          </select>
          
          <input
            type="text"
            value={form.taskName || ''}
            onChange={e => onChange({ ...form, taskName: e.target.value })}
            placeholder="Tên công việc *"
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium"
            autoFocus
          />
          
          <select
            value={form.taskType || 'Công tác'}
            onChange={e => onChange({ ...form, taskType: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          >
            <option value="Công tác">Công tác</option>
            <option value="Họp">Họp</option>
            <option value="Làm việc tại cơ quan">Làm việc tại cơ quan</option>
            <option value="Đào tạo">Đào tạo</option>
            <option value="Khác">Khác</option>
          </select>
          
          <input
            type="text"
            value={form.location || ''}
            onChange={e => onChange({ ...form, location: e.target.value })}
            placeholder="Địa điểm"
            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          />
          
          <div className="flex gap-1">
            <button onClick={onSave} className="flex-1 px-2 py-1 text-xs text-white bg-[#2d6e3e] rounded hover:bg-[#235832] font-bold">
              <Save className="w-3 h-3 inline mr-0.5" /> Lưu
            </button>
            <button onClick={onCancel} className="flex-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Handle inline save
  const handleInlineSave = useCallback((unit: OrgUnit, dayIndex: number, date: Date) => {
    if (!inlineEditForm.taskName?.trim() || !inlineEditForm.userName?.trim()) {
      addToast('error', 'Lỗi', 'Vui lòng nhập tên công việc và chọn nhân sự');
      return;
    }
    
    const newSchedule: WeeklySchedule = {
      id: 'ws_' + Date.now(),
      weekStartDate: weekStartDate.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      department: inlineEditForm.department || '',
      workUnit: inlineEditForm.workUnit || '',
      userName: inlineEditForm.userName || '',
      userPosition: inlineEditForm.userPosition || '',
      dayOfWeek: dayIndex,
      date: date.toISOString().split('T')[0],
      taskName: inlineEditForm.taskName || '',
      taskType: (inlineEditForm.taskType as WeeklySchedule['taskType']) || 'Công tác',
      location: inlineEditForm.location || '',
      notes: inlineEditForm.notes || '',
      status: (inlineEditForm.status as WeeklySchedule['status']) || 'Chưa bắt đầu',
      createdAt: new Date().toISOString(),
      createdBy: 'inline_edit',
    };
    
    onAddSchedule(newSchedule);
    setInlineEditingCell(null);
    setInlineEditForm({});
    addToast('success', 'Thành công', 'Đã thêm lịch công tác mới');
  }, [inlineEditForm, weekStartDate, weekEndDate, onAddSchedule, addToast]);

  return (
    <div className="max-w-full mx-auto pb-12 space-y-5 px-4">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#2d6e3e]" />
            <span>Lịch Công Tac Tuần - Bảng Tổng Hợp</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem lịch theo cấu trúc tổ chức: Lãnh đạo - Phòng ban - Cơ sở | 7 ngày trong tuần
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần trước">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            
            <div className="px-4 py-2 bg-[#2d6e3e] text-white rounded-lg shadow-sm">
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Tuần</div>
              <div className="font-bold text-lg">
                {weekStartDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - 
                {weekEndDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>

            <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần sau">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>

            <button onClick={handleThisWeek} className="ml-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Tuần này
            </button>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedGroupFilter}
              onChange={e => { setSelectedGroupFilter(e.target.value); setSelectedWorkUnit('ALL'); setSelectedDay(null); setDrillDown(null); }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e] min-w-[200px]"
            >
              <option value="ALL">Tất cả nhóm</option>
              <option value="leader">🟢 Nhóm Lãnh đạo</option>
              <option value="department">🔵 Nhóm Phòng ban</option>
              <option value="baseUnit">🟦 Nhóm Thống kê cơ sở tất cả</option>
            </select>

            <select
              value={selectedWorkUnit}
              onChange={e => { setSelectedWorkUnit(e.target.value); setSelectedDay(null); setDrillDown(null); }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e] min-w-[200px]"
            >
              <option value="ALL">Tất cả đơn vị</option>
              {orgUnits.filter(u => u.type !== 'leader' && (selectedGroupFilter === 'ALL' || u.type === selectedGroupFilter)).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm công việc, nhân sự, địa điểm..."
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e] min-w-[200px]"
              />
            </div>

            <select
              value={filterTaskType}
              onChange={e => setFilterTaskType(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="Họp">Họp</option>
              <option value="Công tác">Công tác</option>
              <option value="Làm việc tại cơ quan">Làm việc tại cơ quan</option>
              <option value="Đào tạo">Đào tạo</option>
              <option value="Khác">Khác</option>
            </select>

            <button onClick={downloadTemplate} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
              File Mẫu
            </button>

            <button onClick={exportToExcel} disabled={schedules.length === 0} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <DownloadIcon className="w-4 h-4" />
              Xuất Excel
            </button>

            <button onClick={triggerFileImport} disabled={isImporting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50">
              <UploadIcon className="w-4 h-4" />
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tải Lên'}
            </button>

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileImport} className="hidden" />

            <button onClick={() => openAddForm()} className="px-4 py-2 text-sm font-bold text-white bg-[#2d6e3e] hover:bg-[#235832] rounded-lg flex items-center gap-2 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Đăng Ký / Nhập Lịch
            </button>
          </div>
        </div>
      </div>

      {/* Charts Dashboard: 6 Task Type Breakdown Horizontal Bar Charts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <HorizontalBarChart data={totalChartData} title="Tổng lịch" color="#2d6e3e" />
        <HorizontalBarChart data={meetingOnlineChartData} title="Lịch Họp trực tuyến" color="#3b82f6" />
        <HorizontalBarChart data={meetingOfflineChartData} title="Lịch Họp trực tiếp" color="#10b981" />
        <HorizontalBarChart data={workAtOfficeChartData} title="Lịch làm việc tại cơ sở" color="#f59e0b" />
        <HorizontalBarChart data={businessTripChartData} title="Công tác ngoài tỉnh" color="#ef4444" />
        <HorizontalBarChart data={otherChartData} title="Làm việc tại cơ quan" color="#8b5cf6" />
      </div>

      {/* Main Layout with Sidebar */}
      <div className="flex gap-4">
        {/* Sidebar Navigation - Collapsible Tree */}
        {sidebarOpen && (
          <aside className="w-64 lg:w-72 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Layout className="w-4 h-4 text-[#2d6e3e]" />
                <span>Cây đơn vị</span>
              </h3>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title="Thu gọn">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <nav className="p-2 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
              {/* Leaders Group */}
              <details className={expandedGroups.leader ? 'open' : ''} onToggle={() => setExpandedGroups(prev => ({ ...prev, leader: !prev.leader }))}>
                <summary className="flex items-center gap-2 px-2 py-1.5 font-semibold text-emerald-700 dark:text-emerald-300 text-xs cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded">
                  <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                  <Users className="w-3 h-3" />
                  <span>Lãnh đạo Cục</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    {orgUnits.filter(u => u.type === 'leader').reduce((sum, u) => sum + u.members.length, 0)} NV
                  </span>
                </summary>
                <div className="pl-6 space-y-1">
                  {orgUnits.filter(u => u.type === 'leader').map(unit => (
                    <button
                      key={unit.id}
                      onClick={() => {
                        setSelectedWorkUnit(unit.name);
                        setSelectedGroupFilter('leader');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="truncate font-medium text-emerald-800 dark:text-emerald-200">{unit.name}</span>
                      <span className="ml-auto text-[9px] text-slate-500">{unit.members.length} NV</span>
                    </button>
                  ))}
                </div>
              </details>

              {/* Departments Group */}
              <details className={expandedGroups.department ? 'open' : ''} onToggle={() => setExpandedGroups(prev => ({ ...prev, department: !prev.department }))}>
                <summary className="flex items-center gap-2 px-2 py-1.5 font-semibold text-blue-700 dark:text-blue-300 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded">
                  <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                  <Building className="w-3 h-3" />
                  <span>Phòng ban</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {orgUnits.filter(u => u.type === 'department').reduce((sum, u) => sum + u.members.length, 0)} NV
                  </span>
                </summary>
                <div className="pl-6 space-y-1">
                  {orgUnits.filter(u => u.type === 'department').map(unit => (
                    <button
                      key={unit.id}
                      onClick={() => {
                        setSelectedWorkUnit(unit.name);
                        setSelectedGroupFilter('department');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="truncate font-medium text-blue-800 dark:text-blue-200">{unit.name}</span>
                      <span className="ml-auto text-[9px] text-slate-500">{unit.members.length} NV</span>
                    </button>
                  ))}
                </div>
              </details>

              {/* Base Units Group */}
              <details className={expandedGroups.baseUnit ? 'open' : ''} onToggle={() => setExpandedGroups(prev => ({ ...prev, baseUnit: !prev.baseUnit }))}>
                <summary className="flex items-center gap-2 px-2 py-1.5 font-semibold text-teal-700 dark:text-teal-300 text-xs cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded">
                  <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                  <MapPin className="w-3 h-3" />
                  <span>Thống kê cơ sở</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300">
                    {orgUnits.filter(u => u.type === 'baseUnit').reduce((sum, u) => sum + u.members.length, 0)} NV
                  </span>
                </summary>
                <div className="pl-6 space-y-1">
                  {orgUnits.filter(u => u.type === 'baseUnit').map(unit => (
                    <button
                      key={unit.id}
                      onClick={() => {
                        setSelectedWorkUnit(unit.name);
                        setSelectedGroupFilter('baseUnit');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      <span className="truncate font-medium text-teal-800 dark:text-teal-200">{unit.name.replace('Thống kê cơ sở ', 'TKCS ')}</span>
                      <span className="ml-auto text-[9px] text-slate-500">{unit.members.length} NV</span>
                    </button>
                  ))}
                </div>
              </details>
            </nav>
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1"
              >
                <ChevronRight className="w-3 h-3 inline mr-1" /> Thu gọn sidebar
              </button>
            </div>
          </aside>
        )}

        {/* Main Table Grid */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_repeat(7,minmax(120px,1fr))] bg-[#006097] text-white border-b border-[#004d7a]">
          <div className="px-3 py-3 font-bold text-sm text-center sticky left-0 z-10 bg-[#006097] border-r border-[#004d7a]">
            ĐỐI TƯỢNG / NGÀY
          </div>
          {weekDates.map((date, idx) => (
            <div key={idx} className={`px-2 py-3 text-center text-xs font-medium border-r border-[#004d7a] ${DAY_HEADER_COLORS[idx]} ${date.toDateString() === new Date().toDateString() ? 'ring-2 ring-yellow-300/50' : ''}`}>
              <div className="text-[10px] opacity-80">{date.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })}</div>
              <div className="font-bold">{DAY_LABELS[idx]}</div>
              <div className="text-[10px]">{date.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <div className="grid grid-cols-[1fr_repeat(7,minmax(120px,1fr))]">
            {filteredOrgUnits.map((unit, unitIdx) => (
              <React.Fragment key={unit.id}>
                {/* Row Header */}
                <div className={`px-3 py-2 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 sticky left-0 z-10 ${unit.type === 'leader' ? 'bg-emerald-50 dark:bg-emerald-950/30' : unit.type === 'department' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-teal-50 dark:bg-teal-950/30'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${unit.type === 'leader' ? 'bg-emerald-600' : unit.type === 'department' ? 'bg-blue-600' : 'bg-teal-600'}`} />
                    <span className={`font-medium text-xs ${unit.type === 'leader' ? 'text-emerald-800 dark:text-emerald-200' : unit.type === 'department' ? 'text-blue-800 dark:text-blue-200' : 'text-teal-800 dark:text-teal-200'}`}>
                      {unit.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/50 dark:bg-slate-800/50">
                      {unit.members.length} NV
                    </span>
                  </div>
                </div>

                {/* Cells for 7 days */}
                {weekDates.map((date, dayIndex) => {
                  const daySchedules = getSchedulesForUnitAndDay(unit, dayIndex);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isInlineEditing = inlineEditingCell?.unitId === unit.id && inlineEditingCell?.dayIndex === dayIndex;
                  
                  const handleCellClick = (e: React.MouseEvent) => {
                    if (daySchedules.length === 0 && !isInlineEditing) {
                      e.stopPropagation();
                      setInlineEditingCell({ unitId: unit.id, dayIndex });
                      const firstMember = unit.members[0];
                      setInlineEditForm({
                        date: date.toISOString().split('T')[0],
                        dayOfWeek: dayIndex,
                        taskType: 'Công tác',
                        status: 'Chưa bắt đầu',
                        userName: firstMember?.fullName || '',
                        userPosition: firstMember?.position || '',
                        department: firstMember?.department || '',
                        workUnit: firstMember?.workUnit || '',
                      });
                    }
                  };
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className={`px-2 py-2 border-b border-slate-200 dark:border-slate-800 border-r border-slate-200 dark:border-slate-800 min-h-[80px] ${DAY_COLUMN_STRIPES[dayIndex]} ${isToday ? 'ring-2 ring-sky-400/50' : ''} ${daySchedules.length > 0 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''} hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors relative`}
                      onClick={handleCellClick}
                    >
                      {isInlineEditing ? (
                        <InlineEditForm
                          unit={unit}
                          dayIndex={dayIndex}
                          date={date}
                          form={inlineEditForm}
                          onChange={setInlineEditForm}
                          onSave={() => handleInlineSave(unit, dayIndex, date)}
                          onCancel={() => setInlineEditingCell(null)}
                        />
                      ) : (
                        <>
{daySchedules.map((schedule, taskIdx) => (
                            <div 
                              key={schedule.id} 
                              className="mb-1.5 p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-shadow cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleEditClick(schedule); }}
                              title="Click để chỉnh sửa"
                            >
                              <div className="flex items-start gap-1.5">
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${{
                                  'Đã hoàn thành': 'bg-emerald-100 text-emerald-700',
                                  'Đang thực hiện': 'bg-sky-100 text-sky-700',
                                  'Chưa bắt đầu': 'bg-amber-100 text-amber-700',
                                  'Hủy': 'bg-rose-100 text-rose-700',
                                }[schedule.status] || 'bg-slate-100 text-slate-700'}`}>
                                  {STATUS_ICONS[schedule.status as keyof typeof STATUS_ICONS]}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {schedule.taskName}
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span>{schedule.userName}</span>
                                    {schedule.location && <span className="truncate">· {schedule.location}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {daySchedules.length === 0 && !isInlineEditing && (
                            <div className="text-center text-slate-300 dark:text-slate-600 py-4">
                              <span className="text-[10px]">—</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      </div>
      </div>

      {/* Footer Dashboard: Progress Bars + Time Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#2d6e3e]" />
            Tổng Hợp Tuần: {weekStartDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekEndDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </h3>
          <button 
            onClick={() => setShowTimeFilterModal(true)} 
            className="px-4 py-2 text-sm font-medium text-white bg-[#2d6e3e] hover:bg-[#235832] rounded-lg flex items-center gap-2 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Xem Tháng/Quý/Năm
          </button>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700 dark:text-slate-300">Tổng tiến độ hoàn thành</span>
              <span className="font-bold text-emerald-600">{weekStats.completionRate}%</span>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${weekStats.completionRate}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-emerald-600">{weekStats.completed}</p>
              <p className="text-[10px] text-emerald-500">{weekStats.total > 0 ? Math.round((weekStats.completed/weekStats.total)*100) : 0}%</p>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-900">
              <p className="text-xs text-sky-700 dark:text-sky-300">Đang thực hiện</p>
              <p className="text-2xl font-bold text-sky-600">{weekStats.inProgress}</p>
              <p className="text-[10px] text-sky-500">{weekStats.total > 0 ? Math.round((weekStats.inProgress/weekStats.total)*100) : 0}%</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-xs text-amber-700 dark:text-amber-300">Chưa bắt đầu</p>
              <p className="text-2xl font-bold text-amber-600">{weekStats.pending}</p>
              <p className="text-[10px] text-amber-500">{weekStats.total > 0 ? Math.round((weekStats.pending/weekStats.total)*100) : 0}%</p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900">
              <p className="text-xs text-rose-700 dark:text-rose-300">Đã hủy</p>
              <p className="text-2xl font-bold text-rose-600">{weekStats.cancelled}</p>
              <p className="text-[10px] text-rose-500">{weekStats.total > 0 ? Math.round((weekStats.cancelled/weekStats.total)*100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal (Right Side Panel) */}
      {showAddForm && (
        <div className="fixed right-0 top-0 bottom-0 z-50 w-full lg:w-[480px] bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2d6e3e]" />
              {editingSchedule ? 'Chỉnh sửa lịch' : 'Thêm lịch mới'}
            </h3>
            <button onClick={() => { setShowAddForm(false); setAddForm({}); setEditingSchedule(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Assignee Selection - Dropdown from actual org units */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Đối tượng thực hiện <span className="text-rose-500">*</span></label>
              <select 
                value={addForm.userName || ''}
                onChange={e => {
                  const selectedUser = users.find(u => u.fullName === e.target.value);
                  setAddForm(prev => ({ 
                    ...prev, 
                    userName: e.target.value,
                    userPosition: selectedUser?.position,
                    department: selectedUser?.department,
                    workUnit: selectedUser?.workUnit
                  }));
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="">Chọn nhân sự...</option>
                <optgroup label="🟢 Lãnh đạo Cục">
                  {users.filter(u => u.role === 'PROVINCE_LEADER' || /cục trưởng|phó cục trưởng/i.test(u.position || '')).map(u => (
                    <option key={u.id} value={u.fullName}>{u.fullName} - {u.position}</option>
                  ))}
                </optgroup>
                {(() => {
                    const nonLeaderUsers = users.filter(u => !(u.role === 'PROVINCE_LEADER' || /cục trưởng|phó cục trưởng/i.test(u.position || '')));
                    const departments = Array.from(new Set(nonLeaderUsers.map(u => u.department)));
                    return departments.map(dept => (
                      <optgroup key={dept} label={`🔵 ${dept}`}>
                        {nonLeaderUsers.filter(u => u.department === dept).map(u => (
                          <option key={u.id} value={u.fullName}>{u.fullName} - {u.position}</option>
                        ))}
                      </optgroup>
                    ));
                  })()}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ngày <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((date, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddFormDateChange(idx)}
                    className={`py-2 text-center text-xs rounded-lg transition-all ${
                      addForm.dayOfWeek === idx
                        ? 'bg-[#2d6e3e] text-white font-bold'
                        : date.toDateString() === new Date().toDateString()
                        ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>{DAY_LABELS_SHORT[idx]}</div>
                    <div className="font-bold">{date.getDate()}</div>
                  </button>
                ))}
              </div>
            </div>

            <input 
              type="text" 
              value={addForm.taskName || ''} 
              onChange={e => setAddForm({...addForm, taskName: e.target.value})}
              placeholder="Tên công việc / Nội dung *"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            />
            
            <select 
              value={addForm.taskType || 'Công tác'}
              onChange={e => setAddForm({...addForm, taskType: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            >
              <option value="Công tác">Công tác</option>
              <option value="Họp">Họp</option>
              <option value="Làm việc tại cơ quan">Làm việc tại cơ quan</option>
              <option value="Đào tạo">Đào tạo</option>
              <option value="Khác">Khác</option>
            </select>

            <input 
              type="text" 
              value={addForm.location || ''} 
              onChange={e => setAddForm({...addForm, location: e.target.value})}
              placeholder="Địa điểm"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            />

            <textarea 
              value={addForm.notes || ''} 
              onChange={e => setAddForm({...addForm, notes: e.target.value})}
              placeholder="Ghi chú"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              rows={2}
            />

            <select 
              value={addForm.status || 'Chưa bắt đầu'}
              onChange={e => setAddForm({...addForm, status: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowAddForm(false); setAddForm({}); setEditingSchedule(null); }} className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg">Hủy</button>
              <button onClick={editingSchedule ? () => handleSaveEdit(editingSchedule) : handleAddSchedule} className="flex-1 px-3 py-2 text-sm text-white bg-[#2d6e3e] rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-[#235832]">
                <Save className="w-4 h-4" /> {editingSchedule ? 'Cập nhật' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Filter Modal */}
      {showTimeFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Báo cáo tổng hợp theo thời gian</h3>
              <button onClick={() => setShowTimeFilterModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {['week', 'month', 'quarter', 'year'].map((filter: TimeFilter) => (
                <button
                  key={filter}
                  onClick={() => { setTimeFilter(filter); setShowTimeFilterModal(false); addToast('info', 'Chuyển chế độ', `Đang xem báo cáo theo ${filter === 'week' ? 'Tuần' : filter === 'month' ? 'Tháng' : filter === 'quarter' ? 'Quý' : 'Năm'}`); }}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${timeFilter === filter ? 'bg-[#2d6e3e] text-white' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  <div className="font-medium">{filter === 'week' ? 'Tuần hiện tại' : filter === 'month' ? 'Tháng hiện tại' : filter === 'quarter' ? 'Quý hiện tại' : 'Năm hiện tại'}</div>
                  <div className="text-xs opacity-70">Thống kê tổng hợp lịch công tác</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};