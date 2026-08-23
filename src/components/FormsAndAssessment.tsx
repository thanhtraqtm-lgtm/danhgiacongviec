import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileCheck, 
  Printer, 
  Download, 
  UploadCloud, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  Building2, 
  User as UserIcon, 
  Calendar, 
  Plus, 
  Trash2, 
  Eye, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { User, SelfAssessmentDoc, WorkflowSubmission, DEPARTMENTS, EvaluationPeriodConfig } from '../types';
import * as XLSX from 'xlsx';
import { OfficialWordAssessmentForm } from './OfficialWordAssessmentForm';
import { ExcelThreeSheetKpiForm } from './ExcelThreeSheetKpiForm';

interface FormsAndAssessmentProps {
  users: User[];
  currentUser?: User | null;
  periodConfig?: EvaluationPeriodConfig;
  docs: SelfAssessmentDoc[];
  selectedDepartment?: string;
  onAddDoc: (doc: Omit<SelfAssessmentDoc, 'id'>) => void;
  onDeleteDoc: (id: string) => void;
  onSubmitWorkflow: (sub: Omit<WorkflowSubmission, 'id'>) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
}

export const FormsAndAssessment: React.FC<FormsAndAssessmentProps> = ({
  users = [],
  currentUser,
  periodConfig,
  docs = [],
  selectedDepartment,
  onAddDoc,
  onDeleteDoc,
  onSubmitWorkflow,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<'WORD_OFFICIAL' | 'EXCEL_3SHEETS' | 'ONLINE' | 'DOWNLOAD_UPLOAD'>('DOWNLOAD_UPLOAD');

  // Available unique departments derived from users list and official DEPARTMENTS list
  const availableDepartments = useMemo(() => {
    const userDepts = Array.from(new Set((users || []).map((u) => u.department).filter(Boolean)));
    return Array.from(new Set([...userDepts, ...DEPARTMENTS]));
  }, [users]);

  // Form State for Online Assessment
  const [selectedUser, setSelectedUser] = useState<string>(users?.[0]?.fullName || '');
  const [selectedDept, setSelectedDept] = useState<string>(users?.[0]?.department || (selectedDepartment && selectedDepartment !== 'ALL' ? selectedDepartment : ''));
  const [period, setPeriod] = useState<string>('Kỳ đánh giá Quý IV/2025');

  // When selected user changes, auto-update selected department and user details
  const handleUserSelect = (fullName: string) => {
    setSelectedUser(fullName);
    const found = (users || []).find((u) => u.fullName === fullName);
    if (found && found.department) {
      setSelectedDept(found.department);
    }
  };

  // Criteria rows
  const [criteria, setCriteria] = useState([
    {
      id: 'c1',
      categoryName: 'I. Khối lượng & Tiến độ công việc',
      targetDescription: 'Báo cáo kiểm kê TSCĐ, CCDC lâu bền năm 2025',
      plannedDeadline: '01/01/2026',
      actualStatus: 'Hoàn thành đúng hạn',
      selfScore: 40,
      maxScore: 40,
    },
    {
      id: 'c2',
      categoryName: 'II. Chất lượng & Hiệu quả sản phẩm',
      targetDescription: 'Tính toán chính xác số liệu kiểm kê toàn tỉnh',
      plannedDeadline: '01/01/2026',
      actualStatus: 'Chất lượng xuất sắc',
      selfScore: 35,
      maxScore: 35,
    },
    {
      id: 'c3',
      categoryName: 'III. Kỷ luật & Đổi mới sáng tạo',
      targetDescription: 'Chấp hành nghiêm quy định, hỗ trợ đồng nghiệp',
      plannedDeadline: 'Định kỳ',
      actualStatus: 'Tốt',
      selfScore: 20,
      maxScore: 25,
    },
  ]);

  const [selfExplanation, setSelfExplanation] = useState('Đã hoàn thành tốt tất cả các chỉ tiêu nhiệm vụ được giao.');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Upload State for Method 2
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Total Self-Score Calculation
  const totalSelfScore = criteria.reduce((sum, c) => sum + (Number(c.selfScore) || 0), 0);

  const handleScoreChange = (id: string, newScore: number, maxScore: number) => {
    const val = Math.min(Math.max(0, newScore), maxScore);
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, selfScore: val } : c)));
  };

  const handleCriteriaTextChange = (id: string, field: 'targetDescription' | 'actualStatus', text: string) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: text } : c)));
  };

  const handleAddCriteriaRow = () => {
    const newId = 'c_' + Date.now();
    setCriteria((prev) => [
      ...prev,
      {
        id: newId,
        categoryName: 'IV. Nhiệm vụ phát sinh / Bổ sung',
        targetDescription: 'Nhiệm vụ công việc mới bổ sung',
        plannedDeadline: '01/01/2026',
        actualStatus: 'Hoàn thành',
        selfScore: 10,
        maxScore: 10,
      },
    ]);
  };

  const handleRemoveCriteriaRow = (id: string) => {
    if (criteria.length <= 1) {
      addToast('warning', 'Không thể xóa!', 'Biểu mẫu phải có ít nhất 1 mục đánh giá.');
      return;
    }
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  // Export Word Document (.doc format)
  const handleExportWordDoc = () => {
    const contentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Phiếu Tự Đánh Giá KPI</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 20px; line-height: 1.5; }
        h2 { text-align: center; text-transform: uppercase; font-size: 16pt; }
        h3 { text-align: center; font-size: 13pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid black; padding: 6px; text-align: left; font-size: 11pt; }
        th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
        .meta { margin-bottom: 15px; font-size: 12pt; }
      </style>
      </head>
      <body>
        <h3>CỤC THỐNG KÊ TỈNH HƯNG YÊN</h3>
        <h2>PHIẾU TỰ ĐÁNH GIÁ VÀ XẾP LOẠI KPI CÁ NHÂN</h2>
        <p class="meta"><strong>Họ và tên:</strong> ${selectedUser}<br/>
        <strong>Đơn vị công tác:</strong> ${selectedDept}<br/>
        <strong>Kỳ đánh giá:</strong> ${period}</p>
        
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Chỉ tiêu / Nhiệm vụ</th>
              <th>Hạn kế hoạch</th>
              <th>Kết quả thực hiện</th>
              <th>Điểm tự chấm</th>
              <th>Điểm tối đa</th>
            </tr>
          </thead>
          <tbody>
            ${criteria
              .map(
                (c, idx) => `
              <tr>
                <td style="text-align:center">${idx + 1}</td>
                <td><strong>${c.categoryName}</strong><br/>${c.targetDescription}</td>
                <td style="text-align:center">${c.plannedDeadline}</td>
                <td>${c.actualStatus}</td>
                <td style="text-align:center; font-weight:bold">${c.selfScore}</td>
                <td style="text-align:center">${c.maxScore}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <p style="margin-top: 15px;"><strong>TỔNG ĐIỂM TỰ ĐÁNH GIÁ: ${totalSelfScore} / 100 ĐIỂM</strong></p>
        <p><strong>Ý kiến giải trình / Đề xuất:</strong> ${selfExplanation}</p>
        
        <br/><br/>
        <table style="border:none">
          <tr style="border:none">
            <td style="border:none; text-align:center; width:50%"><strong>NGƯỜI TỰ ĐÁNH GIÁ</strong><br/><i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><strong>${selectedUser}</strong></td>
            <td style="border:none; text-align:center; width:50%"><strong>TRƯỞNG PHÒNG DỰỆT</strong><br/><i>(Ký và ghi rõ họ tên)</i><br/><br/><br/></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Phieu_Tu_Danh_Gia_${selectedUser.replace(/\s+/g, '_')}_2025.doc`;
    a.click();
    addToast('success', 'Xuất File Word Thành Công!', `Đã tải phiếu tự đánh giá của ${selectedUser}.`);
  };

  // Export Excel Document
  const handleExportExcel = () => {
    const dataRows = criteria.map((c, idx) => ({
      'STT': idx + 1,
      'Họ và tên cán bộ': selectedUser,
      'Phòng ban': selectedDept,
      'Kỳ đánh giá': period,
      'Danh mục nhiệm vụ': c.categoryName,
      'Mô tả chỉ tiêu': c.targetDescription,
      'Hạn kế hoạch': c.plannedDeadline,
      'Kết quả thực tế': c.actualStatus,
      'Điểm tự chấm': c.selfScore,
      'Điểm tối đa': c.maxScore,
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tu_Danh_Gia_KPI');
    XLSX.writeFile(wb, `Mau_Tu_Danh_Gia_KPI_${selectedUser.replace(/\s+/g, '_')}.xlsx`);
    addToast('success', 'Xuất Excel Thành Công!', 'Đã tải bảng điểm tự đánh giá ra file Excel.');
  };

  // Submit to Workflow (Send for Approval)
  const handleSubmitWorkflowForm = () => {
    // Khóa sổ kỳ đánh giá → không cho gửi mới
    if (periodConfig?.isLocked) {
      addToast('error', 'Kỳ Đã Khóa Sổ!', `Kỳ "${periodConfig.periodName}" đã bị khóa bởi ${periodConfig.lockedBy || 'lãnh đạo'}. Không thể gửi phiếu đánh giá mới.`);
      return;
    }
    // Lấy thông tin user thật từ danh sách users hoặc currentUser
    const matchedUser = (users || []).find((u) => u.fullName === selectedUser) || currentUser || null;
    const realUserId = matchedUser?.id || currentUser?.id || 'usr_' + Date.now();
    const realPosition = matchedUser?.position || currentUser?.position || 'Chuyên viên';
    const realDept = selectedDept || matchedUser?.department || currentUser?.department || '';

    onSubmitWorkflow({
      userId: realUserId,
      userName: selectedUser,
      userPosition: realPosition,
      department: realDept,
      period,
      selfScoreTotal: totalSelfScore,
      criteria: criteria.map((c) => ({
        id: c.id,
        categoryName: c.categoryName,
        targetDescription: c.targetDescription,
        plannedDeadline: c.plannedDeadline,
        actualStatus: c.actualStatus,
        selfScore: c.selfScore,
        maxScore: c.maxScore,
      })),
      selfExplanation,
      status: 'PENDING_DEPT',
      submittedAt: new Date().toLocaleString('vi-VN'),
    });

    addToast('success', 'Đã Gửi Trình Duyệt!', `Phiếu tự đánh giá của ${selectedUser} đã gửi lên Trưởng phòng phê duyệt.`);
  };

  // Save as Draft (DRAFT status)
  const handleSaveAsDraft = () => {
    if (periodConfig?.isLocked) {
      addToast('error', 'Kỳ Đã Khóa Sổ!', `Kỳ "${periodConfig.periodName}" đã bị khóa.`);
      return;
    }
    const matchedUser = (users || []).find((u) => u.fullName === selectedUser) || currentUser || null;
    const realUserId = matchedUser?.id || currentUser?.id || 'usr_' + Date.now();
    const realPosition = matchedUser?.position || currentUser?.position || 'Chuyên viên';
    const realDept = selectedDept || matchedUser?.department || currentUser?.department || '';

    onSubmitWorkflow({
      userId: realUserId,
      userName: selectedUser,
      userPosition: realPosition,
      department: realDept,
      period,
      selfScoreTotal: totalSelfScore,
      criteria: criteria.map((c) => ({
        id: c.id,
        categoryName: c.categoryName,
        targetDescription: c.targetDescription,
        plannedDeadline: c.plannedDeadline,
        actualStatus: c.actualStatus,
        selfScore: c.selfScore,
        maxScore: c.maxScore,
      })),
      selfExplanation,
      status: 'DRAFT',
      submittedAt: new Date().toLocaleString('vi-VN'),
    });

    addToast('success', 'Đã Lưu Nháp!', `Phiếu tự đánh giá của ${selectedUser} đã được lưu nháp. Bạn có thể tiếp tục chỉnh sửa sau.`);
  };

  // File Download Handlers for Method 2 Templates
  const downloadOfficialTemplate = (type: string) => {
    let fileName = '';
    let rows: any[] = [];

    if (type === '01') {
      fileName = 'Mau_01_Phieu_Tu_Danh_Gia_Cong_Chuc.xlsx';
      rows = [
        ['MẪU 01: PHIẾU TỰ ĐÁNH GIÁ VÀ XẾP LOẠI CHẤT LƯỢNG CÔNG CHỨC'],
        ['Họ và tên:', 'Trần Thị Quyên', 'Chức vụ:', 'Chuyên viên'],
        ['Phòng ban:', 'Phòng Thống kê Tổng hợp', 'Kỳ đánh giá:', 'Quý IV/2025'],
        [],
        ['STT', 'Tiêu chí đánh giá', 'Kết quả tự chấm', 'Điểm tối đa', 'Ghi chú / Giải trình'],
        ['1', 'Chấp hành chủ trương, đường lối, chính sách', '20', '20', 'Đạt xuất sắc'],
        ['2', 'Khối lượng, tiến độ và chất lượng công việc KPI', '55', '60', 'Trễ 1 nhiệm vụ phát sinh'],
        ['3', 'Tinh thần phối hợp và kỷ luật lao động', '20', '20', 'Tốt'],
      ];
    } else if (type === '02') {
      fileName = 'Mau_02_Bang_Cham_Diem_KPI_Cuc.xlsx';
      rows = [
        ['MẪU 02: BẢNG TỔNG HỢP ĐIỂM KPI CÁ NHÂN VÀ ĐƠN VỊ'],
        ['STT', 'Mã công việc', 'Tên công việc', 'Trọng số', 'Hạn kế hoạch', 'Thực tế xong', 'Điểm KPI'],
        ['1', 'KPI_01', 'Báo cáo kiểm kê TSCĐ, CCDC lâu bền năm 2025', '20', '01/01/2026', '01/01/2026', '20'],
        ['2', 'KPI_02', 'Tổng hợp số liệu nông nghiệp tháng 12', '25', '02/01/2026', '02/01/2026', '25'],
      ];
    } else {
      fileName = 'Mau_03_Bao_Cao_Giai_Trinh_Tre_Han.xlsx';
      rows = [
        ['MẪU 03: BÁO CÁO GIẢI TRÌNH LÝ DO TRỄ HẠN CÔNG VIỆC'],
        ['STT', 'Tên công việc trễ hạn', 'Số ngày trễ', 'Lý do khách quan/chủ quan', 'Biện pháp khắc phục'],
        ['1', 'Báo cáo kiểm kê TSCĐ phát sinh', '3 ngày', 'Chậm nhận dữ liệu từ cơ sở Vùng 2', 'Đã đôn đốc và hoàn thành'],
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Chuan');
    XLSX.writeFile(wb, fileName);
    addToast('success', 'Đã Tải Biểu Mẫu Chuẩn!', `File ${fileName} đã được tải về máy.`);
  };

  // Upload handler for Method 2
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const file = files[0];

    setTimeout(() => {
      onAddDoc({
        fileName: file.name,
        userName: selectedUser,
        uploadDate: new Date().toLocaleDateString('vi-VN'),
        extractedContent: `Bản tự đánh giá hoàn thiện từ file [${file.name}]. Tổng điểm đề xuất: ${totalSelfScore} điểm. Đã kiểm tra hợp lệ.`,
        wordCount: Math.floor(Math.random() * 500) + 200,
      });

      setUploading(false);
      addToast('success', 'Tải Lên Bản Tự Đánh Giá Thành Công!', `Đã lưu file ${file.name} vào hệ thống.`);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* OFFICIAL WORD ASSESSMENT FORM */}
      {activeTab === 'WORD_OFFICIAL' && (
        <OfficialWordAssessmentForm
          users={users}
          selectedDepartment={selectedDepartment}
          onSaveDoc={onAddDoc}
          onSubmitWorkflow={onSubmitWorkflow}
          addToast={addToast}
        />
      )}

      {/* EXCEL 3-SHEET KPI FORM */}
      {activeTab === 'EXCEL_3SHEETS' && (
        <ExcelThreeSheetKpiForm
          users={users}
          selectedDepartment={selectedDepartment}
          generalCriteriaScore={27}
          addToast={addToast}
          onSubmitWorkflow={onSubmitWorkflow}
          onSaveDoc={onAddDoc}
        />
      )}

      {/* METHOD 2: DOWNLOAD TEMPLATES & UPLOAD COMPLETED FORM */}
      {activeTab === 'DOWNLOAD_UPLOAD' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Official Templates Download */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-500" />
                Kho Biểu Mẫu Chuẩn Do Admin Cấu Hình
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Tải về các mẫu phiếu đã chuẩn hóa để điền thông tin tự đánh giá
              </p>

              <div className="space-y-3">
                {/* Template 1 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 group hover:border-indigo-300 transition-all">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Mẫu 01-ĐG/TKT: Phiếu Tự Đánh Giá
                    </span>
                    <span className="text-[11px] text-slate-400">Đánh giá xếp loại chất lượng công chức</span>
                  </div>
                  <button
                    onClick={() => downloadOfficialTemplate('01')}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    Tải về (.xlsx)
                  </button>
                </div>

                {/* Template 2 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 group hover:border-indigo-300 transition-all">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Mẫu 02-KPI/Cục: Bảng Chấm Điểm KPI
                    </span>
                    <span className="text-[11px] text-slate-400">Danh mục công việc & trọng số chi tiết</span>
                  </div>
                  <button
                    onClick={() => downloadOfficialTemplate('02')}
                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    Tải về (.xlsx)
                  </button>
                </div>

                {/* Template 3 */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 group hover:border-indigo-300 transition-all">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                      Mẫu 03-BCTH: Giải Trình Trễ Hạn
                    </span>
                    <span className="text-[11px] text-slate-400">Mẫu báo cáo giải trình nguyên nhân trễ hạn</span>
                  </div>
                  <button
                    onClick={() => downloadOfficialTemplate('03')}
                    className="flex items-center justify-center px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded shadow-sm hover:bg-amber-700 transition-colors shrink-0"
                  >
                    Tải về (.xlsx)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Upload Completed Assessment Zone & List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-1 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-500" />
                Khu Vực Tải Lên Bản Tự Đánh Giá Hoàn Thiện
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Tải lên bản tự đánh giá cá nhân đã điền đầy đủ (File Word .docx, Excel .xlsx hoặc PDF)
              </p>

              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    setUploading(true);
                    setTimeout(() => {
                      onAddDoc({
                        fileName: file.name,
                        userName: selectedUser,
                        uploadDate: new Date().toLocaleDateString('vi-VN'),
                        extractedContent: `Bản tự đánh giá [${file.name}] của ${selectedUser}. Trạng thái đã tải lên thành công.`,
                        wordCount: 420,
                      });
                      setUploading(false);
                      addToast('success', 'Đã Tải Lên File!', `Bản tự đánh giá ${file.name} đã sẵn sàng.`);
                    }, 800);
                  }
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-1">
                  Kéo thả file tự đánh giá vào đây
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">Hỗ trợ định dạng .docx, .doc, .xlsx, .pdf (Tối đa 25MB)</p>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
                  <span>Chọn File Từ Máy Tính</span>
                  <input
                    type="file"
                    accept=".docx,.doc,.xlsx,.xls,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* List of Uploaded Documents */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center justify-between">
                <span>Bản Tự Nhận Xét Đã Tải Lên ({docs.length})</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Hợp lệ</span>
              </h3>

              <div className="space-y-3">
                {docs.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Chưa có bản tự đánh giá nào được tải lên.</p>
                ) : (
                  docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs">
                          DOC
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {doc.fileName}
                          </span>
                          <p className="text-[11px] text-slate-400">
                            Cán bộ: <strong className="text-slate-700 dark:text-slate-300">{doc.userName}</strong> • Ngày tải: {doc.uploadDate}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteDoc(doc.id)}
                        className="flex items-center justify-center p-2 rounded-xl text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL (Standard Government A4 Sheet Format) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full p-8 space-y-6 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-600" />
                Xem Trước Bản In A4 Theo Chuẩn Cục Thống Kê
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  Xác Nhận In
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="flex items-center justify-center px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded shadow-sm hover:bg-slate-300 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Printable A4 Form Content */}
            <div className="space-y-4 text-xs font-serif leading-relaxed text-black">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider">CỤC THỐNG KÊ TỈNH HƯNG YÊN</h4>
                <h3 className="font-extrabold text-base uppercase text-indigo-950">PHIẾU TỰ ĐÁNH GIÁ VÀ XẾP LOẠI CÔNG VIỆC KPI</h3>
                <p className="italic text-[11px] text-slate-600">{period}</p>
              </div>

              <div className="border border-slate-300 p-4 rounded-xl space-y-1 font-sans text-[11px]">
                <p><strong>Họ và tên cán bộ:</strong> {selectedUser}</p>
                <p><strong>Đơn vị công tác:</strong> {selectedDept}</p>
                <p><strong>Chức vụ:</strong> Chuyên viên chuyên môn</p>
              </div>

              <table className="w-full border-collapse text-sm font-sans">
                <thead>
                  <tr className="bg-[#005ba1] text-white font-bold">
                    <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499] border-r border-[#004499]">STT</th>
                    <th className="px-3 py-2.5 min-w-[250px] border-b-2 border-[#004499] border-r border-[#004499]">Danh Mục Chỉ Tiêu</th>
                    <th className="px-3 py-2.5 w-24 text-center border-b-2 border-[#004499] border-r border-[#004499]">Hạn Định</th>
                    <th className="px-3 py-2.5 w-24 text-center border-b-2 border-[#004499] border-r border-[#004499]">Tự Chấm</th>
                    <th className="px-3 py-2.5 w-24 text-center border-b-2 border-[#004499]">Tối Đa</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c, i) => (
                    <tr key={c.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100 hover:bg-slate-50/80 transition-colors`}>
                      <td className="px-3 py-2 w-12 text-center font-mono text-slate-600 border-r border-slate-100">{i + 1}</td>
                      <td className="px-3 py-2 min-w-[250px] border-r border-slate-100">
                        <strong className="text-slate-900">{c.categoryName}</strong><br/>
                        <span className="text-slate-600 text-sm">{c.targetDescription}</span>
                      </td>
                      <td className="px-3 py-2 w-24 text-center font-mono text-slate-900 border-r border-slate-100">{c.plannedDeadline}</td>
                      <td className="px-3 py-2 w-24 text-center font-bold font-mono text-slate-900 border-r border-slate-100">{c.selfScore}</td>
                      <td className="px-3 py-2 w-24 text-center font-mono text-slate-900">{c.maxScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl font-sans text-xs flex justify-between font-bold">
                <span>TỔNG ĐIỂM TỰ ĐÁNH GIÁ:</span>
                <span className="text-indigo-700 font-mono text-sm">{totalSelfScore} / 100 ĐIỂM</span>
              </div>

              <div className="font-sans text-[11px] space-y-1">
                <p><strong>Ý kiến giải trình:</strong> {selfExplanation}</p>
              </div>

              <div className="pt-8 grid grid-cols-2 text-center font-sans text-xs">
                <div>
                  <p className="font-bold">NGƯỜI TỰ ĐÁNH GIÁ</p>
                  <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-bold">{selectedUser}</p>
                </div>
                <div>
                  <p className="font-bold">TRƯỜNG PHÒNG PHÊ DUYỆT</p>
                  <p className="italic text-[10px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-bold">Đỗ Xuân Phú</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
