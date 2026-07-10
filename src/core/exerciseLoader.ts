import { SupabaseService } from '~/src/services/supabaseService';
import { AppConfig } from '~/src/types';

export async function loadExercises(config: AppConfig): Promise<{ templates: Record<string, Record<string, Record<string, { assignment: string; criteria: string }>>>; statusText: string }> {
  const res = await fetch(chrome.runtime.getURL("exercises.json"));
  if (!res.ok) throw new Error("Không tìm thấy file exercises.json trong extension.");
  const templates = await res.json();

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

  let statusText = "Chưa kích hoạt";
  if (SupabaseService.isEnabled(config)) {
    try {
      const cloudExercises = await SupabaseService.pullExercises(config);
      statusText = "🟢 Sẵn sàng";
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
    } catch (exErr) {
      console.error("Lỗi đồng bộ đề bài từ Supabase:", exErr);
      statusText = "🔴 Lỗi kết nối CSDL";
    }
  }
  return { templates, statusText };
}
