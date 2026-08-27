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
  ExternalLink,
  Sun,
  Moon,
  Building2 as Building2Icon,
  CheckCircle2,
  XCircle as XCircleIcon,
} from 'lucide-react';
import { WeeklyScheduleItem, User as UserType, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';

const STATUSES = ['Đã hoàn thành', 'Đang thực hiện', 'Chưa bắt đầu', 'Hủy'] as const;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_LABELS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SESSIONS = ['MORNING', 'AFTERNOON'];
const SESSION_LABELS = { MORNING: 'Sáng', AFTERNOON: 'Chiều' };

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

const WORK_TYPE_LABELS_VN = {
  OFFICE: 'Làm việc tại cơ quan',
  OUTSIDE: 'Công tác ngoài',
  MEETING: 'Họp/Hội nghị',
  OFF: 'Nghỉ/Off',
};

const WORK_TYPE_COLORS = {
  OFFICE: '#f59e0b',
  OUTSIDE: '#10b981',
  MEETING: '#3b82f6',
  OFF: '#6b7280',
};

const WORK_TYPE_ICONS = {
  OFFICE: Building,
  OUTSIDE: Briefcase,
  MEETING: Users,
  OFF: XCircleIcon,
};

const LEADER_COLOR = '#2d6e3e';
const PHONG_COLOR = '#3b82f6';
const VUNG1_COLOR = '#0d9488';
const VUNG2_COLOR = '#ec4899';

const DEFAULT_LEADERS = [
  { name: 'Đào Trọng Truyền', position: 'Trưởng Thống kê', unitName: 'Ban Lãnh đạo' },
  { name: 'Đào Thị Hiếu', position: 'Phó Trưởng Thống kê', unitName: 'Ban Lãnh đạo' },
  { name: 'Vũ Tuấn Hùng', position: 'Phó Trưởng Thống kê', unitName: 'Ban Lãnh đạo' },
  { name: 'Phạm Văn Tự', position: 'Phó Trưởng Thống kê', unitName: 'Ban Lãnh đạo' },
];

const VUNG1_UNITS = [
  'Phố Hiến', 'Như Quỳnh', 'Yên Mỹ', 'Mỹ Hào', 'Khoái Châu', 'Lương Bằng', 'Hoàng Hoa Thám'
];

const VUNG2_UNITS = [
  'Quỳnh Phụ', 'Hưng Hà', 'Đông Hưng', 'Thái Thụy', 'Tiền Hải', 'Kiến Xương', 'Vũ Thư'
];

const PHONG_UNITS = [
  { short: 'P. Tổng hợp', full: 'Phòng Thống kê Tổng hợp', count: 12 },
  { short: 'Phòng TCHC', full: 'Phòng TCHC', count: 0 },
  { short: 'P. TMDV & Giá', full: 'Phòng Thống kê TMDV & Giá', count: 0 },
  { short: 'P. CNXD', full: 'Phòng Thống kê CNXD', count: 0 },
  { short: 'P. NN&XH', full: 'Phòng Thống kê NN&XH', count: 0 },
];

const formatWeekRange = (start: Date) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

// Card colors for modern design
const CARD_GRADIENTS = [
  'from-emerald-500 to-emerald-600',
  'from-blue-500 to-blue-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
  'from-rose-500 to-rose-600',
  'from-indigo-500 to-indigo-600',
  'from-orange-500 to-orange-600',
];

const CARD_HOVER_GRADIENTS = [
  'from-emerald-600 to-emerald-700',
  'from-blue-600 to-blue-700',
  'from-amber-600 to-amber-700',
  'from-purple-600 to-purple-700',
  'from-rose-600 to-rose-700',
  'from-indigo-600 to-indigo-700',
  'from-orange-600 to-orange-700',
];

const CARD_BG_LIGHT = [
  'bg-emerald-50 dark:bg-emerald-950/20',
  'bg-blue-50 dark:bg-blue-950/20',
  'bg-amber-50 dark:bg-amber-950/20',
  'bg-purple-50 dark:bg-purple-950/20',
  'bg-rose-50 dark:bg-rose-950/20',
  'bg-indigo-50 dark:bg-indigo-950/20',
  'bg-orange-50 dark:bg-orange-950/20',
];

const CARD_BORDER_LIGHT = [
  'border-emerald-200 dark:border-emerald-800',
  'border-blue-200 dark:border-blue-800',
  'border-amber-200 dark:border-amber-800',
  'border-purple-200 dark:border-purple-800',
  'border-rose-200 dark:border-rose-800',
  'border-indigo-200 dark:border-indigo-800',
  'border-orange-200 dark:border-orange-800',
];

const CARD_TEXT_COLOR = [
  'text-emerald-700 dark:text-emerald-300',
  'text-blue-700 dark:text-blue-300',
  'text-amber-700 dark:text-amber-300',
  'text-purple-700 dark:text-purple-300',
  'text-rose-700 dark:text-rose-300',
  'text-indigo-700 dark:text-indigo-300',
  'text-orange-700 dark:text-orange-300',
];

// ===== MODERN CARD COMPONENT =====
interface ModernCardProps {
  unit: {
    id: string;
    name: string;
    fullName?: string;
    position?: string;
    color: string;
    members: UserType[];
    allSchedules: any[];
  };
  index: number;
  schedules: any[];
  weekStartDateStr: string;
  filterWorkType: string;
  onClick: () => void;
  onAddClick: (e: React.MouseEvent) => void;
  isExpanded: boolean;
  handleEditClick: (schedule: any) => void;
}

const ModernCard: React.FC<ModernCardProps> = ({
  unit,
  index,
  schedules,
  weekStartDateStr,
  filterWorkType,
  onClick,
  onAddClick,
  isExpanded,
  handleEditClick
}) => {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const hoverGradient = CARD_HOVER_GRADIENTS[index % CARD_HOVER_GRADIENTS.length];
  const bgLight = CARD_BG_LIGHT[index % CARD_BG_LIGHT.length];
  const borderLight = CARD_BORDER_LIGHT[index % CARD_BORDER_LIGHT.length];
  const textColor = CARD_TEXT_COLOR[index % CARD_TEXT_COLOR.length];

  const getScheduleForUnit = (unitName: string, unitMembers: UserType[]) => {
    const memberNames = new Set(unitMembers.map(m => m.fullName));
    return schedules.filter(s => {
      if (s.weekStartDate !== weekStartDateStr) return false;
      if (!memberNames.has(s.personName)) return false;
      if (filterWorkType !== 'ALL' && s.workType !== filterWorkType) return false;
      return true;
    }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  };

  const unitSchedules = getScheduleForUnit(unit.fullName || unit.name, unit.members);
  const totalTasks = unitSchedules.length;

  // Group by work type
  const workTypeCounts = unitSchedules.reduce((acc, s) => {
    acc[s.workType] = (acc[s.workType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by day
  const schedulesByDay: Record<number, any[]> = {};
  unitSchedules.forEach(s => {
    if (!schedulesByDay[s.dayOfWeek]) schedulesByDay[s.dayOfWeek] = [];
    schedulesByDay[s.dayOfWeek].push(s);
  });

  const daysWithTasks = Object.keys(schedulesByDay).length;
  const busiestDay = Object.entries(schedulesByDay).reduce((max, [day, tasks]) => 
    tasks.length > max.count ? { day: parseInt(day), count: tasks.length } : max, { day: -1, count: 0 });

  if (isExpanded) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Expanded Header */}
        <div className={`px-5 py-4 flex items-center justify-between ${gradient} text-white`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base">{unit.name + (unit.position ? ` (${unit.position})` : '')}</h4>
              <p className="text-xs opacity-90">{unit.fullName || unit.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
              {totalTasks} việc
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
              title="Thu gọn"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{daysWithTasks}/7 ngày có lịch</span>
          </div>
          {Object.entries(workTypeCounts).map(([type, count]) => {
            const Icon = WORK_TYPE_ICONS[type as keyof typeof WORK_TYPE_ICONS] || Building;
            return (
              <span key={type} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{backgroundColor: WORK_TYPE_COLORS[type] + '20', color: WORK_TYPE_COLORS[type]}}>
                <Icon className="w-3 h-3" />
                {WORK_TYPE_LABELS_VN[type]} {count}
              </span>
            );
          })}
        </div>

        {/* Detail Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-28">Thời gian</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nhân sự / Chức vụ</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nội dung công việc</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Địa điểm</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((dayLabel, dayIndex) => {
                const daySchedules = schedulesByDay[dayIndex] || [];
                const dayBg = CARD_BG_LIGHT[dayIndex % CARD_BG_LIGHT.length];

                if (daySchedules.length === 0) {
                  return (
                    <tr key={dayIndex} className={`border-b border-slate-100 dark:border-slate-800 ${dayBg}`}>
                      <td className="px-4 py-3 text-slate-500 font-medium">{dayLabel}</td>
                      <td colSpan={4} className="px-4 py-3 text-slate-400 text-center text-sm">— Không có lịch —</td>
                    </tr>
                  );
                }

                return daySchedules.map((s, idx) => (
                  <tr key={`${dayIndex}-${idx}`} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${dayBg}`}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{dayLabel}</span>
                        <span className="flex items-center gap-1 text-xs">
                          <span className={`px-2 py-0.5 rounded ${s.session === 'MORNING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'}`}>
                            {SESSION_LABELS[s.session]}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{s.personName}</p>
                        {s.personRole && <p className="text-xs text-slate-500 dark:text-slate-400">{s.personRole}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded text-[10px] font-medium" style={{backgroundColor: WORK_TYPE_COLORS[s.workType] + '20', color: WORK_TYPE_COLORS[s.workType]}}>
                          {(() => {
                            const Icon = WORK_TYPE_ICONS[s.workType as keyof typeof WORK_TYPE_ICONS] || Building;
                            return <Icon className="w-3 h-3 inline-block mr-1" />;
                          })()}
                          {WORK_TYPE_LABELS_VN[s.workType]}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 truncate max-w-[350px]">{s.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 inline-block mr-1 opacity-50" />
                      {s.location || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(s); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Sửa"
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        {/* Add Button at bottom */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <button 
            onClick={onAddClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4.5 h-4.5" style={{ color: unit.color }} />
            <span>Thêm lịch công tác mới</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative group w-full min-h-[140px] flex flex-col ${bgLight} ${borderLight} border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden`}
      style={{ borderTop: `3px solid ${unit.color}` }}
    >
      {/* Background accent */}
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg`} style={{ background: `linear-gradient(135deg, ${unit.color}, ${unit.color}dd)` }}>
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h4 className={`font-bold text-sm truncate ${textColor}`}>{unit.name + (unit.position ? ` (${unit.position})` : '')}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{unit.fullName || unit.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${textColor}`} style={{ backgroundColor: unit.color + '20' }}>
              {totalTasks} việc
            </span>
            <ChevronRight className={`w-4 h-4 ${textColor}`} />
          </div>
        </div>

        {/* Stats Preview */}
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="space-y-2">
            {/* Work type pills */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(workTypeCounts).slice(0, 3).map(([type, count]) => {
                const Icon = WORK_TYPE_ICONS[type as keyof typeof WORK_TYPE_ICONS] || Building;
                return (
                  <span key={type} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium" style={{backgroundColor: WORK_TYPE_COLORS[type] + '20', color: WORK_TYPE_COLORS[type]}}>
                    <Icon className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">{WORK_TYPE_LABELS_VN[type]}</span>
                    <span className="sm:hidden">{count}</span>
                  </span>
                );
              })}
              {Object.keys(workTypeCounts).length > 3 && (
                <span className="px-2 py-0.5 rounded text-[9px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                  +{Object.keys(workTypeCounts).length - 3} loại khác
                </span>
              )}
            </div>

            {/* Day indicators */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {DAY_LABELS_SHORT.map((day, dayIndex) => {
                const hasTasks = schedulesByDay[dayIndex] && schedulesByDay[dayIndex].length > 0;
                return (
                  <span 
                    key={dayIndex}
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-all ${
                      hasTasks 
                        ? `${textColor} bg-white/80 dark:bg-slate-800/80 shadow-sm border ${borderLight}`
                        : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'
                    }`}
                    title={`${DAY_LABELS[dayIndex]}: ${hasTasks ? schedulesByDay[dayIndex].length + ' việc' : 'Không có lịch'}`}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Footer with quick stats */}
          <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {daysWithTasks}/7 ngày
            </span>
            {busiestDay.day >= 0 && (
              <span className={`${textColor} font-semibold flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {DAY_LABELS_SHORT[busiestDay.day]} nhiều nhất ({busiestDay.count})
              </span>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
};

// ===== SECTION BLOCK COMPONENT =====
const SectionBlock = ({ 
  title, 
  subtitle,
  icon, 
  headerColor,
  units,
  color,
  type,
  onAddForm,
  schedules,
  weekStartDateStr,
  filterWorkType,
  handleEditClick
}: { 
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  headerColor: string;
  units: Array<{id: string; name: string; fullName?: string; position?: string; color: string; members: UserType[]; allSchedules: any[]}>;
  color: string;
  type: 'leader' | 'phong' | 'vung1' | 'vung2';
  onAddForm: (dayIndex?: number, unitName?: string, session?: 'MORNING' | 'AFTERNOON') => void;
  schedules: any[];
  weekStartDateStr: string;
  filterWorkType: string;
  handleEditClick: (schedule: any) => void;
}) => {
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

  const handleToggleExpand = (unitId: string) => {
    setExpandedUnitId(prev => prev === unitId ? null : unitId);
  };

  const handleAddClick = (e: React.MouseEvent, unitName: string) => {
    e.stopPropagation();
    onAddForm(undefined, unitName);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ borderTop: `3px solid ${headerColor}` }}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between ${`bg-gradient-to-r from-${headerColor.replace('#', '')} to-${headerColor.replace('#', '')}dd`} text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase">{title}</h3>
            <p className="text-[11px] opacity-90">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold">
            {units.reduce((sum, u) => sum + u.members.length, 0)} nhân sự
          </span>
        </div>
      </div>

      {/* Cards Grid - Modern Design */}
      <div className="p-4">
        <div className="grid gap-3" style={{ 
          gridTemplateColumns: units.length <= 2 
            ? 'repeat(2, 1fr)' 
            : units.length <= 4 
              ? 'repeat(2, 1fr)' 
              : units.length <= 6 
                ? 'repeat(3, 1fr)' 
                : 'repeat(4, 1fr)' 
        }}>
          {units.map((unit, index) => (
            <ModernCard
              key={unit.id}
              unit={unit}
              index={index}
              schedules={schedules}
              weekStartDateStr={weekStartDateStr}
              filterWorkType={filterWorkType}
              onClick={() => handleToggleExpand(unit.id)}
              onAddClick={(e) => handleAddClick(e, unit.fullName || unit.name)}
              isExpanded={expandedUnitId === unit.id}
              handleEditClick={handleEditClick}
            />
          ))}

          {/* Empty state when no units */}
          {units.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-2">Chưa có đơn vị nào</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Chưa có dữ liệu đơn vị</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Alternating colors for cards
const cardColors = [
  'bg-emerald-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-indigo-600',
  'bg-orange-600',
];

// ===== MAIN COMPONENT =====
export const WeeklyWorkSchedule: React.FC<{
  users: UserType[];
  schedules: any[];
  onAddSchedule: (item: any) => void;
  onUpdateSchedule: (id: string, updated: any) => void;
  onDeleteSchedule: (id: string) => void;
  onBatchSaveSchedules: (items: any[]) => void;
  onClearWeekSchedules: (weekStartDate: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}> = ({
  users,
  schedules,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onBatchSaveSchedules,
  onClearWeekSchedules,
  addToast
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [filterWorkType, setFilterWorkType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drillDown, setDrillDown] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const weekStartDateStr = weekStartDate.toISOString().split('T')[0];

  const leaderUnits = useMemo(() => 
    DEFAULT_LEADERS.map((l) => ({
      id: `leader_${l.name}`,
      name: l.name,
      position: l.position,
      fullName: l.name,
      color: LEADER_COLOR,
      members: users.filter(u => u.fullName === l.name),
      allSchedules: schedules.filter(s => s.weekStartDate === weekStartDateStr && s.personName === l.name)
    }))
  , [users, schedules, weekStartDateStr]);

  const getSchedulesForUnit = useCallback((unitName: string, unitMembers: UserType[]) => {
    const memberNames = new Set(unitMembers.map(m => m.fullName));
    return schedules.filter(s => {
      if (s.weekStartDate !== weekStartDateStr) return false;
      if (!memberNames.has(s.personName)) return false;
      if (filterWorkType !== 'ALL' && s.workType !== filterWorkType) return false;
      return true;
    }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }, [schedules, weekStartDateStr, filterWorkType]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
  };

  const handleEditClick = (schedule: any) => {
    setEditingId(schedule.id || '');
    setAddForm({ ...schedule });
  };

  const handleSaveEdit = (scheduleId: string) => {
    if (!addForm.title?.trim() || !addForm.personName?.trim() || !addForm.weekStartDate) {
      addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    onUpdateSchedule(scheduleId, { ...addForm, updatedAt: new Date().toISOString() });
    setEditingId(null);
    setAddForm({});
    addToast('success', 'Thành công', 'Đã cập nhật lịch công tác');
  };

  const handleAddSchedule = () => {
    if (!addForm.title?.trim() || !addForm.personName?.trim() || !addForm.weekStartDate) {
      addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    onAddSchedule({ ...addForm });
    setShowAddForm(false);
    setAddForm({});
    addToast('success', 'Thành công', 'Đã thêm lịch công tác mới');
  };

  const openAddForm = (dayIndex?: number, unitName?: string, session?: 'MORNING' | 'AFTERNOON') => {
    const initialForm: any = {
      weekStartDate: weekStartDateStr,
      dayOfWeek: dayIndex !== undefined ? (dayIndex + 1) % 7 : 1,
      session: session || 'MORNING',
      workType: 'OFFICE',
    };
    if (unitName) {
      const unitUsers = users.filter(u => u.fullName === unitName || u.department === unitName || u.workUnit === unitName);
      if (unitUsers[0]) {
        initialForm.personName = unitUsers[0].fullName;
        initialForm.personRole = unitUsers[0].position;
        initialForm.unitName = unitUsers[0].department || unitUsers[0].workUnit;
      }
    }
    setAddForm(initialForm);
    setShowAddForm(true);
    setEditingId(null);
  };

  const handleMatrixCellClick = (unitName: string, unitMembers: UserType[], dayIndex: number, session: 'MORNING' | 'AFTERNOON') => {
    const dayOfWeek = (dayIndex + 1) % 7;
    const memberNames = new Set(unitMembers.map(m => m.fullName));
    const daySchedules = schedules.filter(s => {
      if (s.weekStartDate !== weekStartDateStr) return false;
      if (s.dayOfWeek !== dayOfWeek) return false;
      if (s.session !== session) return false;
      if (!memberNames.has(s.personName)) return false;
      return true;
    });
    
    if (daySchedules.length > 0) {
      const unitMembersFiltered = unitMembers.filter(u => daySchedules.some(s => s.personName === u.fullName));
      setDrillDown({ unitName, unitMembers: unitMembersFiltered, dayIndex, session: SESSION_LABELS[session], schedules: daySchedules });
    } else {
      openAddForm(dayIndex, unitName, session);
    }
  };

  const handleClearWeek = () => {
    if (confirm(`Xóa toàn bộ lịch tuần ${formatWeekRange(weekStartDate)}?`)) {
      onClearWeekSchedules(weekStartDateStr);
      addToast('success', 'Đã xóa', 'Đã xóa toàn bộ lịch tuần này');
    }
  };

  const downloadTemplate = useCallback(() => {
    const headers = [
      'Tuần (Thứ 2 YYYY-MM-DD)',
      'Thứ (1-6, 0=CN)',
      'Buổi (MORNING/AFTERNOON)',
      'Tên nhân sự',
      'Chức vụ',
      'Đơn vị',
      'Tiêu đề công việc',
      'Loại công việc (OFFICE/OUTSIDE/MEETING/OFF)',
      'Địa điểm',
      'Thành phần tham gia',
      'Ghi chú'
    ];

    const sampleData = [
      [
        weekStartDateStr,
        '1',
        'MORNING',
        'Đào Trọng Truyền',
        'Trưởng Thống kê',
        'Ban Lãnh đạo',
        'Họp triển khai kế hoạch quý',
        'MEETING',
        'Phòng họp A',
        'Ban lãnh đạo',
        'Họp định kỳ'
      ],
      [
        weekStartDateStr,
        '2',
        'AFTERNOON',
        'Bùi Văn Thắng',
        'Nhân viên',
        'Phòng Thống kê Tổng hợp',
        'Công tác kiểm tra cơ sở',
        'OUTSIDE',
        'Thống kê cơ sở Phố Hiến',
        'Đội kiểm tra',
        'Kiểm tra định kỳ'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mẫu lịch tuần');
    XLSX.writeFile(wb, `Mau_Lich_Tuan_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', 'Đã tải file mẫu về máy');
  }, [addToast]);

  const downloadMatrixTemplate = useCallback(() => {
    const headers = [
      'Tuần (Thứ 2 YYYY-MM-DD)',
      'Thứ (1-6, 0=CN)',
      'Buổi (MORNING/AFTERNOON)',
      ...DEFAULT_LEADERS.map(l => `${l.name}\n(${l.position})`)
    ];

    const sampleData: string[][] = [];
    [1,2,3,4,5,6,0].forEach((dayOfWeek, dayIndex) => {
      SESSIONS.forEach((session, sessionIndex) => {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + dayIndex);
        const row: string[] = [];
        row.push(sessionIndex === 0 ? `${SESSION_LABELS[dayOfWeek]} (${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})` : '');
        row.push(dayOfWeek.toString());
        row.push(session);
        DEFAULT_LEADERS.forEach(() => {
          row.push(sessionIndex === 0 ? 'Làm việc cơ quan' : '');
        });
        sampleData.push(row);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    ws['!cols'] = [
      { wch: 22 },
      { wch: 8 },
      { wch: 10 },
      ...DEFAULT_LEADERS.map(() => ({ wch: 35 }))
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch Công Tác Lãnh Đạo');
    XLSX.writeFile(wb, `Mau_Lich_Ma_Tran_Lanh_Dao_${new Date().toISOString().split('T')[0]}.xlsx`);
    addToast('success', 'Thành công', 'Đã tải file mẫu ma trận về máy');
  }, [addToast]);

  const exportToExcel = useCallback(() => {
    if (schedules.length === 0) {
      addToast('warning', 'Cảnh báo', 'Không có dữ liệu để xuất');
      return;
    }

    const headers = [
      'Tuần (Thứ 2)',
      'Thứ',
      'Buổi',
      'Nhân sự',
      'Chức vụ',
      'Đơn vị',
      'Tiêu đề',
      'Loại công việc',
      'Địa điểm',
      'Thành phần',
      'Ghi chú'
    ];

    const data = schedules.map(s => [
      s.weekStartDate,
      s.dayOfWeek.toString(),
      s.session,
      s.personName,
      s.personRole || '',
      s.unitName || '',
      s.title,
      s.workType || '',
      s.location || '',
      s.participants || '',
      s.notes || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch công tác tuần');
    XLSX.writeFile(wb, `Lich_Cong_Tac_Tuan_${weekStartDateStr}.xlsx`);
    addToast('success', 'Thành công', `Đã xuất ${data.length} bản ghi ra Excel`);
  }, [schedules, addToast]);

  const parseMatrixFormat = useCallback((jsonData: string[][]) => {
    if (jsonData.length < 2) return null;
    const headers = jsonData[0] as string[];
    if (!headers[0]?.toLowerCase().includes('ngày') || !headers[1]?.toLowerCase().includes('buổi')) return null;
    
    const leaderNames = headers.slice(3).map(h => h.split('\n')[0].split('(')[0].trim());
    const rows = jsonData.slice(1);
    const result: any[] = [];
    let currentDayIndex = -1;
    
    rows.forEach((row) => {
      const dayCell = row[0]?.toString().trim();
      const dayOfWeekStr = row[1]?.toString().trim() || '';
      const session = row[2]?.toString().trim() || '';
      
      if (dayCell) {
        const dayMatch = dayCell.match(/Thứ\s*(\d+)/);
        if (dayMatch) {
          currentDayIndex = parseInt(dayMatch[1]) - 1;
        }
      }
      
      if (currentDayIndex >= 0 && currentDayIndex < 7 && SESSIONS.includes(session)) {
        const dayOfWeek = [1,2,3,4,5,6,0][currentDayIndex];
        leaderNames.forEach((leaderName, leaderIdx) => {
          const content = row[leaderIdx + 3]?.toString().trim() || '';
          if (content && content !== '—' && content !== '') {
            result.push({
              weekStartDate: weekStartDateStr,
              dayOfWeek,
              session: SESSIONS[SESSIONS.indexOf(session)],
              personName: leaderName,
              title: content,
              workType: content.includes('Họp') ? 'MEETING' : content.includes('Công tác') ? 'OUTSIDE' : 'OFFICE',
              location: content.includes('📍') || content.includes('') ? content.split(/[📍]/).pop()?.trim() : ''
            });
          }
        });
      }
    });
    
    return result.length > 0 ? result : null;
  }, [weekStartDateStr]);

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
           const items = matrixData.map(cell => ({
             weekStartDate: cell.weekStartDate,
             dayOfWeek: cell.dayOfWeek,
             session: cell.session,
             personName: cell.personName,
             title: cell.title,
             workType: cell.workType,
             location: cell.location,
             createdAt: new Date().toISOString()
           }));
           
           if (items.length === 0) {
            addToast('warning', 'Cảnh báo', 'Không tìm thấy dữ liệu hợp lệ trong file ma trận');
            return;
          }
          
          onBatchSaveSchedules(items);
          addToast('success', 'Nhập thành công (Ma trận)', `Đã nhập ${items.length} lịch công tác từ file ma trận`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as string[][];

        const colMap: Record<string, number> = {};
        headers.forEach((h, i) => {
          const normalized = h.toLowerCase().trim();
          if (normalized.includes('tuần') || normalized.includes('thứ 2')) colMap.weekStartDate = i;
          else if (normalized.includes('thứ') && !normalized.includes('tuần')) colMap.dayOfWeek = i;
          else if (normalized.includes('buổi')) colMap.session = i;
          else if (normalized.includes('nhân sự') || normalized.includes('tên')) colMap.personName = i;
          else if (normalized.includes('chức vụ')) colMap.personRole = i;
          else if (normalized.includes('đơn vị')) colMap.unitName = i;
          else if (normalized.includes('tiêu đề') || normalized.includes('nội dung')) colMap.title = i;
          else if (normalized.includes('loại')) colMap.workType = i;
          else if (normalized.includes('địa điểm')) colMap.location = i;
          else if (normalized.includes('thành phần')) colMap.participants = i;
          else if (normalized.includes('ghi chú')) colMap.notes = i;
        });

        const items = rows.map((row, rowIndex) => ({
          weekStartDate: row[colMap.weekStartDate]?.toString().trim() || weekStartDateStr,
          dayOfWeek: parseInt(row[colMap.dayOfWeek]?.toString().trim() || '1', 10),
          session: row[colMap.session]?.toString().trim() || 'MORNING',
          personName: row[colMap.personName]?.toString().trim() || '',
          personRole: row[colMap.personRole]?.toString().trim() || '',
          unitName: row[colMap.unitName]?.toString().trim() || '',
          title: row[colMap.title]?.toString().trim() || '',
          workType: row[colMap.workType]?.toString().trim() || 'OFFICE',
          location: row[colMap.location]?.toString().trim() || '',
          participants: row[colMap.participants]?.toString().trim() || '',
          notes: row[colMap.notes]?.toString().trim() || '',
          createdAt: new Date().toISOString(),
        })).filter(item => item.title && item.personName);

        if (items.length === 0) {
          addToast('error', 'Lỗi', 'Không có dữ liệu hợp lệ để nhập');
          return;
        }

        onBatchSaveSchedules(items);
        addToast('success', 'Nhập thành công', `Đã nhập ${items.length} lịch công tác`);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        console.error('Import error:', err);
        addToast('error', 'Lỗi đọc file', 'File Excel không hợp lệ hoặc bị lỗi định dạng');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [addToast, parseMatrixFormat]);

  const triggerFileImport = () => {
    fileInputRef.current?.click();
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
                value={addForm.personName || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, personName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Chức vụ</label>
              <input
                type="text"
                value={addForm.personRole || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, personRole: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tuần (Thứ 2)</label>
              <input
                type="date"
                value={addForm.weekStartDate || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, weekStartDate: e.target.value, dayOfWeek: new Date(e.target.value).getDay() }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Thứ (1-6, 0=CN)</label>
              <input
                type="number"
                value={addForm.dayOfWeek || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                min={0} max={6}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Buổi</label>
              <select
                value={addForm.session || 'MORNING'}
                onChange={(e) => setAddForm(prev => ({ ...prev, session: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="MORNING">Sáng</option>
                <option value="AFTERNOON">Chiều</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề công việc</label>
              <input
                type="text"
                value={addForm.title || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Loại công việc</label>
              <select
                value={addForm.workType || 'OFFICE'}
                onChange={(e) => setAddForm(prev => ({ ...prev, workType: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="OFFICE">Làm việc tại cơ quan</option>
                <option value="OUTSIDE">Công tác ngoài</option>
                <option value="MEETING">Họp/Hội nghị</option>
                <option value="OFF">Nghỉ/Off</option>
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Thành phần tham gia</label>
              <input
                type="text"
                value={addForm.participants || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, participants: e.target.value }))}
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
                <span className="px-3 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg min-w-[180px] text-center">
                  {formatWeekRange(weekStartDate)}
                </span>
                <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Tuần sau">
                  <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button onClick={handleThisWeek} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium text-slate-600 dark:text-slate-400" title="Tuần này">
                  Tuần này
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={downloadMatrixTemplate} className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors" title="Mẫu ma trận">
                <DownloadIcon className="w-4 h-4 text-emerald-600" />
              </button>
              <button onClick={downloadTemplate} className="p-2 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors" title="Mẫu nhập">
                <DownloadIcon className="w-4 h-4 text-sky-600" />
              </button>
              <button onClick={triggerFileImport} className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors" title="Nhập Excel">
                <UploadIcon className="w-4 h-4 text-amber-600" />
              </button>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" />
              <button onClick={exportToExcel} className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Xuất Excel">
                <FileSpreadsheet className="w-4 h-4 text-[#2d6e3e]" />
              </button>
              <button onClick={handleClearWeek} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Xóa tuần">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>

        {/* 2x2 GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionBlock
            title="1. LỊCH CÔNG TÁC BAN LÃNH ĐẠO"
            subtitle="4 LÃNH ĐẠO"
            icon={<Users className="w-4 h-4" />}
            headerColor={LEADER_COLOR}
            units={leaderUnits}
            color={LEADER_COLOR}
            type="leader"
            onAddForm={openAddForm}
            schedules={schedules}
            weekStartDateStr={weekStartDateStr}
            filterWorkType={filterWorkType}
            handleEditClick={handleEditClick}
          />
          <SectionBlock
            title="2. LỊCH THỐNG KÊ CƠ SỞ VÙNG 1"
            subtitle="7 CƠ SỞ VÙNG 1"
            icon={<Building2 className="w-4 h-4" />}
            headerColor={VUNG1_COLOR}
            units={VUNG1_UNITS.map(name => ({
              id: `vung1_${name}`,
              name,
              fullName: `Thống kê cơ sở ${name}`,
              color: VUNG1_COLOR,
              members: users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`),
              allSchedules: schedules.filter(s => s.weekStartDate === weekStartDateStr && s.unitName === `Thống kê cơ sở ${name}`)
            }))}
            color={VUNG1_COLOR}
            type="vung1"
            onAddForm={openAddForm}
            schedules={schedules}
            weekStartDateStr={weekStartDateStr}
            filterWorkType={filterWorkType}
            handleEditClick={handleEditClick}
          />
          <SectionBlock
            title="3. LỊCH CÔNG TÁC 5 PHÒNG CHỨC NĂNG"
            subtitle="5 PHÒNG"
            icon={<Building className="w-4 h-4" />}
            headerColor={PHONG_COLOR}
            units={PHONG_UNITS.map(p => ({
              id: `phong_${p.full}`,
              name: p.short,
              fullName: p.full,
              color: PHONG_COLOR,
              members: users.filter(u => u.department === p.full),
              allSchedules: schedules.filter(s => s.weekStartDate === weekStartDateStr && s.unitName === p.full)
            }))}
            color={PHONG_COLOR}
            type="phong"
            onAddForm={openAddForm}
            schedules={schedules}
            weekStartDateStr={weekStartDateStr}
            filterWorkType={filterWorkType}
            handleEditClick={handleEditClick}
          />
          <SectionBlock
            title="4. LỊCH THỐNG KÊ CƠ SỞ VÙNG 2"
            subtitle="7 CƠ SỞ VÙNG 2"
            icon={<Building2 className="w-4 h-4" />}
            headerColor={VUNG2_COLOR}
            units={VUNG2_UNITS.map(name => ({
              id: `vung2_${name}`,
              name,
              fullName: `Thống kê cơ sở ${name}`,
              color: VUNG2_COLOR,
              members: users.filter(u => u.department === `Thống kê cơ sở ${name}` || u.workUnit === `Thống kê cơ sở ${name}`),
              allSchedules: schedules.filter(s => s.weekStartDate === weekStartDateStr && s.unitName === `Thống kê cơ sở ${name}`)
            }))}
            color={VUNG2_COLOR}
            type="vung2"
            onAddForm={openAddForm}
            schedules={schedules}
            weekStartDateStr={weekStartDateStr}
            filterWorkType={filterWorkType}
            handleEditClick={handleEditClick}
          />
        </div>

      </div>
    </div>
  );
};

export default WeeklyWorkSchedule;