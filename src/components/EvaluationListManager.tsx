import React, { useState, useMemo } from 'react';
import { 
  ListChecks, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Eye, 
  ArrowRight,
  FileText,
  UserCheck,
  Award,
  Lock
} from 'lucide-react';
import { WorkflowSubmission, User, KpiTask, SelfAssessmentDoc, EvaluationPeriodConfig, DEPARTMENTS } from '../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface EvaluationListManagerProps {
  submissions: WorkflowSubmission[];
  users: User[];
  tasks: KpiTask[];
  docs?: SelfAssessmentDoc[];
  periodConfig: EvaluationPeriodConfig;
  onNavigateToWorkflow?: (userId: string) => void;
  selectedDepartment?: string;
}

export const EvaluationListManager: React.FC<EvaluationListManagerProps> = ({
  submissions,
  users,
  tasks,
  docs = [],
  periodConfig,
  onNavigateToWorkflow,
  selectedDepartment = 'ALL'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>(selectedDepartment);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Handle row click to navigate to workflow with pre-selected user
  const handleRowClick = (userId: string) => {
    if (onNavigateToWorkflow) {
      onNavigateToWorkflow(userId);
    }
  };

  // Build a consolidated list per user
  const combinedList = useMemo(() => {
    return users.map((user, idx) => {
      // Find submissions for this user
      const userSubs = submissions.filter(s => 
        s.userId === user.id || 
        s.userName?.normalize('NFC').trim().toLowerCase() === user.fullName?.normalize('NFC').trim().toLowerCase()
      );
      const latestSub = userSubs[0]; // most recent

      // User tasks
      const userTasks = tasks.filter(t => 
        t.userName?.normalize('NFC').trim().toLowerCase() === user.fullName?.normalize('NFC').trim().toLowerCase()
      );

      // Task stats
      const completedTasks = userTasks.filter(t => (t.status || '').includes('Hoàn thành'));

      // Scores
      // 1. Điểm tự chấm của cán bộ
      let selfScoreTotal: number | null = null;
      if (latestSub) {
        if (latestSub.selfScoreTotal !== undefined && latestSub.selfScoreTotal !== null && Number(latestSub.selfScoreTotal) > 0) {
          selfScoreTotal = Number(latestSub.selfScoreTotal);
        } else if (latestSub.criteria && latestSub.criteria.length > 0) {
          const sum = latestSub.criteria.reduce((a, b) => a + (Number(b.selfScore) || 0), 0);
          selfScoreTotal = sum > 0 ? Number(sum.toFixed(1)) : 0;
        } else if (latestSub.deptHeadScore !== undefined && latestSub.deptHeadScore !== null) {
          selfScoreTotal = Number(latestSub.deptHeadScore);
        } else {
          selfScoreTotal = 0;
        }
      }

      // 2. Điểm Trưởng phòng: CHỈ hiển thị khi Trưởng phòng ĐÃ DUYỆT hoặc Lãnh đạo đã duyệt
      const isDeptApproved = latestSub?.status === 'APPROVED_DEPT' || latestSub?.status === 'APPROVED_FINAL';
      const deptScore = isDeptApproved && latestSub?.deptHeadScore !== undefined && latestSub?.deptHeadScore !== null
        ? Number(latestSub.deptHeadScore)
        : null;

      // 3. Điểm Lãnh đạo Cục: CHỈ hiển thị khi Lãnh đạo Cục ĐÃ PHÊ DUYỆT (status === 'APPROVED_FINAL')
      const isLeaderApproved = latestSub?.status === 'APPROVED_FINAL';
      const finalScore = isLeaderApproved && latestSub?.finalScore !== undefined && latestSub?.finalScore !== null
        ? Number(latestSub.finalScore)
        : null;

      // Status
      let statusText = 'Chưa nộp phiếu';
      let statusBadgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      let statusKey = 'NOT_SUBMITTED';

      if (latestSub) {
        if (latestSub.status === 'APPROVED_FINAL') {
          statusText = 'Lãnh đạo đã duyệt';
          statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
          statusKey = 'APPROVED_FINAL';
        } else if (latestSub.status === 'APPROVED_DEPT') {
          statusText = 'Trưởng phòng đã duyệt (Chờ Cục)';
          statusBadgeClass = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
          statusKey = 'APPROVED_DEPT';
        } else if (latestSub.status === 'PENDING_DEPT') {
          statusText = 'Chờ Trưởng phòng duyệt';
          statusBadgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
          statusKey = 'PENDING_DEPT';
        } else if (latestSub.status === 'REJECTED') {
          statusText = 'Yêu cầu làm lại';
          statusBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
          statusKey = 'REJECTED';
        } else {
          statusText = 'Đã nộp phiếu';
          statusBadgeClass = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
          statusKey = 'SUBMITTED';
        }
      }

      return {
        stt: idx + 1,
        user,
        period: latestSub?.period || periodConfig.periodName,
        taskCount: userTasks.length,
        completedTaskCount: completedTasks.length,
        submission: latestSub,
        selfScoreTotal,
        deptScore,
        finalScore,
        statusText,
        statusBadgeClass,
        statusKey,
        submittedAt: latestSub?.submittedAt || '',
        deptHeadName: latestSub?.deptHeadName || '',
        approverName: latestSub?.approverName || ''
      };
    });
  }, [users, submissions, tasks, periodConfig]);

  // Filtered list
  const filteredList = useMemo(() => {
    return combinedList.filter(item => {
      // Dept filter
      if (deptFilter !== 'ALL' && item.user.department !== deptFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'SUBMITTED' && item.statusKey === 'NOT_SUBMITTED') return false;
        if (statusFilter === 'NOT_SUBMITTED' && item.statusKey !== 'NOT_SUBMITTED') return false;
        if (statusFilter === 'APPROVED' && item.statusKey !== 'APPROVED_FINAL' && item.statusKey !== 'APPROVED_DEPT') return false;
        if (statusFilter === 'PENDING' && item.statusKey !== 'PENDING_DEPT') return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.user.fullName.toLowerCase().includes(q);
        const matchDept = (item.user.department || '').toLowerCase().includes(q);
        const matchPos = (item.user.position || '').toLowerCase().includes(q);
        if (!matchName && !matchDept && !matchPos) return false;
      }
      return true;
    });
  }, [combinedList, deptFilter, statusFilter, searchTerm]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = combinedList.length;
    const submitted = combinedList.filter(i => i.statusKey !== 'NOT_SUBMITTED').length;
    const approved = combinedList.filter(i => i.statusKey === 'APPROVED_FINAL').length;
    const pending = combinedList.filter(i => i.statusKey === 'PENDING_DEPT' || i.statusKey === 'APPROVED_DEPT').length;
    return { total, submitted, approved, pending };
  }, [combinedList]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredList.map((item, i) => ({
      'STT': i + 1,
      'Kỳ Đánh Giá': item.period,
      'Họ và Tên': item.user.fullName,
      'Phòng Ban': item.user.department,
      'Chức Vụ': item.user.position,
      'Số lượng công việc': item.taskCount,
      'Đã hoàn thành': item.completedTaskCount,
      'Điểm tự chấm': item.selfScoreTotal || '',
      'Điểm Trưởng phòng': item.deptScore !== null ? item.deptScore : '',
      'Điểm Lãnh đạo Cục': item.finalScore !== null ? item.finalScore : '',
      'Trạng thái': item.statusText,
      'Trưởng phòng duyệt': item.deptHeadName || '',
      'Lãnh đạo phê duyệt': item.approverName || '',
      'Thời gian nộp': item.submittedAt || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Danh_Gia');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Danh_Sach_Danh_Gia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div id="evaluation-list-container" className="space-y-5 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 rounded-xl">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Danh Sách Theo Dõi & Đánh Giá Cán Bộ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {periodConfig.periodName} • Thống kê tiến độ nộp phiếu và điểm tự chấm theo thời gian thực
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {periodConfig.isLocked && (
            <span className="px-3 py-2 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Đã khóa sổ — chỉ xem
            </span>
          )}
          {onNavigateToWorkflow && (
            <button
              onClick={onNavigateToWorkflow}
              className="px-3 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Màn hình Phê duyệt KPI
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Xuất Excel Danh Sách
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tổng số cán bộ</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-400">100% nhân sự</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wide">Đã nộp phiếu</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-sky-700 dark:text-sky-400">{stats.submitted}</span>
            <span className="text-xs font-semibold text-sky-600">
              {stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Đang chờ duyệt</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.pending}</span>
            <span className="text-xs font-semibold text-amber-600">Cần xử lý</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Đã duyệt hoàn tất</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.approved}</span>
            <span className="text-xs font-semibold text-emerald-600">Hoàn thành</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo họ tên, chức vụ, phòng ban..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Dept Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">Tất cả Phòng ban / Đơn vị</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="SUBMITTED">Đã nộp phiếu</option>
              <option value="PENDING">Đang chờ duyệt</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="NOT_SUBMITTED">Chưa nộp phiếu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] custom-scrollbar">
          <table className="w-full border-collapse text-sm font-sans">
            <thead>
              <tr className="bg-[#005ba1] text-white font-bold">
                <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499] border-r border-[#004499]">STT</th>
                <th className="px-3 py-2.5 min-w-[180px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Họ và Tên</th>
                <th className="px-3 py-2.5 min-w-[180px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Phòng Ban / Đơn Vị</th>
                <th className="px-3 py-2.5 min-w-[140px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Chức Vụ</th>
                <th className="px-3 py-2.5 min-w-[140px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Nhiệm Vụ (KPI)</th>
                <th className="px-3 py-2.5 min-w-[120px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Điểm Tự Chấm</th>
                <th className="px-3 py-2.5 min-w-[120px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Điểm Trưởng Phòng</th>
                <th className="px-3 py-2.5 min-w-[120px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Điểm Lãnh Đạo</th>
                <th className="px-3 py-2.5 min-w-[180px] text-center border-b-2 border-[#004499] border-r border-[#004499]">Trạng Thái Luồng Duyệt</th>
                <th className="px-3 py-2.5 min-w-[150px] text-center border-b-2 border-[#004499]">Người Duyệt</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Không tìm thấy dữ liệu đánh giá phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr 
                    key={item.user.id} 
                    onClick={() => handleRowClick(item.user.id)}
                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors cursor-pointer`}
                  >
                    <td className="px-3 py-2 w-12 text-center font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                      {item.stt}
                    </td>

                    <td className="px-3 py-2 min-w-[180px] font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {item.user.fullName}
                      <div className="text-[10px] text-slate-400 font-normal">
                        user: {item.user.username}
                      </div>
                    </td>

                    <td className="px-3 py-2 min-w-[180px] text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {item.user.department || 'Chưa phân phòng'}
                    </td>

                    <td className="px-3 py-2 min-w-[140px] text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {item.user.position || 'Chuyên viên'}
                    </td>

                    <td className="px-3 py-2 min-w-[140px] text-center border-r border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.completedTaskCount}/{item.taskCount}
                      </span>
                      <span className="text-[10px] text-slate-500 block">công việc</span>
                    </td>

                    <td className="px-3 py-2 min-w-[120px] text-center border-r border-slate-100 dark:border-slate-800">
                      {item.selfScoreTotal !== null && item.selfScoreTotal >= 0 ? (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600 rounded-none">
                          {item.selfScoreTotal} đ
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa chấm</span>
                      )}
                    </td>

                    <td className="px-3 py-2 min-w-[120px] text-center font-bold border-r border-slate-100 dark:border-slate-800">
                      {item.deptScore !== null ? (
                        <span className="text-sky-700 dark:text-sky-400 font-bold">
                          {item.deptScore} đ
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    <td className="px-3 py-2 min-w-[120px] text-center font-bold border-r border-slate-100 dark:border-slate-800">
                      {item.finalScore !== null ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          {item.finalScore} đ
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    <td className="px-3 py-2 min-w-[180px] text-center border-r border-slate-100 dark:border-slate-800">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold ${item.statusBadgeClass} rounded-none`}>
                        {item.statusText}
                      </span>
                    </td>

                    <td className="px-3 py-2 min-w-[150px] text-center text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                      {item.approverName || item.deptHeadName || (
                        <span className="text-slate-400 italic">Chờ chỉ định</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
