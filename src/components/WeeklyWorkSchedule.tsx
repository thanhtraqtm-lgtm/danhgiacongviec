import React, { useState, useMemo } from 'react';
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
  Users
} from 'lucide-react';
import { WeeklySchedule, User, DEPARTMENTS } from '../types';

interface WeeklyWorkScheduleProps {
  schedules: WeeklySchedule[];
  users: User[];
  onAddSchedule: (schedule: WeeklySchedule) => void;
  onUpdateSchedule: (schedule: WeeklySchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

const TASK_TYPES = ['Công tác', 'Họp', 'Đào tạo', 'Khác', 'Làm việc tại cơ quan'] as const;
const STATUSES = ['Đã hoàn thành', 'Đang thực hiện', 'Chưa bắt đầu', 'Hủy'] as const;
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

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
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterTaskType, setFilterTaskType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeeklySchedule>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<WeeklySchedule>>({});

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
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    setSelectedDay(null);
  };

  const handleThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(now.setDate(diff)));
    const todayIndex = new Date().getDay();
    setSelectedDay(todayIndex === 0 ? 6 : todayIndex - 1);
  };

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (filterDepartment !== 'ALL' && s.department !== filterDepartment) return false;
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
  }, [schedules, filterDepartment, filterTaskType, searchQuery]);

  const getSchedulesForDay = (dayIndex: number) => {
    const targetDate = weekDates[dayIndex].toISOString().split('T')[0];
    return filteredSchedules.filter(s => s.date === targetDate)
      .sort((a, b) => a.taskName.localeCompare(b.taskName));
  };

  const departments = useMemo(() => 
    Array.from(new Set(users.map(u => u.department).filter(Boolean)))
  , [users]);

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

  const handleAddFormDateChange = (dayIndex: number) => {
    const date = weekDates[dayIndex].toISOString().split('T')[0];
    setAddForm(prev => ({ ...prev, date, dayOfWeek: dayIndex }));
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-5">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#2d6e3e]" />
            <span>Lịch Công Tac Tuần</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý lịch công tác, họp, đào tạo hàng tuần theo phòng ban & nhân sự
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm công việc, nhân sự, địa điểm..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-[#2d6e3e]"
            />
          </div>

          <select
            value={filterDepartment}
            onChange={e => setFilterDepartment(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filterTaskType}
            onChange={e => setFilterTaskType(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="ALL">Tất cả loại</option>
            {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Week Navigation & Add Button */}
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

        <button 
          onClick={() => { setShowAddForm(true); setAddForm({ date: weekDates[0]?.toISOString().split('T')[0], dayOfWeek: 0 }); }}
          className="px-4 py-2 text-sm font-bold text-white bg-[#2d6e3e] hover:bg-[#235832] rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm lịch
        </button>
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
                    onClick={(e) => { e.stopPropagation(); handleAddFormDateChange(dayIndex); setShowAddForm(true); }}
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
        <div className="w-full lg:w-[400px] flex flex-col gap-4 shrink-0">
          {showAddForm && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-[460px]">
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
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-[460px]">
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
                      onClick={() => { setShowAddForm(true); setAddForm({ date: weekDates[selectedDay].toISOString().split('T')[0], dayOfWeek: selectedDay }); }}
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
                                <span>{schedule.department}</span>
                              </div>
                            )}

                            {schedule.workUnit && schedule.workUnit !== schedule.department && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span className="text-[11px]">Cơ sở: {schedule.workUnit}</span>
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