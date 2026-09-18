import React, { useState } from 'react';
import { ASTMetrics } from '~/src/services/codeAnalysis';

interface AstMetricsPanelProps {
  language?: string;
  metrics?: ASTMetrics;
}

function rankBadgeClass(rank: string): string {
  const letter = rank.trim().charAt(0);
  if (letter === 'A') return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (letter === 'B') return "bg-sky-50 text-sky-700 border-sky-200";
  if (letter === 'C') return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export const AstMetricsPanel: React.FC<AstMetricsPanelProps> = ({ language, metrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!metrics) return null;

  return (
    <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded border border-slate-150">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wide">
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>📊 Độ phức tạp mã nguồn{language ? ` (${language.toUpperCase()})` : ''}</span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${rankBadgeClass(metrics.complexityRank)}`}>
          CC {metrics.cyclomaticComplexity} · {metrics.complexityRank.charAt(0)}
        </span>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] font-mono text-slate-600 pl-4 pt-1">
          <span>Tổng dòng: <b className="text-slate-800">{metrics.totalLines}</b></span>
          <span>Dòng code: <b className="text-slate-800">{metrics.codeLines}</b></span>
          <span>Dòng comment: <b className="text-slate-800">{metrics.commentLines}</b></span>
          <span>Dòng trắng: <b className="text-slate-800">{metrics.blankLines}</b></span>
          <span>Số hàm: <b className="text-slate-800">{metrics.totalFunctions}</b></span>
          <span>Số class: <b className="text-slate-800">{metrics.totalClasses}</b></span>
          {metrics.detectedPatterns.length > 0 && (
            <span className="col-span-2">
              Pattern: <b className="text-slate-800">{metrics.detectedPatterns.join(', ')}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
