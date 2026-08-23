import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  BarChart3,
  Layers,
  ArrowRight,
  Send,
  UserCheck,
  Search,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { User, SelfEvalCriterion, EvaluationPeriodConfig } from '../types';
import { evaluateOverallKPI, EvaluationResult } from '../utils/kpiLogic';
import { defaultCatalogItems } from '../utils/excelParser';

export interface TaskKpiRow {
  id: string;
  taskName: string;
  approvalLevel: string; // Cấp trình
  productName: string; // Sản phẩm
  quantity: number; // Số lượng (Cột 5)
  progressNote: string; // Tiến độ (Cột 6)
  note: string; // Ghi chú (Cột 7)
  maxScore: number; // Điểm tối đa (Cột 8 - 100, 200, 400...)
  evalScore: number; // Điểm chấm công việc (Cột 9)
  // Sheet 2 execution inputs
  actualQtyCompleted: number; // Thực tế hoàn thành KPI số lượng (thường = quantity)
  actualQualityCompleted: number; // Thực tế hoàn thành KPI chất lượng (thường = quantity)
  actualTimelineCompleted: number; // Thực tế hoàn thành KPI tiến độ
}

const DEFAULT_KPI_ROWS: TaskKpiRow[] = [
  { id: '1', taskName: 'Báo cáo kiểm kê tài sản cố định', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Báo cáo', quantity: 3, progressNote: 'Hằng tháng', note: 'Công việc chuẩn', maxScore: 100, evalScore: 90, actualQtyCompleted: 3, actualQualityCompleted: 3, actualTimelineCompleted: 3 },
  { id: '2', taskName: 'Báo cáo thống kê định kỳ 6 tháng', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Báo cáo', quantity: 1, progressNote: '6 tháng', note: '', maxScore: 100, evalScore: 90, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
  { id: '3', taskName: 'Tờ trình ban hành quy chế nội bộ', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Tờ trình/Quyết định', quantity: 20, progressNote: 'Theo yêu cầu cấp có thẩm quyền', note: '', maxScore: 100, evalScore: 90, actualQtyCompleted: 20, actualQualityCompleted: 20, actualTimelineCompleted: 20 },
  { id: '4', taskName: 'Tờ trình thẩm định dự toán', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Tờ trình', quantity: 50, progressNote: 'Theo yêu cầu cấp có thẩm quyền', note: '', maxScore: 100, evalScore: 90, actualQtyCompleted: 50, actualQualityCompleted: 50, actualTimelineCompleted: 49 },
  { id: '5', taskName: 'Báo cáo tổng kết năm', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Báo cáo', quantity: 1, progressNote: 'Năm', note: '', maxScore: 200, evalScore: 180, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
  { id: '6', taskName: 'Tờ trình/Công văn chỉ đạo chuyên môn', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Tờ trình/Công văn', quantity: 1, progressNote: 'Theo yêu cầu cấp có thẩm quyền', note: '', maxScore: 200, evalScore: 180, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
  { id: '7', taskName: 'Báo cáo chuyên đề thống kê vĩ mô', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Báo cáo', quantity: 1, progressNote: 'Năm', note: '', maxScore: 200, evalScore: 180, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
  { id: '8', taskName: 'Tờ trình/Danh mục sản phẩm thống kê', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Tờ trình/Danh mục sản phẩm', quantity: 1, progressNote: 'Theo yêu cầu cấp có thẩm quyền', note: '', maxScore: 400, evalScore: 360, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
  { id: '9', taskName: 'Tờ trình/Công văn hướng dẫn cơ sở', approvalLevel: 'Lãnh đạo đơn vị', productName: 'Tờ trình/Công văn', quantity: 1, progressNote: 'Hằng Quý', note: '', maxScore: 400, evalScore: 360, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
  { id: '10', taskName: 'Tờ trình/Công văn công tác Đảng', approvalLevel: 'Bí thư chi bộ', productName: 'Tờ trình/Công văn', quantity: 1, progressNote: 'Hằng Quý', note: '', maxScore: 400, evalScore: 360, actualQtyCompleted: 1, actualQualityCompleted: 1, actualTimelineCompleted: 1 },
];

interface ExcelThreeSheetKpiFormProps {
  generalCriteriaScore?: number; // From Word form (0 - 30)
  users?: User[];
  currentUser?: User | null;
  selectedDepartment?: string;
  periodConfig?: EvaluationPeriodConfig;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, description?: string) => void;
  onSubmitWorkflow?: (sub: any) => void;
  onSaveDoc?: (doc: any) => void;
}

export const ExcelThreeSheetKpiForm: React.FC<ExcelThreeSheetKpiFormProps> = ({
  generalCriteriaScore = 27,
  users = [],
  currentUser,
  selectedDepartment,
  periodConfig,
  addToast,
  onSubmitWorkflow,
  onSaveDoc
}) => {
  const [rows, setRows] = useState<TaskKpiRow[]>([]);

  // Search filter term
  const [searchTerm, setSearchTerm] = useState('');

  // Time Period Title
  const [evalPeriodTitle, setEvalPeriodTitle] = useState(`Tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`);

  // Staff & Department Selection
  const [selectedDept, setSelectedDept] = useState<string>(
    currentUser ? (currentUser.department || 'ALL') : (selectedDepartment && selectedDepartment !== 'ALL' ? selectedDepartment : 'ALL')
  );
  
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [positionTitle, setPositionTitle] = useState(currentUser?.title || '');
  
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPositionTitle(currentUser.title || '');
      setSelectedDept(currentUser.department || 'ALL');
    } else if (selectedDepartment) {
      setSelectedDept(selectedDepartment);
      if (selectedDepartment !== 'ALL') {
        const matches = (users || []).filter((u) => u.department === selectedDepartment);
        if (matches.length > 0) {
          setFullName(matches[0].fullName);
          setPositionTitle(matches[0].title || 'Thống kê viên');
        }
      }
    }
  }, [selectedDepartment, users, currentUser]);
  const [selectedUserName, setSelectedUserName] = useState<string>(
    currentUser?.fullName || (users[0]?.fullName || '')
  );

  const availableDepts = useMemo(() => {
    return Array.from(new Set((users || []).map((u) => u.department).filter(Boolean)));
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!selectedDept || selectedDept === 'ALL') {
      return users || [];
    }
    const matches = (users || []).filter((u) => u.department === selectedDept);
    return matches.length > 0 ? matches : (users || []);
  }, [users, selectedDept]);

  // Sync selectedUserName when selectedDept changes manually
  useEffect(() => {
    if (!currentUser && filteredUsers.length > 0) {
      const exists = filteredUsers.find((u) => u.fullName === selectedUserName);
      if (!exists) {
        setSelectedUserName(filteredUsers[0].fullName);
      }
    }
  }, [filteredUsers, selectedUserName, currentUser]);

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    const matches = dept === 'ALL' ? (users || []) : (users || []).filter((u) => u.department === dept);
    if (matches.length > 0) {
      setSelectedUserName(matches[0].fullName);
    }
  };

  const currentStaff = useMemo(() => {
    return (users || []).find((u) => u.fullName === selectedUserName);
  }, [users, selectedUserName]);

  const handleSaveAndSubmitForApproval = () => {
    // Khóa sổ kỳ đánh giá → không cho gửi mới
    if (periodConfig?.isLocked) {
      addToast('error', 'Kỳ Đã Khóa Sổ!', `Kỳ "${periodConfig.periodName}" đã bị khóa bởi ${periodConfig.lockedBy || 'lãnh đạo'}. Không thể gửi báo cáo KPI mới. Vui lòng liên hệ quản trị viên.`);
      return;
    }
    const staffDept = currentStaff?.department || (selectedDept !== 'ALL' ? selectedDept : (currentUser?.department || ''));
    const staffPosition = currentStaff?.position || 'Chuyên viên';

    const criteriaList: SelfEvalCriterion[] = [
      {
        id: 'crit_kpi_qty',
        categoryName: 'KPI Số lượng thực hiện',
        targetDescription: `Tỷ lệ hoàn thành khối lượng: ${sheet3Summary.kpiQuantityPct}% (Quy đổi: ${sheet3Summary.convertedQtyCompleted}/${sheet3Summary.convertedQtyTarget})`,
        plannedDeadline: evalPeriodTitle,
        actualStatus: 'Hoàn thành',
        selfScore: Number((sheet3Summary.kpiQuantityPct * 0.35).toFixed(1)),
        maxScore: 35.0,
      },
      {
        id: 'crit_kpi_qual',
        categoryName: 'KPI Chất lượng thực hiện',
        targetDescription: `Tỷ lệ hoàn thành chất lượng: ${sheet3Summary.kpiQualityPct}%`,
        plannedDeadline: evalPeriodTitle,
        actualStatus: 'Hoàn thành',
        selfScore: Number((sheet3Summary.kpiQualityPct * 0.35).toFixed(1)),
        maxScore: 35.0,
      },
      {
        id: 'crit_kpi_time',
        categoryName: 'KPI Tiến độ thực hiện',
        targetDescription: `Tỷ lệ hoàn thành tiến độ: ${sheet3Summary.kpiTimelinePct}%`,
        plannedDeadline: evalPeriodTitle,
        actualStatus: 'Hoàn thành',
        selfScore: Number((sheet3Summary.kpiTimelinePct * 0.30).toFixed(1)),
        maxScore: 30.0,
      },
      {
        id: 'crit_classification',
        categoryName: 'Xếp loại chất lượng',
        targetDescription: `Xếp loại: ${sheet3Summary.classificationLabel} - ${sheet3Summary.isUnder100Percent ? 'Dưới 100% nhiệm vụ (Điều 7)' : 'Đủ 100% nhiệm vụ'}`,
        plannedDeadline: evalPeriodTitle,
        actualStatus: sheet3Summary.classificationLabel,
        selfScore: sheet3Summary.finalOverallScore,
        maxScore: 100.0,
      }
    ];

    if (onSubmitWorkflow) {
      onSubmitWorkflow({
        userId: currentStaff?.id || currentUser?.id || 'usr_' + Date.now(),
        userName: selectedUserName,
        userPosition: staffPosition,
        department: staffDept,
        period: evalPeriodTitle,
        selfScoreTotal: sheet3Summary.finalOverallScore,
        criteria: criteriaList,
        selfExplanation: `Tự động tính từ Bảng tổng hợp KPI 3 Sheet (${displayRowsWithSheet1.length} công việc). Điểm KPI: ${sheet3Summary.finalOverallScore}/100. Xếp loại: ${sheet3Summary.classificationLabel}. ${sheet3Summary.isUnder100Percent ? 'Áp dụng Điều 7: Hoàn thành <100% nhiệm vụ = Không hoàn thành nhiệm vụ.' : ''}`,
        status: 'PENDING_DEPT',
        submittedAt: new Date().toLocaleString('vi-VN'),
        attachedFileName: `Bao_Cao_KPI_3Sheet_${selectedUserName.replace(/\s+/g, '_')}_${evalPeriodTitle.replace(/\s+/g, '_')}.xlsx`,
      });
    }
    if (onSaveDoc) {
      onSaveDoc({
        fileName: `Bao_Cao_KPI_3Sheet_${selectedUserName.replace(/\s+/g, '_')}_${evalPeriodTitle.replace(/\s+/g, '_')}.xlsx`,
        userName: selectedUserName,
        uploadDate: new Date().toISOString().split('T')[0],
        extractedContent: `BÁO CÁO CHẤM ĐIỂM KPI 3 SHEET AUTOMATIC - ${selectedUserName} (${staffDept}) - ${evalPeriodTitle}\nĐiểm tổng hợp: ${sheet3Summary.finalOverallScore}/100\nKPI Số lượng: ${sheet3Summary.kpiQuantityPct}%\nKPI Chất lượng: ${sheet3Summary.kpiQualityPct}%\nKPI Tiến độ: ${sheet3Summary.kpiTimelinePct}%\nXếp loại: ${sheet3Summary.classificationLabel}\n${sheet3Summary.isUnder100Percent ? 'Áp dụng Điều 7: Hoàn thành dưới 100% nhiệm vụ = Không hoàn thành nhiệm vụ' : ''}`,
        wordCount: 180,
      });
    }
    addToast(
      'success',
      'Đã Lưu & Gửi Phê Duyệt Thành Công!',
      `Hồ sơ đánh giá KPI 3 Sheet của ${selectedUserName} - Điểm: ${sheet3Summary.finalOverallScore}đ (${sheet3Summary.classificationLabel}) đã được lưu và gửi đến Trưởng phòng.`
    );
  };

  // --- SHEET 1 AUTOMATIC CALCULATIONS ---
  // Column 10: Conversion Factor (Hệ số quy đổi) = Điểm chấm công việc / 5
  const rowsWithSheet1 = useMemo(() => {
    return rows.map((r) => {
      const conversionFactor = Number((r.evalScore / 5).toFixed(2));
      return {
        ...r,
        conversionFactor
      };
    });
  }, [rows]);

  const displayRowsWithSheet1 = useMemo(() => {
    if (!searchTerm.trim()) return rowsWithSheet1;
    const term = searchTerm.toLowerCase();
    return rowsWithSheet1.filter((r) =>
      r.taskName.toLowerCase().includes(term) ||
      r.approvalLevel.toLowerCase().includes(term) ||
      r.productName.toLowerCase().includes(term) ||
      r.progressNote.toLowerCase().includes(term) ||
      selectedUserName.toLowerCase().includes(term) ||
      selectedDept.toLowerCase().includes(term)
    );
  }, [rowsWithSheet1, searchTerm, selectedUserName, selectedDept]);

  // --- SHEET 2 AUTOMATIC CALCULATIONS ---
  // Cột 6: Số lượng quy đổi = Số lượng thực hiện (Cột 4) x Hệ số quy đổi (Cột 5)
  // Cột 8: KPI Số lượng quy đổi = Thực tế hoàn thành x Hệ số quy đổi
  // Cột 10: KPI Chất lượng quy đổi = Thực tế hoàn thành x Hệ số quy đổi
  // Cột 12: KPI Tiến độ quy đổi = Thực tế hoàn thành x Hệ số quy đổi
  const rowsWithSheet2 = useMemo(() => {
    return rowsWithSheet1.map((r) => {
      const convertedTotalQty = Number((r.quantity * r.conversionFactor).toFixed(2));
      const convertedActualQty = Number((r.actualQtyCompleted * r.conversionFactor).toFixed(2));
      const convertedActualQuality = Number((r.actualQualityCompleted * r.conversionFactor).toFixed(2));
      const convertedActualTimeline = Number((r.actualTimelineCompleted * r.conversionFactor).toFixed(2));

      return {
        ...r,
        convertedTotalQty,
        convertedActualQty,
        convertedActualQuality,
        convertedActualTimeline
      };
    });
  }, [rowsWithSheet1]);

  // Sheet 2 Totals
  const sheet2Totals = useMemo(() => {
    let totalQty = 0;
    let totalFactor = 0;
    let totalConvertedQty = 0;
    let totalActualQty = 0;
    let totalConvertedActualQty = 0;
    let totalActualQuality = 0;
    let totalConvertedActualQuality = 0;
    let totalActualTimeline = 0;
    let totalConvertedActualTimeline = 0;

    rowsWithSheet2.forEach((r) => {
      totalQty += r.quantity;
      totalFactor += r.conversionFactor;
      totalConvertedQty += r.convertedTotalQty;
      totalActualQty += r.actualQtyCompleted;
      totalConvertedActualQty += r.convertedActualQty;
      totalActualQuality += r.actualQualityCompleted;
      totalConvertedActualQuality += r.convertedActualQuality;
      totalActualTimeline += r.actualTimelineCompleted;
      totalConvertedActualTimeline += r.convertedActualTimeline;
    });

    return {
      totalQty: Number(totalQty.toFixed(2)),
      totalFactor: Number(totalFactor.toFixed(2)),
      totalConvertedQty: Number(totalConvertedQty.toFixed(2)),
      totalActualQty: Number(totalActualQty.toFixed(2)),
      totalConvertedActualQty: Number(totalConvertedActualQty.toFixed(2)),
      totalActualQuality: Number(totalActualQuality.toFixed(2)),
      totalConvertedActualQuality: Number(totalConvertedActualQuality.toFixed(2)),
      totalActualTimeline: Number(totalActualTimeline.toFixed(2)),
      totalConvertedActualTimeline: Number(totalConvertedActualTimeline.toFixed(2)),
    };
  }, [rowsWithSheet2]);

  // --- SHEET 3 AUTOMATIC CALCULATIONS ---
  // KPI SỐ LƯỢNG = (Cột 8 tổng / Cột 6 tổng) * 100
  // KPI CHẤT LƯỢNG = (Cột 10 tổng / Cột 6 tổng) * 100
  // KPI TIẾN ĐỘ = (Cột 12 tổng / Cột 6 tổng) * 100
  // Tổng điểm theo quy định: (a+b+c)/3 * 70% + Điểm tiêu chí chung (30%)
  // Quy định Điều 7: Nếu % số lượng < 100% → "Không hoàn thành nhiệm vụ" (<50đ)
  const sheet3Summary = useMemo(() => {
    const denom = sheet2Totals.totalConvertedQty || 1;
    
    const kpiQuantityPct = Number(((sheet2Totals.totalConvertedActualQty / denom) * 100).toFixed(2));
    const kpiQualityPct = Number(((sheet2Totals.totalConvertedActualQuality / denom) * 100).toFixed(2));
    const kpiTimelinePct = Number(((sheet2Totals.totalConvertedActualTimeline / denom) * 100).toFixed(4));

    const evaluation = evaluateOverallKPI(
      kpiQuantityPct,
      kpiQualityPct,
      kpiTimelinePct,
      generalCriteriaScore,
      false // isLeader - sẽ mở rộng sau
    );

    return {
      kpiQuantityPct,
      kpiQualityPct,
      kpiTimelinePct,
      taskExecutionScore: evaluation.taskExecutionScore,
      weightedTask70: Number(((evaluation.taskExecutionScore / 100) * 70).toFixed(2)),
      finalOverallScore: evaluation.totalScore,
      classification: evaluation.classification,
      classificationLabel: evaluation.classificationLabel,
      isUnder100Percent: evaluation.isUnder100Percent,
    };
  }, [sheet2Totals, generalCriteriaScore]);

  // Table Row Add / Remove / Edit
  const handleAddRow = () => {
    const newId = (rows.length + 1).toString();
    const newRow: TaskKpiRow = {
      id: newId,
      taskName: 'Nhiệm vụ mới bổ sung',
      approvalLevel: 'Lãnh đạo đơn vị',
      productName: 'Báo cáo/Công văn',
      quantity: 1,
      progressNote: 'Hằng tháng',
      note: '',
      maxScore: 100,
      evalScore: 90,
      actualQtyCompleted: 1,
      actualQualityCompleted: 1,
      actualTimelineCompleted: 1
    };
    setRows([...rows, newRow]);
    addToast('info', 'Đã thêm dòng mới', 'Hãy nhập thông tin sản phẩm và điểm cá nhân tự chấm');
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      addToast('warning', 'Không thể xóa', 'Bảng báo cáo cần ít nhất 1 dòng nhiệm vụ');
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleCellChange = (id: string, field: keyof TaskKpiRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          // Auto sync actual quantities if quantity changes
          if (field === 'quantity') {
            updated.actualQtyCompleted = Number(value);
            updated.actualQualityCompleted = Number(value);
            updated.actualTimelineCompleted = Number(value);
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Export 3-Sheet Excel File
  const handleExportExcel3Sheets = () => {
    try {
      addToast('info', 'Đang tạo file Excel 3 Sheet...', 'Đang liên kết công thức tự động giữa 3 Sheet');

      // Sheet 1 Data Array
      const sheet1Data = rowsWithSheet2.map((r, idx) => ({
        'TT': idx + 1,
        'Nhiệm vụ': r.taskName,
        'Cấp trình': r.approvalLevel,
        'Sản phẩm': r.productName,
        'Số lượng': r.quantity,
        'Tiến độ': r.progressNote,
        'Ghi chú': r.note,
        'Điểm tối đa': r.maxScore,
        'Điểm chấm công việc': r.evalScore,
        'Hệ số quy đổi': r.conversionFactor
      }));

      // Sheet 2 Data Array
      const sheet2Data = rowsWithSheet2.map((r, idx) => ({
        'TT': idx + 1,
        'Nhiệm vụ': r.taskName,
        'Sản phẩm': r.productName,
        'Số lượng công việc': r.quantity,
        'Hệ số quy đổi': r.conversionFactor,
        'Số lượng quy đổi': r.convertedTotalQty,
        'KPI Số lượng - Thực tế': r.actualQtyCompleted,
        'KPI Số lượng - Quy đổi': r.convertedActualQty,
        'KPI Chất lượng - Thực tế': r.actualQualityCompleted,
        'KPI Chất lượng - Quy đổi': r.convertedActualQuality,
        'KPI Tiến độ - Thực tế': r.actualTimelineCompleted,
        'KPI Tiến độ - Quy đổi': r.convertedActualTimeline,
      }));

      // Sheet 3 Summary Data Array
      const sheet3Data = [
        { 'Chỉ tiêu KPI': 'KPI SỐ LƯỢNG', 'Tỷ lệ hoàn thành (%)': sheet3Summary.kpiQuantityPct, 'ĐIỂM THỰC HIỆN NHIỆM VỤ (70%)': sheet3Summary.taskExecutionScore, 'KẾT QUẢ THEO DÕI ĐÁNH GIÁ TỔNG HỢP': sheet3Summary.finalOverallScore },
        { 'Chỉ tiêu KPI': 'KPI CHẤT LƯỢNG', 'Tỷ lệ hoàn thành (%)': sheet3Summary.kpiQualityPct, 'ĐIỂM THỰC HIỆN NHIỆM VỤ (70%)': '', 'KẾT QUẢ THEO DÕI ĐÁNH GIÁ TỔNG HỢP': '' },
        { 'Chỉ tiêu KPI': 'KPI TIẾN ĐỘ', 'Tỷ lệ hoàn thành (%)': sheet3Summary.kpiTimelinePct, 'ĐIỂM THỰC HIỆN NHIỆM VỤ (70%)': '', 'KẾT QUẢ THEO DÕI ĐÁNH GIÁ TỔNG HỢP': '' },
        { 'Chỉ tiêu KPI': 'XẾP LOẠI CHẤT LƯỢNG', 'Tỷ lệ hoàn thành (%)': sheet3Summary.classificationLabel, 'ĐIỂM THỰC HIỆN NHIỆM VỤ (70%)': `${sheet3Summary.taskExecutionScore}đ`, 'KẾT QUẢ THEO DÕI ĐÁNH GIÁ TỔNG HỢP': `${sheet3Summary.finalOverallScore}đ (${sheet3Summary.isUnder100Percent ? 'Điều 7: <100% = Không hoàn thành' : 'Đủ 100%'})` },
      ];

      // Sheet 4: Danh mục sản phẩm quy đổi (Mục 9)
      const catalogExportData = defaultCatalogItems.map((item, idx) => ({
        'STT': idx + 1,
        'Nhóm nhiệm vụ': item.taskGroup,
        'Công việc chi tiết': item.detailTask,
        'Sản phẩm đầu ra': item.outputProduct,
        'Phân nhóm': item.categoryGroup,
        'Khung điểm tối đa': item.maxScore,
        'Điểm chấm': item.evaluatedScore,
        'Hệ số quy đổi': item.conversionFactor,
        'Ghi chú': item.notes,
      }));

      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
      XLSX.utils.book_append_sheet(wb, ws1, '1.Báo cáo công việc');

      const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
      XLSX.utils.book_append_sheet(wb, ws2, '2.Thực tế triển khai');

      const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
      XLSX.utils.book_append_sheet(wb, ws3, '3.Kết quả tổng hợp');

      const ws4 = XLSX.utils.json_to_sheet(catalogExportData);
      // Set column widths for Sheet 4
      ws4['!cols'] = [
        { wch: 5 },   // STT
        { wch: 30 },  // Nhóm nhiệm vụ
        { wch: 50 },  // Công việc chi tiết
        { wch: 40 },  // Sản phẩm đầu ra
        { wch: 10 },  // Phân nhóm
        { wch: 15 },  // Khung điểm
        { wch: 12 },  // Điểm chấm
        { wch: 15 },  // Hệ số quy đổi
        { wch: 25 },  // Ghi chú
      ];
      XLSX.utils.book_append_sheet(wb, ws4, '4.Danh mục quy đổi');

      const fileName = `Bao_Cao_SMCV_KPI_3Sheets_${evalPeriodTitle.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      addToast('success', 'Xuất tệp Excel 3 Sheet thành công!', `Đã lưu tệp ${fileName}`);
    } catch {
      addToast('error', 'Lỗi xuất file Excel', 'Không thể khởi tạo tệp Excel 3 Sheet.');
    }
  };

  // Upload Excel file to parse data
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addToast('info', 'Đang nhập tệp Excel...', 'Đang đọc cấu trúc các Sheet');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const parsedData = XLSX.utils.sheet_to_json<any>(ws);

        if (parsedData && parsedData.length > 0) {
          const importedRows: TaskKpiRow[] = parsedData.map((item: any, idx: number) => {
            const qty = Number(item['Số lượng'] || item['Số lượng công việc'] || 1);
            const maxS = Number(item['Điểm tối đa'] || 100);
            const evalS = Number(item['Điểm chấm công việc'] || 90);

            return {
              id: (idx + 1).toString(),
              taskName: item['Nhiệm vụ'] || `Nhiệm vụ ${idx + 1}`,
              approvalLevel: item['Cấp trình'] || 'Lãnh đạo đơn vị',
              productName: item['Sản phẩm'] || 'Báo cáo',
              quantity: qty,
              progressNote: item['Tiến độ'] || 'Theo yêu cầu',
              note: item['Ghi chú'] || '',
              maxScore: maxS,
              evalScore: evalS,
              actualQtyCompleted: qty,
              actualQualityCompleted: qty,
              actualTimelineCompleted: qty
            };
          });

          setRows(importedRows);
          addToast('success', 'Tải lên thành công!', `Đã nạp ${importedRows.length} nhiệm vụ từ file Excel.`);
        }
      };
      reader.readAsBinaryString(file);
    } catch {
      addToast('error', 'Lỗi tải tệp Excel', 'Định dạng tệp Excel không khớp mẫu báo cáo.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Right Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 -mt-3 mb-2">
        <label className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer">
          Nhập Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} className="hidden" />
        </label>

        <button
          onClick={handleExportExcel3Sheets}
          className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors"
        >
          Xuất Excel
        </button>

        <button
          onClick={handleSaveAndSubmitForApproval}
          className="flex items-center justify-center px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-800 transition-colors"
        >
          Gửi phê duyệt
        </button>
      </div>

      {/* Department, Staff Selection & Search Filter Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-b-2 border-b-amber-400 shadow-xs px-4 py-2 rounded-lg flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Phòng ban:</span>
            {currentUser ? (
              <span className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                {currentUser.department || 'Chưa cập nhật'}
              </span>
            ) : (
              <select
                value={selectedDept}
                onChange={(e) => handleDeptChange(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">Tất cả phòng ban ({users.length})</option>
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Cán bộ:</span>
            {currentUser ? (
               <span className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentUser.fullName} - {currentUser.title}
               </span>
            ) : (
               <select
                 value={selectedUserName}
                 onChange={(e) => setSelectedUserName(e.target.value)}
                 className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[220px]"
               >
                 {filteredUsers.map((u) => (
                   <option key={u.id} value={u.fullName}>
                     {u.fullName} - {u.title}
                   </option>
                 ))}
               </select>
            )}
          </div>
        </div>

        {/* Search input field */}
        <div className="relative w-56 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* --- TABLE CONTAINER SECTION --- */}
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* SHEET 1 TABLE: BÁO CÁO SẢN PHẨM / CÔNG VIỆC VÀ CHẤM ĐIỂM KPI */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase font-sans">
                SHEET 1
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-wide font-sans text-slate-800 dark:text-slate-100">
                BÁO CÁO SẢN PHẨM/CÔNG VIỆC VÀ CHẤM ĐIỂM KPI
              </h3>
            </div>

            {/* Period & Add Row Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Kỳ:</span>
                <input
                  type="text"
                  value={evalPeriodTitle}
                  onChange={(e) => setEvalPeriodTitle(e.target.value)}
                  className="font-bold text-amber-600 dark:text-amber-400 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none text-xs w-24 text-center"
                />
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tổng điểm KPI:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">{sheet3Summary.finalOverallScore} / 100</span>
              </div>

              <button
                onClick={handleAddRow}
                className="flex items-center justify-center px-4 py-2 bg-amber-400 text-slate-950 text-xs font-bold rounded shadow-sm hover:bg-amber-300 transition-colors border border-amber-300"
              >
                Thêm Dòng
              </button>
            </div>
          </div>

          {/* Sheet 1 Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm font-sans">
              <thead>
                <tr className="bg-[#005ba1] text-white font-bold">
                  <th className="px-3 py-2.5 w-10 text-center border-b-2 border-[#004499] border-r border-[#004499]">TT</th>
                  <th className="px-3 py-2.5 min-w-[280px] border-b-2 border-[#004499] border-r border-[#004499]">(2) Nhiệm vụ</th>
                  <th className="px-3 py-2.5 min-w-[120px] border-b-2 border-[#004499] border-r border-[#004499]">(3) Cấp trình</th>
                  <th className="px-3 py-2.5 min-w-[150px] border-b-2 border-[#004499] border-r border-[#004499]">(4) Sản phẩm</th>
                  <th className="px-3 py-2.5 w-20 text-center border-b-2 border-[#004499] border-r border-[#004499]">(5) Số lượng</th>
                  <th className="px-3 py-2.5 min-w-[140px] border-b-2 border-[#004499] border-r border-[#004499]">(6) Tiến độ</th>
                  <th className="px-3 py-2.5 min-w-[140px] border-b-2 border-[#004499] border-r border-[#004499]">(7) Ghi chú</th>
                  <th className="px-3 py-2.5 w-24 text-center border-b-2 border-[#004499] border-r border-[#004499] bg-amber-100/30 text-amber-950">(8) Điểm tối đa</th>
                  <th className="px-3 py-2.5 w-24 text-center border-b-2 border-[#004499] border-r border-[#004499] bg-amber-200/50 text-amber-950">(9) Điểm chấm</th>
                  <th className="px-3 py-2.5 w-20 text-center border-b-2 border-[#004499] border-r border-[#004499] bg-emerald-200/50 text-emerald-950 font-black">
                    (10) Hệ số
                  </th>
                  <th className="px-3 py-2.5 w-12 text-center border-b-2 border-[#004499]">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {displayRowsWithSheet1.map((r, idx) => (
                  <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-amber-50/60 transition-colors`}>
                    <td className="px-3 py-1.5 w-10 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">{idx + 1}</td>
                    <td className="px-2 py-1 min-w-[280px] border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={r.taskName}
                        onChange={(e) => handleCellChange(r.id, 'taskName', e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-indigo-400 font-medium text-sm"
                      />
                    </td>
                    <td className="px-2 py-1 min-w-[120px] border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={r.approvalLevel}
                        onChange={(e) => handleCellChange(r.id, 'approvalLevel', e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-indigo-400 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1 min-w-[150px] border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={r.productName}
                        onChange={(e) => handleCellChange(r.id, 'productName', e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-indigo-400 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1 w-20 text-center border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="number"
                        min="1"
                        value={r.quantity}
                        onChange={(e) => handleCellChange(r.id, 'quantity', Number(e.target.value))}
                        className="w-12 text-center px-1 py-1 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none text-sm"
                      />
                    </td>
                    <td className="px-2 py-1 min-w-[140px] border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={r.progressNote}
                        onChange={(e) => handleCellChange(r.id, 'progressNote', e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-indigo-400 text-sm"
                      />
                    </td>
<td className="px-2 py-1 min-w-[140px] border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) => handleCellChange(r.id, 'note', e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-indigo-400 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1 w-24 text-center border-r border-slate-100 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10">
                      <select
                        value={r.maxScore}
                        onChange={(e) => handleCellChange(r.id, 'maxScore', Number(e.target.value))}
                        className="px-1 py-1 text-center font-bold bg-amber-100/50 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-sm rounded-none"
                      >
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={400}>400</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 w-24 text-center border-r border-slate-100 dark:border-slate-800 bg-amber-100/40 dark:bg-amber-900/20">
                      <input
                        type="number"
                        step="1"
                        value={r.evalScore}
                        onChange={(e) => handleCellChange(r.id, 'evalScore', Number(e.target.value))}
                        className="w-14 text-center font-black py-1 bg-amber-200/60 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 text-sm rounded-none focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 w-20 text-center border-r border-slate-100 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/50 font-black text-emerald-700 dark:text-emerald-300">
                      {r.conversionFactor}
                    </td>
                    <td className="px-2 py-1.5 w-12 text-center">
                      <button
                        onClick={() => handleRemoveRow(r.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SHEET 2 TABLE: THỰC TẾ TRIỂN KHAI (KPI SỐ LƯỢNG, CHẤM ĐIỂM KPI) */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase font-sans">
                SHEET 2
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-wide font-sans text-slate-800 dark:text-slate-100">
                THỰC TẾ TRIỂN KHAI
              </h3>
            </div>
          </div>

          {/* Sheet 2 Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm font-sans">
              <thead>
                <tr className="bg-[#005ba1] text-white font-bold">
                  <th rowSpan={3} className="px-3 py-2.5 w-10 text-center border-b-2 border-[#004499] border-r border-[#004499]">TT</th>
                  <th rowSpan={3} className="px-3 py-2.5 min-w-[280px] border-b-2 border-[#004499] border-r border-[#004499]">Nhiệm vụ</th>
                  <th rowSpan={3} className="px-3 py-2.5 min-w-[150px] border-b-2 border-[#004499] border-r border-[#004499]">Sản phẩm</th>
                  <th colSpan={3} className="px-3 py-2.5 text-center bg-[#004499] border-b-2 border-[#004499] border-r border-[#004499]">
                    NHIỆM VỤ THỰC HIỆN
                  </th>
                  <th colSpan={2} className="px-3 py-2.5 text-center bg-[#004499] border-b-2 border-[#004499] border-r border-[#004499]">
                    KPI SỐ LƯỢNG
                  </th>
                  <th colSpan={2} className="px-3 py-2.5 text-center bg-[#004499] border-b-2 border-[#004499] border-r border-[#004499]">
                    KPI CHẤT LƯỢNG
                  </th>
                  <th colSpan={2} className="px-3 py-2.5 text-center bg-[#004499] border-b-2 border-[#004499]">
                    KPI TIẾN ĐỘ
                  </th>
                </tr>
                <tr className="bg-[#004499] text-white font-bold">
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(4) Số lượng</th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(5) Hệ số</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-r border-[#004499] font-black bg-blue-900/50 text-blue-200">
                    (6) Quy đổi
                  </th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(7) Thực tế</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-r border-[#004499] font-bold bg-emerald-900/50 text-emerald-200">
                    (8) Quy đổi
                  </th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(9) Thực tế</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-r border-[#004499] font-bold bg-teal-900/50 text-teal-200">
                    (10) Quy đổi
                  </th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(11) Thực tế</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-[#004499] font-bold bg-amber-900/50 text-amber-200">
                    (12) Quy đổi
                  </th>
                </tr>
                <tr className="bg-[#003388] text-white font-bold">
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(4) Số lượng</th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(5) Hệ số link</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-r border-[#004499] font-black bg-blue-900/50 text-blue-200">
                    (6)=(5)*(4)<br />Quy đổi
                  </th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(7) Thực tế</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-r border-[#004499] font-bold bg-emerald-900/50 text-emerald-200">
                    (8)=(7)*(5)<br />Quy đổi
                  </th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(9) Thực tế</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-r border-[#004499] font-bold bg-teal-900/50 text-teal-200">
                    (10)=(9)*(5)<br />Quy đổi
                  </th>
                  <th className="px-2 py-1.5 w-20 text-center border-r border-[#004499]">(11) Thực tế</th>
                  <th className="px-3 py-1.5 min-w-[100px] text-center border-[#004499] font-bold bg-amber-900/50 text-amber-200">
                    (12)=(11)*(5)<br />Quy đổi
                  </th>
                </tr>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-xs border-y-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={3} className="p-2 text-center uppercase tracking-wider text-white font-extrabold bg-[#006097]">
                    TỔNG SỐ TÍNH ĐIỂM
                  </td>
                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold">{sheet2Totals.totalQty}</td>
                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold">{sheet2Totals.totalFactor}</td>
                  <td className="p-2 text-center text-blue-700 dark:text-blue-300 font-bold">{sheet2Totals.totalConvertedQty}</td>

                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold">{sheet2Totals.totalActualQty}</td>
                  <td className="p-2 text-center text-emerald-700 dark:text-emerald-300 font-bold">{sheet2Totals.totalConvertedActualQty}</td>

                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold">{sheet2Totals.totalActualQuality}</td>
                  <td className="p-2 text-center text-teal-700 dark:text-teal-300 font-bold">{sheet2Totals.totalConvertedActualQuality}</td>

                  <td className="p-2 text-center text-slate-800 dark:text-slate-100 font-bold">{sheet2Totals.totalActualTimeline}</td>
                  <td className="p-2 text-center text-amber-700 dark:text-amber-300 font-bold">{sheet2Totals.totalConvertedActualTimeline}</td>
                </tr>
              </thead>

              <tbody>
                {rowsWithSheet2.map((r, idx) => (
                  <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/50'} border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors`}>
                    <td className="px-3 py-1.5 w-10 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-800">{idx + 1}</td>
                    <td className="px-3 py-1.5 min-w-[280px] font-medium border-r border-slate-100 dark:border-slate-800">{r.taskName}</td>
                    <td className="px-3 py-1.5 min-w-[150px] border-r border-slate-100 dark:border-slate-800">{r.productName}</td>

                    {/* Nhiệm vụ thực hiện */}
                    <td className="px-3 py-1.5 w-20 text-center font-bold border-r border-slate-100 dark:border-slate-800">{r.quantity}</td>
                    <td className="px-3 py-1.5 w-20 text-center font-bold text-amber-600 dark:text-amber-400 border-r border-slate-100 dark:border-slate-800">{r.conversionFactor}</td>
                    <td className="px-3 py-1.5 min-w-[100px] text-center font-bold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/30 border-r border-slate-100 dark:border-slate-800">
                      {r.convertedTotalQty}
                    </td>

                    {/* KPI Số lượng */}
                    <td className="px-3 py-1 w-20 text-center border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="number"
                        value={r.actualQtyCompleted}
                        onChange={(e) => handleCellChange(r.id, 'actualQtyCompleted', Number(e.target.value))}
                        className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none text-sm"
                      />
                    </td>
                    <td className="px-3 py-1.5 min-w-[100px] text-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/30 border-r border-slate-100 dark:border-slate-800">
                      {r.convertedActualQty}
                    </td>

                    {/* KPI Chất lượng */}
                    <td className="px-3 py-1 w-20 text-center border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="number"
                        value={r.actualQualityCompleted}
                        onChange={(e) => handleCellChange(r.id, 'actualQualityCompleted', Number(e.target.value))}
                        className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none"
                      />
                    </td>
<td className="px-3 py-1.5 min-w-[100px] text-center font-bold text-teal-700 dark:text-teal-300 bg-teal-50/30 dark:bg-teal-950/30 border-r border-slate-100 dark:border-slate-800">
                      {r.convertedActualQuality}
                    </td>

                    {/* KPI Tiến độ */}
                    <td className="px-3 py-1 w-20 text-center border-r border-slate-100 dark:border-slate-800">
                      <input
                        type="number"
                        value={r.actualTimelineCompleted}
                        onChange={(e) => handleCellChange(r.id, 'actualTimelineCompleted', Number(e.target.value))}
                        className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none text-sm"
                      />
                    </td>
                    <td className="px-3 py-1.5 min-w-[100px] text-center font-bold text-amber-700 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/30 border-slate-100 dark:border-slate-800">
                      {r.convertedActualTimeline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SHEET 3 TABLE: KẾT QUẢ THEO DÕI, ĐÁNH GIÁ (SYNTHESIS SUMMARY) */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase font-sans">
                SHEET 3
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-wide font-sans text-slate-800 dark:text-slate-100">
                KẾT QUẢ THEO DÕI, ĐÁNH GIÁ TỔNG HỢP (KẾT NỐI WORD & EXCEL)
              </h3>
            </div>
          </div>

          {/* Sheet 3 Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm font-sans">
              <thead>
                <tr className="bg-[#005ba1] text-white font-bold">
                  <th className="px-4 py-2.5 min-w-[180px] border-b-2 border-[#004499] border-r border-[#004499]">CHỈ TIÊU BẢNG</th>
                  <th className="px-3 py-2.5 w-32 text-center border-b-2 border-[#004499] border-r border-[#004499]">TỶ LỆ HOÀN THÀNH (%)</th>
                  <th className="px-4 py-2.5 min-w-[200px] text-center border-b-2 border-[#004499] border-r border-[#004499] bg-amber-50/30 dark:bg-amber-950/30">
                    ĐIỂM THỰC HIỆN NHIỆM VỤ (70%)
                  </th>
                  <th className="px-4 py-2.5 min-w-[220px] text-center border-b-2 border-[#004499] bg-emerald-100/60 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-black">
                    KẾT QUẢ THEO DÕI, ĐÁNH GIÁ TỔNG HỢP (100%)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 min-w-[180px] font-bold border-r border-slate-100 dark:border-slate-800">KPI SỐ LƯỢNG</td>
                  <td className="px-3 py-3 w-32 text-center font-black text-indigo-600 dark:text-indigo-400 border-r border-slate-100 dark:border-slate-800">
                    {sheet3Summary.kpiQuantityPct}%
                  </td>
                  <td rowSpan={4} className="px-4 py-4 min-w-[200px] text-center align-middle font-black text-xl text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/10 border-r border-slate-100 dark:border-slate-800 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-2xl font-black">{sheet3Summary.taskExecutionScore}</div>
                    <div className="text-[11px] font-normal text-slate-500 mt-1">
                      (Trung bình KPI Số lượng, Chất lượng, Tiến độ)
                    </div>
                  </td>
                  <td rowSpan={4} className="px-4 py-4 min-w-[220px] text-center align-middle font-black text-3xl text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 border-slate-100 dark:border-slate-800 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-3xl font-black">{sheet3Summary.finalOverallScore}</div>
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                      = ({sheet3Summary.taskExecutionScore} / 100 * 70) + {generalCriteriaScore} (Tiêu chí chung)
                    </div>
                  </td>
                </tr>

                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 min-w-[180px] font-bold border-r border-slate-100 dark:border-slate-800">KPI CHẤT LƯỢNG</td>
                  <td className="px-3 py-3 w-32 text-center font-black text-teal-600 dark:text-teal-400 border-r border-slate-100 dark:border-slate-800">
                    {sheet3Summary.kpiQualityPct}%
                  </td>
                </tr>

                <tr className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 min-w-[180px] font-bold border-r border-slate-100 dark:border-slate-800">KPI TIẾN ĐỘ</td>
                  <td className="px-3 py-3 w-32 text-center font-black text-amber-600 dark:text-amber-400 border-r border-slate-100 dark:border-slate-800">
                    {sheet3Summary.kpiTimelinePct}%
                  </td>
                </tr>

                {/* Classification Row - Xếp loại theo quy định */}
                <tr className="bg-emerald-50 dark:bg-emerald-950/30 border-t-2 border-emerald-300 dark:border-emerald-800 border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 min-w-[180px] font-bold text-emerald-800 dark:text-emerald-200 border-r border-slate-100 dark:border-slate-800">
                    XẾP LOẠI CHẤT LƯỢNG
                  </td>
                  <td className="px-3 py-3 w-32 text-center font-black text-emerald-800 dark:text-emerald-200 border-r border-slate-100 dark:border-slate-800">
                    {sheet3Summary.isUnder100Percent ? '⚠ Dưới 100%' : 'Đủ 100%'}
                  </td>
                  <td className="px-4 py-3 min-w-[200px] text-center align-middle font-black text-xl text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/50 border-r border-slate-100 dark:border-slate-800">
                    {sheet3Summary.classificationLabel}
                  </td>
                  <td className="px-4 py-3 min-w-[220px] text-center align-middle font-black text-2xl text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/50 border-slate-100 dark:border-slate-800">
                    {sheet3Summary.classification === 'KhongHoanThanh' ? '🔴' : sheet3Summary.classification === 'HoanThanh' ? '🟡' : sheet3Summary.classification === 'Tot' ? '🟢' : '🟣'}
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                      {sheet3Summary.isUnder100Percent && <span>{'Áp dụng Điều 7: <100% = Không hoàn thành'}</span>}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Manager Submission Action Bar */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hoàn Tất Tự Chấm Điểm & Trình Duyệt
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sau khi kiểm tra kết quả tính toán tự động ở 3 Sheet, bấm nút bên phải để lưu hồ sơ và chuyển Trưởng phòng phê duyệt.
                </p>
              </div>
            </div>

            {/* Classification Summary Badge */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border font-semibold text-sm ${
              sheet3Summary.classification === 'KhongHoanThanh' 
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700 dark:text-red-300' 
                : sheet3Summary.classification === 'HoanThanh' 
                  ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 text-yellow-700 dark:text-yellow-300'
                  : sheet3Summary.classification === 'Tot' 
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 text-green-700 dark:text-green-300'
                    : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 text-purple-700 dark:text-purple-300'
            }`}>
              <span>Xếp loại:</span>
              <span className="font-black">{sheet3Summary.classificationLabel}</span>
              <span className="text-[11px]">({sheet3Summary.finalOverallScore}đ)</span>
              {sheet3Summary.isUnder100Percent && (
                <span className="text-red-600 dark:text-red-400 font-bold">{'⚠ Điều 7: <100%'}</span>
              )}
            </div>

            <button
              onClick={handleSaveAndSubmitForApproval}
              className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors w-full md:w-auto"
            >
              Lưu & Gửi Phê Duyệt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
