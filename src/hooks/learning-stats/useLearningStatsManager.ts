import { useState, useEffect, useMemo } from 'react';
import { useToast } from '~/src/core/ToastContext';
import { getAllSnapshots, saveSnapshot, deleteSnapshot, makeSnapshotKey } from '~/src/core/learningStatsStorage';
import { LearningStatsSnapshot, LearningStatRow } from '~/src/types';
import { logger } from '~/src/core/logger';

export type SortColumn = keyof LearningStatRow;
export type SortDirection = 'asc' | 'desc';

export function useLearningStatsManager() {
  const { showToast } = useToast();

  const [snapshots, setSnapshots] = useState<Record<string, LearningStatsSnapshot>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState("🔍 Mở trang Thống kê học tập trên LMS và bấm \"Quét chỉ số\".");
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    getAllSnapshots().then(all => {
      setSnapshots(all);
      const keys = Object.keys(all);
      if (keys.length > 0) {
        setActiveKey(keys[keys.length - 1]);
        setStatusText(`📋 Đã tải ${keys.length} lượt quét đã lưu.`);
        setStatusType('success');
      }
    });
  }, []);

  const handleScan = () => {
    setIsScanning(true);
    setStatusText("🔍 Đang quét chỉ số học tập...");
    setStatusType('info');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.url?.includes('/learning-statistics')) {
        setIsScanning(false);
        setStatusText("💡 Hãy mở trang Thống kê học tập (learning-statistics) trên LMS để quét.");
        setStatusType('warning');
        logger.warn("LEARNING_STATS", "Quét thất bại: sai trang web LMS.");
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id! },
        files: ['/learningStatsScraper.js']
      }, (results) => {
        setIsScanning(false);
        if (chrome.runtime.lastError) {
          setStatusText("❌ Không thể quét: " + chrome.runtime.lastError.message);
          setStatusType('error');
          logger.error("LEARNING_STATS", "Lỗi scripting khi quét trang.", chrome.runtime.lastError.message);
          return;
        }

        const scraped = results && results[0]?.result as LearningStatsSnapshot | undefined;
        if (!scraped || scraped.rows.length === 0) {
          setStatusText("❓ Không tìm thấy dữ liệu bảng chỉ số trên trang.");
          setStatusType('warning');
          logger.warn("LEARNING_STATS", "Quét hoàn tất nhưng không có dữ liệu.");
          return;
        }

        const snapshot: LearningStatsSnapshot = { ...scraped, scannedAt: new Date().toISOString() };
        saveSnapshot(snapshot).then((key) => {
          setSnapshots(prev => ({ ...prev, [key]: snapshot }));
          setActiveKey(key);
          setStatusText(`✅ Đã quét ${snapshot.rows.length} sinh viên (${snapshot.className} - ${snapshot.subjectName}).`);
          setStatusType('success');
          logger.success("LEARNING_STATS", `Quét thành công lớp "${snapshot.className}" môn "${snapshot.subjectName}": ${snapshot.rows.length} sinh viên.`);

          if (snapshot.missingColumns.length > 0) {
            showToast(`LMS đã đổi cấu trúc cột: ${snapshot.missingColumns.join(', ')}. Dữ liệu các cột này có thể thiếu.`, "warning");
          }
        });
      });
    });
  };

  const handleDeleteSnapshot = (key: string) => {
    if (!window.confirm("Xoá dữ liệu đã quét cho lớp/môn này?")) return;
    deleteSnapshot(key).then(() => {
      setSnapshots(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setActiveKey(prev => (prev === key ? null : prev));
      showToast("Đã xoá dữ liệu.", "success");
    });
  };

  const handleSwitchSnapshot = (key: string) => {
    setActiveKey(key);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const activeSnapshot = activeKey ? snapshots[activeKey] : null;

  const displayedRows = useMemo(() => {
    if (!activeSnapshot) return [];

    let rows = activeSnapshot.rows;
    const search = filterText.trim().toLowerCase();
    if (search) {
      rows = rows.filter(r =>
        r.studentName.toLowerCase().includes(search) ||
        r.studentEmail.toLowerCase().includes(search)
      );
    }

    if (sortColumn) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortColumn];
        const vb = b[sortColumn];
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDirection === 'asc' ? va - vb : vb - va;
        }
        return sortDirection === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    return rows;
  }, [activeSnapshot, filterText, sortColumn, sortDirection]);

  return {
    snapshots,
    activeKey,
    activeSnapshot,
    displayedRows,
    isScanning,
    statusText,
    statusType,
    sortColumn,
    sortDirection,
    filterText,
    setFilterText,
    handleScan,
    handleDeleteSnapshot,
    handleSwitchSnapshot,
    handleSort,
    makeSnapshotKey
  };
}
