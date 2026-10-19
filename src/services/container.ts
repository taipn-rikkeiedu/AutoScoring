import { STORAGE_KEYS } from '~/src/core/constants';
import { backgroundProxy } from '~/src/infra/backgroundProxy';
import { localStore, sessionStore } from '~/src/infra/storage';
import { QldtAuthProvider, StoredTokenSource, TabTokenSource } from './qldt/auth';
import { QldtHttpClient } from './qldt/client';
import { CachedQldtClient } from './qldt/cachedClient';
import { CatalogService } from './qldt/catalogService';
import { HomeworkService } from './qldt/homeworkService';
import { MonitorService } from './qldt/monitorService';
import { CareService } from './qldt/careService';
import { QldtApiCrawler } from './qldt/apiCrawler';
import { QldtDiagnostics } from './qldt/diagnostics';

/**
 * Composition root: nơi DUY NHẤT ghép các lớp với nhau (chọn cài đặt cụ thể cho từng interface).
 * Code nghiệp vụ nhận phụ thuộc qua constructor; hook lấy service qua `useServices()` — test thay bằng bản giả.
 */
export function createServices() {
  const storedToken = new StoredTokenSource(localStore, STORAGE_KEYS.qldtAuthToken);
  const auth = new QldtAuthProvider(new TabTokenSource(), storedToken);
  const client = new QldtHttpClient(auth, backgroundProxy);
  // Danh mục ít đổi → client có cache; dữ liệu thay đổi liên tục → client thường
  const catalogClient = new CachedQldtClient(client, auth, sessionStore);

  return {
    qldt: {
      auth,
      client,
      catalog: new CatalogService(catalogClient),
      homework: new HomeworkService(client),
      monitor: new MonitorService(client),
      care: new CareService(client),
      crawler: new QldtApiCrawler(client, auth),
      diagnostics: new QldtDiagnostics(auth, storedToken, client)
    }
  };
}

export type Services = ReturnType<typeof createServices>;

/** Bộ service dùng chung của trang extension. */
export const services: Services = createServices();
