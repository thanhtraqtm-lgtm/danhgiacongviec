import React, { useState, useRef } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  Trash,
  Building2,
  X
} from 'lucide-react';
import { User, Department, DEPARTMENTS } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import * as XLSX from 'xlsx';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onImportUsers?: (data: any[]) => void;
  onClearUsers?: () => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onAddUser,
  onDeleteUser,
  onUpdateUser,
  onImportUsers,
  onClearUsers,
  addToast
}) => {
  const [searchKey, setSearchKey] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState<Department | string>('Phòng Thống kê Tổng hợp');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [birthYear, setBirthYear] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [workUnit, setWorkUnit] = useState('Thống kê tỉnh Hưng Yên');
  const [jobDescription, setJobDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'PROVINCE_LEADER' | 'DEPT_HEAD' | 'STAFF'>('STAFF');

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{id: string, name: string} | null>(null);
  const [showClearConfirmUser, setShowClearConfirmUser] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      'STT', 'Họ và tên', 'Năm sinh', 'Ngày vào ngành', 'Chức vụ', 
      'Đơn vị công tác', 'Phòng ban', 'Mô tả công việc được giao',
      'Số điện thoại', 'Địa chỉ email', 'Tên đăng nhập', 'Mật khẩu'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_nhan_su");
    XLSX.writeFile(wb, `Mau_Danh_sach_nhan_su.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseExcelFile(file, 'users');
      if (onImportUsers) {
        onImportUsers(parsed.allRows);
      } else {
        addToast('warning', 'Chưa hỗ trợ', 'Tính năng tải lên chưa được liên kết.');
      }
    } catch (err: any) {
      addToast('error', 'Lỗi tải file', err.message || 'Có lỗi xảy ra');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    const wsData = [
      [
        'STT', 'Họ và tên', 'Năm sinh', 'Ngày vào ngành', 'Chức vụ', 
        'Đơn vị công tác', 'Phòng ban', 'Mô tả công việc được giao',
        'Số điện thoại', 'Địa chỉ email', 'Tên đăng nhập', 'Mật khẩu'
      ]
    ];
    filteredUsers.forEach((u, idx) => {
      wsData.push([
        idx + 1,
        u.fullName,
        u.birthYear || '',
        u.joinDate || '',
        u.position,
        u.workUnit || '',
        u.department,
        u.jobDescription || '',
        u.phone || '',
        u.email || '',
        u.username,
        u.password || ''
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = [
      { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, 
      { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 25 }, 
      { wch: 20 }, { wch: 15 }
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_nhan_su");
    XLSX.writeFile(wb, `Danh_sach_nhan_su_${new Date().getTime()}.xlsx`);
    addToast('success', 'Xuất Excel thành công', 'File đã được tải xuống.');
  };

  const handleClearData = () => setShowClearConfirmUser(true);
  const confirmClearData = () => {
    if (onClearUsers) onClearUsers();
    setShowClearConfirmUser(false);
  };
  const cancelClearData = () => setShowClearConfirmUser(false);

  const departments = DEPARTMENTS;

  const resetForm = () => {
    setFullName('');
    setBirthYear('');
    setJoinDate('');
    setPosition('');
    setWorkUnit('Thống kê tỉnh Hưng Yên');
    setDepartment('Phòng Thống kê Tổng hợp');
    setJobDescription('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('123456');
    setRole('STAFF');
    setEditingUser(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setBirthYear(user.birthYear || '');
    setJoinDate(user.joinDate || '');
    setPosition(user.position);
    setWorkUnit(user.workUnit || '');
    setDepartment(user.department);
    setJobDescription(user.jobDescription || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setUsername(user.username);
    setPassword(user.password || '123456');

    // Rule: Phó phòng không được gán quyền Trưởng phòng mà để là Chuyên viên
    const normPos = (user.position || '').toLowerCase().trim();
    if (normPos.includes('phó phòng') || normPos.includes('phó trưởng phòng') || normPos.includes('phó chi cục')) {
      setRole('STAFF');
    } else {
      setRole(user.role || (user.department === 'Lãnh đạo' ? 'PROVINCE_LEADER' : 'STAFF'));
    }
    setShowAddModal(true);
  };

  const handlePositionChange = (val: string) => {
    setPosition(val);
    const norm = val.toLowerCase().trim();
    if (norm.includes('phó phòng') || norm.includes('phó trưởng phòng') || norm.includes('phó chi cục') || (norm.includes('phó') && !norm.includes('cục trưởng'))) {
      setRole('STAFF');
    } else if (norm.includes('trưởng phòng') || norm.includes('chi cục trưởng')) {
      setRole('DEPT_HEAD');
    } else if (norm.includes('cục trưởng')) {
      setRole('PROVINCE_LEADER');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      addToast('warning', 'Thiếu thông tin!', 'Vui lòng nhập Họ tên và Tên đăng nhập.');
      return;
    }
    
    // Rule: Phó phòng không được gán Trưởng phòng mà để là Chuyên viên (STAFF)
    let assignedRole = role;
    const normPos = position.toLowerCase().trim();
    if (normPos.includes('phó phòng') || normPos.includes('phó trưởng phòng') || normPos.includes('phó chi cục') || (normPos.includes('phó') && !normPos.includes('cục trưởng'))) {
      assignedRole = 'STAFF';
    }

    const userData = {
      fullName,
      birthYear,
      joinDate,
      position,
      workUnit,
      department,
      jobDescription,
      phone,
      email,
      username,
      password,
      role: assignedRole,
    };

    if (editingUser) {
      onUpdateUser(editingUser.id, userData);
      addToast('success', 'Cập nhật thành công!', `Đã cập nhật thông tin tài khoản ${fullName}.`);
    } else {
      onAddUser(userData);
      addToast('success', 'Thêm User thành công!', `Đã tạo tài khoản cho ${fullName}.`);
    }
    setShowAddModal(false);
  };

  const confirmDeleteRow = () => {
    if (deleteConfirmUser) {
      onDeleteUser(deleteConfirmUser.id);
      setDeleteConfirmUser(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmUser({ id, name });
  };

  const filteredUsers = (users || []).filter((u) => {
    const matchesDept = filterDepartment === 'ALL' || u.department === filterDepartment;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchKey.toLowerCase()) ||
      u.position.toLowerCase().includes(searchKey.toLowerCase()) ||
      u.username.toLowerCase().includes(searchKey.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-4 animate-in fade-in-50">
      {/* Top Toolbar Card matching screenshot */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <Users className="w-5 h-5 text-sky-700 dark:text-sky-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            DANH SÁCH NHÂN SỰ
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Tìm nhân sự..."
              className="px-3 py-1.5 pr-8 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#198754] hover:bg-[#157347] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Tải xuống danh sách Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải xuống</span>
          </button>

          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fd7e14] hover:bg-[#e36a09] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Tải lên file Excel"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải lên</span>
          </button>

          <button
            onClick={handleClearData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dc3545] hover:bg-[#bb2d3b] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Xóa toàn bộ dữ liệu"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#6610f2] hover:bg-[#5b0ed9] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            title="Thêm nhân sự mới"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Thêm mới</span>
          </button>
        </div>
      </div>

      {/* Main Table with Green Header and Clean Government Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#2d6e3e] text-white font-bold text-xs tracking-wide">
                <th className="px-3 py-3 w-10 text-center whitespace-nowrap border-r border-white/20">STT</th>
                <th className="px-3 py-3 min-w-[170px] text-center whitespace-nowrap border-r border-white/20">Họ và tên</th>
                <th className="px-3 py-3 min-w-[90px] text-center whitespace-nowrap border-r border-white/20">Năm Sinh</th>
                <th className="px-3 py-3 min-w-[120px] text-center whitespace-nowrap border-r border-white/20">Ngày Vào Ngành</th>
                <th className="px-3 py-3 min-w-[160px] text-center whitespace-nowrap border-r border-white/20">Chức vụ</th>
                <th className="px-3 py-3 min-w-[170px] text-center whitespace-nowrap border-r border-white/20">Đơn vị Công tác</th>
                <th className="px-3 py-3 min-w-[180px] text-center whitespace-nowrap border-r border-white/20">PHÒNG BAN/ĐƠN VỊ</th>
                <th className="px-3 py-3 min-w-[200px] text-center border-r border-white/20">Mô Tả Công Việc</th>
                <th className="px-3 py-3 min-w-[110px] text-center whitespace-nowrap border-r border-white/20">Điện Thoại</th>
                <th className="px-3 py-3 min-w-[170px] text-center whitespace-nowrap border-r border-white/20">Email</th>
                <th className="px-3 py-3 min-w-[160px] text-center whitespace-nowrap border-r border-white/20">Tên Đăng Nhập</th>
                <th className="px-3 py-3 min-w-[90px] text-center whitespace-nowrap border-r border-white/20">Mật khẩu</th>
                <th className="px-3 py-3 w-20 text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700 font-normal">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    Chưa có người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr 
                    key={u.id} 
                    className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-300 dark:border-slate-700"
                  >
                    <td className="px-3 py-2.5 text-center text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                      {u.fullName}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.birthYear || ''}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.joinDate || ''}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.position || ''}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.workUnit || 'Thống kê tỉnh Hưng yên'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.department}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                      {u.jobDescription || ''}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.phone || ''}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.email || ''}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.username}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap border-r border-slate-300 dark:border-slate-700">
                      {u.password || '123654'}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEdit(u)} 
                          className="text-sky-600 hover:text-sky-800 transition-colors p-1" 
                          title="Sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id, u.fullName)} 
                          className="text-rose-600 hover:text-rose-800 transition-colors p-1" 
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                {editingUser ? 'Sửa Thông Tin Nhân Sự' : 'Thêm Nhân Sự Mới'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Họ và Tên (*)</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Năm sinh</label>
                  <input type="text" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày vào ngành</label>
                  <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chức vụ</label>
                  <input 
                    type="text" 
                    value={position} 
                    onChange={(e) => handlePositionChange(e.target.value)} 
                    placeholder="Ví dụ: Cục trưởng, Trưởng phòng, Phó phòng, Chuyên viên..." 
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Đơn vị công tác</label>
                  <input type="text" value={workUnit} onChange={(e) => setWorkUnit(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng ban</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value as Department)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phân quyền vai trò hệ thống (*)</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as any)} 
                    className="w-full p-2.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-bold"
                  >
                    <option value="PROVINCE_LEADER">🏛️ Lãnh đạo Cục (Cục trưởng, Phó Cục trưởng)</option>
                    <option value="DEPT_HEAD">🏢 Trưởng phòng / Chi cục trưởng (Phê duyệt cấp 1)</option>
                    <option value="STAFF">👤 Chuyên viên (Bao gồm Phó phòng, Thống kê viên - Tự đánh giá)</option>
                    <option value="ADMIN">🛡️ Quản trị viên hệ thống (Admin)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1 italic">* Lưu ý: Phó phòng không gán quyền Trưởng phòng mà để vai trò là Chuyên viên.</p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả công việc được giao</label>
                  <input type="text" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Tóm tắt nhiệm vụ chính" className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Địa chỉ Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username (*)</label>
                  <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors">
                  {editingUser ? 'Lưu thay đổi' : 'Thêm Nhân Sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClearConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa dữ liệu</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Bạn có chắc chắn muốn xóa toàn bộ danh sách tài khoản? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={cancelClearData} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={confirmClearData} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors">Xóa Tất Cả</button>
            </div>
          </div>
        </div>
      )}
      
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa người dùng</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Bạn có muốn xóa tài khoản <strong>{deleteConfirmUser.name}</strong> không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmUser(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={confirmDeleteRow} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors">Xóa Người Dùng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
