import { circuitBreaker } from './circuitBreaker';
import { rateLimiter, MIN_REQUEST_INTERVAL_MS } from './rateLimiter';

export interface LmsSubmissionResponse {
  data?: any;
  error?: string;
  status: number;
  raw: string;
}

export interface LmsApiParams {
  sessionId: string;
  refreshToken: string;
}

export interface LmsValidationResult {
  valid: boolean;
  errors: string[];
}

const LMS_API_BASE = "https://apiportal.rikkei.edu.vn";

export function validateParams(params: LmsApiParams): LmsValidationResult {
  const errors: string[] = [];
  const { sessionId, refreshToken } = params;

  if (!sessionId || !sessionId.trim()) {
    errors.push("sessionId không được để trống.");
  } else {
    const trimmed = sessionId.trim();
    if (!/^\d+$/.test(trimmed)) errors.push(`sessionId phải là số nguyên dương, nhận được: "${trimmed}"`);
    if (trimmed.length > 20) errors.push(`sessionId quá dài (${trimmed.length} ký tự), có thể sai.`);
    if (trimmed === "0") errors.push("sessionId không thể là 0.");
  }

  if (!refreshToken || !refreshToken.trim()) {
    errors.push("refresh_token không được để trống. Vui lòng cấu hình trong Settings.");
  } else {
    const trimmed = refreshToken.trim();
    if (trimmed.length < 10) errors.push("refresh_token quá ngắn, có thể không hợp lệ.");
    if (trimmed.includes("http://") || trimmed.includes("https://")) errors.push("refresh_token chứa URL — có thể bạn đã nhập nhầm.");
    if (trimmed.includes(" ")) errors.push("refresh_token chứa khoảng trắng — có thể bạn đã copy thừa.");
  }

  return { valid: errors.length === 0, errors };
}

export class LmsApiService {
  static validateBeforeCall(params: LmsApiParams): LmsValidationResult {
    return validateParams(params);
  }

  static resetCircuitBreaker(): void {
    circuitBreaker.reset();
  }

  static async getSubmissions(params: LmsApiParams): Promise<LmsSubmissionResponse> {
    const validation = validateParams(params);
    if (!validation.valid) {
      throw new Error(`⛔ Không gọi API — tham số không hợp lệ:\n${validation.errors.map(e => `  • ${e}`).join("\n")}`);
    }

    const cbCheck = circuitBreaker.canRequest();
    if (!cbCheck.allowed) throw new Error(cbCheck.reason!);

    const rlCheck = rateLimiter.canRequest();
    if (!rlCheck.allowed) {
      throw new Error(`⏳ Vui lòng chờ ${Math.ceil(rlCheck.waitMs! / 1000)}s trước khi gọi API tiếp. (Giới hạn: ${MIN_REQUEST_INTERVAL_MS / 1000}s)`);
    }

    const { sessionId, refreshToken } = params;
    const url = `${LMS_API_BASE}/sessions/${encodeURIComponent(sessionId.trim())}`;
    rateLimiter.recordRequest();

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "FETCH",
          url,
          options: {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${refreshToken.trim()}`,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            }
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ status: 0, raw: "", error: `🌐 Lỗi Chrome Runtime: ${chrome.runtime.lastError.message}` });
            return;
          }

          if (!response || !response.success) {
            const status = response?.status || 0;
            if (status >= 500) circuitBreaker.recordServerError(status);
            resolve({ status, raw: "", error: response?.error || "Không phản hồi từ background proxy" });
            return;
          }

          const status = response.status;
          if (status >= 500) {
            circuitBreaker.recordServerError(status);
            resolve({
              status,
              raw: response.text || "",
              error: `⛔ Server lỗi ${status} (${response.statusText || "Internal Error"}). sessionId="${sessionId}" có thể không tồn tại.`
            });
            return;
          }

          if (status >= 400) {
            const tokenHint = (status === 401 || status === 403) ? " Token có thể hết hạn hoặc không hợp lệ." : "";
            resolve({ status, raw: response.text || "", error: `HTTP ${status}: ${response.statusText || "Error"}.${tokenHint}` });
            return;
          }

          circuitBreaker.recordSuccess();
          const rawText = response.text || "";
          let data: any = undefined;
          try {
            data = JSON.parse(rawText);
          } catch {}

          resolve({ status, raw: rawText, data });
        }
      );
    });
  }
}
