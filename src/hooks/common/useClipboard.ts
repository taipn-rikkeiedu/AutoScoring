import { useCallback } from 'react';
import { useToast } from '~/src/core/ToastContext';

const COPY_FAILED = 'Không sao chép được — kiểm tra quyền Clipboard của tiện ích.';

/** Sao chép văn bản kèm thông báo; trả `true` nếu thành công (nơi gọi có thể hiện dấu "đã chép"). */
export function useClipboard() {
  const { showToast } = useToast();
  return useCallback(async (text: string, successMessage: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage, 'success');
      return true;
    } catch {
      showToast(COPY_FAILED, 'error');
      return false;
    }
  }, [showToast]);
}
