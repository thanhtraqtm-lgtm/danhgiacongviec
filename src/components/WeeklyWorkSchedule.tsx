import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  PieChart,
  ChevronDown,
  Eye,
  XCircle,
  Maximize2
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
  Legend,
  ResponsiveContainer,
  Pie,
  Cell,
  PieChart as RechartsPieChart
} from 'recharts';

interface WeeklyWorkScheduleProps {
  schedules: WeeklySchedule[];
  users: User[];
  onAddSchedule: (schedule: WeeklySchedule) => void;
  onUpdateSchedule: (schedule: WeeklySchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

const TASK_TYPES = ['Công tác', 'Họp', 'Đào tạo', 'Khác', 'Làm việc tại cơ quan'] as const;
const TASK_TYPE_LABELS = ['Tổng lịch', 'Lịch Họp trực tuyến', 'Lịch Họp trực tiếp', 'Lịch làm việc tại cơ sở', 'Công tác ngoài tỉnh', 'Làm việc tại cơ quan'] as const;
const STATUSES = ['Đã hoàn thành', 'Đang thực hiện', 'Chưa bắt đầu', 'Hủy'] as const;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const WORK_UNITS = [
  'Thống kê tỉnh Hưng Yên',
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

const LEADERS = [
  'Đào Trọng Truyền',
  'Đỗ Xuân Phú',
  'Nguyễn Thị Hoài Thảo',
  'Nguyễn Duy Minh',
];

const DEPARTMENTS_LIST = [
  'Phòng Thống kê Tổng hợp',
  'Phòng TCHC',
  'Phòng Thống kê TMDV & Giá',
  'Phòng Thống kê CNXD',
  'Phòng Thống kê NN&XH',
];

const BASE_UNITS = [
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
];

const STATUS_COLORS = {
  'Đã hoàn thành': '#10b981',
  'Đang thực hiện': '#0ea5e9',
  'Chưa bắt đầu': '#f59e0b',
  'Hủy': '#ef4444',
};

type DrillDownType = 'leaders' | 'departments' | 'baseUnits' | null;

interface DrillDownData {
  type: DrillDownType;
  name: string;
  schedules: WeeklySchedule[];
}

export const WeeklyWorkSchedule: React.FC<WeeklyWorkScheduleProps> = ({
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedWorkUnit, setSelectedWorkUnit] = useState<string>('ALL');
  const [filterTaskType, setFilterTaskType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeeklySchedule>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<WeeklySchedule>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
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

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (selectedWorkUnit !== 'ALL' && s.workUnit !== selectedWorkUnit) return false;
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
    });
  }, [schedules, selectedWorkUnit, filterTaskType, searchQuery]);

  const getSchedulesForDay = (dayIndex: number) => {
    const targetDate = weekDates[dayIndex].toISOString().split('T')[0];
    return filteredSchedules.filter(s => s.date === targetDate)
      .sort((a, b) => a.taskName.localeCompare(b.taskName));
  };

  // Chart data computation
  const getChartData = useCallback((groupList: string[], groupType: 'leader' | 'department' | 'baseUnit') => {
    return groupList.map(name => {
      const groupSchedules = filteredSchedules.filter(s => {
        if (groupType === 'leader') {
          return LEADERS.includes(s.userName) && s.userName === name;
        } else if (groupType === 'department') {
          return s.department === name;
        } else {
          return s.workUnit === name;
        }
      });
      const counts = STATUSES.reduce((acc, status) => {
        acc[status] = groupSchedules.filter(s => s.status === status).length;
        return acc;
      }, {} as Record<string, number>);
      const total = groupSchedules.length;
      return { name, ...counts, total };
    }).filter(d => d.total > 0);
  }, [filteredSchedules]);

  const leaderChartData = useMemo(() => getChartData(LEADERS, 'leader'), [getChartData]);
  const deptChartData = useMemo(() => getChartData(DEPARTMENTS_LIST, 'department'), [getChartData]);
  const baseChartData = useMemo(() => getChartData(BASE_UNITS, 'baseUnit'), [getChartData]);

  // Task type breakdown chart data
  const getTaskTypeChartData = useCallback((taskTypeFilter: string) => {
    return BASE_UNITS.map(name => {
      const unitSchedules = filteredSchedules.filter(s => s.workUnit === name);
      const typeSchedules = taskTypeFilter === 'TOTAL' 
        ? unitSchedules 
        : unitSchedules.filter(s => s.taskType === taskTypeFilter);
      return { name, value: typeSchedules.length };
    }).filter(d => d.value > 0);
  }, [filteredSchedules]);

  const totalChartData = useMemo(() => getTaskTypeChartData('TOTAL'), [getTaskTypeChartData]);
  const meetingOnlineChartData = useMemo(() => getTaskTypeChartData('Họp'), [getTaskTypeChartData]);
  const meetingOfflineChartData = useMemo(() => getTaskTypeChartData('Công tác'), [getTaskTypeChartData]);
  const workAtOfficeChartData = useMemo(() => getTaskTypeChartData('Làm việc tại cơ quan'), [getTaskTypeChartData]);
  const businessTripChartData = useMemo(() => getTaskTypeChartData('Đào tạo'), [getTaskTypeChartData]);
  const otherChartData = useMemo(() => getTaskTypeChartData('Khác'), [getTaskTypeChartData]);

  const handleDrillDown = (type: DrillDownType, name: string) => {
    const groupSchedules = filteredSchedules.filter(s => {
      if (type === 'leaders') return LEADERS.includes(s.userName) && s.userName === name;
      if (type === 'departments') return s.department === name;
      if (type === 'baseUnits') return s.workUnit === name;
      return false;
    });
    setDrillDown({ type, name, schedules: groupSchedules });
  };

  const closeDrillDown = () => setDrillDown(null);

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'Công tác': return <Briefcase className="w-3.5 h-3.5 text-blue-600" />;
      case 'Họp': return <Users className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Đào tạo': return <GraduationCap className="w-3.5 h-3.5 text-purple-600" />;
      case 'Làm việc tại cơ quan': return <BookOpen className="w-3.5 h-3.5 text-slate-600" />;
      default: return <MoreHorizontal className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã hoàn thành': return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300';
      case 'Đang thực hiện': return 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300';
      case 'Chưa bắt đầu': return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300';
      case 'Hủy': return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300';
    }
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

  const openAddForm = (dayIndex?: number) => {
    const initialForm: Partial<WeeklySchedule> = {
      date: dayIndex !== undefined ? weekDates[dayIndex].toISOString().split('T')[0] : weekDates[0]?.toISOString().split('T')[0],
      dayOfWeek: dayIndex ?? 0,
      taskType: 'Công tác',
      status: 'Chưa bắt đầu',
    };
    if (selectedWorkUnit !== 'ALL') {
      initialForm.workUnit = selectedWorkUnit;
    }
    setAddForm(initialForm);
    setShowAddForm(true);
  };

  const downloadTemplate = useCallback(() => {
    const headers = [
      'Đơn vị (workUnit)',
      'Phòng ban (department)',
      'Ngày (YYYY-MM-DD)',
      'Thứ (0-6)',
      'Tên công việc',
      'Loại công việc',
      'Nhân sự',
      'Chức vụ',
      'Địa điểm',
      'Ghi chú',
      'Trạng thái'
    ];

    const sampleData = [
      [
        selectedWorkUnit !== 'ALL' ? selectedWorkUnit : 'Thống kê tỉnh Hưng Yên',
        'Phòng Thống kê Tổng hợp',
        weekDates[0]?.toISOString().split('T')[0] || '',
        '0',
        'Họp triển khai kế hoạch quý',
        'Họp',
        'Nguyễn Văn A',
        'Trưởng phòng',
        'Phòng họp A',
        'Họp định kỳ',
        'Chưa bắt đầu'
      ],
      [
        selectedWorkUnit !== 'ALL' ? selectedWorkUnit : 'Thống kê tỉnh Hưng Yên',
        'Phòng TCHC',
        weekDates[1]?.toISOString().split('T')[0] || '',
        '1',
        'Công tác kiểm tra cơ sở',
        'Công tác',
        'Trần Thị B',
        'Chuyên viên',
        'Thống kê cơ sở Phố Hiến',
        'Kiểm tra định kỳ',
        'Chưa bắt đầu'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mẫu lịch tuần');
    XLSX.writeFile(wb, `Mau_Lich_Tuan_${selectedWorkUnit !== 'ALL' ? selectedWorkUnit.replace(/\s+/g, '_') : 'Tat_Ca'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', 'Đã tải file mẫu về máy');
  }, [selectedWorkUnit, weekDates, addToast]);

  const exportToExcel = useCallback(() => {
    if (filteredSchedules.length === 0) {
      addToast('warning', 'Cảnh báo', 'Không có dữ liệu để xuất');
      return;
    }

    const headers = [
      'Đơn vị (workUnit)',
      'Phòng ban (department)',
      'Ngày (YYYY-MM-DD)',
      'Thứ (0-6)',
      'Tên công việc',
      'Loại công việc',
      'Nhân sự',
      'Chức vụ',
      'Địa điểm',
      'Ghi chú',
      'Trạng thái',
      'Ngày tạo',
      'Người tạo'
    ];

    const data = filteredSchedules.map(s => [
      s.workUnit || '',
      s.department || '',
      s.date,
      s.dayOfWeek,
      s.taskName,
      s.taskType,
      s.userName,
      s.userPosition || '',
      s.location || '',
      s.notes || '',
      s.status,
      s.createdAt,
      s.createdBy
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch công tác tuần');
    XLSX.writeFile(wb, `Lich_Cong_Tac_Tuan_${selectedWorkUnit !== 'ALL' ? selectedWorkUnit.replace(/\s+/g, '_') : 'Tat_Ca'}_${weekStartDate.toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', `Đã xuất ${filteredSchedules.length} bản ghi ra Excel`);
  }, [filteredSchedules, selectedWorkUnit, weekStartDate, addToast]);

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
          if (normalized.includes('đơn vị') || normalized.includes('workunit')) colMap.workUnit = i;
          else if (normalized.includes('phòng ban') || normalized.includes('department')) colMap.department = i;
          else if (normalized.includes('ngày') || normalized.includes('date')) colMap.date = i;
          else if (normalized.includes('thứ') || normalized.includes('dayofweek')) colMap.dayOfWeek = i;
          else if (normalized.includes('tên công việc') || normalized.includes('taskname') || normalized.includes('nội dung')) colMap.taskName = i;
          else if (normalized.includes('loại') || normalized.includes('tasktype')) colMap.taskType = i;
          else if (normalized.includes('nhân sự') || normalized.includes('username') || normalized.includes('người')) colMap.userName = i;
          else if (normalized.includes('chức vụ') || normalized.includes('position') || normalized.includes('userposition')) colMap.userPosition = i;
          else if (normalized.includes('địa điểm') || normalized.includes('location')) colMap.location = i;
          else if (normalized.includes('ghi chú') || normalized.includes('notes') || normalized.includes('note')) colMap.notes = i;
          else if (normalized.includes('trạng thái') || normalized.includes('status')) colMap.status = i;
        });

        const newSchedules: WeeklySchedule[] = [];
        let errorCount = 0;
        let duplicateUnitCount = 0;

        rows.forEach((row, rowIndex) => {
          const workUnit = row[colMap.workUnit]?.toString().trim() || '';
          const department = row[colMap.department]?.toString().trim() || '';
          const date = row[colMap.date]?.toString().trim() || '';
          const dayOfWeek = parseInt(row[colMap.dayOfWeek]?.toString().trim() || '0', 10);
          const taskName = row[colMap.taskName]?.toString().trim() || '';
          const taskType = row[colMap.taskType]?.toString().trim() || 'Công tác';
          const userName = row[colMap.userName]?.toString().trim() || '';
          const userPosition = row[colMap.userPosition]?.toString().trim() || '';
          const location = row[colMap.location]?.toString().trim() || '';
          const notes = row[colMap.notes]?.toString().trim() || '';
          const status = row[colMap.status]?.toString().trim() || 'Chưa bắt đầu';

          if (!taskName || !userName || !date) {
            errorCount++;
            return;
          }

          if (selectedWorkUnit !== 'ALL' && workUnit && workUnit !== selectedWorkUnit) {
            duplicateUnitCount++;
            return;
          }

          const finalWorkUnit = selectedWorkUnit !== 'ALL' ? selectedWorkUnit : (workUnit || '');

          newSchedules.push({
            id: 'ws_' + Date.now() + '_' + rowIndex,
            weekStartDate: weekStartDate.toISOString(),
            weekEndDate: weekEndDate.toISOString(),
            department,
            workUnit: finalWorkUnit,
            userName,
            userPosition,
            dayOfWeek: isNaN(dayOfWeek) ? 0 : dayOfWeek,
            date,
            taskName,
            taskType: TASK_TYPES.includes(taskType as any) ? taskType as any : 'Công tác',
            location,
            notes,
            status: STATUSES.includes(status as any) ? status as any : 'Chưa bắt đầu',
            createdAt: new Date().toISOString(),
            createdBy: 'import_excel',
          });
        });

        if (duplicateUnitCount > 0) {
          addToast('error', 'Lỗi đơn vị không khớp', 
            `${duplicateUnitCount} dòng bị bỏ qua: Đơn vị trong file không trùng với đơn vị đang chọn (${selectedWorkUnit}). Vui lòng chọn đúng đơn vị hoặc sửa file Excel.`);
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
  }, [selectedWorkUnit, weekStartDate, weekEndDate, onAddSchedule, addToast]);

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  const stats = useMemo(() => {
    const total = filteredSchedules.length;
    const completed = filteredSchedules.filter(s => s.status === 'Đã hoàn thành').length;
    const inProgress = filteredSchedules.filter(s => s.status === 'Đang thực hiện').length;
    const pending = filteredSchedules.filter(s => s.status === 'Chưa bắt đầu').length;
    const cancelled = filteredSchedules.filter(s => s.status === 'Hủy').length;
    return { total, completed, inProgress, pending, cancelled };
  }, [filteredSchedules]);

  // Chart Components
  const StackedBarChart = ({ data, title, color, onClick, unitName }: { 
    data: any[], 
    title: string, 
    color: string,
    onClick: (name: string) => void,
    unitName: string
  }) => {
    if (data.length === 0) return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 h-64 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Chưa có dữ liệu</span>
      </div>
    );

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3 h-48 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onClick(unitName)}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-slate-800 dark:text-slate-100 text-xs">{title}</h4>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <BarChart2 className="w-2.5 h-2.5" />
            Chi tiết
          </span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip 
              formatter={(value: number) => [value, 'lịch']}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            />
            <Legend />
            {STATUSES.map((status, index) => (
              <Bar 
                key={status} 
                dataKey={status} 
                stackId="a" 
                fill={STATUS_COLORS[status as keyof typeof STATUS_COLORS]} 
                name={status}
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

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

  const PieChartCard = ({ data, title, onClick, unitName }: { 
    data: any[], 
    title: string,
    onClick: (name: string) => void,
    unitName: string
  }) => {
    if (data.length === 0) return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 h-64 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Chưa có dữ liệu</span>
      </div>
    );

    const pieData = data.map(d => ({
      name: d.name,
      value: d.total,
      color: STATUS_COLORS['Đang thực hiện']
    }));

    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3 h-48 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onClick(unitName)}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-slate-800 dark:text-slate-100 text-xs">{title}</h4>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <PieChart className="w-2.5 h-2.5" />
            Chi tiết
          </span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={45}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'lịch']} />
          </RechartsPieChart>
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
              <button onClick={closeDrillDown} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{drillDown.name}</h3>
                <p className="text-xs text-slate-500">{drillDown.schedules.length} lịch công tác trong tuần</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg" onClick={closeDrillDown}>Đóng</button>
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
                            {getTaskTypeIcon(schedule.taskType)}
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{schedule.taskName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(schedule.status)}`}>
                              {schedule.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{schedule.date} ({DAY_LABELS[schedule.dayOfWeek]})</span>
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
                          <button onClick={() => { handleEditClick(schedule); closeDrillDown(); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Sửa">
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

  return (
    <div className="max-w-full mx-auto pb-12 space-y-5 px-4">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#2d6e3e]" />
            <span>Lịch Công Tac Tuần</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý lịch công tác, họp, đào tạo hàng tuần theo đơn vị & nhân sự
          </p>
        </div>
      </div>

      {/* Dashboard Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng lịch</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Đã hoàn thành</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Đang thực hiện</p>
              <p className="text-2xl font-bold text-sky-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Chưa bắt đầu</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Đã hủy</p>
              <p className="text-2xl font-bold text-rose-600">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Dashboard - Row 1: Pie charts for Leaders & Departments, Bar for Base Units */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* 4 Lãnh đạo - Pie Chart */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2d6e3e]" />
            4 Lãnh đạo Cục
          </h4>
          <PieChartCard 
            data={leaderChartData} 
            title="Phân bố lịch" 
            onClick={(name) => handleDrillDown('leaders', name)}
            unitName=""
          />
        </div>

        {/* 5 Phòng ban - Pie Chart */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            5 Phòng ban
          </h4>
          <PieChartCard 
            data={deptChartData} 
            title="Phân bố lịch" 
            onClick={(name) => handleDrillDown('departments', name)}
            unitName=""
          />
        </div>

        {/* 14 Cơ sở - Stacked Bar Chart (wider) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-600" />
            14 Cơ sở Thống kê
          </h4>
          <StackedBarChart 
            data={baseChartData} 
            title="Lịch theo trạng thái" 
            color="#0d9488"
            onClick={(name) => handleDrillDown('baseUnits', name)}
            unitName=""
          />
        </div>
      </div>

      {/* Charts Dashboard - Row 2: 6 Task Type Breakdown Horizontal Bar Charts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <HorizontalBarChart data={totalChartData} title="Tổng lịch" color="#2d6e3e" />
        <HorizontalBarChart data={meetingOnlineChartData} title="Lịch Họp trực tuyến" color="#3b82f6" />
        <HorizontalBarChart data={meetingOfflineChartData} title="Lịch Họp trực tiếp" color="#10b981" />
        <HorizontalBarChart data={workAtOfficeChartData} title="Lịch làm việc tại cơ sở" color="#f59e0b" />
        <HorizontalBarChart data={businessTripChartData} title="Công tác ngoài tỉnh" color="#ef4444" />
        <HorizontalBarChart data={otherChartData} title="Làm việc tại cơ quan" color="#8b5cf6" />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Unit Filter & Search */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Building className="w-4 h-4 text-[#2d6e3e]" />
              <span>Đơn vị:</span>
            </label>
            <select
              value={selectedWorkUnit}
              onChange={e => { setSelectedWorkUnit(e.target.value); setSelectedDay(null); setDrillDown(null); }}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e] min-w-[280px]"
            >
              <option value="ALL">Tất cả đơn vị (15 đơn vị)</option>
              {WORK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm công việc, nhân sự, địa điểm..."
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e] min-w-[250px]"
              />
            </div>

            <select
              value={filterTaskType}
              onChange={e => setFilterTaskType(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">Tất cả loại</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
              title="Tải file mẫu Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              File Mẫu
            </button>

            <button
              onClick={exportToExcel}
              disabled={filteredSchedules.length === 0}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Xuất ra file Excel"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>

            <button
              onClick={triggerFileImport}
              disabled={isImporting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Nhập từ file Excel"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tải Lên'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />

            <button
              onClick={() => openAddForm()}
              className="px-4 py-2 text-sm font-bold text-white bg-[#2d6e3e] hover:bg-[#235832] rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Đăng Ký / Nhập Lịch
            </button>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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

        <div className="text-sm text-slate-500">
          Đơn vị: <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedWorkUnit === 'ALL' ? 'Tất cả' : selectedWorkUnit}</span> | 
          {filteredSchedules.length} lịch
        </div>
      </div>

      {/* Main Grid: Left Week Calendar + Right Day Schedule */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* Calendar Area - Weekly View */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          {/* Week Header */}
          <div className="p-3.5 bg-[#2d6e3e] text-white flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2 tracking-wide uppercase">
              <CalendarIcon className="w-4 h-4" />
              Lịch tuần
            </h3>
          </div>
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-[#235832] text-white border-b border-[#1b4426]">
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDay === idx;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDay(idx)}
                  className={`py-3 text-center cursor-pointer transition-all relative ${
                    isSelected 
                      ? 'bg-[#2d6e3e] text-white font-bold' 
                      : isToday
                      ? 'bg-white/10 text-yellow-300 font-bold'
                      : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <div className={`text-xs font-medium ${idx >= 5 ? 'text-amber-300' : ''}`}>
                    {DAY_LABELS[idx]}
                  </div>
                  <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-yellow-200' : ''}`}>
                    {date.getDate()}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {date.toLocaleDateString('vi-VN', { month: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Days Grid - List View */}
          <div className="grid grid-cols-7 flex-1 min-h-[400px]">
            {weekDates.map((date, dayIndex) => {
              const daySchedules = getSchedulesForDay(dayIndex);
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = selectedDay === dayIndex;
              const hasSchedules = daySchedules.length > 0;

              return (
                <div 
                  key={dayIndex} 
                  onClick={() => setSelectedDay(dayIndex)}
                  className={`border border-slate-200 dark:border-slate-800 p-2 flex flex-col min-h-[150px] ${
                    isSelected 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#2d6e3e] ring-2 ring-[#2d6e3e]/50 z-10' 
                      : isToday
                      ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300/50'
                      : hasSchedules
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday 
                        ? 'bg-sky-600 text-white shadow-xs' 
                        : isSelected
                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {date.getDate()}
                    </span>
                    {hasSchedules && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                        {daySchedules.length} việc
                      </span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
                    {daySchedules.map((schedule, idx) => (
                      <div 
                        key={schedule.id} 
                        className={`text-[10.5px] px-1.5 py-1 rounded font-medium border cursor-pointer hover:shadow-sm transition-shadow ${
                          getStatusColor(schedule.status)
                        }`}
                        title={`${schedule.taskName} - ${schedule.userName}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          {getTaskTypeIcon(schedule.taskType)}
                          <span className="font-bold truncate">{schedule.taskName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] opacity-80">
                          <span className="truncate">{schedule.userName}</span>
                          {schedule.location && (
                            <>
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{schedule.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {!hasSchedules && (
                      <div className="text-center py-6 text-slate-400">
                        <span className="text-[11px]">Chưa có lịch</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); openAddForm(dayIndex); }}
                    className="mt-2 text-center text-[11px] text-slate-400 hover:text-[#2d6e3e] font-medium transition-colors"
                  >
                    + Thêm
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Detail / Add Form (Right Pane) */}
        <div className="w-full lg:w-[420px] flex flex-col gap-4 shrink-0">
          {showAddForm && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-[500px]">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#2d6e3e]" />
                  Thêm lịch mới
                </h3>
                <button onClick={() => { setShowAddForm(false); setAddForm({}); }} className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-3">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ngày</label>
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
                          <div>{DAY_LABELS[idx].charAt(0)}</div>
                          <div className="font-bold">{date.getDate()}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <input 
                    type="text" 
                    value={addForm.taskName || ''} 
                    onChange={e => setAddForm({...addForm, taskName: e.target.value})}
                    placeholder="Tên công việc / Nội dung"
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                  
                  <select 
                    value={addForm.taskType || 'Công tác'}
                    onChange={e => setAddForm({...addForm, taskType: e.target.value})}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

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
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Chọn nhân sự</option>
                    {users.map(u => <option key={u.id} value={u.fullName}>{u.fullName} - {u.position}</option>)}
                  </select>

                  {/* WorkUnit field - pre-filled and disabled when unit is selected */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Đơn vị (Cơ sở) {selectedWorkUnit !== 'ALL' && <span className="text-xs text-emerald-600">(Đã khóa theo bộ lọc)</span>}
                    </label>
                    <select 
                      value={addForm.workUnit || (selectedWorkUnit !== 'ALL' ? selectedWorkUnit : '')}
                      onChange={selectedWorkUnit === 'ALL' ? e => setAddForm({...addForm, workUnit: e.target.value}) : undefined}
                      disabled={selectedWorkUnit !== 'ALL'}
                      className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                    >
                      <option value="">Chọn đơn vị</option>
                      {WORK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <input 
                    type="text" 
                    value={addForm.location || ''} 
                    onChange={e => setAddForm({...addForm, location: e.target.value})}
                    placeholder="Địa điểm (tùy chọn)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />

                  <textarea 
                    value={addForm.notes || ''} 
                    onChange={e => setAddForm({...addForm, notes: e.target.value})}
                    placeholder="Ghi chú (tùy chọn)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    rows={2}
                  />

                  <select 
                    value={addForm.status || 'Chưa bắt đầu'}
                    onChange={e => setAddForm({...addForm, status: e.target.value})}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => { setShowAddForm(false); setAddForm({}); }} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg">Hủy</button>
                    <button onClick={handleAddSchedule} className="px-3 py-1.5 text-xs text-white bg-[#2d6e3e] rounded-lg flex items-center gap-1 font-bold hover:bg-[#235832]">
                      <Save className="w-3 h-3" /> Lưu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showAddForm && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-[500px]">
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    {selectedDay !== null 
                      ? `Chi tiết ${DAY_LABELS[selectedDay]} (${weekDates[selectedDay]?.toLocaleDateString('vi-VN')})`
                      : 'Chọn ngày trên lịch'
                    }
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedDay !== null ? getSchedulesForDay(selectedDay).length : 0} lịch trong ngày
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-3">
                {selectedDay === null && (
                  <div className="text-center py-12 text-slate-400">
                    <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Chọn một ngày trong tuần để xem chi tiết</p>
                  </div>
                )}

                {selectedDay !== null && getSchedulesForDay(selectedDay).length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-2">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Không có lịch công tác trong ngày này</p>
                    <button 
                      onClick={() => openAddForm(selectedDay)}
                      className="mt-3 px-3 py-1.5 text-xs text-white bg-[#2d6e3e] rounded-lg hover:bg-[#235832] transition-colors"
                    >
                      Thêm lịch đầu tiên
                    </button>
                  </div>
                )}

                {selectedDay !== null && getSchedulesForDay(selectedDay).length > 0 && (
                  getSchedulesForDay(selectedDay).map((schedule, idx) => (
                    <div key={schedule.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 space-y-2.5 shadow-xs">
                      {editingSchedule === schedule.id ? (
                        <div className="space-y-2.5">
                          <input 
                            type="text" 
                            value={editForm.taskName} 
                            onChange={e => setEditForm({...editForm, taskName: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          />
                          <select 
                            value={editForm.taskType}
                            onChange={e => setEditForm({...editForm, taskType: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          >
                            {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input 
                            type="text" 
                            value={editForm.userName || ''} 
                            onChange={e => {
                              const selectedUser = users.find(u => u.fullName === e.target.value);
                              setEditForm(prev => ({ 
                                ...prev, 
                                userName: e.target.value,
                                userPosition: selectedUser?.position,
                                department: selectedUser?.department,
                                workUnit: selectedUser?.workUnit
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                            list="user-list"
                          />
                          <datalist id="user-list">
                            {users.map(u => <option key={u.id} value={u.fullName} />)}
                          </datalist>
                          
                          {/* WorkUnit in edit form - also locked to selected unit */}
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Đơn vị (Cơ sở) {selectedWorkUnit !== 'ALL' && <span className="text-xs text-emerald-600">(Đã khóa theo bộ lọc)</span>}
                            </label>
                            <select 
                              value={editForm.workUnit || (selectedWorkUnit !== 'ALL' ? selectedWorkUnit : '')}
                              onChange={selectedWorkUnit === 'ALL' ? e => setEditForm({...editForm, workUnit: e.target.value}) : undefined}
                              disabled={selectedWorkUnit !== 'ALL'}
                              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                            >
                              <option value="">Chọn đơn vị</option>
                              {WORK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>

                          <input 
                            type="text" 
                            value={editForm.location || ''} 
                            onChange={e => setEditForm({...editForm, location: e.target.value})}
                            placeholder="Địa điểm"
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          />
                          <textarea 
                            value={editForm.notes || ''} 
                            onChange={e => setEditForm({...editForm, notes: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                            rows={2}
                          />
                          <select 
                            value={editForm.status}
                            onChange={e => setEditForm({...editForm, status: e.target.value})}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          
                          <div className="flex gap-2 justify-end pt-1">
                            <button onClick={() => setEditingSchedule(null)} className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg">Hủy</button>
                            <button onClick={() => handleSaveEdit(schedule.id)} className="px-2.5 py-1 text-xs text-white bg-[#2d6e3e] rounded-lg flex items-center gap-1 font-bold hover:bg-[#235832]">
                              <Save className="w-3 h-3" /> Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-center gap-2">
                              {getTaskTypeIcon(schedule.taskType)}
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                                {idx + 1}. {schedule.taskName}
                              </h4>
                            </div>
                            <div className="flex gap-1 shrink-0 ml-2">
                              <button onClick={() => handleEditClick(schedule)} className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Sửa">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => {
                                if (confirm('Bạn có chắc muốn xóa lịch công tác này?')) {
                                  onDeleteSchedule(schedule.id);
                                  addToast('success', 'Đã xóa', 'Lịch công tác đã được xóa thành công');
                                }
                              }} className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors" title="Xóa">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                              <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>Loại: {schedule.taskType}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(schedule.status)}`}>
                                {schedule.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{schedule.userName} - {schedule.userPosition || ''}</span>
                            </div>

                            {schedule.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{schedule.location}</span>
                              </div>
                            )}

                            {schedule.department && (
                              <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>Phòng ban: {schedule.department}</span>
                              </div>
                            )}

                            {schedule.workUnit && (
                              <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span className="font-medium">Cơ sở: {schedule.workUnit}</span>
                              </div>
                            )}

                            {schedule.notes && (
                              <div className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 bg-white dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                                {schedule.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};