import { useEffect, useState } from 'react';
import { useApp } from '~/src/core/AppContext';
import { logger } from '~/src/core/logger';
import { BankCourse, BankSession, toBankHomework } from '~/src/core/exerciseBank';
import { getQldtAuth } from '~/src/services/lms/qldtApiClient';
import {
  QldtOption, listQldtClasses, listQldtCourses, fetchCourseSessions, fetchSessionHomework
} from '~/src/services/lms/examAnalysisService';

const LOG_MODULE = 'EXERCISE_BANK';
const SESSION_FETCH_CONCURRENCY = 3;

/** Tên môn sạch (bỏ hậu tố học kỳ " — HK2" mà danh sách môn thêm vào để phân biệt). */
const courseNameOf = (label: string) => label.split(' — ')[0].trim();

export function useExerciseBank() {
  const { exerciseBank, saveExerciseBank } = useApp();
  const [classes, setClasses] = useState<QldtOption[]>([]);
  const [classId, setClassId] = useState('');
  const [courses, setCourses] = useState<QldtOption[]>([]);
  const [courseId, setCourseId] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null); // courseId đang tải
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const loadClasses = async () => {
    try {
      setError('');
      setClasses(await listQldtClasses(await getQldtAuth()));
    } catch (e: any) {
      setError('Không tải được danh sách lớp: ' + e.message);
    }
  };

  useEffect(() => { loadClasses(); }, []);

  const handleClassChange = async (id: string) => {
    setClassId(id);
    setCourses([]);
    setCourseId('');
    if (!id) return;
    try {
      setCourses(await listQldtCourses(await getQldtAuth(), id));
    } catch (e: any) {
      setError('Không tải được môn học: ' + e.message);
    }
  };

  /** Tải toàn bộ đề của 1 môn: danh sách buổi → đề của từng buổi (kèm tiêu chí chấm). */
  const syncCourse = async (id: string, name: string) => {
    if (syncing) return;
    setSyncing(id);
    setError('');
    try {
      const auth = await getQldtAuth();
      const sessions = await fetchCourseSessions(auth, id);
      const result: BankSession[] = sessions.map(s => ({ ...s, homework: [] }));
      let done = 0;
      let next = 0;
      setProgress({ done: 0, total: sessions.length });
      await Promise.all(Array.from({ length: Math.min(SESSION_FETCH_CONCURRENCY, sessions.length) }, async () => {
        while (next < sessions.length) {
          const i = next++;
          result[i].homework = (await fetchSessionHomework(auth, sessions[i].id)).map(toBankHomework);
          setProgress({ done: ++done, total: sessions.length });
        }
      }));
      const course: BankCourse = { courseId: id, courseName: name, syncedAt: new Date().toISOString(), sessions: result };
      await saveExerciseBank({ ...exerciseBank, [id]: course });
      const total = result.reduce((n, s) => n + s.homework.length, 0);
      logger.success(LOG_MODULE, `Tải đề môn "${name}": ${result.length} buổi, ${total} đề.`);
    } catch (e: any) {
      setError(`Không tải được đề môn "${name}": ${e.message}`);
      logger.error(LOG_MODULE, `Không tải được đề môn "${name}".`, e.message);
    } finally {
      setSyncing(null);
      setProgress(null);
    }
  };

  const handleSyncSelected = () => {
    const label = courses.find(c => c.value === courseId)?.label;
    if (courseId && label) syncCourse(courseId, courseNameOf(label));
  };

  const removeCourse = async (id: string) => {
    const next = { ...exerciseBank };
    delete next[id];
    await saveExerciseBank(next);
  };

  return {
    bank: exerciseBank,
    classes, classId, courses, courseId, setCourseId,
    syncing, progress, error,
    reloadClasses: loadClasses, handleClassChange, handleSyncSelected, syncCourse, removeCourse
  };
}
