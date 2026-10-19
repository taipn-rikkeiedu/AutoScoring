import { STORAGE_KEYS } from '~/src/core/constants';
import { localStore } from '~/src/infra/storage';

/**
 * Chuyển giữa 2 cách mở extension: popup thả xuống (ghim trên toolbar) hoặc cửa sổ nổi riêng.
 * Chế độ "window": bỏ popup mặc định để bấm icon kích hoạt `chrome.action.onClicked` → mở / focus cửa sổ nổi.
 */
export class FloatingWindowManager {
  private static readonly SIZE = { width: 1024, height: 720 };
  private defaultPopupPath = '';
  private windowId: number | null = null;

  /** Gắn listener; gọi 1 lần khi background khởi động. */
  start(): void {
    this.applyModeFromStorage();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.uiWindowMode]) this.applyModeFromStorage();
    });
    chrome.windows.onRemoved.addListener((id) => { if (id === this.windowId) this.windowId = null; });
    chrome.action.onClicked.addListener(() => { this.openOrFocus(); });
  }

  async openOrFocus(): Promise<void> {
    if (this.windowId !== null) {
      try {
        await chrome.windows.update(this.windowId, { focused: true });
        return;
      } catch {
        this.windowId = null;
      }
    }

    // Phục hồi ID cửa sổ nổi khi service worker bị ngủ đông rồi thức dậy
    try {
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('/*') });
      const windowTab = tabs.find(t => t.url && t.url.includes('mode=window'));
      if (windowTab?.windowId) {
        this.windowId = windowTab.windowId;
        await chrome.windows.update(this.windowId, { focused: true });
        return;
      }
    } catch (e) {
      console.error('Lỗi khi tìm kiếm cửa sổ nổi:', e);
    }

    const win = await chrome.windows.create({
      url: this.floatingUrl(await this.popupPath()),
      type: 'popup',
      ...FloatingWindowManager.SIZE
    });
    this.windowId = win?.id ?? null;
  }

  private async popupPath(): Promise<string> {
    if (!this.defaultPopupPath) this.defaultPopupPath = (await chrome.action.getPopup({})) || 'popup.html';
    return this.defaultPopupPath;
  }

  // getPopup() có thể trả đường dẫn tương đối ("popup.html") hoặc URL tuyệt đối tuỳ trình duyệt
  // → resolve qua URL() để không nhân đôi tiền tố chrome-extension://.
  private floatingUrl(popupPath: string): string {
    const url = new URL(popupPath, chrome.runtime.getURL('/'));
    url.searchParams.set('mode', 'window');
    return url.toString();
  }

  private async applyModeFromStorage(): Promise<void> {
    const popupPath = await this.popupPath();
    const mode = (await localStore.get(STORAGE_KEYS.uiWindowMode)) === 'window' ? 'window' : 'popup';
    await chrome.action.setPopup({ popup: mode === 'popup' ? popupPath : '' });
  }
}
