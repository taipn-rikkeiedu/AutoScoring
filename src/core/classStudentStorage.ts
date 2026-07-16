import { Student } from '~/src/types';
import { STORAGE_KEYS } from './constants';

type ClassStudentLists = Record<string, Student[]>;

const CLASS_LISTS_KEY = STORAGE_KEYS.classStudentLists;
const LEGACY_CLASS_LIST_KEY = STORAGE_KEYS.legacyClassStudentList;

function getStorage(keys: string[]): Promise<Record<string, any>> {
  return new Promise(resolve => chrome.storage.local.get(keys as any, resolve));
}

function setStorage(values: Record<string, any>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(values, () => resolve()));
}

export async function getClassStudents(classId: string | null): Promise<Student[]> {
  if (!classId) return [];

  const stored = await getStorage([CLASS_LISTS_KEY, LEGACY_CLASS_LIST_KEY]);
  const classLists = (stored[CLASS_LISTS_KEY] || {}) as ClassStudentLists;

  if (Array.isArray(classLists[classId])) {
    return classLists[classId];
  }

  const legacyList = stored[LEGACY_CLASS_LIST_KEY];
  if (Object.keys(classLists).length === 0 && Array.isArray(legacyList) && legacyList.length > 0) {
    classLists[classId] = legacyList;
    await setStorage({ [CLASS_LISTS_KEY]: classLists });
    return legacyList;
  }

  return [];
}

export async function saveClassStudents(classId: string | null, students: Student[]): Promise<void> {
  if (!classId) return;

  const stored = await getStorage([CLASS_LISTS_KEY]);
  const classLists = (stored[CLASS_LISTS_KEY] || {}) as ClassStudentLists;
  classLists[classId] = students;
  await setStorage({ [CLASS_LISTS_KEY]: classLists });
}

export async function updateClassStudents(
  classId: string | null,
  updater: (students: Student[]) => Student[]
): Promise<Student[]> {
  const current = await getClassStudents(classId);
  const updated = updater([...current]);
  await saveClassStudents(classId, updated);
  return updated;
}

export async function clearClassStudents(classId: string | null): Promise<void> {
  if (!classId) return;

  const stored = await getStorage([CLASS_LISTS_KEY]);
  const classLists = (stored[CLASS_LISTS_KEY] || {}) as ClassStudentLists;
  delete classLists[classId];
  await setStorage({ [CLASS_LISTS_KEY]: classLists });
}
