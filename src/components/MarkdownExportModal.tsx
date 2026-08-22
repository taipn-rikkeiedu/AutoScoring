import React, { useState } from 'react';
import {
  formatExerciseToMarkdown,
  exportSingleExerciseToMd,
  exportSessionToZip,
  exportLibraryToZip,
  copyMarkdownToClipboard,
  downloadMarkdownFile,
  sanitizeFileName,
  ExerciseLibrary
} from '~/src/core/markdownExporter';
import { DocumentTextIcon, DownloadIcon, CopyIcon, CheckIcon, ArchiveBoxIcon } from '~/src/components/Icons';

type ExportScope = 'single' | 'session' | 'all';

interface Props {
  selectedChapter: string;
  selectedSession: string;
  selectedAssignment: string;
  promptText: string;
  criteriaText: string;
  exerciseTemplates: ExerciseLibrary;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const MarkdownExportModal: React.FC<Props> = ({
  selectedChapter,
  selectedSession,
  selectedAssignment,
  promptText,
  criteriaText,
  exerciseTemplates,
  onClose,
  onToast
}) => {
  // Determine default scope: 'single' if exercise is selected, otherwise 'all'
  const [scope, setScope] = useState<ExportScope>(
    selectedChapter && selectedSession && selectedAssignment ? 'single' : 'all'
  );
  const [includeRubric, setIncludeRubric] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'preview'>('options');

  // Compute stats
  const totalChapters = Object.keys(exerciseTemplates).length;
  let totalAllExercises = 0;
  Object.values(exerciseTemplates).forEach(sessions => {
    Object.values(sessions).forEach(assigns => {
      totalAllExercises += Object.keys(assigns).length;
    });
  });

  const sessionExercises = (selectedChapter && selectedSession && exerciseTemplates[selectedChapter]?.[selectedSession]) || {};
  const sessionExerciseCount = Object.keys(sessionExercises).length;

  // Single markdown preview
  const currentMarkdown = formatExerciseToMarkdown({
    chapter: selectedChapter || 'Chưa chọn',
    session: selectedSession || 'Chưa chọn',
    assignmentName: selectedAssignment || 'Bài tập mẫu',
    assignmentText: promptText || '',
    criteriaText: includeRubric ? criteriaText : '',
    includeMetadata
  });

  const handleCopy = async () => {
    if (scope === 'single') {
      const ok = await copyMarkdownToClipboard(currentMarkdown);
      if (ok) {
        setCopied(true);
        onToast('Đã sao chép nội dung Markdown vào bộ nhớ tạm!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } else {
        onToast('Không thể sao chép vào bộ nhớ tạm.', 'error');
      }
    } else if (scope === 'session') {
      // Build merged markdown for session
      const names = Object.keys(sessionExercises).sort();
      const merged = names.map((name) => {
        const ex = sessionExercises[name];
        return formatExerciseToMarkdown({
          chapter: selectedChapter,
          session: selectedSession,
          assignmentName: name,
          assignmentText: ex.assignment || '',
          criteriaText: includeRubric ? (ex.criteria || '') : '',
          includeMetadata
        });
      }).join('\n\n---\n\n');

      const ok = await copyMarkdownToClipboard(merged);
      if (ok) {
        setCopied(true);
        onToast(`Đã sao chép toàn bộ ${names.length} bài tập trong Session!`, 'success');
        setTimeout(() => setCopied(false), 2000);
      } else {
        onToast('Không thể sao chép vào bộ nhớ tạm.', 'error');
      }
    } else {
      onToast('Tùy chọn Toàn bộ Kho đề bài chỉ hỗ trợ tải file nén .zip.', 'warning');
    }
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);

      if (scope === 'single') {
        if (!selectedAssignment) {
          onToast('Vui lòng chọn bài tập trước khi xuất.', 'warning');
          return;
        }
        const safeChapter = sanitizeFileName(selectedChapter, 'Course');
        const safeSession = sanitizeFileName(selectedSession, 'Session');
        const safeName = sanitizeFileName(selectedAssignment, 'Exercise');
        const fileName = `${safeChapter}_${safeSession}_${safeName}.md`;

        downloadMarkdownFile(currentMarkdown, fileName);
        onToast(`Đã xuất bài tập '${selectedAssignment}' sang file .md!`, 'success');
        onClose();
      } else if (scope === 'session') {
        if (!selectedChapter || !selectedSession) {
          onToast('Vui lòng chọn Khóa học và Session cần xuất.', 'warning');
          return;
        }
        if (sessionExerciseCount === 0) {
          onToast('Session này không có bài tập nào để xuất.', 'warning');
          return;
        }
        await exportSessionToZip(selectedChapter, selectedSession, sessionExercises);
        onToast(`Đã xuất ${sessionExerciseCount} bài tập trong Session sang file .zip!`, 'success');
        onClose();
      } else if (scope === 'all') {
        if (totalAllExercises === 0) {
          onToast('Kho đề bài hiện đang trống.', 'warning');
          return;
        }
        const res = await exportLibraryToZip(exerciseTemplates);
        onToast(`Đã xuất toàn bộ Kho đề bài (${res.totalExercises} bài tập) thành công!`, 'success');
        onClose();
      }
    } catch (err: any) {
      console.error('Lỗi xuất tệp:', err);
      onToast(`Lỗi xuất tệp: ${err.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <DocumentTextIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-bold leading-tight">Xuất Đề Bài Sang Markdown (.md)</h2>
              <p className="text-[10px] text-blue-100 font-medium">Lưu trữ trên máy tính cá nhân hoặc dán vào Notion / Obsidian</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors text-base leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Tab navigation for Options / Preview */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('options')}
            className={`pb-2 px-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'options'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Tùy chọn xuất
          </button>
          {scope === 'single' && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-2 px-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Xem trước Markdown
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          {activeTab === 'options' ? (
            <>
              {/* Scope Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                  Phạm vi xuất đề bài:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Option 1: Single Exercise */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all ${
                      scope === 'single'
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    } ${!selectedAssignment ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={scope === 'single'}
                      onChange={() => setScope('single')}
                      disabled={!selectedAssignment}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">1. Đề bài đang chọn</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                          File .md
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                        {selectedAssignment ? selectedAssignment : '(Chưa chọn bài tập)'}
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Current Session */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all ${
                      scope === 'session'
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    } ${!selectedSession ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={scope === 'session'}
                      onChange={() => setScope('session')}
                      disabled={!selectedSession}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">2. Toàn bộ Session này</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                          File .zip ({sessionExerciseCount} bài)
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                        {selectedSession ? `${selectedChapter} > ${selectedSession}` : '(Chưa chọn Session)'}
                      </p>
                    </div>
                  </label>

                  {/* Option 3: Full Library */}
                  <label
                    className={`flex items-start gap-2.5 p-2.5 border rounded-lg cursor-pointer transition-all ${
                      scope === 'all'
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">3. Toàn bộ Kho đề bài</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                          Gói .zip ({totalAllExercises} bài)
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        Bao gồm {totalChapters} khóa học, tạo cấu trúc thư mục và README mục lục.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Formatting Options */}
              <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                  Cài đặt định dạng:
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeRubric}
                      onChange={(e) => setIncludeRubric(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Kèm tiêu chí chấm điểm (Rubric / Criteria)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Kèm thông tin Khóa học & Ngày xuất (Metadata Header)</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            /* Preview Area */
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">
                  Xem trước nội dung Markdown:
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentMarkdown.length} ký tự
                </span>
              </div>
              <pre className="text-[11px] font-mono p-3 bg-slate-900 text-slate-100 rounded-lg max-h-[220px] overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
                {currentMarkdown}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
          {scope !== 'all' && (
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-98"
          >
            {isExporting ? (
              <span>Đang đóng gói...</span>
            ) : (
              <>
                {scope === 'single' ? (
                  <DownloadIcon className="w-3.5 h-3.5 text-white" />
                ) : (
                  <ArchiveBoxIcon className="w-3.5 h-3.5 text-white" />
                )}
                <span>
                  {scope === 'single'
                    ? 'Tải file .md về máy'
                    : scope === 'session'
                    ? `Tải Session .zip (${sessionExerciseCount} bài)`
                    : `Tải Kho đề bài .zip (${totalAllExercises} bài)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
