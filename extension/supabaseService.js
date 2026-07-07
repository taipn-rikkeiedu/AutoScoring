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
  static async upsertCareNote(config, classId, studentId, studentName, note) {
    if (!this.isEnabled(config)) return;
    const url = `${config.supabaseUrl}/rest/v1/care_notes?on_conflict=class_id,student_id`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          class_id: classId,
          student_id: studentId,
          student_name: studentName,
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

  // --- Class Students Sync ---
  static async upsertClassStudents(config, classId, studentsList) {
    if (!this.isEnabled(config) || !studentsList || studentsList.length === 0) return;
    const url = `${config.supabaseUrl}/rest/v1/class_students?on_conflict=class_id,student_id`;
    const payload = studentsList.map(st => ({
      class_id: classId,
      student_id: st.studentId,
      student_name: st.studentName,
      submission_url: st.submissionUrl || "",
      github_url: st.githubUrl || "",
      score: st.score !== null && st.score !== undefined ? st.score : null,
      comments: st.comments || "",
      assignment_name: st.assignmentName || "",
      lms_status: st.lmsStatus || "",
      db_id: st.dbId || "",
      updated_at: new Date().toISOString()
    }));

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Supabase upsertClassStudents error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase upsertClassStudents exception:", e);
      throw e;
    }
  }

  static async pullClassStudents(config, classId) {
    if (!this.isEnabled(config)) return [];
    const url = `${config.supabaseUrl}/rest/v1/class_students?class_id=eq.${classId}`;
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
        console.error("Supabase pullClassStudents error:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Supabase pullClassStudents exception:", e);
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
}
