import React from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useSingleGrader } from '~/src/hooks/single-grader/useSingleGrader';

export const SingleGraderTab: React.FC = () => {
  const {
    activeStudent,
    repoUrl,
    setRepoUrl,
    selectedChapter,
    setSelectedChapter,
    selectedSession,
    setSelectedSession,
    selectedAssignment,
    setSelectedAssignment,
    detectedSubIndex,
    isGrading,
    statusMessage,
    results,
    isFileTreeExpanded,
    setIsFileTreeExpanded,
    detectedSubmissions,
    chapters,
    sessions,
    assignments,
    aiStatus,
    handleDetectedSubmissionChange,
    handleGradeSingle,
    handleCopyReport
  } = useSingleGrader();

  const [isCopied, setIsCopied] = React.useState(false);

  const onCopy = () => {
    handleCopyReport();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const parsedMarkdown = results?.report ? DOMPurify.sanitize(marked.parse(results.report) as string) : '';
  const scoreBadgeClass = results && parseFloat(results.score) >= 80 ? "bg-gradient-to-br from-green-600 to-green-800 text-white" : results && parseFloat(results.score) >= 50 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" : "bg-gradient-to-br from-red-600 to-red-800 text-white";

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
      {activeStudent && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 border-l-4 border-l-green-500 rounded text-xs text-green-800 font-semibold select-none">
          👤 Đang chấm cho: <span className="font-extrabold text-green-900">{activeStudent.studentName} ({activeStudent.studentId})</span>
        </div>
      )}

      {detectedSubmissions.length > 0 && (
        <div className="flex flex-col gap-1 select-none">
          <label className="text-[11px] font-bold text-slate-500">Bài nộp phát hiện trên trang:</label>
          <select
            value={detectedSubIndex}
            onChange={handleDetectedSubmissionChange}
            className="w-full text-xs font-semibold text-slate-700 bg-green-50/50 border border-blue-200 rounded-md py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          >
            <option value="">-- Chọn bài nộp phát hiện trên trang --</option>
            {detectedSubmissions.map((sub, idx) => (
              <option key={idx} value={idx}>{sub.exerciseName} ({sub.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")})</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-slate-500">GitHub Repository URL:</label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Chọn Chương:</label>
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none shadow-sm"
          >
            <option value="">-- Chọn Chương --</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Chọn Session:</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              disabled={!selectedChapter}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none disabled:opacity-60"
            >
              <option value="">-- Chọn --</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Chọn Bài tập:</label>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              disabled={!selectedSession}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2 focus:outline-none disabled:opacity-60"
            >
              <option value="">-- Chọn --</option>
              {assignments.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleGradeSingle}
        disabled={isGrading || aiStatus !== "success"}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md text-xs font-bold shadow-md hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 cursor-pointer"
      >
        {isGrading ? "⏳ Đang chấm..." : "🚀 Bắt đầu Chấm điểm"}
      </button>

      {isGrading && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 border border-blue-200 rounded-lg bg-blue-50/50 shadow-sm select-none">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-[11px] font-bold text-blue-700 animate-pulse">{statusMessage}</span>
          </div>

          {/* Premium Skeleton Card Loader */}
          <div className="flex flex-col gap-3 border border-slate-200 rounded-md p-3.5 bg-white shadow-sm animate-pulse select-none">
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <div className="h-3 w-28 bg-slate-200 rounded"></div>
              <div className="h-4 w-16 bg-slate-200 rounded-full"></div>
            </div>
            <div className="h-6 w-full bg-slate-100 rounded-md border border-slate-150"></div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="h-3 w-3/4 bg-slate-200 rounded"></div>
              <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
              <div className="h-3 w-1/2 bg-slate-200 rounded"></div>
              <div className="h-3 w-2/3 bg-slate-100 rounded"></div>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="flex flex-col gap-3 border border-slate-200 rounded-md p-3.5 bg-white shadow-sm select-text">
          <div className="flex justify-between items-center select-none pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Kết Quả Đánh Giá</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                className={`text-[10px] font-bold py-1 px-2.5 rounded transition-all duration-150 border active:scale-95 cursor-pointer ${
                  isCopied
                    ? "bg-green-50 border-green-500 text-green-700 font-bold"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
                }`}
              >
                {isCopied ? "✓ Đã sao chép" : "📋 Sao chép"}
              </button>
              <span className={`text-[10px] font-bold py-1 px-2.5 rounded-full ${scoreBadgeClass}`}>{results.score} / 100</span>
            </div>
          </div>

          {results.fileList && results.fileList.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded border border-slate-150">
              <div 
                onClick={() => setIsFileTreeExpanded(!isFileTreeExpanded)}
                className="flex items-center gap-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide cursor-pointer select-none"
              >
                <span>{isFileTreeExpanded ? '▼' : '▶'}</span>
                <span>📂 Xem tệp đã chấm ({results.fileList.length} file)</span>
              </div>
              {isFileTreeExpanded && (
                <ul className="flex flex-col max-h-[140px] overflow-y-auto pl-4 list-none text-slate-500 text-[10.5px] font-medium gap-1 font-mono">
                  {results.fileList.map((file, idx) => <li key={idx}>📄 {file}</li>)}
                </ul>
              )}
            </div>
          )}

          <div 
            className="prose prose-sm max-w-none text-slate-750 leading-relaxed text-xs [&_h1]:text-xs [&_h1]:font-bold [&_h2]:text-[11px] [&_h2]:font-bold [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:text-slate-900"
            dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
          />
        </div>
      )}
    </div>
  );
};
