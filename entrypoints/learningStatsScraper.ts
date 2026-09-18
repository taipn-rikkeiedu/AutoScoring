import { COLUMN_DEFS, buildRowFromCells, parsePercent } from '~/src/core/learningStatsParser';

function normalizeHeaderText(text: string): string {
  return (text || '').trim().toLowerCase();
}

function matchColumnIndex(headers: string[], headerMatch: string[], headerExclude: string[] = []): number {
  return headers.findIndex(h =>
    headerMatch.some(m => h.includes(m)) && !headerExclude.some(ex => h.includes(ex))
  );
}

export default defineUnlistedScript(() => {
  const table = document.querySelector('table.table');
  if (!table) {
    return { className: '', subjectName: '', missingColumns: [], summary: null, rows: [] };
  }

  const headerCells = Array.from(table.querySelectorAll('thead th'));
  const headers = headerCells.map(th => normalizeHeaderText(th.textContent || ''));

  const columnIndexByKey: Record<string, number> = {};
  const missingColumns: string[] = [];
  COLUMN_DEFS.forEach(col => {
    const idx = matchColumnIndex(headers, col.headerMatch, col.headerExclude);
    if (idx === -1) {
      missingColumns.push(col.key);
    } else {
      columnIndexByKey[col.key] = idx;
    }
  });

  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
    const cells = Array.from(tr.querySelectorAll('td'));
    const rawCells: Record<string, string | string[]> = {};

    Object.entries(columnIndexByKey).forEach(([key, idx]) => {
      const cell = cells[idx];
      if (!cell) return;

      if (key === 'name') {
        const paragraphs = Array.from(cell.querySelectorAll('p')).map(p => p.textContent || '');
        rawCells[key] = paragraphs.length > 0 ? paragraphs : [(cell.textContent || '')];
      } else if (key === 'hackathonTN' || key === 'hackathonTL') {
        // Mỗi cell Hackathon chứa 2 div.test-container (2 lần thi), lấy điểm cao nhất (.test-point.high).
        const highPoint = cell.querySelector('.test-point.high');
        rawCells[key] = (highPoint?.textContent || '').trim();
      } else {
        rawCells[key] = (cell.textContent || '').trim();
      }
    });

    return buildRowFromCells(rawCells);
  }).filter(row => row.studentName);

  // Tên lớp nằm ở phần tử `.header` đầu tiên trong .container-lg (khác với `.header` thứ 2 chứa dropdown môn học).
  const classNameEl = document.querySelector('.container-lg .header');
  const className = classNameEl?.textContent?.trim() || '';

  const subjectSelect = document.querySelector('select.form-select') as HTMLSelectElement | null;
  const subjectName = subjectSelect?.options[subjectSelect.selectedIndex]?.textContent?.trim() || '';

  // 3 thẻ tóm tắt trên đầu trang: tỷ lệ nghỉ >10%, vi phạm bài tập >10%, vi phạm không chuẩn bị bài.
  const summaryCards = Array.from(document.querySelectorAll('div')).filter(div => {
    const text = div.textContent || '';
    return text.includes('Tỷ lệ sinh viên nghỉ trên 10%') ||
      text.includes('Tỷ lệ sinh viên vi phạm bài tập trên 10%') ||
      text.includes('Tỷ lệ sinh viên vi phạm không chuẩn bị bài');
  });

  const readSummaryCard = (labelText: string): { ratio: number | null; text: string } => {
    const card = summaryCards.find(div => (div.textContent || '').includes(labelText) && div.children.length >= 2);
    if (!card) return { ratio: null, text: '' };
    const valueEl = Array.from(card.children).find(child => (child.textContent || '').trim().endsWith('%'));
    const text = valueEl?.textContent?.trim() || '';
    return { ratio: parsePercent(text), text };
  };

  const absent = readSummaryCard('Tỷ lệ sinh viên nghỉ trên 10%');
  const homeworkViolation = readSummaryCard('Tỷ lệ sinh viên vi phạm bài tập trên 10%');
  const unpreparedViolation = readSummaryCard('Tỷ lệ sinh viên vi phạm không chuẩn bị bài');

  return {
    className,
    subjectName,
    missingColumns,
    summary: {
      absentOverTenPercentRatio: absent.ratio,
      absentOverTenPercentText: absent.text,
      homeworkViolationRatio: homeworkViolation.ratio,
      homeworkViolationText: homeworkViolation.text,
      unpreparedViolationRatio: unpreparedViolation.ratio,
      unpreparedViolationText: unpreparedViolation.text
    },
    rows
  };
});
