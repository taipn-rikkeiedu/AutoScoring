import React from 'react';
import { useLmsApiTest } from '~/src/hooks/lms-api-test/useLmsApiTest';

export const LmsApiTestTab: React.FC = () => {
  const {
    sessionId,
    setSessionId,
    refreshToken,
    handleTokenChange,
    isLoading,
    validation,
    response,
    responseTime,
    error,
    viewMode,
    setViewMode,
    hasSiteAccess,
    handleRequestPermission,
    handleValidate,
    handleFetchSubmissions,
    handleResetCircuitBreaker
  } = useLmsApiTest();

  return (
    <div className="flex flex-col flex-1 p-4 gap-3 overflow-y-auto">
      {/* Warning Banner */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <div className="text-[11px] text-amber-800 leading-relaxed">
          <span className="font-bold">Cẩn thận:</span> API server sẽ trả 502 nếu <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">sessionId</code> không tồn tại, có thể làm tê liệt server. Hãy chắc chắn ID đúng trước khi gọi.
        </div>
      </div>

      {/* Site Access Permission Warning */}
      {!hasSiteAccess && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">🔒 Thiếu quyền truy cập Website</span>
          <p className="text-[10px] text-red-600">Cần cấp quyền truy cập để gọi API và giải quyết CORS.</p>
          <button
            onClick={handleRequestPermission}
            className="w-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md py-1.5 px-3 transition-colors shadow-sm"
          >
            🔑 Cấp Quyền Truy Cập
          </button>
        </div>
      )}

      {/* Input Fields */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700">🔗 Tham Số API</span>
        </div>
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Session ID: <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              placeholder="Ví dụ: 12345 (số nguyên dương)"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-500">Refresh Token: <span className="text-red-400">*</span></label>
            <input
              type="password"
              value={refreshToken}
              onChange={(e) => handleTokenChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              placeholder="Bearer token từ LMS"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Validation Result */}
      {validation && (
        <div className={`flex flex-col gap-1 p-2.5 rounded-lg border ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <span className={`text-[11px] font-bold ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
            {validation.valid ? '✅ Validation OK' : `⛔ ${validation.errors.length} lỗi validation:`}
          </span>
          {!validation.valid && (
            <ul className="pl-3 mt-0.5">
              {validation.errors.map((err: string, i: number) => (
                <li key={i} className="text-[10px] text-red-600 list-disc">{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={isLoading}
          className="flex-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-md py-2 px-3 hover:bg-slate-200 transition-colors shadow-sm"
        >
          🔍 Kiểm Tra
        </button>
        <button
          onClick={handleFetchSubmissions}
          disabled={isLoading || !sessionId.trim() || !refreshToken.trim()}
          className="flex-1 text-xs font-bold text-white bg-blue-600 border border-blue-700 rounded-md py-2 px-3 hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
        >
          {isLoading ? "Đang gọi..." : "🚀 Gọi API"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700">❌ Lỗi</span>
            {error.includes('Circuit breaker') && (
              <button onClick={handleResetCircuitBreaker} className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 hover:bg-amber-200 rounded">
                🔄 Reset Circuit Breaker
              </button>
            )}
          </div>
          <pre className="text-[10px] text-red-600 whitespace-pre-wrap break-all leading-relaxed font-mono bg-red-100/50 rounded p-2">{error}</pre>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="flex flex-col gap-0 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm animate-fade-in">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">📦 Response</span>
              <span className="text-[10px] text-slate-400 font-mono">{response.raw.length} chars</span>
            </div>
            <div className="flex items-center gap-2">
              {responseTime !== null && <span className="text-[10px] text-slate-400 font-mono">{responseTime}ms</span>}
              <span className="text-[10px] font-bold py-0.5 px-1.5 rounded-full bg-green-150 text-green-700">{response.status}</span>
            </div>
          </div>

          <div className="flex border-b border-slate-200">
            {['rendered', 'json', 'source'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`flex-1 text-[10px] font-bold py-1.5 capitalize transition-colors ${viewMode === mode ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {mode === 'source' ? 'Raw Source' : mode}
              </button>
            ))}
          </div>

          <div className="max-h-[220px] overflow-y-auto">
            {viewMode === 'rendered' && (
              response.data?.homework ? (
                <div className="flex flex-col gap-3.5 p-3.5 select-text">
                  <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">📖 Session: {response.data.name}</div>
                  {response.data.homework.map((item: any, index: number) => (
                    <div key={item.id || index} className="flex flex-col gap-2 border border-slate-100 rounded-md p-3 bg-slate-50/40">
                      <span className="text-xs font-bold text-slate-800">{index + 1}. {item.title}</span>
                      {item.description && (
                        <div className="text-[11px] text-slate-600 leading-relaxed border-t pt-2" dangerouslySetInnerHTML={{ __html: item.description }} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="p-3 text-[10px] text-slate-600 font-mono">{response.raw}</pre>
              )
            )}

            {viewMode === 'json' && (
              <pre className="p-3 text-[10px] text-slate-700 font-mono">{JSON.stringify(response.data, null, 2)}</pre>
            )}

            {viewMode === 'source' && (
              <pre className="p-3 text-[10px] text-slate-600 font-mono">{response.raw}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
