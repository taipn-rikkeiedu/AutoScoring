import { SupabaseService } from '~/src/services/supabaseService';
import { AppConfig } from '~/src/types';
import { UI_MESSAGES } from './constants';
import { logger } from './logger';

export async function loadExercises(config: AppConfig): Promise<{ templates: Record<string, Record<string, Record<string, { assignment: string; criteria: string }>>>; statusText: string; syncError?: string }> {
  let templates: any = {};
  
  if (config.exerciseSource === 'api' && config.exerciseApiUrl && config.exerciseApiUrl.trim() !== '') {
    try {
      const headers: Record<string, string> = {};
      if (config.exerciseApiToken && config.exerciseApiToken.trim() !== '') {
        headers['Authorization'] = `Bearer ${config.exerciseApiToken.trim()}`;
      }
      const res = await fetch(config.exerciseApiUrl.trim(), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      templates = await res.json();
      logger.info("EXERCISE_LOADER", `Đã tải đề bài từ API Server thành công.`);
    } catch (err: any) {
      logger.error("EXERCISE_LOADER", "Lỗi tải đề bài từ API Server, chuyển sang dùng Local.", err.message);
      const res = await fetch(chrome.runtime.getURL("exercises.json"));
      if (!res.ok) throw new Error("Không tìm thấy file exercises.json trong extension.");
      templates = await res.json();
    }
  } else {
    const res = await fetch(chrome.runtime.getURL("exercises.json"));
    if (!res.ok) throw new Error("Không tìm thấy file exercises.json trong extension.");
    templates = await res.json();
  }

  if (config.uploadedExercises) {
    const localEdits = config.uploadedExercises;
    for (const chap in localEdits) {
      if (!templates[chap]) templates[chap] = {};
      for (const sess in localEdits[chap]) {
        if (!templates[chap][sess]) templates[chap][sess] = {};
        for (const name in localEdits[chap][sess]) {
          templates[chap][sess][name] = { ...localEdits[chap][sess][name] };
        }
      }
    }
  }

  let statusText: string = UI_MESSAGES.statuses.supabaseInactive;
  let syncError: string | undefined;
  if (SupabaseService.isEnabled(config)) {
    try {
      const cloudExercises = await SupabaseService.pullExercises(config);
      statusText = UI_MESSAGES.statuses.supabaseReady;
      if (cloudExercises && cloudExercises.length > 0) {
        cloudExercises.forEach(ex => {
          const chap = ex.chapter;
          const sess = ex.session;
          const name = ex.assignment_name;
          if (!templates[chap]) templates[chap] = {};
          if (!templates[chap][sess]) templates[chap][sess] = {};
          templates[chap][sess][name] = {
            assignment: ex.assignment_text || "",
            criteria: ex.criteria || ""
          };
        });
      }
    } catch (exErr: any) {
      logger.error("EXERCISE_LOADER", "Lỗi đồng bộ đề bài từ Backend.", exErr.message || exErr);
      statusText = UI_MESSAGES.statuses.supabaseDbError;
      syncError = exErr.message || String(exErr);
    }
  }
  return { templates, statusText, syncError };
}
