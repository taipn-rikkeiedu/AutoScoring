/**
 * Định tuyến message trong background theo `type`: mỗi loại 1 handler đăng ký riêng
 * → thêm loại message mới không phải sửa các handler cũ (Open/Closed).
 */

/** Trả Promise → kết quả được gửi lại cho bên gửi; trả void → không phản hồi. */
export type MessageHandler = (message: any, sender: chrome.runtime.MessageSender) => Promise<unknown> | void;

export class MessageRouter {
  private readonly handlers = new Map<string, MessageHandler>();

  register(type: string, handler: MessageHandler): this {
    this.handlers.set(type, handler);
    return this;
  }

  /** Xử lý 1 message; trả `true` khi sẽ phản hồi bất đồng bộ (quy ước của chrome.runtime.onMessage). */
  dispatch(message: any, sender: chrome.runtime.MessageSender, sendResponse: (r: unknown) => void): boolean {
    const handler = this.handlers.get(message?.type);
    if (!handler) return false;
    let result: Promise<unknown> | void;
    try {
      result = handler(message, sender);
    } catch (e: any) {
      sendResponse({ success: false, error: e?.message || String(e) });
      return false;
    }
    if (!result) return false;
    result
      .then(sendResponse)
      .catch((e: any) => sendResponse({ success: false, error: e?.message || String(e) }));
    return true;
  }

  listen(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => this.dispatch(message, sender, sendResponse));
  }
}
