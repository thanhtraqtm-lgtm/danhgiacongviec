import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Video,
  MapPin,
  Clock,
  X,
  Edit2,
  Save,
  Trash2,
  Users,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Building2,
  Briefcase,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { Meeting } from '../types';

interface MeetingCalendarProps {
  meetings: Meeting[];
  onUpdateMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

const MEETING_TYPE_CONFIG = {
  google_meet: { label: 'Google Meet', color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300', icon: Video },
  hybrid: { label: 'Hybrid', color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300', icon: Video },
  polycom: { label: 'Polycom', color: '#8b5cf6', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-300', icon: Video },
  offline: { label: 'Trực tiếp', color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-300', icon: MapPin },
};

const WORK_TYPE_CONFIG = {
  OFFICE: { label: 'Làm việc tại cơ quan', color: '#f59e0b', icon: Building2 },
  OUTSIDE: { label: 'Công tác ngoài', color: '#10b981', icon: Briefcase },
  MEETING: { label: 'Họp/Hội nghị', color: '#3b82f6', icon: Users },
  OFF: { label: 'Nghỉ/Off', color: '#6b7280', icon: X },
};

const CARD_GRADIENTS = [
  'from-emerald-500 to-emerald-600',
  'from-blue-500 to-blue-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
  'from-rose-500 to-rose-600',
  'from-indigo-500 to-indigo-600',
  'from-orange-500 to-orange-600',
  'from-teal-500 to-teal-600',
  'from-cyan-500 to-cyan-600',
];

const CARD_BG_LIGHT = [
  'bg-emerald-50 dark:bg-emerald-950/20',
  'bg-blue-50 dark:bg-blue-950/20',
  'bg-amber-50 dark:bg-amber-950/20',
  'bg-purple-50 dark:bg-purple-950/20',
  'bg-rose-50 dark:bg-rose-950/20',
  'bg-indigo-50 dark:bg-indigo-950/20',
  'bg-orange-50 dark:bg-orange-950/20',
  'bg-teal-50 dark:bg-teal-950/20',
  'bg-cyan-50 dark:bg-cyan-950/20',
];

const CARD_BORDER_LIGHT = [
  'border-emerald-200 dark:border-emerald-800',
  'border-blue-200 dark:border-blue-800',
  'border-amber-200 dark:border-amber-800',
  'border-purple-200 dark:border-purple-800',
  'border-rose-200 dark:border-rose-800',
  'border-indigo-200 dark:border-indigo-800',
  'border-orange-200 dark:border-orange-800',
  'border-teal-200 dark:border-teal-800',
  'border-cyan-200 dark:border-cyan-800',
];

const CARD_TEXT_COLOR = [
  'text-emerald-700 dark:text-emerald-300',
  'text-blue-700 dark:text-blue-300',
  'text-amber-700 dark:text-amber-300',
  'text-purple-700 dark:text-purple-300',
  'text-rose-700 dark:text-rose-300',
  'text-indigo-700 dark:text-indigo-300',
  'text-orange-700 dark:text-orange-300',
  'text-teal-700 dark:text-teal-300',
  'text-cyan-700 dark:text-cyan-300',
];

const BLOCKS_CONFIG = {
  block1: {
    id: 'block1',
    title: 'LỊCH HỌP TUẦN',
    subtitle: '4 KHỐI CHÍNH',
    icon: Users,
    color: '#2d6e3e',
    count: 4,
  },
  block2: {
    id: 'block2',
    title: 'LỊCH CÔNG TÁC CHI TIẾT',
    subtitle: 'THEO DÕI NGÀY',
    icon: CalendarDays,
    color: '#3b82f6',
    count: 7,
  },
  block3: {
    id: 'block3',
    title: 'PHÂN LOẠI HÌNH THỨC',
    subtitle: '5 LOẠI HỘP',
    icon: Building2,
    color: '#ec4899',
    count: 5,
  },
};

interface StatCardProps {
  title: string;
  value: number;
  label: string;
  index: number;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, label, index, color, icon, onClick, children }) => {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const bgLight = CARD_BG_LIGHT[index % CARD_BG_LIGHT.length];
  const borderLight = CARD_BORDER_LIGHT[index % CARD_BORDER_LIGHT.length];
  const textColor = CARD_TEXT_COLOR[index % CARD_TEXT_COLOR.length];

  return (
    <button
      onClick={onClick}
      className={`relative group w-full min-h-[120px] flex flex-col ${bgLight} ${borderLight} border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden`}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative p-4 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg`} style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
              {icon}
            </div>
            <div className="min-w-0">
              <h4 className={`font-bold text-sm truncate ${textColor}`}>{title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${textColor}`} style={{ backgroundColor: color + '20' }}>
              {value}
            </span>
            <ChevronRight className={`w-4 h-4 ${textColor}`} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-end">
          {children}
          <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              Chi tiết
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

interface BlockSectionProps {
  config: typeof BLOCKS_CONFIG.block1;
  cards: Array<{ title: string; value: number; label: string; icon: React.ReactNode; onClick: () => void }>;
  onAddClick?: () => void;
}

const BlockSection: React.FC<BlockSectionProps> = ({ config, cards, onAddClick }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ borderTop: `3px solid ${config.color}` }}>
      <div className={`px-4 py-3 flex items-center justify-between bg-gradient-to-r from-${config.color.replace('#', '')} to-${config.color.replace('#', '')}dd text-white`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <config.icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase">{config.title}</h3>
            <p className="text-[10px] opacity-90">{config.subtitle}</p>
          </div>
        </div>
        {onAddClick && (
          <button onClick={onAddClick} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Thêm">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="grid gap-2" style={{ 
          gridTemplateColumns: cards.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)' 
        }}>
          {cards.map((card, index) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              label={card.label}
              index={index}
              color={config.color}
              icon={card.icon}
              onClick={card.onClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const MeetingCalendar: React.FC<MeetingCalendarProps> = ({
  meetings,
  onUpdateMeeting,
  onDeleteMeeting,
  addToast
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Meeting>>({});
  const [showAllMeetings, setShowAllMeetings] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDay = (firstDayOfMonth + 6) % 7;

  const handlePrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const filteredMeetings = useMemo(() => meetings.filter(m => {
    if (filterType !== 'ALL' && m.meetingType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  }), [meetings, filterType, searchQuery]);

  const getMeetingsForDay = (day: number) => filteredMeetings.filter(m => {
    if (!m.startDate) return false;
    const d = new Date(m.startDate);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < startingDay; i++) {
      arr.push(<div key={`empty-${i}`} className="min-h-[100px] border border-slate-200/60 bg-slate-50/50 dark:bg-slate-900/30" />);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dayMeetings = getMeetingsForDay(i);
      const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();
      const isSelected = selectedDay?.toDateString() === new Date(year, month, i).toDateString();
      const hasMeetings = dayMeetings.length > 0;
      arr.push(
        <div key={i} onClick={() => setSelectedDay(new Date(year, month, i))}
          className={`min-h-[100px] border border-slate-200 dark:border-slate-800 p-2 relative cursor-pointer transition-all flex flex-col justify-between ${
            isSelected ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#2d6e3e] ring-2 ring-[#2d6e3e]/50 z-10' 
            : hasMeetings ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
              isToday ? 'bg-[#2d6e3e] text-white shadow-xs' : isSelected ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-300'
            }`}>{i}</span>
            {hasMeetings && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">{dayMeetings.length} họp</span>}
          </div>
          <div className="mt-1 space-y-1 overflow-y-auto max-h-[60px] custom-scrollbar flex-1">
            {dayMeetings.map(m => {
              const startT = new Date(m.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const cfg = MEETING_TYPE_CONFIG[m.meetingType as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.offline;
              return (
                <div key={m.id} className={`${cfg.bg} ${cfg.text} ${cfg.border} text-[10px] truncate px-1.5 py-1 rounded font-medium border`} title={`${startT} - ${m.title}`}>
                  <span className="font-bold mr-1">{startT}</span>
                  <span>{m.title}</span>
                </div>
              );
            })}
          </div>
        </div>
    );
    return arr;
  }, [year, month, startingDay, daysInMonth, selectedDay, filteredMeetings]);

  const selectedDayMeetings = useMemo(() => selectedDay ? filteredMeetings.filter(m => {
    if (!m.startDate) return false;
    const d = new Date(m.startDate);
    return d.getFullYear() === selectedDay.getFullYear() && d.getMonth() === selectedDay.getMonth() && d.getDate() === selectedDay.getDate();
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) : [], [selectedDay, filteredMeetings]);

  const allMeetingsWithWork = useMemo(() => {
    const workItems = meetings.map(m => ({
      ...m,
      workType: 'MEETING' as const,
      dayOfWeek: m.startDate ? new Date(m.startDate).getDay() : 0,
      session: m.startDate ? (new Date(m.startDate).getHours() < 12 ? 'MORNING' : 'AFTERNOON') as 'MORNING' | 'AFTERNOON' : 'MORNING',
      personName: m.organizer || 'Cục Thống Kê',
      personRole: '',
      unitName: '',
      location: m.location || '',
    }));
    return [...workItems];
  }, [meetings]);

  const handleEditClick = (meeting: Meeting) => { setEditingMeeting(meeting.id); setEditForm(meeting); };
  const handleSaveEdit = (meetingId: string) => {
    if (!editForm.title?.trim() || !editForm.startDate || !editForm.endDate) { addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc'); return; }
    if (new Date(editForm.startDate) >= new Date(editForm.endDate)) { addToast('error', 'Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu'); return; }
    onUpdateMeeting({ ...(meetings.find(m => m.id === meetingId) as Meeting), ...editForm });
    setEditingMeeting(null);
    addToast('success', 'Thành công', 'Đã cập nhật lịch họp');
  };

  const getBlock1Cards = () => [
    { title: 'Họp Trực Tiếp', value: filteredMeetings.filter(m => m.meetingType === 'offline').length, label: 'cuộc họp', icon: <MapPin className="w-4.5 h-4.5" />, onClick: () => setFilterType('offline') },
    { title: 'Google Meet', value: filteredMeetings.filter(m => m.meetingType === 'google_meet').length, label: 'cuộc họp', icon: <Video className="w-4.5 h-4.5" />, onClick: () => setFilterType('google_meet') },
    { title: 'Polycom', value: filteredMeetings.filter(m => m.meetingType === 'polycom').length, label: 'cuộc họp', icon: <Video className="w-4.5 h-4.5" />, onClick: () => setFilterType('polycom') },
    { title: 'Hybrid', value: filteredMeetings.filter(m => m.meetingType === 'hybrid').length, label: 'cuộc họp', icon: <Video className="w-4.5 h-4.5" />, onClick: () => setFilterType('hybrid') },
  ];

  const getBlock3Cards = () => [
    { title: 'Tất Cả', value: filteredMeetings.length, label: 'cuộc họp', icon: <CalendarDays className="w-4.5 h-4.5" />, onClick: () => setFilterType('ALL') },
    { title: 'Trong Tuần Này', value: filteredMeetings.filter(m => m.startDate && new Date(m.startDate) >= new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)) && new Date(m.startDate) <= new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7))).length, label: 'cuộc họp', icon: <CalendarDays className="w-4.5 h-4.5" />, onClick: () => {} },
    { title: 'Tháng Nay', value: filteredMeetings.filter(m => m.startDate && new Date(m.startDate).getMonth() === month && new Date(m.startDate).getFullYear() === year).length, label: 'cuộc họp', icon: <CalendarIcon className="w-4.5 h-4.5" />, onClick: () => {} },
    { title: 'Có Link Online', value: filteredMeetings.filter(m => m.googleMeetLink).length, label: 'cuộc họp', icon: <ExternalLink className="w-4.5 h-4.5" />, onClick: () => {} },
    { title: 'Đã Xảy Ra', value: filteredMeetings.filter(m => m.startDate && new Date(m.startDate) < new Date()).length, label: 'cuộc họp', icon: <Clock className="w-4.5 h-4.5" />, onClick: () => {} },
  ];

  const getBlock2Cards = () => {
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return dayNames.map((day, idx) => {
      const dayMeetings = filteredMeetings.filter(m => m.startDate && new Date(m.startDate).getDay() === (idx === 0 ? 0 : idx));
      return {
        title: `Thứ ${idx === 0 ? 'CN' : idx}`,
        value: dayMeetings.length,
        label: 'cuộc họp',
        icon: <CalendarDays className="w-4.5 h-4.5" />,
        onClick: () => {}
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-5">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#2d6e3e]" />
            <span>Lịch Họp & Công Tác Cục Thống Kê</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Theo dõi, tra cứu lịch làm việc, hội nghị trực tuyến và họp giao ban</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm cuộc họp..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e]" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none">
            <option value="ALL">Tất cả hình thức</option>
            <option value="offline">Trực tiếp</option>
            <option value="google_meet">Google Meet</option>
            <option value="polycom">Polycom</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <button onClick={() => setShowAllMeetings(!showAllMeetings)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {showAllMeetings ? 'Thu gọn' : 'Xem tất cả'}
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns - Left narrower (1/3), Right wider (2/3) */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* LEFT COLUMN - 1/3 width - Two stacked blocks */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          {/* Block 1: 4 cards */}
          <BlockSection config={BLOCKS_CONFIG.block1} cards={getBlock1Cards()} />
          
          {/* Block 3: 5 cards */}
          <BlockSection config={BLOCKS_CONFIG.block3} cards={getBlock3Cards()} />
        </div>

        {/* RIGHT COLUMN - 2/3 width - Block 2 */}
        <div className="lg:w-2/3">
          <BlockSection config={BLOCKS_CONFIG.block2} cards={getBlock2Cards()} />
        </div>
      </div>

      {/* BOTTOM: Full-width Detail List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2d6e3e] flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {showAllMeetings 
                  ? `Tất Cả Lịch Hộip & Công Tác (${allMeetingsWithWork.length})` 
                  : selectedDay 
                    ? `Lịch Họp Ngày ${selectedDay.toLocaleDateString('vi-VN')} (${selectedDayMeetings.length})`
                    : 'Chọn ngày trên lịch hoặc bấm "Xem tất cả"'
                }
              </h3>
              <p className="text-xs text-slate-500">
                {showAllMeetings ? 'Bao gồm cả "Làm việc tại cơ quan" và các loại công tác khác' : 'Nhấn vào ngày trên lịch tháng để xem chi tiết'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
              {showAllMeetings ? allMeetingsWithWork.length : selectedDayMeetings.length} mục
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-10">STT</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-32">Ngày</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-24">Buổi</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Tiêu đề / Nội dung</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-36">Loại</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-40">Hình thức</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Địa điểm</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 w-20">Người tạo</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(showAllMeetings ? allMeetingsWithWork : selectedDayMeetings).map((item, idx) => {
                const isMeeting = 'meetingType' in item && item.meetingType;
                const startT = item.startDate ? new Date(item.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const endT = item.endDate ? new Date(item.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const dateStr = item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '';
                const dayOfWeek = item.startDate ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(item.startDate).getDay()] : '';
                
                let typeConfig, typeLabel, typeIcon;
                if (isMeeting) {
                  typeConfig = MEETING_TYPE_CONFIG[item.meetingType as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.offline;
                  typeLabel = typeConfig.label;
                  typeIcon = <typeConfig.icon className="w-3.5 h-3.5" />;
                } else {
                  typeConfig = WORK_TYPE_CONFIG[item.workType as keyof typeof WORK_TYPE_CONFIG] || WORK_TYPE_CONFIG.OFFICE;
                  typeLabel = typeConfig.label;
                  typeIcon = <typeConfig.icon className="w-3.5 h-3.5" />;
                }

                const sessionLabel = item.session === 'MORNING' ? 'Sáng' : 'Chiều';
                const sessionColor = item.session === 'MORNING' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';

                return (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{dateStr}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{dayOfWeek}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${sessionColor}`}>{sessionLabel}</span>
                      {startT && <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{startT} - {endT}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[300px]">{item.title}</p>
                      {item.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[300px] mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium" style={{backgroundColor: typeConfig.color + '20', color: typeConfig.color}}>
                        {typeIcon}
                        <span>{typeLabel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isMeeting ? (
                        <span className={`px-2.5 py-1 rounded text-[10px] font-medium ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>
                          <typeConfig.icon className="w-3 h-3 inline-block mr-1" />
                          {typeConfig.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 opacity-50" />
                      <span className="truncate max-w-[150px]">{item.location || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{item.personName || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {isMeeting && !showAllMeetings && (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEditClick(item as Meeting)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Sửa"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { if (confirm('Bạn có chắc muốn xóa?')) { onDeleteMeeting(item.id); addToast('success', 'Đã xóa', 'Đã xóa thành công'); } }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(showAllMeetings ? allMeetingsWithWork : selectedDayMeetings).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {showAllMeetings ? 'Chưa có lịch họp/công tác nào' : selectedDay ? 'Không có lịch họp trong ngày này' : 'Chưa chọn ngày'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {showAllMeetings ? 'Nhấn "Thêm" để tạo mới' : 'Nhấn vào ngày trên lịch tháng hoặc bấm "Xem tất cả"'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MeetingCalendar;