import { useState, useCallback } from 'react';
import { Student } from '~/src/types';
import { exportToExcel } from '~/src/core/excelExporter';

export type StatusFilter = 'all' | 'completed' | 'notCompleted' | 'pending' | 'notSubmitted';

export interface FieldConfig {
  key: string;
  label: string;
  default: boolean;
}

export const FIELDS: FieldConfig[] = [
  { key: 'studentId',      label: 'Mã sinh viên',       default: true  },
  { key: 'studentName',    label: 'Họ và Tên',           default: true  },
  { key: 'lmsStatus',      label: 'Trạng thái LMS',      default: true  },
  { key: 'submittedCount', label: 'Số bài đã nộp',       default: true  },
  { key: 'completedCount', label: 'Số bài hoàn thành',   default: true  },
  { key: 'aiScore',        label: 'Điểm AI',             default: false },
  { key: 'githubUrl',      label: 'GitHub URL',          default: false },
  { key: 'submissionUrl',  label: 'URL bài nộp LMS',     default: false },
];

export const COLUMN_LABELS: Record<string, string> = {
  studentId:      'Mã sinh viên',
  studentName:    'Họ và Tên',
  lmsStatus:      'Trạng thái LMS',
  submittedCount: 'Số bài đã nộp',
  completedCount: 'Số bài hoàn thành',
  aiScore:        'Điểm AI',
  githubUrl:      'GitHub URL',
  submissionUrl:  'URL bài nộp LMS',
};

const COL_WIDTHS: Record<string, number> = {
  studentId:      14,
  studentName:    26,
  lmsStatus:      20,
  submittedCount: 16,
  completedCount: 18,
  aiScore:        10,
  githubUrl:      40,
  submissionUrl:  40,
};

export function getStudentStatus(st: Student) {
  const s = st.lmsStatus ? st.lmsStatus.trim().toUpperCase() : '';
  const isCompleted    = s.includes('HOÀN THÀNH') && !s.includes('CHƯA');
  const isPending      = s.includes('CHỜ KIỂM TRA') || s.includes('ĐANG CHỜ') || s.includes('KIỂM TRA');
  const isNotCompleted = !isCompleted && !isPending;
  return { isCompleted, isPending, isNotCompleted };
}

export function getLatestScore(st: Student): string {
  const directScore = (st as any).score;
  if (directScore !== null && directScore !== undefined) return String(directScore);
  if (st.submissions) {
    let latest: any = null;
    for (const key in st.submissions) {
      const sub = st.submissions[key];
      if (sub?.score !== undefined && sub?.score !== null) {
        if (!latest || new Date(sub.gradedAt || 0) > new Date(latest.gradedAt || 0)) latest = sub;
      }
    }
    if (latest) return String(latest.score);
  }
  return '';
}

export function filterStudents(students: Student[], filter: StatusFilter): Student[] {
  if (filter === 'all') return students;
  return students.filter(st => {
    if (filter === 'notSubmitted') return (st.submittedCount ?? 0) === 0;
    const { isCompleted, isPending, isNotCompleted } = getStudentStatus(st);
    if (filter === 'completed')    return isCompleted;
    if (filter === 'pending')      return isPending;
    if (filter === 'notCompleted') return isNotCompleted;
    return true;
  });
}

export function useExcelExporter(students: Student[], onExport: (msg: string, type: 'success' | 'error' | 'warning') => void, onClose: () => void) {
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FIELDS.map(f => [f.key, f.default]))
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isExporting, setIsExporting] = useState(false);

  const toggleField = useCallback((key: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectAll  = () => setSelectedFields(Object.fromEntries(FIELDS.map(f => [f.key, true])));
  const selectNone = () => setSelectedFields(Object.fromEntries(FIELDS.map(f => [f.key, false])));

  const filteredStudents = filterStudents(students, statusFilter);
  const activeFieldCount  = FIELDS.filter(f => selectedFields[f.key]).length;

  const countFor = (filter: StatusFilter) =>
    filter === 'all' ? students.length : filterStudents(students, filter).length;

  const handleCopyToClipboard = async () => {
    if (activeFieldCount === 0) {
      onExport('Vui lòng chọn ít nhất một trường để sao chép.', 'warning');
      return;
    }
    if (filteredStudents.length === 0) {
      onExport('Không có học viên nào để sao chép.', 'warning');
      return;
    }

    const activeFields = FIELDS.filter(f => selectedFields[f.key]);
    const headers = activeFields.map(f => COLUMN_LABELS[f.key]).join('\t');
    const rows = filteredStudents.map(st => {
      return activeFields.map(f => {
        switch (f.key) {
          case 'studentId':      return st.studentId || '';
          case 'studentName':    return st.studentName || '';
          case 'lmsStatus':      return st.lmsStatus || '';
          case 'submittedCount': return String(st.submittedCount ?? 0);
          case 'completedCount': return String(st.completedCount ?? 0);
          case 'aiScore':        return getLatestScore(st);
          case 'githubUrl':      return (st as any).githubUrl || '';
          case 'submissionUrl':  return st.submissionUrl || '';
          default: return '';
        }
      }).join('\t');
    }).join('\n');

    try {
      await navigator.clipboard.writeText(`${headers}\n${rows}`);
      onExport(`📋 Đã sao chép ${filteredStudents.length} dòng vào Clipboard!`, 'success');
    } catch (err: any) {
      onExport('Không thể sao chép: ' + err.message, 'error');
    }
  };

  const handleExportExcel = async () => {
    if (activeFieldCount === 0) {
      onExport('Vui lòng chọn ít nhất một trường để xuất.', 'warning');
      return;
    }
    if (filteredStudents.length === 0) {
      onExport('Không có học viên nào khớp với bộ lọc để xuất.', 'warning');
      return;
    }

    setIsExporting(true);
    const activeFields = FIELDS.filter(f => selectedFields[f.key]);

    const data = filteredStudents.map((st, index) => {
      const row: Record<string, any> = { 'STT': index + 1 };
      activeFields.forEach(f => {
        let val: any = '';
        if (f.key === 'studentId')      val = st.studentId;
        else if (f.key === 'studentName')    val = st.studentName;
        else if (f.key === 'lmsStatus')      val = st.lmsStatus;
        else if (f.key === 'submittedCount') val = st.submittedCount ?? 0;
        else if (f.key === 'completedCount') val = st.completedCount ?? 0;
        else if (f.key === 'aiScore')        val = getLatestScore(st) ? Number(getLatestScore(st)) : '';
        else if (f.key === 'githubUrl')      val = (st as any).githubUrl || '';
        else if (f.key === 'submissionUrl')  val = st.submissionUrl || '';
        row[COLUMN_LABELS[f.key]] = val;
      });
      return row;
    });

    const columnWidths = [{ wch: 8 }, ...activeFields.map(f => ({ wch: COL_WIDTHS[f.key] || 15 }))];
    const fileName = `Export_Class_${new Date().toISOString().slice(0,10)}.xlsx`;

    try {
      await exportToExcel(data, "Danh_sach", fileName, columnWidths);
      onExport('🎉 Xuất tệp Excel thành công!', 'success');
      onClose();
    } catch (err: any) {
      onExport('Lỗi xuất Excel: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    selectedFields,
    statusFilter,
    setStatusFilter,
    isExporting,
    toggleField,
    selectAll,
    selectNone,
    filteredStudents,
    activeFieldCount,
    countFor,
    handleCopyToClipboard,
    handleExportExcel
  };
}
