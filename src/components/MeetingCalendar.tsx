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
  Building,
  User,
  MoreHorizontal,
} from 'lucide-react';
import { Meeting, User as UserType } from '../types';

interface MeetingCalendarProps {
  meetings: Meeting[];
  users: UserType[];
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
    subtitle: '4 HÌNH THỨC HỘP',
    icon: Users,
    color: '#2d6e3e',
    cardsPerRow: 4,
  },
  block2: {
    id: 'block2',
    title: 'LỊCH CÔNG TÁC THEO NGÀY',
    subtitle: '7 NGÀY TUẦN',
    icon: CalendarDays,
    color: '#3b82f6',
    cardsPerRow: 4,
  },
  block3: {
    id: 'block3',
    title: 'PHÂN LOẠI HÌNH THỨC',
    subtitle: '5 BỘ LỌC',
    icon: Building2,
    color: '#ec4899',
    cardsPerRow: 3,
  },
};

const DEFAULT_LEADERS = [
  { name: 'Đào Trọng Truyền', position: 'Trưởng Thống kê', unitName: 'Ban Lãnh đạo', color: '#2d6e3e' },
  { name: 'Đào Thị Hiếu', position: 'Phó Trưởng Thống kê', unitName: 'Ban Lãnh đạo', color: '#10b981' },
  { name: 'Vũ Tuấn Hùng', position: 'Phó Trưởng Thống kê', unitName: 'Ban Lãnh đạo', color: '#3b82f6' },
  { name: 'Phạm Văn Tự', position: 'Phó Trưởng Thống kê', unitName: 'Ban Lãnh đạo', color: '#f59e0b' },
];

interface StatCardProps {
  title: string;
  value: number;
  label: string;
  index: number;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
  cardsPerRow: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, label, index, color, icon, onClick, cardsPerRow }) => {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const bgLight = CARD_BG_LIGHT[index % CARD_BG_LIGHT.length];
  const borderLight = CARD_BORDER_LIGHT[index % CARD_BORDER_LIGHT.length];
  const textColor = CARD_TEXT_COLOR[index % CARD_TEXT_COLOR.length];

  const cardWidth = `calc(${100 / cardsPerRow}% - ${(cardsPerRow - 1) * 8 / cardsPerRow}px)`;

  return (
    <button
      onClick={onClick}
      className={`relative group flex flex-col ${bgLight} ${borderLight} border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden min-h-[120px]`}
      style={{ 
        borderTop: `3px solid ${color}`,
        flex: `1 1 ${cardWidth}`,
        minWidth: cardWidth,
        maxWidth: cardWidth,
      }}
    >
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="relative p-4 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0`} style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`font-bold text-sm ${textColor} truncate`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${textColor} whitespace-nowrap`} style={{ backgroundColor: color + '20' }}>
              {value}
            </span>
            <ChevronRight className={`w-4 h-4 ${textColor} flex-shrink-0`} />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-end min-h-0">
          <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <CalendarDays className="w-3 h-3 flex-shrink-0" />
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
  cards: Array<{ title: string; value: number; label: string; icon: React.ReactNode; onClick: () => void; department?: string }>;
  onCardClick?: (department: string) => void;
}

const BlockSection: React.FC<BlockSectionProps> = ({ config, cards, onCardClick }) => {
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
      </div>
      <div className="p-3">
        <div 
          className="flex flex-wrap width-full"
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            width: '100%', 
            gap: '8px',
            alignItems: 'stretch',
          }}
        >
          {cards.map((card, index) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              label={card.label}
              index={index}
              color={config.color}
              icon={card.icon}
              onClick={() => { card.onClick(); if (card.department && onCardClick) onCardClick(card.department); }}
              cardsPerRow={config.cardsPerRow}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface WeeklyScheduleMatrixProps {
  users: UserType[];
  meetings: Meeting[];
  selectedDepartment: string | null;
  onUpdateMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

const WeeklyScheduleMatrix: React.FC<WeeklyScheduleMatrixProps> = ({ 
  users, 
  meetings, 
  selectedDepartment, 
  onUpdateMeeting, 
  onDeleteMeeting, 
  addToast 
}) => {
  const [editingMeeting, setEditingMeeting] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Meeting>>({});

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const dayLabelsFull = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const sessions = ['MORNING', 'AFTERNOON'];
  const sessionLabels = { MORNING: 'Sáng', AFTERNOON: 'Chiều' };

  const getUsersForDepartment = (dept: string) => {
    if (dept === 'Ban Lãnh đạo') {
      return DEFAULT_LEADERS.map(l => users.find(u => u.fullName === l.name)).filter(Boolean) as UserType[];
    }
    return users.filter(u => u.department === dept || u.workUnit === dept);
  };

  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    DEFAULT_LEADERS.forEach(l => depts.add(l.unitName));
    users.forEach(u => { if (u.department) depts.add(u.department); if (u.workUnit) depts.add(u.workUnit); });
    return Array.from(depts).sort();
  }, [users]);

  const getMeetingsForUser = (userName: string) => {
    return meetings.filter(m => {
      if (!m.startDate) return false;
      const d = new Date(m.startDate);
      return d >= weekStart && d <= weekEnd && (m.organizer === userName || m.title.includes(userName));
    }).sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
  };

  const getMeetingsForDepartment = (dept: string) => {
    const deptUsers = getUsersForDepartment(dept);
    const userNames = deptUsers.map(u => u.fullName);
    return meetings.filter(m => {
      if (!m.startDate) return false;
      const d = new Date(m.startDate);
      return d >= weekStart && d <= weekEnd && userNames.some(name => m.organizer === name || m.title.includes(name));
    }).sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
  };

  const handleEditClick = (meeting: Meeting) => { setEditingMeeting(meeting.id); setEditForm(meeting); };
  const handleSaveEdit = (meetingId: string) => {
    if (!editForm.title?.trim() || !editForm.startDate || !editForm.endDate) { addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc'); return; }
    if (new Date(editForm.startDate) >= new Date(editForm.endDate)) { addToast('error', 'Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu'); return; }
    onUpdateMeeting({ ...(meetings.find(m => m.id === meetingId) as Meeting), ...editForm });
    setEditingMeeting(null);
    addToast('success', 'Thành công', 'Đã cập nhật lịch');
  };

  if (!selectedDepartment) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-12">
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-10 h-10 text-slate-400" />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-2">Chọn một khối thống kê bên trên</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Nhấn vào thẻ để xem ma trận lịch tuần chi tiết của phòng/đơn vị đó</p>
        </div>
      </div>
    );
  }

  const deptUsers = getUsersForDepartment(selectedDepartment);
  const deptMeetings = getMeetingsForDepartment(selectedDepartment);

  const meetingsByDayAndSession = useMemo(() => {
    const map: Record<number, Record<string, Meeting[]>> = {};
    dayLabels.forEach((_, dayIdx) => {
      map[dayIdx] = { MORNING: [], AFTERNOON: [] };
    });
    deptMeetings.forEach(m => {
      if (!m.startDate) return;
      const d = new Date(m.startDate);
      const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const hour = d.getHours();
      const session = hour < 12 ? 'MORNING' : 'AFTERNOON';
      if (map[dayIdx] && map[dayIdx][session]) {
        map[dayIdx][session].push(m);
      }
    });
    return map;
  }, [deptMeetings]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2d6e3e] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Ma Trận Lịch Tuần: {selectedDepartment}
            </h3>
            <p className="text-xs text-slate-500">
              {deptUsers.length} nhân sự • {deptMeetings.length} lịch • Tuần {weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300">
            {deptMeetings.length} mục
          </span>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[600px] p-4">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 w-36 whitespace-nowrap border-r border-slate-200 dark:border-slate-700">
                Nhân sự / Chức vụ
              </th>
              {dayLabels.map((day, dayIdx) => (
                <th key={day} className="px-2 py-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700" style={{ minWidth: '180px' }}>
                  <div className="font-medium">{day}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {new Date(weekStart.getTime() + dayIdx * 86400000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deptUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Không có nhân sự nào trong đơn vị này</p>
                </td>
              </tr>
            ) : (
              deptUsers.map((user, userIdx) => {
                const userMeetings = getMeetingsForUser(user.fullName);
                const userMeetingsByDay = useMemo(() => {
                  const map: Record<number, Record<string, Meeting[]>> = {};
                  dayLabels.forEach((_, dayIdx) => {
                    map[dayIdx] = { MORNING: [], AFTERNOON: [] };
                  });
                  userMeetings.forEach(m => {
                    if (!m.startDate) return;
                    const d = new Date(m.startDate);
                    const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                    const hour = d.getHours();
                    const session = hour < 12 ? 'MORNING' : 'AFTERNOON';
                    if (map[dayIdx] && map[dayIdx][session]) {
                      map[dayIdx][session].push(m);
                    }
                  });
                  return map;
                }, [userMeetings]);

                return (
                  <tr key={user.fullName} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-900 z-10 w-36">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm">{user.fullName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{user.position || user.role || '—'}</span>
                      </div>
                    </td>
                    {dayLabels.map((_, dayIdx) => (
                      <td key={dayIdx} className="px-1 py-1.5 border-r border-slate-200 dark:border-slate-700 align-top" style={{ minWidth: '180px', maxWidth: '180px' }}>
                        <div className="space-y-1">
                          {sessions.map(session => {
                            const dayMeetings = userMeetingsByDay[dayIdx]?.[session] || [];
                            if (dayMeetings.length === 0) {
                              return (
                                <div key={session} className="h-10 min-h-[40px] border border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center">
                                  <span className="text-[10px] text-slate-300 dark:text-slate-600">
                                    {sessionLabels[session]}: —
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div key={session} className="space-y-1">
                                {dayMeetings.map((m, mIdx) => {
                                  const startT = new Date(m.startDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  const endT = m.endDate ? new Date(m.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                  const cfg = MEETING_TYPE_CONFIG[m.meetingType as keyof typeof MEETING_TYPE_CONFIG] || MEETING_TYPE_CONFIG.offline;
                                  return (
                                    <div 
                                      key={m.id} 
                                      className={`${cfg.bg} ${cfg.text} ${cfg.border} text-[10px] rounded-lg p-2 border shadow-sm`}
                                      style={{ fontSize: '10px' }}
                                    >
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/50 dark:bg-slate-800/50">
                                          {sessionLabels[session]}
                                        </span>
                                        <span className="font-bold">{startT}{endT && ` - ${endT}`}</span>
                                      </div>
                                      <p className="font-medium truncate max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{m.title}</p>
                                      {m.location && <p className="text-[9px] opacity-80 flex items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5" />{m.location}</p>}
                                      {editingMeeting === m.id ? (
                                        <div className="space-y-1.5 mt-1 pt-1 border-t border-white/50 dark:border-slate-800/50">
                                          <input 
                                            type="text" 
                                            value={editForm.title} 
                                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-[10px] bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                                          />
                                          <div className="grid grid-cols-2 gap-1">
                                            <input 
                                              type="datetime-local" 
                                              value={editForm.startDate ? new Date(editForm.startDate).toISOString().slice(0,16) : ''} 
                                              onChange={e => setEditForm({...editForm, startDate: new Date(e.target.value).toISOString()})}
                                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-[9px]"
                                            />
                                            <input 
                                              type="datetime-local" 
                                              value={editForm.endDate ? new Date(editForm.endDate).toISOString().slice(0,16) : ''} 
                                              onChange={e => setEditForm({...editForm, endDate: new Date(e.target.value).toISOString()})}
                                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-[9px]"
                                            />
                                          </div>
                                          <select 
                                            value={editForm.meetingType}
                                            onChange={e => setEditForm({...editForm, meetingType: e.target.value as any})}
                                            className="w-full px-2 py-1 border border-slate-300 rounded text-[10px]"
                                          >
                                            <option value="offline">Trực tiếp</option>
                                            <option value="google_meet">Google Meet</option>
                                            <option value="polycom">Polycom</option>
                                            <option value="hybrid">Hybrid</option>
                                          </select>
                                          <div className="flex gap-1 justify-end">
                                            <button onClick={() => setEditingMeeting(null)} className="px-2 py-1 text-[10px] text-slate-600 bg-white border border-slate-300 rounded">Hủy</button>
                                            <button onClick={() => handleSaveEdit(m.id)} className="px-2 py-1 text-[10px] text-white bg-[#2d6e3e] rounded flex items-center gap-1 font-bold">
                                              <Save className="w-3 h-3" /> Lưu
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleEditClick(m)} className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20" title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                                          <button onClick={() => { if (confirm('Xóa lịch này?')) { onDeleteMeeting(m.id); addToast('success', 'Đã xóa', 'Đã xóa thành công'); } }} className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const MeetingCalendar: React.FC<MeetingCalendarProps> = ({
  meetings,
  users,
  onUpdateMeeting,
  onDeleteMeeting,
  addToast
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

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
  }
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

  const getBlock1Cards = () => [
    { title: 'Họp Trực Tiếp', value: filteredMeetings.filter(m => m.meetingType === 'offline').length, label: 'cuộc họp', icon: <MapPin className="w-4.5 h-4.5" />, onClick: () => setFilterType('offline'), department: undefined },
    { title: 'Google Meet', value: filteredMeetings.filter(m => m.meetingType === 'google_meet').length, label: 'cuộc họp', icon: <Video className="w-4.5 h-4.5" />, onClick: () => setFilterType('google_meet'), department: undefined },
    { title: 'Polycom', value: filteredMeetings.filter(m => m.meetingType === 'polycom').length, label: 'cuộc họp', icon: <Video className="w-4.5 h-4.5" />, onClick: () => setFilterType('polycom'), department: undefined },
    { title: 'Hybrid', value: filteredMeetings.filter(m => m.meetingType === 'hybrid').length, label: 'cuộc họp', icon: <Video className="w-4.5 h-4.5" />, onClick: () => setFilterType('hybrid'), department: undefined },
  ];

  const getBlock3Cards = () => [
    { title: 'Tất Cả', value: filteredMeetings.length, label: 'cuộc họp', icon: <CalendarDays className="w-4.5 h-4.5" />, onClick: () => setFilterType('ALL'), department: undefined },
    { title: 'Trong Tuần Này', value: filteredMeetings.filter(m => m.startDate && new Date(m.startDate) >= new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)) && new Date(m.startDate) <= new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7))).length, label: 'cuộc họp', icon: <CalendarDays className="w-4.5 h-4.5" />, onClick: () => {}, department: undefined },
    { title: 'Tháng Nay', value: filteredMeetings.filter(m => m.startDate && new Date(m.startDate).getMonth() === month && new Date(m.startDate).getFullYear() === year).length, label: 'cuộc họp', icon: <CalendarIcon className="w-4.5 h-4.5" />, onClick: () => {}, department: undefined },
    { title: 'Có Link Online', value: filteredMeetings.filter(m => m.googleMeetLink).length, label: 'cuộc họp', icon: <ExternalLink className="w-4.5 h-4.5" />, onClick: () => {}, department: undefined },
    { title: 'Đã Xảy Ra', value: filteredMeetings.filter(m => m.startDate && new Date(m.startDate) < new Date()).length, label: 'cuộc họp', icon: <Clock className="w-4.5 h-4.5" />, onClick: () => {}, department: undefined },
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
        onClick: () => {},
        department: undefined,
      };
    });
  };

  const getDepartmentCards = () => {
    const depts = ['Ban Lãnh đạo', 'Phòng Thống kê Tổng hợp', 'Phòng TCHC', 'Phòng Thống kê TMDV & Giá', 'Phòng Thống kê CNXD', 'Phòng Thống kê NN&XH'];
    return depts.map((dept, idx) => {
      const deptUsers = users.filter(u => u.department === dept || u.workUnit === dept);
      const deptMeetings = meetings.filter(m => {
        if (!m.startDate) return false;
        const d = new Date(m.startDate);
        return d.getMonth() === month && d.getFullYear() === year && deptUsers.some(u => m.organizer === u.fullName || m.title.includes(u.fullName));
      });
      return {
        title: dept.replace('Phòng Thống kê ', 'P. ').replace('Thống kê cơ sở ', 'CS '),
        value: deptMeetings.length,
        label: `${deptUsers.length} người`,
        icon: <Building className="w-4.5 h-4.5" />,
        onClick: () => {},
        department: dept,
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

      {/* Main Grid: 2 Columns - Left 40%, Right 60% */}
      <div className="flex flex-col lg:flex-row gap-5" style={{ display: 'flex', flexWrap: 'nowrap' }}>
        {/* LEFT COLUMN - 40% width - Two stacked blocks */}
        <div className="flex flex-col gap-4" style={{ flex: '0 0 40%', maxWidth: '40%', minWidth: '320px' }}>
          {/* Block 1: 4 cards - 4 per row */}
          <BlockSection config={BLOCKS_CONFIG.block1} cards={getBlock1Cards()} onCardClick={setSelectedDepartment} />
          
          {/* Block 3: 5 cards - 3 per row */}
          <BlockSection config={BLOCKS_CONFIG.block3} cards={getBlock3Cards()} onCardClick={setSelectedDepartment} />
        </div>

        {/* RIGHT COLUMN - 60% width - Block 2 */}
        <div className="flex-1 min-w-0" style={{ flex: '0 0 60%' }}>
          <BlockSection config={BLOCKS_CONFIG.block2} cards={getBlock2Cards()} />
        </div>
      </div>

      {/* BOTTOM: Department Cards Row - Click to show matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ec4899] flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ma Trận Lịch Tuần Theo Phòng/Ban</h3>
              <p className="text-xs text-slate-500">Nhấn vào thẻ phòng/ban bên dưới để xem chi tiết lịch của toàn bộ nhân sự đơn vị đó</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div 
            className="flex flex-wrap width-full"
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              width: '100%', 
              gap: '8px',
              alignItems: 'stretch',
            }}
          >
            {getDepartmentCards().map((card, index) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                label={card.label}
                index={index}
                color={BLOCKS_CONFIG.block3.color}
                icon={card.icon}
                onClick={() => setSelectedDepartment(card.department!)}
                cardsPerRow={4}
              />
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM: Full-width Matrix Detail List */}
      <WeeklyScheduleMatrix
        users={users}
        meetings={meetings}
        selectedDepartment={selectedDepartment}
        onUpdateMeeting={onUpdateMeeting}
        onDeleteMeeting={onDeleteMeeting}
        addToast={addToast}
      />
    </div>
  );
};

export default MeetingCalendar;