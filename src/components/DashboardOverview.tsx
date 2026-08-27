import { formatDate, formatWeekRange } from "../utils/dateUtils";
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ListTodo, 
  TrendingUp, 
  Building2, 
  Search, 
  Filter, 
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Users
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
, ComposedChart, Line } from 'recharts';
import { KpiTask, DEPARTMENTS, WeeklySchedule } from '../types/index';
import { Award, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';

// Constants for Weekly Schedule Matrix
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SESSIONS = ['MORNING', 'AFTERNOON'];
const SESSION_LABELS = { MORNING: 'Sáng', AFTERNOON: 'Chiều' };

const DEFAULT_LEADERS = [
  { name: 'Đào Trọng Truyền', position: 'Trưởng Thống kê' },
  { name: 'Đào Thị Hiếu', position: 'Phó Trưởng Thống kê' },
  { name: 'Vũ Tuấn Hùng', position: 'Phó Trưởng Thống kê' },
  { name: 'Phạm Văn Tự', position: 'Phó Trưởng Thống kê' },
];

interface DashboardOverviewProps {
  tasks: KpiTask[];
  schedules?: WeeklySchedule[];
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  onNavigateToTasks?: () => void;
  globalRole?: string;
}

// Normalize a department/status string for robust matching:
// - NFC unicode normalization (fixes NFD vs NFC Vietnamese tone differences)
// - trim extra whitespace (including NBSP)
// - collapse internal multiple spaces
// - lowercase for case-insensitive comparison
const normStr = (s: string): string =>
  (s || '')
    .normalize('NFC')
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ') // NBSP/zero-width -> space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Check if a task belongs to a department using fuzzy/normalized matching
const deptMatches = (taskDept: string | undefined, targetDept: string): boolean =>
  normStr(taskDept || 'Chưa phân bổ') === normStr(targetDept);

// Normalize a task status string for robust matching (handles Vietnamese variants
// like "Hoàn thành", "hoàn thành", "Hoan thanh", extra spaces, NFC/NFD differences)
const normStatus = (s: string | undefined): string => normStr(s || '');

// Check if a task status matches one of several expected statuses (fuzzy)
const statusIn = (taskStatus: string | undefined, expected: string[]): boolean =>
  expected.some(e => normStatus(taskStatus) === normStatus(e));

// Custom tooltip that shows the full department name (fullName) when available,
// so truncated X-axis labels don't hide information.
const DeptTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const fullName = payload[0]?.payload?.fullName || label;
  return (
    <div style={{ fontSize: '11px', padding: '6px 8px', background: '#fff', border: '1px solid #c6d8c8', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 700, color: '#2d4a36', marginBottom: 2 }}>{fullName}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || p.fill || '#31523b', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};


export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tasks = [],
  schedules = [],
  selectedDepartment,
  setSelectedDepartment,
  addToast,
  onNavigateToTasks,
  globalRole,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'UNFINISHED' | 'LATE' | 'COMPLETED' | 'COMPLETED_LATE'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'PHONG' | 'VUNG1' | 'VUNG2'>('ALL');

  // Current week start date (Monday)
  const [weekStartDate] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const weekStartDateStr = weekStartDate.toISOString().split('T')[0];

  // (stats moved below — it now derives from phongStats + vung1Stats + vung2Stats
  //  so that Tổng chung EXACTLY equals the sum of the 3 region blocks.)

  // Chart Data 1: Trend over months computed from REAL task deadlines (planDeadline)
  // Groups tasks by month based on their planDeadline (DD/MM/YYYY or YYYY-MM-DD).
  // hoanThanh = completed-on-time, treHan = late (either completed-late or unfinished-late).
  const trendChartData = useMemo(() => {
    const safeTasks = (tasks || []).filter(t =>
      (selectedDepartment || '').toUpperCase() === 'ALL' || deptMatches(t.department, selectedDepartment)
    );
    const buckets: Record<string, { hoanThanh: number; treHan: number; chuaHoanThanh: number }> = {};
    const monthLabel = (y: number, m: number) => `T${m + 1}/${String(y).slice(2)}`;
    safeTasks.forEach(t => {
      const raw = (t.planDeadline || '').trim();
      if (!raw) return;
      let d: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        d = new Date(raw.slice(0, 10));
      } else {
        const parts = raw.split(/[\/\-.]/);
        if (parts.length >= 3) {
          const dd = parseInt(parts[0], 10);
          const mm = parseInt(parts[1], 10) - 1;
          const yyyy = parseInt(parts[2], 10);
          if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) d = new Date(yyyy, mm, dd);
        }
      }
      if (!d || isNaN(d.getTime())) return;
      const key = monthLabel(d.getFullYear(), d.getMonth());
      if (!buckets[key]) buckets[key] = { hoanThanh: 0, treHan: 0, chuaHoanThanh: 0 };
      const s = t.status || '';
      if (statusIn(s, ['Hoàn thành', 'Đúng hạn'])) buckets[key].hoanThanh++;
      else if (statusIn(s, ['Hoàn thành trễ hạn', 'Chưa hoàn thành trễ hạn', 'Trễ hạn'])) buckets[key].treHan++;
      else if (statusIn(s, ['Chưa hoàn thành'])) buckets[key].chuaHoanThanh++;
    });
    const sortedKeys = Object.keys(buckets).sort((a, b) => {
      const ma = parseInt(a.slice(1, a.indexOf('/')), 10);
      const ya = parseInt(a.slice(a.indexOf('/') + 1), 10);
      const mb = parseInt(b.slice(1, b.indexOf('/')), 10);
      const yb = parseInt(b.slice(b.indexOf('/') + 1), 10);
      return ya * 100 + ma - (yb * 100 + mb);
    });
    return sortedKeys.map(k => {
      const total = buckets[k].hoanThanh + buckets[k].treHan + buckets[k].chuaHoanThanh;
      const completionPct = total
        ? Math.round(((buckets[k].hoanThanh + buckets[k].treHan) / total) * 100)
        : 0;
      return {
        period: k,
        hoanThanh: buckets[k].hoanThanh,
        treHan: buckets[k].treHan,
        chuaHoanThanh: buckets[k].chuaHoanThanh,
        total,
        completionPct,
      };
    });
  }, [tasks, selectedDepartment]);

  // Chart Data: Late tasks by 19 units (hoàn thành trễ hạn + chưa hoàn thành trễ hạn)
  // Used by the single-green-bar + 2-line overlay chart replacing the monthly trend.

  // Chart Data 2: Horizontal Bar Chart for Top 5 Departments
  // MOCK DATA REMOVED: using real task arrays for charts
  // Split DEPARTMENTS into categories
  const phongList = DEPARTMENTS.slice(1, 6);
  const vung1List = DEPARTMENTS.slice(6, 13);
  const vung2List = DEPARTMENTS.slice(13, 20);

  const calculateUnitData = (unitList, allTasks) => {
    return unitList.map((d) => {
      const deptTasks = allTasks.filter((t) => deptMatches(t.department, d));
      const total = deptTasks.length;
      const completed = deptTasks.filter((t) => statusIn(t.status, ['Hoàn thành', 'Đúng hạn'])).length;
      const completedLate = deptTasks.filter((t) => statusIn(t.status, ['Hoàn thành trễ hạn'])).length;
      const unfinished = deptTasks.filter((t) => statusIn(t.status, ['Chưa hoàn thành'])).length;
      const unfinishedLate = deptTasks.filter((t) => statusIn(t.status, ['Chưa hoàn thành trễ hạn', 'Trễ hạn'])).length;

      const shortName = d
        .replace('Phòng Thống kê ', 'P.TK ')
        .replace('Thống kê cơ sở ', 'CS ')
        .replace('Thống kê cở sở ', 'CS ');
        
      return {
        name: shortName.length > 20 ? shortName.slice(0, 20) + '…' : shortName,
        fullName: d,
        'Tổng việc': total,
        'Hoàn thành': completed,
        'Hoàn thành trễ hạn': completedLate,
        'Chưa hoàn thành': unfinished,
        'Chưa hoàn thành trễ hạn': unfinishedLate,
        'Tổng hoàn thành': completed + completedLate,
        'Tổng chưa hoàn thành': unfinished + unfinishedLate
      };
    });
  };

  
  
  const staffRatings = useMemo(() => {
    const userTasks: Record<string, any> = {};
    (tasks || []).forEach(t => {
      if(!userTasks[t.userName]) userTasks[t.userName] = { total: 0, completed: 0, late: 0 };
      userTasks[t.userName].total++;
      if(statusIn(t.status, ['Hoàn thành', 'Đúng hạn'])) userTasks[t.userName].completed++;
      if(statusIn(t.status, ['Trễ hạn', 'Chưa hoàn thành trễ hạn', 'Hoàn thành trễ hạn'])) userTasks[t.userName].late++;
    });

    let xuatSac = 0, tot = 0, hoanThanh = 0, khongHoanThanh = 0;
    Object.values(userTasks).forEach(u => {
      const rate = u.total > 0 ? u.completed / u.total : 0;
      if (rate === 1 && u.late === 0) xuatSac++;
      else if (rate >= 0.8) tot++;
      else if (rate >= 0.5) hoanThanh++;
      else khongHoanThanh++;
    });

    // Mock data if empty for visual
    if (Object.keys(userTasks).length === 0) {
      return [
        { name: 'HT xuất sắc', value: 15, color: '#1a65ff' },
        { name: 'HT tốt NV', value: 45, color: '#03c39a' },
        { name: 'HT nhiệm vụ', value: 20, color: '#f59e0b' },
        { name: 'Không HT', value: 5, color: '#fe275d' }
      ];
    }

    return [
      { name: 'HT xuất sắc', value: xuatSac, color: '#1a65ff' },
      { name: 'HT tốt NV', value: tot, color: '#03c39a' },
      { name: 'HT nhiệm vụ', value: hoanThanh, color: '#f59e0b' },
      { name: 'Không HT', value: khongHoanThanh, color: '#fe275d' }
    ];
  }, [tasks]);

  const phongData = useMemo(() => calculateUnitData(phongList, tasks || []), [tasks]);
  const vung1Data = useMemo(() => calculateUnitData(vung1List, tasks || []), [tasks]);
  const vung2Data = useMemo(() => calculateUnitData(vung2List, tasks || []), [tasks]);
  const deptBar19Data = useMemo(() => calculateUnitData(DEPARTMENTS.slice(1), tasks || []), [tasks]);

  const blockData = useMemo(() => {
    const sumUp = (dataList) => dataList.reduce((acc, curr) => ({
      'Tổng việc': acc['Tổng việc'] + curr['Tổng việc'],
      'Hoàn thành': acc['Hoàn thành'] + curr['Hoàn thành'],
      'Hoàn thành trễ hạn': acc['Hoàn thành trễ hạn'] + curr['Hoàn thành trễ hạn'],
      'Chưa hoàn thành': acc['Chưa hoàn thành'] + curr['Chưa hoàn thành'],
      'Chưa hoàn thành trễ hạn': acc['Chưa hoàn thành trễ hạn'] + curr['Chưa hoàn thành trễ hạn'],
      'Trễ hạn': acc['Trễ hạn'] + curr['Hoàn thành trễ hạn'] + curr['Chưa hoàn thành trễ hạn']
    }), { 'Tổng việc': 0, 'Hoàn thành': 0, 'Hoàn thành trễ hạn': 0, 'Chưa hoàn thành': 0, 'Chưa hoàn thành trễ hạn': 0, 'Trễ hạn': 0 });
    
    return [
      { name: '5 Phòng', ...sumUp(phongData) },
      { name: 'Vùng 1', ...sumUp(vung1Data) },
      { name: 'Vùng 2', ...sumUp(vung2Data) }
    ];
  }, [phongData, vung1Data, vung2Data]);

  const calcStatsForGroup = (dataList) => {
    return dataList.reduce((acc, curr) => {
      acc.total += curr['Tổng việc'];
      acc.completed += curr['Hoàn thành'];
      acc.completedLate += curr['Hoàn thành trễ hạn'];
      acc.unfinished += curr['Chưa hoàn thành'];
      acc.unfinishedLate += curr['Chưa hoàn thành trễ hạn'];
      // Tổng đã hoàn thành (đúng hạn + trễ hạn)
      acc.totalCompleted += curr['Hoàn thành'] + curr['Hoàn thành trễ hạn'];
      // Tổng chưa hoàn thành (trong hạn + trễ hạn)
      acc.totalUnfinished += curr['Chưa hoàn thành'] + curr['Chưa hoàn thành trễ hạn'];
      return acc;
    }, { total: 0, completed: 0, completedLate: 0, unfinished: 0, unfinishedLate: 0, totalCompleted: 0, totalUnfinished: 0 });
  };

  const phongStats = useMemo(() => calcStatsForGroup(phongData), [phongData]);
  const vung1Stats = useMemo(() => calcStatsForGroup(vung1Data), [vung1Data]);
  const vung2Stats = useMemo(() => calcStatsForGroup(vung2Data), [vung2Data]);

  // Calculate 6 Stat Cards metrics ("Tổng chung") - sum of 3 blocks only
  // Excludes 'Lãnh đạo' and 'Chưa phân bổ' to match sum of 5 Phòng + Vùng 1 + Vùng 2
  const stats = useMemo(() => {
    const total = phongStats.total + vung1Stats.total + vung2Stats.total;
    const completed = phongStats.completed + vung1Stats.completed + vung2Stats.completed;
    const completedLate = phongStats.completedLate + vung1Stats.completedLate + vung2Stats.completedLate;
    const unfinished = phongStats.unfinished + vung1Stats.unfinished + vung2Stats.unfinished;
    const late = phongStats.unfinishedLate + vung1Stats.unfinishedLate + vung2Stats.unfinishedLate;
    const nearDeadline = 0;
    const completionRate = total ? Math.round(((completed + completedLate) / total) * 100) : 0;
    const lateRate = total ? Math.round(((late + completedLate) / total) * 100) : 0;
    return { total, completed, nearDeadline, late, completedLate, unfinished, completionRate, lateRate };
  }, [phongStats, vung1Stats, vung2Stats]);

  // ALL tasks stats (including Lãnh đạo and Chưa phân bổ) - for accurate total count
  const allStats = useMemo(() => {
    const allTasks = tasks || [];
    const total = allTasks.length;
    const completed = allTasks.filter((t) => statusIn(t.status, ['Hoàn thành', 'Đúng hạn'])).length;
    const completedLate = allTasks.filter((t) => statusIn(t.status, ['Hoàn thành trễ hạn'])).length;
    const unfinished = allTasks.filter((t) => statusIn(t.status, ['Chưa hoàn thành'])).length;
    const late = allTasks.filter((t) => statusIn(t.status, ['Chưa hoàn thành trễ hạn', 'Trễ hạn'])).length;
    const completionRate = total ? Math.round(((completed + completedLate) / total) * 100) : 0;
    const lateRate = total ? Math.round(((late + completedLate) / total) * 100) : 0;
    return { total, completed, completedLate, unfinished, late, completionRate, lateRate };
  }, [tasks]);

  // Tổng cộng 3 khối (dùng riêng cho bảng so sánh 3 khối ở dưới) - same as stats now
  const stats3Blocks = useMemo(() => ({
    total: phongStats.total + vung1Stats.total + vung2Stats.total,
    completed: phongStats.completed + vung1Stats.completed + vung2Stats.completed,
    completedLate: phongStats.completedLate + vung1Stats.completedLate + vung2Stats.completedLate,
    unfinished: phongStats.unfinished + vung1Stats.unfinished + vung2Stats.unfinished,
    late: phongStats.unfinishedLate + vung1Stats.unfinishedLate + vung2Stats.unfinishedLate,
    completionRate: 0,
  }), [phongStats, vung1Stats, vung2Stats]);

  // Fix completionRate for stats3Blocks
  useEffect(() => {
    const total = phongStats.total + vung1Stats.total + vung2Stats.total;
    const completed = phongStats.completed + vung1Stats.completed + vung2Stats.completed;
    const completedLate = phongStats.completedLate + vung1Stats.completedLate + vung2Stats.completedLate;
    // Note: can't modify stats3Blocks directly, will compute inline where needed
  }, [phongStats, vung1Stats, vung2Stats]);

  const completionDonutData = useMemo(() => {
    // Đã hoàn thành = đúng hạn + trễ hạn (đều là đã xong)
    // Chưa hoàn thành = chưa HT trong hạn + chưa HT trễ hạn
    return [
      { name: 'Đã hoàn thành', value: stats.completed + stats.completedLate, color: '#1a65ff' },
      { name: 'Chưa hoàn thành', value: Math.max(0, stats.unfinished + stats.late), color: '#dae6db' },
    ];
  }, [stats]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Filtered tasks table
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      // Group Filter Logic
      if (selectedGroup === 'PHONG' && !phongList.some(d => deptMatches(t.department, d))) return false;
      if (selectedGroup === 'VUNG1' && !vung1List.some(d => deptMatches(t.department, d))) return false;
      if (selectedGroup === 'VUNG2' && !vung2List.some(d => deptMatches(t.department, d))) return false;

      // Department filter logic
      const matchesDept =
        (selectedDepartment || '').toUpperCase() === 'ALL' || deptMatches(t.department, selectedDepartment);

      let matchesStatus = true;
      const activeFilter = activeCardFilter !== 'ALL' ? activeCardFilter : statusFilter;

      if (activeFilter === 'COMPLETED') {
        matchesStatus = statusIn(t.status, ['Hoàn thành']);
      } else if (activeFilter === 'LATE') {
        matchesStatus = statusIn(t.status, ['Chưa hoàn thành trễ hạn', 'Trễ hạn']);
      } else if (activeFilter === 'UNFINISHED') {
        matchesStatus = statusIn(t.status, ['Chưa hoàn thành']);
      } else if (activeFilter === 'COMPLETED_LATE') {
        matchesStatus = statusIn(t.status, ['Hoàn thành trễ hạn']);
      }

      const matchesSearch =
        t.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.userName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [tasks, selectedDepartment, statusFilter, activeCardFilter, searchQuery, selectedGroup, phongList, vung1List, vung2List]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartment, statusFilter, activeCardFilter, searchQuery, selectedGroup]);

  useEffect(() => {
    if (selectedDepartment !== 'ALL') setSelectedGroup('ALL');
  }, [selectedDepartment]);

  // Excel Export
  const handleExportExcel = () => {
    const exportRows = filteredTasks.map((t, index) => ({
      'STT': index + 1,
      'Tên công việc': t.taskName,
      'Loại công việc': t.jobType || 'Kế hoạch',
      'Người chủ trì': t.userName,
      'Đơn vị phối hợp': t.coopUnit || '',
      'Ngày giao việc': t.assignedDate || '',
      'Hạn hoàn thành': t.planDeadline,
      'Tình trạng': t.status,
      'Lý do trễ hạn': t.lateReason || '',
      'Phòng ban': t.department || 'Chưa phân bổ',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard_Tasks');
    XLSX.writeFile(wb, `Dashboard_BaoCao_KPI_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addToast('success', 'Xuất Excel Thành Công!', `Đã xuất ${exportRows.length} công việc ra file Excel.`);
  };

  return (
    <div className="min-h-screen bg-[#eef3ef] p-2 font-sans">
      <div className="w-full mx-auto space-y-3">
        
        {/* MAIN HEADER - Larger logo */}
        <div className="bg-[#78a57b] py-4 px-6 text-center rounded-sm shadow-xs flex items-center justify-center gap-3 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          <div className="text-left">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-widest uppercase drop-shadow-xs leading-tight">
              KPI DASHBOARD TỔNG HỢP
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-0.5 tracking-wide">Quản Lý Tiến Độ & Hiệu Suất Công Việc</p>
          </div>
        </div>

        
{/* MAIN LAYOUT: Left 40% (Quadrant 1 & 3), Right 60% (Quadrant 2 & 4) */}
         <div className="flex flex-col lg:flex-row gap-2" style={{ flex: '0 0 100%' }}>
           <div className="flex flex-col gap-2" style={{ flex: '0 0 40%', minWidth: '0' }}>
          
          
          {/* ================= QUADRANT 1: TỔNG QUAN CHUNG ================= */}
          <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
            <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
              1. Tổng Chung 
            </div>
            
            {/* KPI Row - 5 Equal Width Cards using Flexbox */}
            <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số việc</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{allStats.total}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{allStats.unfinished}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa HT trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{allStats.late}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{allStats.completed}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('ALL'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">HT trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{allStats.completedLate}</span>
              </div>
            </div>
            {/* Charts Area */}
            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Staff Rating Bar Chart */}
              <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                 <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">ĐÁNH GIÁ XẾP LOẠI CÁN BỘ</span>
                <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffRatings} layout="vertical" margin={{ top: 0, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4ebe5" />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#7a8c7f' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip cursor={{ fill: 'rgba(241,245,242,0.7)' }} contentStyle={{ fontSize: '11px', padding: '4px', borderColor: '#c6d8c8' }} />
                    <Bar dataKey="value" barSize={22} radius={[0, 3, 3, 0]}>
                       {staffRatings.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Completion Donut Chart */}
              <div className="w-full sm:w-[40%] flex flex-col">
                <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 mt-6">
                     <span className="text-[20px] font-bold text-[#2563eb]">{stats.completionRate}%</span>
                     <span className="text-[10px] font-medium text-[#4f6f56]">Đúng hạn</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                    <PieChart>
                      <Pie data={completionDonutData} innerRadius="65%" outerRadius="90%" dataKey="value" stroke="none">
                        <Cell fill="#2563eb" />
                        <Cell fill="#dae6db" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '10px', padding: '2px 6px', borderColor: '#c6d8c8' }} />
                      <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          
{/* ================= QUADRANT 3: KHỐI VÙNG 1 ================= */}
           <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
             <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
               3. KHỐI VÙNG 1
             </div>
            {/* KPI Row - 5 Columns */}
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]">
              <div className="py-1.5 px-2 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span className="text-[10.5px] font-medium truncate w-full text-center text-white/90">Tổng số việc</span>
                <span className="text-lg font-bold tracking-normal mt-0.5 leading-none w-full text-center">{phongStats.total}</span>
              </div>
              <div className="py-1.5 px-2 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span className="text-[10.5px] font-medium truncate w-full text-center text-white/90">Chưa hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-0.5 leading-none w-full text-center">{phongStats.unfinished}</span>
              </div>
              <div className="py-1.5 px-2 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span className="text-[10.5px] font-medium truncate w-full text-center text-white/90">Chưa HT trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-0.5 leading-none w-full text-center">{phongStats.unfinishedLate}</span>
              </div>
              <div className="py-1.5 px-2 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span className="text-[10.5px] font-medium truncate w-full text-center text-white/90">Hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-0.5 leading-none w-full text-center">{phongStats.completed}</span>
              </div>
              <div className="py-1.5 px-2 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <span className="text-[10.5px] font-medium truncate w-full text-center text-white/90">HT trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-0.5 leading-none w-full text-center">{phongStats.completedLate}</span>
              </div>
            </div>
            {/* Charts Area */}
            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Clustered Vertical Bar Chart */}
              <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                 <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">CHI TIẾT ĐƠN VỊ</span>
                <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phongData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%" barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebe5" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#7a8c7f" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(241,245,242,0.7)" }} content={<DeptTooltip />} />
                    <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: "10px", color: "#4f6f56" }} />
                    <Bar dataKey="Tổng hoàn thành" name="Hoàn thành" fill="#2563eb" barSize={14} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Tổng chưa hoàn thành" name="Chưa HT" fill="#e11d48" barSize={14} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Half-Donut Gauge Chart */}
              <div className="w-full sm:w-[40%] flex flex-col">
                <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 mt-12">
                     <span className="text-[20px] font-bold text-[#2563eb]">{phongStats.total ? Math.round(((phongStats.completed + phongStats.completedLate) / phongStats.total) * 100) : 0}%</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%" className="z-10 mt-8">
                    <PieChart>
                      <Pie data={[
                        { name: "Đã hoàn thành", value: phongStats.completed + phongStats.completedLate, color: "#2d6e3e" },
                        { name: "Chưa hoàn thành", value: phongStats.unfinished + phongStats.unfinishedLate, color: "#dae6db" }
                      ]} startAngle={180} endAngle={0} cy="70%" innerRadius="65%" outerRadius="100%" dataKey="value" stroke="none">
                        <Cell fill="#2563eb" />
                        <Cell fill="#dae6db" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 6px", borderColor: "#c6d8c8" }} />
                      <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
</div>
           </div>
           <div className="flex flex-col gap-2" style={{ flex: '0 0 60%', minWidth: '0' }}>
{/* ================= QUADRANT 2: KHỐI CÁC PHÒNG ================= */}
            <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
              <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
                2. Khối Các Phòng
              </div>
              {/* KPI Row - 5 Equal Width Cards using Flexbox */}
              <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số việc</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.total}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.unfinished}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa HT trễ hạn</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.unfinishedLate}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.completed}</span>
                </div>
                <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('PHONG'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                  <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">HT trễ hạn</span>
                  <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{phongStats.completedLate}</span>
                </div>
              </div>
             {/* Charts Area */}
             <div className="flex flex-col sm:flex-row h-[280px]">
               {/* Composed Chart */}
               <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                  <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">CHI TIẾT ĐƠN VỊ</span>
                 <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={vung1Data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebe5" />
                     <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fontSize: 9, fill: "#7a8c7f" }} axisLine={false} tickLine={false} />
                     <Tooltip cursor={{ fill: "rgba(241,245,242,0.7)" }} content={<DeptTooltip />} />
                     <Legend verticalAlign="top" height={24} iconType="rect" wrapperStyle={{ fontSize: "10px", color: "#4f6f56" }} />
                     <Bar dataKey="Tổng việc" name="Tổng CV" fill="#cbd5e1" barSize={20} radius={[2, 2, 0, 0]} />
                     <Line type="monotone" dataKey="Tổng hoàn thành" name="Hoàn thành" stroke="#2563eb" strokeWidth={3.5} dot={{ r: 5, fill: "#2563eb" }} />
                   </ComposedChart>
                 </ResponsiveContainer>
                 </div>
               </div>
               
               {/* Solid Pie Chart */}
               <div className="w-full sm:w-[40%] flex flex-col">
                 <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                   <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                      <span className="text-[20px] font-bold text-[#2563eb]">{vung1Stats.total ? Math.round(((vung1Stats.completed + vung1Stats.completedLate) / vung1Stats.total) * 100) : 0}%</span>
                   </div>
                   <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                     <PieChart>
                       <Pie data={[
                         { name: "Đã hoàn thành", value: vung1Stats.completed + vung1Stats.completedLate },
                         { name: "Chưa hoàn thành", value: vung1Stats.unfinished + vung1Stats.unfinishedLate }
                       ]} innerRadius="65%" outerRadius="85%" dataKey="value" stroke="#fff" strokeWidth={2}>
                         <Cell fill="#2563eb" />
                         <Cell fill="#e11d48" />
                       </Pie>
                       <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 6px", borderColor: "#c6d8c8" }} />
                       <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
               </div>
             </div>
           </div>
        {/* ================= QUADRANT 4: KHỐI VÙNG 2 ================= */}
           <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col overflow-hidden">
            <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide">
              4. KHỐI VÙNG 2
            </div>
            {/* KPI Row - 5 Equal Width Cards using Flexbox */}
            <div className="flex flex-wrap gap-2 p-2 bg-[#f5f9f6] border-b border-[#c6d8c8]" style={{ width: '100%' }}>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2d6e3e] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('ALL'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Tổng số việc</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.total}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#e11d48] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('UNFINISHED'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.unfinished}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#0d9488] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('LATE'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Chưa HT trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.unfinishedLate}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#2563eb] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">Hoàn thành</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.completed}</span>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer hover:opacity-90 transition-all active:scale-95 flex flex-col justify-center items-center text-center rounded bg-[#8b5cf6] text-white shadow-xs min-h-[60px]" onClick={() => { setActiveCardFilter('COMPLETED_LATE'); setSelectedGroup('VUNG2'); setSelectedDepartment('ALL'); document.getElementById('dataTable')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ flex: '1 1 calc(20% - 8px)' }}>
                <span className="text-[10px] font-medium text-white/90 leading-tight text-center px-1 break-words">HT trễ hạn</span>
                <span className="text-lg font-bold tracking-normal mt-1 leading-none text-center">{vung2Stats.completedLate}</span>
              </div>
            </div>
            {/* Charts Area */}
            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Area Chart */}
              <div className="w-full sm:w-[60%] pt-2 pb-2 pr-2 border-r border-[#e8efe9] flex flex-col">
                 <span className="text-[11px] font-semibold text-[#4f6f56] text-center w-full block mt-2 mb-2 tracking-wide">CHI TIẾT ĐƠN VỊ</span>
                <div className="flex-1 min-h-0 relative flex flex-col" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={vung2Data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCHT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ebe5" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#2d4a36", fontWeight: "600" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#7a8c7f" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f1f5f2" }} content={<DeptTooltip />} />
                    <Legend verticalAlign="top" height={24} iconType="plainline" wrapperStyle={{ fontSize: "10px", color: "#4f6f56" }} />
                    <Area type="monotone" strokeWidth={2.5} dataKey="Tổng hoàn thành" name="Hoàn thành" stroke="#2563eb" fillOpacity={1} fill="url(#colorHT)" />
                    <Area type="monotone" strokeWidth={2.5} dataKey="Tổng chưa hoàn thành" name="Chưa HT" stroke="#e11d48" fillOpacity={1} fill="url(#colorCHT)" />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </div>
              
              {/* Donut Chart Q4 */}
              <div className="w-full sm:w-[40%] flex flex-col">
                <div className="h-[100%] p-2 relative flex flex-col items-center justify-center rounded" style={{ backgroundColor: '#f0f7f2', backgroundImage: 'linear-gradient(to right, #d8e8df 1px, transparent 1px), linear-gradient(to bottom, #d8e8df 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                  <span className="text-[11px] font-semibold text-[#4f6f56] absolute top-4 text-center tracking-wide">TỶ LỆ HOÀN THÀNH<br/>TRÊN TỔNG SỐ</span>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                     <span className="text-[20px] font-bold text-[#2563eb]">{vung2Stats.total ? Math.round(((vung2Stats.completed + vung2Stats.completedLate) / vung2Stats.total) * 100) : 0}%</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%" className="z-10 mt-6">
                    <PieChart>
                      <Pie data={[
                        { name: "Đã hoàn thành", value: vung2Stats.completed + vung2Stats.completedLate },
                        { name: "Chưa hoàn thành", value: vung2Stats.unfinished + vung2Stats.unfinishedLate }
                      ]} innerRadius="65%" outerRadius="85%" dataKey="value" stroke="#fff" strokeWidth={2}>
                        <Cell fill="#2563eb" />
                        <Cell fill="#e11d48" />
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", padding: "2px 6px", borderColor: "#c6d8c8" }} />
                      <Legend verticalAlign="bottom" height={20} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#4f6f56', paddingBottom: 2 }} formatter={(value) => <span style={{ color: '#4f6f56' }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
</div>
            </div>
          </div>
        </div>
      </div>
        </div>

        {/* ================= WEEKLY SCHEDULE MATRIX - 4 LEADERS ================= */}
        <div className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col mt-3 overflow-hidden">
          <div className="bg-[#87af89] text-white text-[12px] font-semibold text-center py-1.5 uppercase tracking-wide flex items-center justify-between px-4">
            <span>5. Ma Trận Lịch Tuần - 4 Lãnh Đạo</span>
            <span className="text-[10px] opacity-80">Click vào ô để xem chi tiết / thêm lịch</span>
          </div>
          <div className="p-3 overflow-x-auto">
            <div className="min-w-max">
              <table className="w-full min-w-[900px] border-collapse text-[11px] font-sans">
                <thead>
                  <tr className="bg-[#f0f7f2] border-b border-[#c6d8c8]">
                    <th className="px-2 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] sticky left-0 bg-[#f0f7f2] z-10 w-28">Lãnh đạo / Chức vụ</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] w-20">T2</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] w-20">T3</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] w-20">T4</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] w-20">T5</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] w-20">T6</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] border-r border-[#c6d8c8] w-20">T7</th>
                    <th className="px-1.5 py-1.5 text-center font-bold text-[#2d4a36] w-20">CN</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_LEADERS.map((leader, lIdx) => (
                    <tr key={leader.name} className={`${lIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 hover:bg-slate-50/80 transition-colors`}>
                      <td className="px-2 py-1.5 font-semibold text-[#2d6e3e] border-r border-[#c6d8c8] sticky left-0 bg-inherit z-10 w-28 text-nowrap">
                        {leader.name} <br/><span className="text-[9px] font-normal text-slate-500">{leader.position}</span>
                      </td>
                      {DAY_LABELS.map((_, dayIdx) => (
                        <td key={dayIdx} className="px-1 py-1 border-r border-[#e8efe9] w-20 min-w-[70px] max-w-[70px] align-top">
                          <div className="space-y-1 min-h-[48px]">
                            {SESSIONS.map((session, sIdx) => {
                              const dayOfWeek = (dayIdx + 1) % 7;
                              const leaderSchedules = schedules.filter(s => 
                                s.weekStartDate === weekStartDateStr && 
                                s.personName === leader.name &&
                                s.dayOfWeek === dayOfWeek &&
                                s.session === session
                              );
                              return (
                                <div 
                                  key={session}
                                  className={`relative p-1 rounded text-[9px] leading-tight min-h-[18px] cursor-pointer transition-all hover:shadow-md hover:z-10 ${
                                    leaderSchedules.length > 0 
                                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                                      : 'bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100'
                                  }`}
                                  onClick={() => {
                                    // Navigate to weekly schedule tab with this leader
                                    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'weekly_schedule' }));
                                  }}
                                  title={leaderSchedules.length > 0 
                                    ? leaderSchedules.map(s => `${SESSION_LABELS[s.session]}: ${s.title}`).join('\n')
                                    : `${DAY_LABELS[dayIdx]} ${SESSION_LABELS[session]} - Click để thêm lịch`}
                                >
                                  <span className="font-medium text-[8px] opacity-70">{SESSION_LABELS[session].charAt(0)}</span>
                                  {leaderSchedules.length > 0 ? (
                                    <span className="block truncate">{leaderSchedules[0].title}</span>
                                  ) : (
                                    <span className="block text-center opacity-50">—</span>
                                  )}
                                  {leaderSchedules.length > 1 && (
                                    <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[7px] rounded-full w-4 h-4 flex items-center justify-center">+{leaderSchedules.length - 1}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-[#f5f9f6] border-t border-[#c6d8c8] px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-600">
              Tuần: {formatWeekRange(weekStartDate)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Có lịch
              </span>
              <span className="text-[9px] text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-200 border border-slate-300"></span> Trống
              </span>
            </div>
          </div>
        </div>

        {/* ================= DATA TABLE ================= */}
        <div id="dataTable" className="bg-white border border-[#c6d8c8] rounded-sm shadow-xs flex flex-col mt-3 scroll-mt-20">
          <div className="bg-[#93b995] text-white text-[10px] font-bold py-1.5 uppercase tracking-widest flex justify-between px-4 items-center">
            <span>BẢNG DỮ LIỆU CHI TIẾT</span>
            <button onClick={handleExportExcel} className="hover:text-[#dae6db] flex items-center gap-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Xuất Excel
            </button>
          </div>
          <div className="p-2 border-b border-[#c6d8c8] flex items-center justify-between bg-[#f5f9f6] gap-4">
            <div className="flex gap-2 w-full max-w-lg">
              <div className="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2 top-1.5 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                <input 
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 border border-[#c6d8c8] rounded-sm text-[11px] bg-white text-[#31523b] outline-none focus:border-[#5fa070]"
                />
              </div>
              <select 
                className="border border-[#c6d8c8] rounded-sm text-[11px] px-2 py-1 bg-white text-[#31523b] outline-none focus:border-[#5fa070]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLETED">Hoàn thành trong hạn</option>
                <option value="COMPLETED_LATE">Hoàn thành trễ hạn</option>
                <option value="UNFINISHED">Chưa hoàn thành trong hạn</option>
                <option value="LATE">Chưa hoàn thành trễ hạn</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full border-collapse text-sm font-sans min-w-[1400px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#005ba1] text-white font-bold">
                  <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499] border-r border-[#004499]">STT</th>
                  <th className="px-4 py-2.5 w-[40%] min-w-[400px] border-b-2 border-[#004499] border-r border-[#004499]">TÊN CÔNG VIỆC</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[180px] border-b-2 border-[#004499] border-r border-[#004499]">PHÒNG BAN</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[180px] border-b-2 border-[#004499] border-r border-[#004499]">NGƯỜI CHỦ TRÌ</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[150px] text-center border-b-2 border-[#004499] border-r border-[#004499]">HẠN HOÀN THÀNH</th>
                  <th className="px-3 py-2.5 w-[15%] min-w-[150px] text-center border-b-2 border-[#004499]">TÌNH TRẠNG</th>
                </tr>
              </thead>
<tbody>
                {paginatedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">Khong co du lieu</td>
                  </tr>
                ) : (
                  paginatedTasks.map((t, idx) => (
                    <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors`}>
                      <td className="px-3 py-2 w-12 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">{idx + 1 + (currentPage - 1) * itemsPerPage}</td>
                      <td className="px-4 py-2 min-w-[400px] text-slate-900 dark:text-slate-100 font-medium border-r border-slate-100 dark:border-slate-800 truncate">{t.taskName}</td>
                      <td className="px-3 py-2 min-w-[180px] text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 truncate">{t.department}</td>
                      <td className="px-3 py-2 min-w-[180px] text-slate-900 dark:text-slate-100 font-medium border-r border-slate-100 dark:border-slate-800 truncate">{t.userName}</td>
                      <td className="px-3 py-2 min-w-[150px] text-center text-slate-900 dark:text-slate-100 font-mono border-r border-slate-100 dark:border-slate-800">{formatDate(t.planDeadline)}</td>
                      <td className="px-3 py-2 min-w-[150px] text-center text-[#1a65ff] font-medium truncate">{t.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-[#f5f9f6] border-t border-[#c6d8c8] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-[#4f6f56] font-medium">
                Hien thi <span className="font-bold text-[#2d6e3e]">{(currentPage - 1) * itemsPerPage + 1}</span>-<span className="font-bold text-[#2d6e3e]">{Math.min(currentPage * itemsPerPage, filteredTasks.length)}</span> / <span className="font-bold text-[#2d6e3e]">{filteredTasks.length}</span> dong
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-[11px] font-semibold text-[#31523b] bg-white border border-[#c6d8c8] rounded-sm hover:bg-[#eef3ef] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#2d6e3e] text-white shadow-sm'
                            : 'text-[#31523b] bg-white border border-[#c6d8c8] hover:bg-[#eef3ef]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-[11px] font-semibold text-[#31523b] bg-white border border-[#c6d8c8] rounded-sm hover:bg-[#eef3ef] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
