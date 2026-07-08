// core/exerciseLoader.js - Helper to load/sync template exercises
import { SupabaseService } from '../services/supabaseService.js';

export async function loadExercises(context, supabaseStatusTag) {
  const res = await fetch(chrome.runtime.getURL("exercises.json"));
  if (!res.ok) throw new Error("Không tìm thấy file exercises.json trong extension.");
  context.exerciseTemplates = await res.json();

  if (context.config.uploadedExercises) {
    const localEdits = context.config.uploadedExercises;
    for (const chap in localEdits) {
      if (!context.exerciseTemplates[chap]) context.exerciseTemplates[chap] = {};
      for (const sess in localEdits[chap]) {
        if (!context.exerciseTemplates[chap][sess]) context.exerciseTemplates[chap][sess] = {};
        for (const name in localEdits[chap][sess]) {
          context.exerciseTemplates[chap][sess][name] = { ...localEdits[chap][sess][name] };
        }
      }
    }
  }

  let supabaseStatusText = "Chưa kích hoạt";
  if (SupabaseService.isEnabled(context.config)) {
    supabaseStatusTag.style.display = "inline-block";
    try {
      const cloudExercises = await SupabaseService.pullExercises(context.config);
      supabaseStatusText = "🟢 Sẵn sàng";
      supabaseStatusTag.className = "version-tag success";
      supabaseStatusTag.title = "Supabase Cloud: Đồng bộ sẵn sàng";
      if (cloudExercises && cloudExercises.length > 0) {
        cloudExercises.forEach(ex => {
          const chap = ex.chapter;
          const sess = ex.session;
          const name = ex.assignment_name;
          if (!context.exerciseTemplates[chap]) context.exerciseTemplates[chap] = {};
          if (!context.exerciseTemplates[chap][sess]) context.exerciseTemplates[chap][sess] = {};
          context.exerciseTemplates[chap][sess][name] = {
            assignment: ex.assignment_text || "",
            criteria: ex.criteria || ""
          };
        });
      }
    } catch (exErr) {
      console.error("Lỗi đồng bộ đề bài từ Supabase:", exErr);
      supabaseStatusText = "🔴 Lỗi kết nối CSDL";
      supabaseStatusTag.className = "version-tag error";
      supabaseStatusTag.title = "Supabase Cloud: Lỗi kết nối CSDL";
    }
  } else {
    supabaseStatusTag.style.display = "none";
  }
  return supabaseStatusText;
}
