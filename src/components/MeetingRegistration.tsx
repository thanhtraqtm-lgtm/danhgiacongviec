import React, { useState, useRef } from 'react';
import {
  CalendarDays,
  Video,
  Users,
  Bell,
  Paperclip,
  Plus,
  Trash2,
  X,
  MapPin,
  Laptop2,
  MonitorSpeaker,
  FileText
} from 'lucide-react';
import { Meeting } from '../types';

interface MeetingRegistrationProps {
  onAddMeeting: (meeting: Meeting) => void;
  onCancel: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const MeetingRegistration: React.FC<MeetingRegistrationProps> = ({
  onAddMeeting,
  onCancel,
  addToast
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState<'google_meet' | 'offline' | 'polycom' | 'hybrid'>('google_meet');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [repeat, setRepeat] = useState(false);
  
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  
  const [reminderType, setReminderType] = useState<'notification' | 'email'>('notification');
  const [reminderTime, setReminderTime] = useState<number>(10);
  const [reminders, setReminders] = useState<{type: 'notification'|'email', minutesBefore: number}[]>([
    { type: 'notification', minutesBefore: 10 },
    { type: 'email', minutesBefore: 60 }
  ]);
  
  const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddAttendee = () => {
    if (!attendeeInput.trim()) return;
    if (!attendees.includes(attendeeInput.trim())) {
      setAttendees([...attendees, attendeeInput.trim()]);
    }
    setAttendeeInput('');
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email));
  };

  const handleAddReminder = () => {
    setReminders([...reminders, { type: reminderType, minutesBefore: reminderTime }]);
  };

  const handleRemoveReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f: File) => ({
      name: f.name,
      url: URL.createObjectURL(f)
    }));
    setAttachments([...attachments, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      addToast('error', 'Lỗi', 'Vui lòng nhập tiêu đề cuộc họp');
      return;
    }
    if (!startDate || !endDate) {
      addToast('error', 'Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      addToast('error', 'Lỗi', 'Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const newMeeting: Meeting = {
      id: 'meet_' + Date.now(),
      title,
      description,
      meetingType,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      repeat,
      googleMeetLink: meetingType === 'google_meet' || meetingType === 'hybrid' ? 'https://meet.google.com/bbn-satc-cxm' : undefined,
      attendees,
      reminders,
      attachments,
      createdAt: new Date().toISOString()
    };

    onAddMeeting(newMeeting);
  };

  const getReminderText = (minutes: number) => {
    if (minutes < 60) return `Trước ${minutes} phút`;
    if (minutes === 60) return `Trước 1 giờ`;
    if (minutes === 1440) return `Trước 1 ngày`;
    return `Trước ${minutes} phút`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">📅</span> Tạo cuộc họp mới
          </h2>
          <p className="text-slate-500 mt-1">Lên lịch họp, tích hợp Google Calendar, chuẩn bị tài liệu</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Thông tin cơ bản */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-indigo-500" />
          Thông tin cơ bản
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              <span className="text-rose-500 mr-1">📌</span>
              Tiêu đề cuộc họp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Họp báo cáo KPI tháng 8"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              <span className="text-emerald-500 mr-1">📝</span>
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết về cuộc họp..."
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <span className="text-purple-500 mr-1">🎬</span>
              Hình thức họp <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType('google_meet')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border font-medium text-sm transition-all ${
                  meetingType === 'google_meet'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Video className="w-4 h-4" /> Google Meet
              </button>
              <button
                type="button"
                onClick={() => setMeetingType('offline')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border font-medium text-sm transition-all ${
                  meetingType === 'offline'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-4 h-4" /> Trực tiếp
              </button>
              <button
                type="button"
                onClick={() => setMeetingType('polycom')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border font-medium text-sm transition-all ${
                  meetingType === 'polycom'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MonitorSpeaker className="w-4 h-4" /> Polycom
              </button>
              <button
                type="button"
                onClick={() => setMeetingType('hybrid')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border font-medium text-sm transition-all ${
                  meetingType === 'hybrid'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Laptop2 className="w-4 h-4" /> Hybrid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ngày giờ & Thời lượng */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-orange-500" />
          Ngày giờ & Thời lượng
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Thời gian bắt đầu <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Thời gian kết thúc <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer w-max">
          <input
            type="checkbox"
            checked={repeat}
            onChange={e => setRepeat(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <span className="text-sky-500">🔄</span> Lặp lại sự kiện
          </span>
        </label>
      </div>

      {/* Thông tin Google Meet */}
      {(meetingType === 'google_meet' || meetingType === 'hybrid') && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            Thông tin Google Meet
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              readOnly
              value="https://meet.google.com/bbn-satc-cxm"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none"
            />
            <a 
              href="https://meet.google.com/bbn-satc-cxm"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Vào phòng họp
            </a>
          </div>
        </div>
      )}

      {/* Người tham dự */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" />
          Người tham dự ({attendees.length})
        </h3>
        <div className="flex gap-3">
          <input
            type="email"
            value={attendeeInput}
            onChange={e => setAttendeeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddAttendee()}
            placeholder="Nhập email người tham dự..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
          />
          <button
            onClick={handleAddAttendee}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </div>
        {attendees.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {attendees.map(email => (
              <span key={email} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                {email}
                <button onClick={() => handleRemoveAttendee(email)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Nhắc nhở */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-500" />
          Nhắc nhở
        </h3>
        <div className="flex gap-3">
          <select
            value={reminderType}
            onChange={e => setReminderType(e.target.value as any)}
            className="w-40 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
          >
            <option value="notification">🔔 Thông báo</option>
            <option value="email">📧 Email</option>
          </select>
          <select
            value={reminderTime}
            onChange={e => setReminderTime(Number(e.target.value))}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white font-medium text-slate-700"
          >
            <option value={5}>Trước 5 phút</option>
            <option value={10}>Trước 10 phút</option>
            <option value={30}>Trước 30 phút</option>
            <option value={60}>Trước 1 giờ</option>
            <option value={1440}>Trước 1 ngày</option>
          </select>
          <button
            onClick={handleAddReminder}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </div>

        {reminders.length > 0 && (
          <div className="space-y-2 mt-4">
            {reminders.map((reminder, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="text-lg">{reminder.type === 'notification' ? '🔔' : '📧'}</span>
                  {getReminderText(reminder.minutesBefore)} ({reminder.type.toUpperCase()})
                </div>
                <button onClick={() => handleRemoveReminder(idx)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tài liệu đính kèm */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-blue-600" />
          Tài liệu đính kèm
        </h3>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <input 
            type="file" 
            multiple 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <FileText className="w-8 h-8 text-slate-400" />
          <div className="text-slate-700 font-medium">Kéo thả hoặc click để chọn tệp</div>
          <div className="text-sm text-slate-500">PDF, DOCX, XLSX, hình ảnh...</div>
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2 mt-4">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{file.name}</span>
                </div>
                <button onClick={() => handleRemoveAttachment(idx)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 sticky bottom-6 z-10 p-4 bg-white/80 backdrop-blur border border-slate-200 rounded-2xl shadow-lg">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2.5 font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-xl transition-colors"
        >
          Tạo Cuộc Họp
        </button>
      </div>
    </div>
  );
};
