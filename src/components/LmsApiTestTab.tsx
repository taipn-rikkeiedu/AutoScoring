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
    <div className="flex flex-col flex-1 p-3.5 gap-3 overflow-y-auto">
      {/* Warning Banner */}
      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
        <span className="font-semibold">Lưu ý:</span> Server có thể trả lỗi 502 nếu <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">sessionId</code> không tồn tại. Hãy kiểm tra chính xác ID trước khi gọi request.
      </div>

      {/* Site Access Permission Warning */}
      {!hasSiteAccess && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
          <span className="text-xs font-semibold text-rose-700">
            Thiếu quyền truy cập Website LMS
          </span>
          <p className="text-[10.5px] text-rose-600">Cần cấp quyền truy cập để gọi API và giải quyết CORS request.</p>
          <button
            onClick={handleRequestPermission}
            className="w-full text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md py-1.5 px-3 transition-colors cursor-pointer"
          >
            Cấp quyền truy cập
          </button>
        </div>
      )}

      {/* Input Fields Card */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-800">
            Tham số Endpoint API
          </span>
        </div>
        <div className="p-3.5 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-medium text-slate-500">
              Session ID: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ví dụ: 12345"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-medium text-slate-500">
              Refresh Token / Bearer Token: <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={refreshToken}
              onChange={(e) => handleTokenChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
              placeholder="Bearer token từ LMS"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Validation Result */}
      {validation && (
        <div className={`flex flex-col gap-1 p-2.5 rounded-lg border ${validation.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <span className={`text-[11px] font-semibold ${validation.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
            {validation.valid ? 'Validation hợp lệ - Sẵn sàng gửi request' : `${validation.errors.length} lỗi validation:`}
          </span>
          {!validation.valid && (
            <ul className="pl-3 mt-0.5">
              {validation.errors.map((err: string, i: number) => (
                <li key={i} className="text-[10px] text-rose-600 list-disc">{err}</li>
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
          className="flex-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md py-1.5 px-3 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Kiểm tra tham số
        </button>
        <button
          onClick={handleFetchSubmissions}
          disabled={isLoading || !sessionId.trim() || !refreshToken.trim()}
          className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md py-1.5 px-3 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? "Đang gọi..." : "Gửi request"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700">Lỗi API</span>
            {error.includes('Circuit breaker') && (
              <button onClick={handleResetCircuitBreaker} className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 hover:bg-amber-200 rounded cursor-pointer">
                Reset Circuit Breaker
              </button>
            )}
          </div>
          <pre className="text-[10px] text-rose-600 whitespace-pre-wrap break-all leading-relaxed font-mono bg-white rounded p-2 border border-rose-200">{error}</pre>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Kết quả phản hồi</span>
              <span className="text-[10px] text-slate-400 font-mono">{response.raw.length} chars</span>
            </div>
            <div className="flex items-center gap-2">
              {responseTime !== null && <span className="text-[10px] text-slate-400 font-mono">{responseTime}ms</span>}
              <span className="text-[10px] font-semibold py-0.5 px-2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {response.status}
              </span>
            </div>
          </div>

          <div className="flex border-b border-slate-200">
            {['rendered', 'json', 'source'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`flex-1 text-[10px] font-semibold py-1.5 capitalize transition-colors cursor-pointer ${
                  viewMode === mode 
                    ? 'text-blue-600 bg-blue-50/60 border-b-2 border-blue-600' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {mode === 'source' ? 'Raw Source' : mode}
              </button>
            ))}
          </div>

          <div className="max-h-[220px] overflow-y-auto">
            {viewMode === 'rendered' && (
              response.data?.homework ? (
                <div className="flex flex-col gap-3 p-3 select-text">
                  <div className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
                    Session: {response.data.name}
                  </div>
                  {response.data.homework.map((item: any, index: number) => (
                    <div key={item.id || index} className="flex flex-col gap-1.5 border border-slate-200 rounded p-2 bg-slate-50/60">
                      <span className="text-xs font-semibold text-slate-800">{index + 1}. {item.title}</span>
                      {item.description && (
                        <div className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/60 pt-1.5" dangerouslySetInnerHTML={{ __html: item.description }} />
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
