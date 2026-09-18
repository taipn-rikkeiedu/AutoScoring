import { LearningStatRow } from '~/src/types';

export function parsePercent(text: string): number | null {
  const trimmed = (text || '').trim();
  if (!trimmed.endsWith('%')) return null;
  const value = parseFloat(trimmed.replace('%', '').replace(',', '.'));
  return isNaN(value) ? null : value;
}

export function parseNumeric(text: string): number | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  const value = parseFloat(trimmed.replace(',', '.'));
  return isNaN(value) ? null : value;
}

export function parseNameEmail(lines: string[]): { name: string; email: string } {
  const cleaned = (lines || []).map(l => (l || '').trim()).filter(Boolean);
  return {
    name: cleaned[0] || '',
    email: cleaned[1] || ''
  };
}

interface ColumnDef {
  key: string;
  headerMatch: string[];
  headerExclude?: string[];
}

/**
 * Danh sách cột nguồn duy nhất dùng để khớp header trên trang LMS.
 * Thêm/bớt cột chỉ cần sửa ở đây và trong buildRowFromCells, không đụng scraper.
 */
export const COLUMN_DEFS: ColumnDef[] = [
  { key: 'no', headerMatch: ['no.', 'stt'] },
  { key: 'name', headerMatch: ['tên'] },
  { key: 'absentRatio', headerMatch: ['tỷ lệ nghỉ học'] },
  { key: 'missingHomeworkRatio', headerMatch: ['tỷ lệ thiếu bài tập'] },
  { key: 'elearningStatus', headerMatch: ['e-learning'] },
  { key: 'lateAssignmentsText', headerMatch: ['số bài chậm'] },
  { key: 'hackathonTN', headerMatch: ['hackathon - tn', 'hackathon-tn'] },
  { key: 'hackathonTL', headerMatch: ['hackathon - tl', 'hackathon-tl'] },
  { key: 'autoRPoints', headerMatch: ['auto r-points'] },
  { key: 'rPoints', headerMatch: ['r-points'], headerExclude: ['auto'] },
  { key: 'scoreLockStatus', headerMatch: ['trạng thái chốt điểm'] },
  { key: 'projectEligibility', headerMatch: ['điều kiện tham gia project'] }
];

/**
 * Nhận vào text thô đã được scraper khớp đúng theo key cột (chưa parse kiểu dữ liệu),
 * trả về 1 LearningStatRow hoàn chỉnh. Không biết gì về DOM/selector.
 */
export function buildRowFromCells(cells: Record<string, string | string[]>): LearningStatRow {
  const { name, email } = parseNameEmail(
    Array.isArray(cells.name) ? cells.name : [String(cells.name || '')]
  );

  const asText = (key: string): string => {
    const value = cells[key];
    return Array.isArray(value) ? (value[0] || '') : (value || '') as string;
  };

  return {
    no: parseNumeric(asText('no')) ?? 0,
    studentName: name,
    studentEmail: email,
    absentRatio: parsePercent(asText('absentRatio')),
    missingHomeworkRatio: parsePercent(asText('missingHomeworkRatio')),
    elearningStatus: asText('elearningStatus'),
    lateAssignmentsText: asText('lateAssignmentsText'),
    hackathonTN: parseNumeric(asText('hackathonTN')),
    hackathonTL: parseNumeric(asText('hackathonTL')),
    rPoints: asText('rPoints'),
    autoRPoints: parseNumeric(asText('autoRPoints')),
    scoreLockStatus: asText('scoreLockStatus'),
    projectEligibility: asText('projectEligibility')
  };
}
