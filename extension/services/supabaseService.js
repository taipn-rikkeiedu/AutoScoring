export class SupabaseService {
  static getHeaders(config) {
    return {
      "apikey": config.supabaseAnonKey,
      "Authorization": `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    };
  }

  static isEnabled(config) {
    return !!(config && config.supabaseSyncEnabled && config.supabaseUrl && config.supabaseAnonKey);
  }

  // --- Care Notes Sync ---
  static async upsertCareNote(config, classId, studentId, studentName, subjectName, studyDate, note) {
    if (!this.isEnabled(config)) return;
    const url = `${config.supabaseUrl}/rest/v1/care_notes?on_conflict=class_id,student_id,subject_name,study_date`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          class_id: classId,
          student_id: studentId,
          student_name: studentName,
          subject_name: subjectName,
          study_date: studyDate,
          note: note,
          updated_at: new Date().toISOString()
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Supabase upsertCareNote error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase upsertCareNote exception:", e);
      throw e;
    }
  }

  static async pullCareNotes(config, classId) {
    if (!this.isEnabled(config)) return [];
    const url = `${config.supabaseUrl}/rest/v1/care_notes?class_id=eq.${classId}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`
        }
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errorText = await res.text();
        console.error("Supabase pullCareNotes error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase pullCareNotes exception:", e);
      throw e;
    }
  }

  // --- Exercises Sync ---
  static async upsertExercise(config, chapter, session, assignmentName, assignmentText, criteria) {
    if (!this.isEnabled(config)) return;
    const url = `${config.supabaseUrl}/rest/v1/exercises?on_conflict=chapter,session,assignment_name`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          chapter: chapter,
          session: session,
          assignment_name: assignmentName,
          assignment_text: assignmentText,
          criteria: criteria,
          updated_at: new Date().toISOString()
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Supabase upsertExercise error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase upsertExercise exception:", e);
      throw e;
    }
  }

  static async pullExercises(config) {
    if (!this.isEnabled(config)) return [];
    const url = `${config.supabaseUrl}/rest/v1/exercises`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`
        }
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errorText = await res.text();
        console.error("Supabase pullExercises error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase pullExercises exception:", e);
      throw e;
    }
  }

  // --- Submissions Sync ---
  static async upsertSubmission(config, classId, studentId, studentName, chapter, session, assignmentName, githubUrl, score, report) {
    if (!this.isEnabled(config)) return;
    const url = `${config.supabaseUrl}/rest/v1/submissions?on_conflict=class_id,student_id,chapter,session,assignment_name`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          class_id: classId,
          student_id: studentId,
          student_name: studentName,
          chapter: chapter,
          session: session,
          assignment_name: assignmentName,
          github_url: githubUrl || "",
          score: score !== null ? parseFloat(score) : null,
          report: report || "",
          graded_at: new Date().toISOString()
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Supabase upsertSubmission error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase upsertSubmission exception:", e);
      throw e;
    }
  }

  static async pullSubmissions(config, classId) {
    if (!this.isEnabled(config)) return [];
    const url = `${config.supabaseUrl}/rest/v1/submissions?class_id=eq.${classId}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`
        }
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errorText = await res.text();
        console.error("Supabase pullSubmissions error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase pullSubmissions exception:", e);
      throw e;
    }
  }
}
