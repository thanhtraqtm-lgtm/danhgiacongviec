import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User as UserIcon, 
  Building2, 
  Crown, 
  Eye, 
  Check, 
  MessageSquare, 
  FileCheck, 
  BadgeCheck,
  Sparkles,
  ChevronRight,
  FileText,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  Award,
  Layers,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  UploadCloud,
  Download,
  Trash2,
  Flag
} from 'lucide-react';
import { WorkflowSubmission, User, EvaluationPeriodConfig, SelfEvalCriterion } from '../types';

interface WorkflowApprovalProps {
  submissions: WorkflowSubmission[];
  periodConfig: EvaluationPeriodConfig;
  onUpdateSubmission: (id: string, updates: Partial<WorkflowSubmission>) => void;
  onUpdatePeriodConfig: (cfg: EvaluationPeriodConfig) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  globalRole: string;
  currentUser?: User | null;
  users?: User[];
  preSelectedUserId?: string;
}

export const WorkflowApproval: React.FC<WorkflowApprovalProps> = ({
  submissions = [],
  periodConfig,
  onUpdateSubmission,
  onUpdatePeriodConfig,
  addToast,
  globalRole = 'DEPT_HEAD',
  currentUser,
  users = [],
  preSelectedUserId,
}) => {
  const [selectedSub, setSelectedSub] = useState<WorkflowSubmission | null>(null);
  const [viewMode, setViewMode] = useState<'CONSOLE' | 'WORD_DOC'>('CONSOLE');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Auto-select submission when preSelectedUserId changes
  useEffect(() => {
    if (preSelectedUserId && submissions.length > 0) {
      const user = users.find(u => u.id === preSelectedUserId);
      if (user) {
        const userSub = submissions.find(s => 
          s.userId === preSelectedUserId || 
          s.userName?.normalize('NFC').trim().toLowerCase() === user.fullName?.normalize('NFC').trim().toLowerCase()
        );
        if (userSub) {
          handleSelectSubmission(userSub);
        }
      }
    }
  }, [preSelectedUserId, submissions, users]);

  // Form State for Dept Head review
  const [deptComment, setDeptComment] = useState('');
  const [deptScore, setDeptScore] = useState<number | ''>(95);

  // Form State for Province Leader review
  const [leaderComment, setLeaderComment] = useState('');
  const [leaderFinalScore, setLeaderFinalScore] = useState<number | ''>(95);

  // Lock Confirmation Modal
  const [showLockModal, setShowLockModal] = useState(false);

  // Initialize selected submission when submissions change
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      if (!selectedSub || !submissions.some((s) => s.id === selectedSub.id)) {
        handleSelectSubmission(submissions[0]);
      } else {
        // Keep current selection updated
        const currentInList = submissions.find((s) => s.id === selectedSub.id);
        if (currentInList) {
          setSelectedSub(currentInList);
        }
      }
    }
  }, [submissions]);

  // When selecting a submission to review
  const handleSelectSubmission = (sub: WorkflowSubmission) => {
    setSelectedSub(sub);
    const defaultDeptScore = sub.deptHeadScore !== undefined && sub.deptHeadScore !== null ? sub.deptHeadScore : (sub.selfScoreTotal || 0);
    const defaultLeaderScore = sub.finalScore !== undefined && sub.finalScore !== null ? sub.finalScore : (sub.deptHeadScore !== undefined ? sub.deptHeadScore : (sub.selfScoreTotal || 0));

    setDeptScore(defaultDeptScore);
    setDeptComment(sub.deptHeadComment || 'Đồng ý với kết quả tự nhận xét, đánh giá của công chức. Hoàn thành tốt các nhiệm vụ được giao trong kỳ.');
    setLeaderFinalScore(defaultLeaderScore);
    setLeaderComment(sub.provinceLeaderComment || 'Nhất trí với kết quả đánh giá của Trưởng phòng và xếp loại công chức theo quy định.');
  };

  // Clamp helper for scores
  const clampNumber = (val: string | number, max: number): number => {
    if (val === '' || val === undefined || val === null) return 0;
    const num = Number(val);
    if (isNaN(num)) return 0;
    if (num < 0) return 0;
    if (num > max) return max;
    return Number(num.toFixed(1));
  };

  // Action: Dept Head Approval
  const handleDeptApprove = (approved: boolean) => {
    if (!selectedSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể thao tác vì Trưởng Thống kê Tỉnh đã khóa sổ kỳ đánh giá.');
      return;
    }

    const currentApprover = currentUser?.fullName || selectedSub.approverName || 'Trưởng phòng';

    if (approved) {
      const finalDeptScore = deptScore === '' ? (selectedSub.selfScoreTotal || 0) : Number(deptScore);
      onUpdateSubmission(selectedSub.id, {
        status: 'APPROVED_DEPT',
        deptHeadName: currentApprover,
        deptHeadComment: deptComment,
        deptHeadScore: finalDeptScore,
        deptApprovedAt: new Date().toLocaleString('vi-VN'),
      });
      addToast(
        'success',
        'Đã Phê Duyệt & Chuyển Lãnh Đạo Cục!',
        `Đã định điểm Trưởng phòng: ${finalDeptScore}đ và chuyển phiếu của ${selectedSub.userName} lên Lãnh đạo Cục Thống kê.`
      );
    } else {
      onUpdateSubmission(selectedSub.id, {
        status: 'REJECTED',
        deptHeadComment: deptComment,
      });
      addToast('warning', 'Đã Yêu Cầu Sửa Đổi!', `Đã chuyển trả phiếu tự đánh giá của ${selectedSub.userName} để hoàn thiện lại.`);
    }
  };

  // Action: Province Leader Final Approval
  const handleLeaderApprove = () => {
    if (!selectedSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Kỳ đánh giá đã được khóa sổ chính thức.');
      return;
    }

    const finalChotScore = leaderFinalScore === '' ? (selectedSub.deptHeadScore || selectedSub.selfScoreTotal || 0) : Number(leaderFinalScore);

    onUpdateSubmission(selectedSub.id, {
      status: 'APPROVED_FINAL',
      provinceLeaderComment: leaderComment,
      finalScore: finalChotScore,
      finalApprovedAt: new Date().toLocaleString('vi-VN'),
    });

    addToast(
      'success',
      'Đã Phê Duyệt Kết Quả Cuối Cùng!',
      `Đã chốt điểm KPI chính thức: ${finalChotScore}đ cho ${selectedSub.userName}. Điểm đã được lưu vào Danh sách và Kết quả đánh giá.`
    );
  };

  // Action: Staff Recall/Retract Submission
  const handleRecallSubmission = () => {
    if (!selectedSub) return;
    if (periodConfig.isLocked) {
      addToast('error', 'Kỳ Đánh Giá Đã Khóa!', 'Không thể thu hồi vì kỳ đánh giá đã được khóa sổ.');
      return;
    }
    
    // Only allow recall if status is DRAFT or PENDING_DEPT
    if (!['DRAFT', 'PENDING_DEPT'].includes(selectedSub.status)) {
      addToast('error', 'Không Thể Thu Hồi!', `Chỉ có thể thu hồi khi phiếu ở trạng thái "Nháp" hoặc "Chờ Trưởng phòng duyệt". Trạng thái hiện tại: ${selectedSub.status}`);
      return;
    }

    onUpdateSubmission(selectedSub.id, {
      status: 'RECALLED',
      recalledAt: new Date().toLocaleString('vi-VN'),
      recalledBy: currentUser?.fullName || 'Cán bộ',
    });

    addToast(
      'success',
      'Đã Thu Hồi Phiếu!',
      `Phiếu tự đánh giá của ${selectedSub.userName} đã được thu hồi về trạng thái nháp. Bạn có thể chỉnh sửa và gửi lại.`
    );
  };

  // Action: Delete Submission (for STAFF to delete their own draft/pending submissions)
  const handleDeleteSubmission = (subId: string) => {
    if (!currentUser) return;
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;
    
    // Only allow delete if status is DRAFT or PENDING_DEPT and it's their own submission
    if (!['DRAFT', 'PENDING_DEPT'].includes(sub.status)) {
      addToast('error', 'Không Thể Xóa!', `Chỉ có thể xóa khi phiếu ở trạng thái "Nháp" hoặc "Chờ Trưởng phòng duyệt".`);
      return;
    }
    if (sub.userName !== currentUser.fullName) {
      addToast('error', 'Không Có Quyền!', 'Bạn chỉ có thể xóa phiếu của chính mình.');
      return;
    }

    // Remove from submissions (in real app, this would call an API)
    onUpdateSubmission(subId, {
      status: 'DELETED',
      deletedAt: new Date().toLocaleString('vi-VN'),
      deletedBy: currentUser.fullName,
    });

    addToast('success', 'Đã Xóa Phiếu!', `Phiếu tự đánh giá đã được xóa khỏi hệ thống.`);
  };

  // Action: Recalculate Scores
  const handleRecalculateScores = () => {
    if (!selectedSub) return;
    
    // Recalculate based on criteria
    let totalScore = 0;
    if (selectedSub.criteria && selectedSub.criteria.length > 0) {
      totalScore = selectedSub.criteria.reduce((sum, c) => sum + (c.selfScore || 0), 0);
    } else {
      totalScore = selectedSub.selfScoreTotal || 0;
    }

    onUpdateSubmission(selectedSub.id, {
      selfScoreTotal: Number(totalScore.toFixed(1)),
      recalculatedAt: new Date().toLocaleString('vi-VN'),
      recalculatedBy: currentUser?.fullName || 'Hệ thống',
      version: (selectedSub.version || 0) + 1,
    });

    addToast(
      'success',
      'Đã Tính Lại Điểm!',
      `Đã cập nhật tổng điểm tự chấm: ${totalScore.toFixed(1)}đ cho ${selectedSub.userName}.`
    );
  };

  // Handle file upload for self-assessment
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSub || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    if (!file.name.match(/\.(docx?|xlsx?|pdf)$/i)) {
      addToast('error', 'Định Dạng Không Hợp Lệ!', 'Chỉ chấp nhận file .docx, .doc, .xlsx, .xls, .pdf');
      return;
    }

    setUploadingFile(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      // In real app, upload to Firebase Storage or similar
      // For now, store as base64 or mock URL
      const fileUrl = URL.createObjectURL(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      onUpdateSubmission(selectedSub.id, {
        selfAssessmentFileUrl: fileUrl,
        selfAssessmentFileName: file.name,
      });

      addToast(
        'success',
        'Đã Tải Lên Bản Tự Đánh Giá!',
        `File ${file.name} đã được đính kèm với phiếu đánh giá.`
      );
    } catch (err) {
      clearInterval(progressInterval);
      addToast('error', 'Lỗi Tải Lên!', 'Không thể tải lên file. Vui lòng thử lại.');
    } finally {
      setUploadingFile(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Action: Exclusive "Khóa Sổ Kỳ Đánh Giá"
  const handleToggleLockPeriod = () => {
    if (globalRole !== 'PROVINCE_LEADER' && globalRole !== 'ADMIN') {
      addToast('error', 'Không Có Quyền!', 'Chỉ có Trưởng Thống kê Tỉnh mới có ĐẶC QUYỀN KHÓA SỔ.');
      return;
    }

    const nextLockState = !periodConfig.isLocked;
    onUpdatePeriodConfig({
      ...periodConfig,
      isLocked: nextLockState,
      lockedAt: nextLockState ? new Date().toLocaleString('vi-VN') : undefined,
      lockedBy: nextLockState ? (currentUser?.fullName || 'Đào Trọng Truyến (Trưởng Thống kê tỉnh)') : undefined,
    });

    setShowLockModal(false);

    if (nextLockState) {
      addToast('success', 'ĐÃ KHÓA SỔ KỲ ĐÁNH GIÁ!', 'Tất cả dữ liệu điểm KPI và phiếu đánh giá đã được đóng băng.');
    } else {
      addToast('info', 'Đã Mở Khóa Kỳ Đánh Giá', 'Cho phép cập nhật lại thông tin đánh giá.');
    }
  };

  // Filter submissions
  const filteredSubmissions = (submissions || []).filter((sub) => {
    // For STAFF role, only show their own submissions
    if (globalRole === 'STAFF' && currentUser) {
      if (sub.userName !== currentUser.fullName) return false;
    }
    // For DEPT_HEAD role, only show submissions from their department
    if (globalRole === 'DEPT_HEAD' && currentUser) {
      if (sub.department !== currentUser.department) return false;
    }
    if (deptFilter !== 'ALL' && sub.department !== deptFilter) return false;
    if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        sub.userName?.toLowerCase().includes(term) ||
        sub.department?.toLowerCase().includes(term) ||
        sub.userPosition?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50">
            <FileText className="w-3.5 h-3.5" /> Nháp
          </span>
        );
      case 'PENDING_DEPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/50">
            <Clock className="w-3.5 h-3.5" /> Chờ Trưởng Phòng Duyệt
          </span>
        );
      case 'PENDING_PROVINCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300/50">
            <Crown className="w-3.5 h-3.5" /> Chờ Lãnh Đạo Cục Chốt
          </span>
        );
      case 'APPROVED_DEPT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300/50">
            <ShieldCheck className="w-3.5 h-3.5" /> Trưởng Phòng Đã Duyệt
          </span>
        );
      case 'APPROVED_FINAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50">
            <BadgeCheck className="w-3.5 h-3.5" /> Lãnh Đạo Cục Đã Chốt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/50">
            <XCircle className="w-3.5 h-3.5" /> Yêu Cầu Làm Lại
          </span>
        );
      case 'RECALLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50">
            <RotateCcw className="w-3.5 h-3.5" /> Đã Thu Hồi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5" /> Đã nộp phiếu
          </span>
        );
    }
  };

  // Fallback criteria if submission criteria is empty
  const displayCriteria: SelfEvalCriterion[] = (selectedSub?.criteria && selectedSub.criteria.length > 0)
    ? selectedSub.criteria
    : [
        {
          id: 'crit_I_1',
          categoryName: 'I. Phẩm chất chính trị, đạo đức, lối sống',
          targetDescription: 'Phẩm chất chính trị, phẩm chất đạo đức, văn hóa thực thi công vụ',
          plannedDeadline: selectedSub?.period || 'Kỳ này',
          actualStatus: 'Hoàn thành',
          selfScore: 5.0,
          maxScore: 5.0
        },
        {
          id: 'crit_I_2',
          categoryName: 'I. Phẩm chất chính trị, đạo đức, lối sống',
          targetDescription: 'Ý thức kỷ luật, kỷ cương trong thực thi công vụ',
          plannedDeadline: selectedSub?.period || 'Kỳ này',
          actualStatus: 'Hoàn thành',
          selfScore: 5.0,
          maxScore: 5.0
        },
        {
          id: 'crit_II_sum',
          categoryName: 'II. Năng lực chuyên môn, trách nhiệm',
          targetDescription: 'Năng lực chuyên môn, giải quyết công việc, tinh thần trách nhiệm và phối hợp',
          plannedDeadline: selectedSub?.period || 'Kỳ này',
          actualStatus: 'Hoàn thành',
          selfScore: 10.0,
          maxScore: 10.0
        },
        {
          id: 'crit_III_sum',
          categoryName: 'III. Đổi mới, sáng tạo, dám nghĩ dám làm',
          targetDescription: 'Đổi mới, giải pháp nâng cao hiệu quả công việc và tinh thần trách nhiệm',
          plannedDeadline: selectedSub?.period || 'Kỳ này',
          actualStatus: 'Hoàn thành',
          selfScore: 8.0,
          maxScore: 10.0
        },
        {
          id: 'crit_IV_kpi',
          categoryName: 'IV. Điểm kết quả thực hiện nhiệm vụ (KPI)',
          targetDescription: `Kết quả thực hiện nhiệm vụ chuyên môn theo danh mục công việc (Trọng số 70%)`,
          plannedDeadline: selectedSub?.period || 'Kỳ này',
          actualStatus: 'Hoàn thành',
          selfScore: Number((Math.max(0, (selectedSub?.selfScoreTotal || 90) - 28)).toFixed(1)),
          maxScore: 70.0
        }
      ];

  const uniqueDepartments = Array.from(new Set(submissions.map((s) => s.department).filter(Boolean)));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Phân Hệ Trình Duyệt & Chấm Điểm 2 Cấp (Workflow)</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Luồng Phê Duyệt & Định Điểm Đánh Giá Công Chức
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Người đang đăng nhập: <strong className="text-indigo-600 dark:text-indigo-400">{currentUser?.fullName || 'Chưa đăng nhập'}</strong> ({currentUser?.position || 'Cán bộ'} - {currentUser?.department || 'Tất cả đơn vị'})
          </p>
        </div>

        {/* Lock Period Button for Leadership */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            periodConfig.isLocked 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300' 
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
          }`}>
            {periodConfig.isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
            <span>{periodConfig.periodName}: {periodConfig.isLocked ? 'ĐÃ KHÓA SỔ' : 'ĐANG MỞ KỲ'}</span>
          </div>

          {(globalRole === 'PROVINCE_LEADER' || globalRole === 'ADMIN') && (
            <button
              onClick={() => setShowLockModal(true)}
              className={`flex items-center justify-center px-4 py-2 gap-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all ${
                periodConfig.isLocked ? 'bg-slate-800 hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {periodConfig.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{periodConfig.isLocked ? 'Mở Khóa Kỳ Đánh Giá' : 'Khóa Sổ Kỳ Đánh Giá'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Submissions */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Danh Sách Phiếu Gửi Duyệt ({filteredSubmissions.length}/{submissions.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nhấp vào từng cán bộ để xem phiếu, chấm điểm và nhận xét
              </p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên cán bộ, chức vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              >
                <option value="ALL">Tất cả phòng ban</option>
                {uniqueDepartments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Nháp</option>
                <option value="PENDING_DEPT">Chờ Trưởng phòng duyệt</option>
                <option value="PENDING_PROVINCE">Chờ Lãnh đạo Cục chốt</option>
                <option value="APPROVED_DEPT">Trưởng phòng đã duyệt</option>
                <option value="APPROVED_FINAL">Lãnh đạo Cục đã chốt</option>
                <option value="REJECTED">Yêu cầu làm lại</option>
                <option value="RECALLED">Đã thu hồi</option>
              </select>
            </div>
          </div>

          {/* Submissions List Container */}
          <div className="max-h-[620px] overflow-y-auto pr-1">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Chưa có phiếu đánh giá nào phù hợp.</p>
                <p className="mt-1">Hãy chuyển sang màn hình <strong>Phiếu đánh giá (Mẫu Word)</strong> hoặc <strong>KPI 3 Sheet (Mẫu Excel)</strong> để làm và gửi phê duyệt.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                    <tr className="border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                      <th className="p-2 w-8 text-center">STT</th>
                      <th className="p-2 w-[30%] min-w-[180px]">Họ tên</th>
                      <th className="p-2 w-[20%] min-w-[120px]">Chức vụ</th>
                      <th className="p-2 w-[20%] min-w-[120px]">Phòng ban</th>
                      <th className="p-2 w-24 text-center">Tự chấm</th>
                      <th className="p-2 w-24 text-center">Trưởng phòng</th>
                      <th className="p-2 w-24 text-center">Lãnh đạo chốt</th>
                      <th className="p-2 w-[18%] min-w-[150px] text-center">Trạng thái</th>
                      <th className="p-2 w-16 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.map((sub, idx) => (
                      <tr 
                        key={sub.id} 
                        onClick={() => handleSelectSubmission(sub)}
                        className={`cursor-pointer transition-colors ${
                          selectedSub?.id === sub.id
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <td className="p-2 w-8 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{sub.userName}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{sub.userPosition}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-400">{sub.department}</td>
                        <td className="p-2 w-24 text-center text-amber-700 dark:text-amber-300 font-mono font-bold">{sub.selfScoreTotal || 0}đ</td>
                        <td className="p-2 w-24 text-center text-sky-700 dark:text-sky-300 font-mono font-bold">
                          {(sub.status === 'APPROVED_DEPT' || sub.status === 'APPROVED_FINAL') && sub.deptHeadScore !== undefined && sub.deptHeadScore !== null
                            ? `${sub.deptHeadScore}đ`
                            : '—'}
                        </td>
                        <td className="p-2 w-24 text-center text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          {sub.status === 'APPROVED_FINAL' && sub.finalScore !== undefined && sub.finalScore !== null
                            ? `${sub.finalScore}đ`
                            : '—'}
                        </td>
                        <td className="p-2 w-[18%] min-w-[150px] text-center">
                          {renderStatusBadge(sub.status)}
                        </td>
                        <td className="p-2 w-16 text-center">
                          {globalRole === 'STAFF' && currentUser && sub.userName === currentUser.fullName && ['DRAFT', 'PENDING_DEPT'].includes(sub.status) && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecalculateScores();
                                }}
                                disabled={periodConfig.isLocked}
                                className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                title="Tính lại điểm"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecallSubmission();
                                }}
                                disabled={periodConfig.isLocked}
                                className="px-2 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
                                title="Thu hồi phiếu"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Bạn có chắc chắn muốn xóa phiếu này?')) {
                                    handleDeleteSubmission(sub.id);
                                  }
                                }}
                                disabled={periodConfig.isLocked}
                                className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors disabled:opacity-50"
                                title="Xóa phiếu"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review, Score Input & Full Form Preview */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          {selectedSub ? (
            <div>
              {/* Submission Header Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold text-xs">
                      {selectedSub.period || periodConfig.periodName}
                    </span>
                    {renderStatusBadge(selectedSub.status)}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-600" />
                    <span>{selectedSub.userName}</span>
                    <span className="text-xs font-normal text-slate-500">({selectedSub.userPosition} - {selectedSub.department})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Trưởng phòng ký duyệt: <strong>{selectedSub.approverName || 'Dương Xuân Phú'}</strong>
                  </p>
                </div>

                {/* Switch View Tabs */}
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-xl gap-1 shrink-0">
                  <button
                    onClick={() => setViewMode('CONSOLE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === 'CONSOLE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bảng Điểm & Nhận Xét</span>
                  </button>
                  <button
                    onClick={() => setViewMode('WORD_DOC')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === 'WORD_DOC'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem Toàn Mẫu Phiếu Word</span>
                  </button>
                </div>
              </div>

              {/* VIEW MODE 1: CONSOLE (Chấm điểm & Phê duyệt nhanh) */}
              {viewMode === 'CONSOLE' && (
                <div className="space-y-5">
                  {/* Summary Score Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">1. Điểm Cán Bộ Tự Chấm</span>
                      <span className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-300">{selectedSub.selfScoreTotal || 0}</span>
                      <span className="text-[10px] text-slate-400 block">/ 100 điểm</span>
                    </div>

                    <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-center">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">2. Điểm Trưởng Phòng Chấm</span>
                      <span className="text-xl font-extrabold font-mono text-sky-700 dark:text-sky-300">
                        {(selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL') && selectedSub.deptHeadScore !== undefined && selectedSub.deptHeadScore !== null 
                          ? `${selectedSub.deptHeadScore}đ` 
                          : 'Chờ duyệt'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">/ 100 điểm</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-center">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">3. Điểm Lãnh Đạo Chốt</span>
                      <span className="text-xl font-extrabold font-mono text-emerald-700 dark:text-emerald-300">
                        {selectedSub.status === 'APPROVED_FINAL' && selectedSub.finalScore !== undefined && selectedSub.finalScore !== null 
                          ? `${selectedSub.finalScore}đ` 
                          : 'Chờ duyệt'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">/ 100 điểm</span>
                    </div>
                  </div>

{/* Criteria Breakdown Table */}
                   <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                     <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                       <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                         <FileText className="w-3.5 h-3.5 text-indigo-600" />
                         <span>Chi Tiết Bảng Điểm Tự Đánh Giá Các Tiêu Chí</span>
                       </h4>
                       <span className="text-[11px] text-slate-500 font-semibold">
                         Tổng: <strong className="text-indigo-600 font-mono">{selectedSub.selfScoreTotal || 0}đ</strong>
                       </span>
                     </div>

                     <div className="overflow-x-auto max-h-60 overflow-y-auto">
                       <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                         <thead>
                           <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                             <th className="p-2.5 text-center w-10" style={{ width: '40px' }}>STT</th>
                             <th className="p-2.5" style={{ width: '15%' }}>Hạng mục tiêu chí</th>
                             <th className="p-2.5" style={{ width: '40%' }}>Nội dung đánh giá</th>
                             <th className="p-2.5 text-center" style={{ width: '60px' }}>Tối đa</th>
                             <th className="p-2.5 text-center" style={{ width: '60px' }}>Tự chấm</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {displayCriteria.map((c, idx) => (
                             <tr key={c.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                               <td className="p-2.5 text-center text-slate-400 font-mono whitespace-nowrap">{idx + 1}</td>
                               <td className="p-2.5 font-bold text-indigo-700 dark:text-indigo-400 whitespace-normal break-words">{c.categoryName}</td>
                               <td className="p-2.5 text-slate-600 dark:text-slate-300 whitespace-normal break-words">{c.targetDescription}</td>
                               <td className="p-2.5 text-center font-mono text-slate-500 whitespace-nowrap">{c.maxScore}đ</td>
                               <td className="p-2.5 text-center font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 whitespace-nowrap">
                                 {c.selfScore}đ
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>

                  {/* Staff Self-Assessment Note (Ưu điểm & Hạn chế) */}
                  {selectedSub.selfExplanation && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        Ý kiến tự nhận xét của công chức (Ưu điểm / Hạn chế):
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selectedSub.selfExplanation}
                      </p>
                    </div>
                  )}

{/* ================= CÁN BỘ (STAFF) - TÙY CHỌN THU HỒI, TÍNH LẠI, TẢI LÊN BẢN TỰ ĐÁNH GIÁ ================= */}
                   {(globalRole === 'STAFF' && currentUser && selectedSub.userName === currentUser.fullName && ['DRAFT', 'PENDING_DEPT'].includes(selectedSub.status)) && (
                     <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60 space-y-3.5 text-xs">
                       <div className="flex items-center justify-between">
                         <h4 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm flex items-center gap-2">
                           <FileCheck className="w-4 h-4 text-indigo-600" />
                           <span>Thao Tác Cá Nhân: Thu Hồi, Tính Lại, Tải Lên Bản Tự Đánh Giá</span>
                         </h4>
                         <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                           Cán bộ: {selectedSub.userName}
                         </span>
                       </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Recall Button */}
                        <button
                          type="button"
                          onClick={handleRecallSubmission}
                          disabled={periodConfig.isLocked || !['DRAFT', 'PENDING_DEPT'].includes(selectedSub.status)}
                          className="px-3.5 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Thu Hồi Phiếu (Retract)</span>
                        </button>

                        {/* Recalculate Button */}
                        <button
                          type="button"
                          onClick={handleRecalculateScores}
                          disabled={periodConfig.isLocked}
                          className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Tính Lại Điểm</span>
                        </button>

                        {/* Upload Self-Assessment File */}
                        <label className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          disabled={periodConfig.isLocked || uploadingFile}
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{uploadingFile ? `Đang tải... ${uploadProgress}%` : 'Tải Lên Bản Tự Đánh Giá'}</span>
                          <input
                            type="file"
                            accept=".docx,.doc,.xlsx,.xls,.pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={periodConfig.isLocked || uploadingFile}
                          />
                        </label>

                        {selectedSub.selfAssessmentFileName && (
                          <a
                            href={selectedSub.selfAssessmentFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{selectedSub.selfAssessmentFileName}</span>
                          </a>
                        )}
                      </div>

                      <p className="text-[10px] text-indigo-700 dark:text-indigo-300 italic">
                        <strong>Lưu ý:</strong> Chỉ có thể thu hồi khi phiếu ở trạng thái "Nháp" hoặc "Chờ Trưởng phòng duyệt". Sau khi Trưởng phòng đã duyệt, chỉ Lãnh đạo Cục mới có thể trả về.
                      </p>
                    </div>
                  )}

{/* ================= TRƯỞNG PHÒNG CHẤM ĐIỂM & NHẬN XÉT FORM ================= */}
                    {(['DEPT_HEAD', 'ADMIN'].includes(globalRole)) && (
                     <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-sky-200 dark:border-sky-900/60 space-y-3.5 text-xs">
                       <h4 className="font-extrabold text-sky-900 dark:text-sky-200 text-sm flex items-center gap-2">
                         <Building2 className="w-4 h-4 text-sky-600" />
                         <span>Ý Kiến Nhận Xét & Định Điểm Của Trưởng Phòng</span>
                       </h4>
                       <span className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold">
                         Cán bộ ký duyệt: {selectedSub.approverName || currentUser?.fullName || 'Dương Xuân Phú'}
                       </span>

{globalRole === 'PROVINCE_LEADER' ? (
                          // Read-only view for Province Leader
                          <div className="space-y-3">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                             <div>
                               <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                 Điểm Trưởng phòng đã chấm:
                               </label>
                               <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold font-mono text-base text-sky-900 dark:text-sky-200">
                                 {selectedSub.deptHeadScore !== undefined && selectedSub.deptHeadScore !== null
                                   ? `${selectedSub.deptHeadScore} / 100 điểm`
                                   : 'Chưa chấm điểm'}
                               </div>
                             </div>
                             <div>
                               <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                 Trạng thái phê duyệt cấp phòng:
                               </label>
                               <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                 {selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL' ? (
                                   <span className="text-emerald-600 font-bold flex items-center gap-1">
                                     <CheckCircle className="w-3.5 h-3.5" /> Đã duyệt lúc {selectedSub.deptApprovedAt || 'hôm nay'}
                                   </span>
                                 ) : (
                                   <span className="text-amber-600 font-bold flex items-center gap-1">
                                     <Clock className="w-3.5 h-3.5" /> Đang chờ Trưởng phòng xem xét
                                   </span>
                                 )}
                               </div>
                             </div>
                           </div>

                           <div>
                             <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                               Nội dung ý kiến nhận xét của Trưởng phòng:
                             </label>
                             <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs leading-relaxed whitespace-pre-line min-h-[60px]">
                               {selectedSub.deptHeadComment || 'Chưa có nhận xét'}
                             </div>
                           </div>
                         </div>
) : (
                          // Full editable form for Dept Head and ADMIN
                          <div className="space-y-3.5">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                             <div className="flex items-center justify-between mb-1">
                               <label className="font-bold text-slate-700 dark:text-slate-300">
                                 Điểm Trưởng phòng chấm (Max 100):
                               </label>
                               <button
                                 type="button"
                                 onClick={() => setDeptScore(selectedSub.selfScoreTotal || 0)}
                                 className="text-[10px] text-indigo-600 hover:underline font-semibold"
                               >
                                 Lấy điểm tự chấm ({selectedSub.selfScoreTotal || 0}đ)
                               </button>
                             </div>
                             <input
                               type="number"
                               min="0"
                               max="100"
                               step="0.5"
                               value={deptScore}
                               onChange={(e) => setDeptScore(e.target.value === '' ? '' : clampNumber(e.target.value, 100))}
                               disabled={periodConfig.isLocked}
                               className="w-full p-2 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 font-extrabold font-mono text-base text-sky-900 dark:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                             />
                           </div>

                           <div>
                             <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                               Trạng thái phê duyệt cấp phòng:
                             </label>
                             <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                               {selectedSub.status === 'APPROVED_DEPT' || selectedSub.status === 'APPROVED_FINAL' ? (
                                 <span className="text-emerald-600 font-bold flex items-center gap-1">
                                   <CheckCircle className="w-3.5 h-3.5" /> Đã duyệt lúc {selectedSub.deptApprovedAt || 'hôm nay'}
                                 </span>
                               ) : (
                                 <span className="text-amber-600 font-bold flex items-center gap-1">
                                   <Clock className="w-3.5 h-3.5" /> Đang chờ Trưởng phòng xem xét
                                 </span>
                               )}
                             </div>
                           </div>
                           </div>

                           <div>
                             <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                               Nội dung ý kiến nhận xét của Trưởng phòng:
                             </label>
                             <textarea
                               rows={3}
                               value={deptComment}
                               onChange={(e) => setDeptComment(e.target.value)}
                               disabled={periodConfig.isLocked}
                               placeholder="Nhập nhận xét về phẩm chất, năng lực, tiến độ và kết quả thực hiện nhiệm vụ..."
                               className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
                             />
                           </div>

                           {/* Action Buttons for Dept Head */}
                           <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-sky-100 dark:border-sky-900/40">
                             <button
                               type="button"
                               onClick={() => handleDeptApprove(false)}
                               disabled={periodConfig.isLocked}
                               className="px-3.5 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                             >
                               <XCircle className="w-3.5 h-3.5" />
                               <span>Yêu Cầu Làm Lại</span>
                             </button>
                             <button
                               type="button"
                               onClick={() => handleDeptApprove(true)}
                               disabled={periodConfig.isLocked}
                               className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                             >
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               <span>Phê Duyệt & Chuyển Lãnh Đạo Cục</span>
                             </button>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                  {/* ================= LÃNH ĐẠO CỤC PHÊ DUYỆT CUỐI CÙNG SECTION ================= */}
                  {(['PROVINCE_LEADER', 'ADMIN'].includes(globalRole)) && (
                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-600" />
                          <span>Quyết Định Phê Duyệt & Chốt Điểm (Trưởng Thống kê Tỉnh)</span>
                        </h4>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                          Lãnh đạo: Đào Trọng Truyến
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700 dark:text-slate-300">
                            Điểm KPI chốt chính thức (Max 100):
                          </label>
                          <button
                            type="button"
                            onClick={() => setLeaderFinalScore(selectedSub.deptHeadScore || selectedSub.selfScoreTotal || 0)}
                            className="text-[10px] text-amber-700 hover:underline font-semibold"
                          >
                            Lấy điểm Trưởng phòng ({selectedSub.deptHeadScore || selectedSub.selfScoreTotal || 0}đ)
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={leaderFinalScore}
                          onChange={(e) => setLeaderFinalScore(e.target.value === '' ? '' : clampNumber(e.target.value, 100))}
                          disabled={periodConfig.isLocked}
                          className="w-full p-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-extrabold font-mono text-base text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ý kiến kết luận của Lãnh đạo Cục:
                        </label>
                        <textarea
                          rows={2}
                          value={leaderComment}
                          onChange={(e) => setLeaderComment(e.target.value)}
                          disabled={periodConfig.isLocked}
                          placeholder="Ý kiến chỉ đạo và xếp loại thi đua..."
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      </div>

                      <div className="flex items-center justify-end pt-1 border-t border-amber-100 dark:border-amber-900/40">
                        <button
                          type="button"
                          onClick={handleLeaderApprove}
                          disabled={periodConfig.isLocked}
                          className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Phê Duyệt Kết Quả Cuối Cùng</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW MODE 2: WORD DOCUMENT PREVIEW */}
              {viewMode === 'WORD_DOC' && (
                <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-sm space-y-6 font-serif max-h-[600px] overflow-y-auto">
                  {/* Official Header */}
                  <div className="grid grid-cols-2 gap-4 text-center text-xs">
                    <div>
                      <p className="font-normal uppercase tracking-wider">CỤC THỐNG KÊ TỈNH HÀ GIANG</p>
                      <p className="font-bold underline decoration-1 uppercase">{selectedSub.department || 'PHÒNG THỐNG KÊ'}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="font-bold underline decoration-1">Độc lập - Tự do - Hạnh phúc</p>
                      <p className="italic text-[11px] mt-1">Hà Giang, ngày ... tháng ... năm 2026</p>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center pt-2">
                    <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1">Mẫu số 01/TĐĐG</p>
                    <h2 className="text-base font-bold uppercase tracking-wide">
                      PHIẾU THEO DÕI, ĐÁNH GIÁ CÔNG CHỨC, LAO ĐỘNG
                    </h2>
                    <p className="text-xs italic font-semibold mt-0.5">
                      Kỳ đánh giá: {selectedSub.period || periodConfig.periodName}
                    </p>
                  </div>

                  {/* Civil Servant Info */}
                  <div className="text-xs space-y-1.5 pl-2 border-l-2 border-slate-300">
                    <p><strong>Họ và tên:</strong> {selectedSub.userName}</p>
                    <p><strong>Chức vụ, vị trí việc làm:</strong> {selectedSub.userPosition || 'Chuyên viên'}</p>
                    <p><strong>Cơ quan, tổ chức, đơn vị:</strong> {selectedSub.department}</p>
                  </div>

{/* Section I: Criteria Table */}
                   <div className="space-y-2">
                     <h3 className="font-bold text-xs uppercase">
                       I. KẾT QUẢ TỰ ĐÁNH GIÁ CỦA CÔNG CHỨC, LAO ĐỘNG
                     </h3>
                     <table className="w-full border-collapse border border-slate-900 text-xs" style={{ tableLayout: 'fixed' }}>
                       <thead>
                         <tr className="bg-slate-100 font-bold text-center">
                           <th className="border border-slate-900 p-2" style={{ width: '40px' }}>STT</th>
                           <th className="border border-slate-900 p-2" style={{ width: '40%' }}>Tiêu chí đánh giá</th>
                           <th className="border border-slate-900 p-2 text-center" style={{ width: '60px' }}>Điểm tối đa</th>
                           <th className="border border-slate-900 p-2 text-center" style={{ width: '60px' }}>Điểm tự chấm</th>
                         </tr>
                       </thead>
                       <tbody>
                         {displayCriteria.map((c, i) => (
                           <tr key={i}>
                             <td className="border border-slate-900 p-2 text-center whitespace-nowrap">{i + 1}</td>
                             <td className="border border-slate-900 p-2 whitespace-normal break-words">
                               <strong className="block mb-1">{c.categoryName}:</strong> {c.targetDescription}
                             </td>
                             <td className="border border-slate-900 p-2 text-center font-mono whitespace-nowrap">{c.maxScore}</td>
                             <td className="border border-slate-900 p-2 text-center font-bold font-mono text-indigo-700 whitespace-nowrap">
                               {c.selfScore}
                             </td>
                           </tr>
                         ))}
                         <tr className="font-bold bg-slate-50">
                           <td colSpan={2} className="border border-slate-900 p-2 text-right uppercase">
                             Tổng điểm tự đánh giá:
                           </td>
                           <td className="border border-slate-900 p-2 text-center font-mono">100</td>
                           <td className="border border-slate-900 p-2 text-center font-mono text-indigo-700 font-bold text-sm">
                            {selectedSub.selfScoreTotal || 0}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Section II: Text & Signatures */}
                  <div className="space-y-3 text-xs">
                    <h3 className="font-bold uppercase">
                      II. TỔNG HỢP KẾT QUẢ & Ý KIẾN NHẬN XÉT
                    </h3>
                    {selectedSub.selfExplanation && (
                      <p className="whitespace-pre-line bg-slate-50 p-2 rounded border border-slate-200">
                        {selectedSub.selfExplanation}
                      </p>
                    )}
                    <div className="bg-sky-50 p-2.5 rounded border border-sky-200">
                      <strong>Ý kiến nhận xét của Trưởng phòng:</strong>{' '}
                      <span>{selectedSub.deptHeadComment || deptComment}</span>
                      <p className="mt-1 font-bold text-sky-800">
                        Điểm Trưởng phòng xác nhận: {selectedSub.deptHeadScore !== undefined ? `${selectedSub.deptHeadScore} / 100 điểm` : 'Đang xem xét'}
                      </p>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs">
                      <div>
                        <p className="font-bold uppercase">CÔNG CHỨC TỰ ĐÁNH GIÁ</p>
                        <p className="italic text-[10px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                        <div className="h-14 flex items-center justify-center font-bold text-slate-700">
                          {selectedSub.userName}
                        </div>
                      </div>
                      <div>
                        <p className="font-bold uppercase">TRƯỞNG PHÒNG KÝ DUYỆT</p>
                        <p className="italic text-[10px] text-slate-400">(Ký và ghi rõ họ tên)</p>
                        <div className="h-14 flex items-center justify-center font-bold text-sky-800">
                          {selectedSub.approverName || 'Dương Xuân Phú'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 px-4 text-xs text-slate-400">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Vui lòng chọn một cán bộ từ danh sách bên trái để xem phiếu.</p>
              <p className="mt-1">Hệ thống sẽ hiển thị toàn bộ bảng điểm, mẫu phiếu Word, cùng biểu mẫu để Trưởng phòng và Lãnh đạo Cục cho điểm & nhận xét.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              {periodConfig.isLocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                {periodConfig.isLocked ? 'Xác Nhận Mở Khóa Kỳ Đánh Giá' : 'Xác Nhận Khóa Sổ Kỳ Đánh Giá KPI'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {periodConfig.isLocked
                  ? 'Bạn có chắc chắn muốn mở khóa kỳ đánh giá? Các cấp có thể tiếp tục chỉnh sửa điểm số.'
                  : 'Hành động này sẽ đóng băng toàn bộ điểm số KPI và phiếu tự đánh giá. Không ai có thể chỉnh sửa dữ liệu trừ khi mở khóa.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                onClick={() => setShowLockModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleToggleLockPeriod}
                className={`px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors ${
                  periodConfig.isLocked ? 'bg-slate-800 hover:bg-slate-900' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {periodConfig.isLocked ? 'Xác Nhận Mở Khóa' : 'Xác Nhận Khóa Sổ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};