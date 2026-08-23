import React, { useState } from 'react';
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
  Filter
} from 'lucide-react';
import { Meeting } from '../types';

interface MeetingCalendarProps {
  meetings: Meeting[];
  onUpdateMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

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
  
  const [editingMeeting, setEditingMeeting] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Meeting>>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: Sun, 1: Mon...
  const startingDay = (firstDayOfMonth + 6) % 7; // Mon=0, ..., Sun=6

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const filteredMeetings = meetings.filter(m => {
    if (filterType !== 'ALL' && m.meetingType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const getMeetingsForDay = (day: number) => {
    return filteredMeetings.filter(m => {
      if (!m.startDate) return false;
      const d = new Date(m.startDate);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[110px] border border-slate-200/60 bg-slate-50/50 dark:bg-slate-900/30" />);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dayMeetings = getMeetingsForDay(i);
    const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();
    const isSelected = selectedDay?.toDateString() === new Date(year, month, i).toDateString();
    const hasMeetings = dayMeetings.length > 0;

    days.push(
      <div 
        key={i} 
        onClick={() => setSelectedDay(new Date(year, month, i))}
        className={`min-h-[110px] border border-slate-200 dark:border-slate-800 p-2 relative cursor-pointer transition-all flex flex-col justify-between ${
          isSelected 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#2d6e3e] ring-2 ring-[#2d6e3e]/50 z-10' 
            : hasMeetings
            ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
            isToday 
              ? 'bg-[#2d6e3e] text-white shadow-xs' 
              : isSelected
              ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            {i}
          </span>

          {hasMeetings && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
              {dayMeetings.length} họp
            </span>
          )}
        </div>

        <div className="mt-1 space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar flex-1">
          {dayMeetings.map(m => {
            const startT = new Date(m.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div 
                key={m.id} 
                className={`text-[10.5px] truncate px-1.5 py-1 rounded font-medium border ${
                  m.meetingType === 'google_meet' 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                    : m.meetingType === 'hybrid'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                    : m.meetingType === 'polycom'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300'
                }`}
                title={`${startT} - ${m.title}`}
              >
                <span className="font-bold mr-1">{startT}</span>
                <span>{m.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedDayMeetings = selectedDay ? (
    filteredMeetings.filter(m => {
      if (!m.startDate) return false;
      const d = new Date(m.startDate);
      return (
        d.getFullYear() === selectedDay.getFullYear() &&
        d.getMonth() === selectedDay.getMonth() &&
        d.getDate() === selectedDay.getDate()
      );
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  ) : [];

  const handleEditClick = (meeting: Meeting) => {
    setEditingMeeting(meeting.id);
    setEditForm(meeting);
  };

  const handleSaveEdit = (meetingId: string) => {
    if (!editForm.title?.trim() || !editForm.startDate || !editForm.endDate) {
      addToast('error', 'Lỗi', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    
    if (new Date(editForm.startDate) >= new Date(editForm.endDate)) {
      addToast('error', 'Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    onUpdateMeeting({ ...(meetings.find(m => m.id === meetingId) as Meeting), ...editForm });
    setEditingMeeting(null);
    addToast('success', 'Thành công', 'Đã cập nhật lịch họp');
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
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi, tra cứu lịch làm việc, hội nghị trực tuyến và họp giao ban
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc họp..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e]"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="offline">Trực tiếp</option>
            <option value="google_meet">Google Meet</option>
            <option value="polycom">Polycom</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Left Month Calendar + Right Day Schedule */}
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* Calendar Area */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          {/* Calendar Header with Government Green Accent */}
          <div className="p-3.5 bg-[#2d6e3e] text-white flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2 tracking-wide uppercase">
              <CalendarIcon className="w-4 h-4" />
              Tháng {month + 1} / Năm {year}
            </h3>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handlePrevMonth} 
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }} 
                className="px-2.5 py-1 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Hôm nay
              </button>
              <button 
                onClick={handleNextMonth} 
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Weekday headers: T2 -> CN */}
          <div className="grid grid-cols-7 bg-[#235832] text-white border-b border-[#1b4426]">
            {['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CHỦ NHẬT'].map((day, idx) => (
              <div key={day} className={`py-2 text-center text-xs font-bold tracking-wider ${idx >= 5 ? 'text-amber-300' : 'text-white'}`}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 flex-1">
            {days}
          </div>
        </div>

        {/* Selected Day Meetings List (Right Pane) */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4 shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-[460px]">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {selectedDay ? `Lịch Họp Ngày ${selectedDay.toLocaleDateString('vi-VN')}` : 'Chọn ngày trên lịch'}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedDayMeetings.length} cuộc họp được ghi nhận
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-3">
              {!selectedDay && (
                <div className="text-center py-12 text-slate-400">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Chưa chọn ngày nào trên lịch</p>
                </div>
              )}

              {selectedDay && selectedDayMeetings.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-2">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Không có lịch họp trong ngày này</p>
                </div>
              )}

              {selectedDay && selectedDayMeetings.length > 0 && (
                selectedDayMeetings.map((meeting, idx) => (
                  <div key={meeting.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 space-y-2.5 shadow-xs">
                    {editingMeeting === meeting.id ? (
                      <div className="space-y-2.5">
                        <input 
                          type="text" 
                          value={editForm.title} 
                          onChange={e => setEditForm({...editForm, title: e.target.value})}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                        />
                        <textarea 
                          value={editForm.description} 
                          onChange={e => setEditForm({...editForm, description: e.target.value})}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="datetime-local" 
                            value={editForm.startDate ? new Date(editForm.startDate).toISOString().slice(0,16) : ''} 
                            onChange={e => setEditForm({...editForm, startDate: new Date(e.target.value).toISOString()})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                          />
                          <input 
                            type="datetime-local" 
                            value={editForm.endDate ? new Date(editForm.endDate).toISOString().slice(0,16) : ''} 
                            onChange={e => setEditForm({...editForm, endDate: new Date(e.target.value).toISOString()})}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                          />
                        </div>
                        <select 
                          value={editForm.meetingType}
                          onChange={e => setEditForm({...editForm, meetingType: e.target.value as any})}
                          className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
                        >
                          <option value="offline">Trực tiếp tại phòng họp</option>
                          <option value="google_meet">Google Meet</option>
                          <option value="polycom">Polycom</option>
                          <option value="hybrid">Hybrid kết hợp</option>
                        </select>
                        
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => setEditingMeeting(null)} className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg">Hủy</button>
                          <button onClick={() => handleSaveEdit(meeting.id)} className="px-2.5 py-1 text-xs text-white bg-[#2d6e3e] rounded-lg flex items-center gap-1 font-bold">
                            <Save className="w-3 h-3" /> Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                            {idx + 1}. {meeting.title}
                          </h4>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <button onClick={() => handleEditClick(meeting)} className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Sửa">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => {
                              if (confirm('Bạn có chắc muốn xóa lịch họp này?')) {
                                onDeleteMeeting(meeting.id);
                                addToast('success', 'Đã xóa', 'Lịch họp đã được xóa thành công');
                              }
                            }} className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors" title="Xóa">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span>
                              {new Date(meeting.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(meeting.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {meeting.meetingType === 'google_meet' || meeting.meetingType === 'hybrid' ? (
                              <Video className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            )}
                            <span className="capitalize font-medium">
                              {meeting.meetingType === 'google_meet' ? 'Google Meet' : meeting.meetingType === 'offline' ? 'Trực tiếp tại phòng họp' : meeting.meetingType}
                            </span>
                          </div>

                          {meeting.googleMeetLink && (
                            <a 
                              href={meeting.googleMeetLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Vào họp online</span>
                            </a>
                          )}

                          {meeting.description && (
                            <div className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 bg-white dark:bg-slate-700/50 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700">
                              {meeting.description}
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
        </div>

      </div>
    </div>
  );
};
