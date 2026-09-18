import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '~/src/types';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

/**
 * Trả về Supabase client dùng chung, tái tạo lại chỉ khi url/anonKey thay đổi
 * (tránh khởi tạo mới mỗi lần gọi, vì createClient() không rẻ).
 */
export function getSupabaseClient(config: AppConfig): SupabaseClient | null {
  const url = (config.supabaseUrl || "").trim();
  const anonKey = (config.supabaseAnonKey || "").trim();
  if (!url || !anonKey) return null;

  if (!cachedClient || cachedUrl !== url || cachedKey !== anonKey) {
    cachedClient = createClient(url, anonKey);
    cachedUrl = url;
    cachedKey = anonKey;
  }
  return cachedClient;
}

export function isSupabaseConfigured(config: AppConfig): boolean {
  return !!(config.supabaseUrl || "").trim() && !!(config.supabaseAnonKey || "").trim();
}
