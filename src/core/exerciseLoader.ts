import { SupabaseService } from '~/src/services/supabaseService';
import { AppConfig } from '~/src/types';
import { UI_MESSAGES } from './constants';

export async function loadExercises(config: AppConfig): Promise<{ templates: Record<string, Record<string, Record<string, { assignment: string; criteria: string }>>>; statusText: string }> {
  const res = await fetch(chrome.runtime.getURL("exercises.json"));
  if (!res.ok) throw new Error("KhÃ´ng tÃ¬m tháº¥y file exercises.json trong extension.");
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

  let statusText: string = UI_MESSAGES.statuses.supabaseInactive;
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
    } catch (exErr) {
      console.error("Lá»—i Ä‘á»“ng bá»™ Ä‘á» bÃ i tá»« Supabase:", exErr);
      statusText = UI_MESSAGES.statuses.supabaseDbError;
    }
  }
  return { templates, statusText };
}
