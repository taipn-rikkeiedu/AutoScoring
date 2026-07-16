import { useState, useEffect } from 'react';
import { LmsApiService, LmsValidationResult } from '~/src/services/lms/lmsApiClient';
import { useToast } from '~/src/core/ToastContext';

export function useLmsApiTest() {
  const { showToast } = useToast();

  const [sessionId, setSessionId] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<LmsValidationResult | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'json' | 'source'>('rendered');
  const [hasSiteAccess, setHasSiteAccess] = useState(true);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      chrome.permissions.contains({
        origins: ["https://apiportal.rikkei.edu.vn/*"]
      }, (result) => setHasSiteAccess(result));
    }
  }, []);

  const handleRequestPermission = () => {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      chrome.permissions.request({
        origins: ["https://apiportal.rikkei.edu.vn/*"]
      }, (granted) => {
        if (granted) {
          setHasSiteAccess(true);
          showToast('✅ Đã cấp quyền truy cập apiportal.rikkei.edu.vn!', 'success');
        } else {
          showToast('❌ Cấp quyền thất bại hoặc bị từ chối.', 'warning');
        }
      });
    }
  };

  useEffect(() => {
    chrome.storage.local.get(['lmsRefreshToken'], (result) => {
      if (result.lmsRefreshToken) setRefreshToken(result.lmsRefreshToken as string);
    });
  }, []);

  const handleTokenChange = (val: string) => {
    setRefreshToken(val);
    chrome.storage.local.set({ lmsRefreshToken: val });
  };

  const handleValidate = () => {
    const res = LmsApiService.validateBeforeCall({ sessionId, refreshToken });
    setValidation(res);
    if (res.valid) {
      showToast('✅ Các tham số hợp lệ!', 'success');
    } else {
      showToast('❌ Tham số không hợp lệ.', 'warning');
    }
  };

  const handleFetchSubmissions = async () => {
    const checkVal = LmsApiService.validateBeforeCall({ sessionId, refreshToken });
    setValidation(checkVal);
    if (!checkVal.valid) {
      showToast('❌ Tham số không hợp lệ. Hãy kiểm tra lại.', 'warning');
      return;
    }

    if (!window.confirm("⚠️ QUAN TRỌNG: Bạn đã chắc chắn Session ID chính xác chưa? ID sai có thể làm tê liệt API server. Bạn có muốn tiếp tục?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResponseTime(null);

    const startTime = Date.now();
    try {
      const res = await LmsApiService.getSubmissions({ sessionId, refreshToken });
      const elapsed = Date.now() - startTime;
      setResponseTime(elapsed);
      setResponse(res);

      if (res.error) {
        setError(res.error);
        showToast('❌ Yêu cầu API trả về lỗi', 'warning');
      } else {
        showToast(`✅ Thành công! Phản hồi nhận được sau ${elapsed}ms`, 'success');
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      setResponseTime(elapsed);
      setError(err.message);
      showToast('⛔ Lỗi: ' + err.message.slice(0, 80), 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCircuitBreaker = () => {
    LmsApiService.resetCircuitBreaker();
    showToast('🔄 Circuit breaker đã được reset.', 'success');
    setError(null);
  };

  return {
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
  };
}
