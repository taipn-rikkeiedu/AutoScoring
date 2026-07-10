export interface AppConfig {
  aiProvider: string;
  aiApiKey: string;
  aiApiUrl: string;
  aiModelName: string;
  githubToken: string;
  systemPrompt: string;
  graderIgnoreItems: string[];
  exerciseSource: string;
  exerciseApiUrl: string;
  exerciseApiToken: string;
  uploadedExercises: any;
  supabaseSyncEnabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface Student {
  studentId: string;
  studentName: string;
  submissionUrl?: string;
  dbId?: string;
  lmsStatus?: string;
  submittedCount?: number;
  completedCount?: number;
  githubUrl?: string;
  score?: string | null;
  comments?: string | null;
  assignmentName?: string;
  submissions?: Record<string, {
    score: string;
    report: string;
    githubUrl: string;
    gradedAt: string;
  }>;
}

export interface CareStudent {
  studentId: string;
  studentName: string;
  subjectName: string;
  studyDate: string;
  note: string;
}

export interface Submission {
  exerciseName: string;
  studentName: string;
  githubUrl: string;
  score?: string | null;
  report?: string;
  status?: string;
  isGraderCompleted?: boolean;
  isGraderSuccess?: boolean;
  fileList?: string[];
  checked?: boolean;
  matchedTemplate?: {
    chapter: string;
    session: string;
    assignmentName: string;
  } | null;
  error?: string;
}

export interface ExerciseTemplate {
  chapter: string;
  session: string;
  assignment_name: string;
  assignment_text: string;
  criteria: string;
}
