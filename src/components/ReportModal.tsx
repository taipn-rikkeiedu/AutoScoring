import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useToast } from '~/src/core/ToastContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  score: string | null;
  report: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, title, score, report }) => {
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isOpen]);

  if (!isOpen) return null;

  // Parse markdown safely
  const parsedMarkdown = report ? DOMPurify.sanitize(marked.parse(report) as string) : '';
  const numericScore = score ? parseFloat(score) : NaN;

  // Determine score badge color
  let scoreBadgeClass = "bg-gradient-to-br from-red-600 to-red-800 text-white";
  if (!isNaN(numericScore)) {
    if (numericScore >= 80) {
      scoreBadgeClass = "bg-gradient-to-br from-green-600 to-green-800 text-white";
    } else if (numericScore >= 50) {
      scoreBadgeClass = "bg-gradient-to-br from-amber-600 to-amber-800 text-white";
    }
  }

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report).then(() => {
      setIsCopied(true);
      showToast("Đã sao chép báo cáo vào bộ nhớ tạm!", "success");
      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    }).catch(err => {
      console.error(err);
      showToast("Lỗi sao chép báo cáo.", "error");
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[2px] animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col pr-6">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Báo cáo chấm bài</span>
            <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            &times;
          </button>
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded transition-all duration-150 border active:scale-95 ${
              isCopied
                ? "bg-green-50 border-green-500 text-green-700"
                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
            }`}
          >
            {isCopied ? "✓ Đã sao chép" : "📋 Sao chép báo cáo"}
          </button>

          <span className={`text-[11px] font-bold py-1 px-2.5 rounded-full shadow-sm ${scoreBadgeClass}`}>
            {score !== null ? `${score} / 100` : '-- / 100'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
          {report ? (
            <div
              className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs 
                prose-headings:font-bold prose-headings:text-slate-800 prose-headings:my-2
                prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
                prose-strong:text-slate-800"
              dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
            />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Không có dữ liệu báo cáo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
