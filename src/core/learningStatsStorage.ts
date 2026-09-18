import { LearningStatsSnapshot } from '~/src/types';
import { STORAGE_KEYS } from './constants';

type LearningStatsSnapshots = Record<string, LearningStatsSnapshot>;

const SNAPSHOTS_KEY = STORAGE_KEYS.learningStatsSnapshots;

function getStorage(keys: string[]): Promise<Record<string, any>> {
  return new Promise(resolve => chrome.storage.local.get(keys as any, resolve));
}

function setStorage(values: Record<string, any>): Promise<void> {
  return new Promise(resolve => chrome.storage.local.set(values, () => resolve()));
}

export function makeSnapshotKey(className: string, subjectName: string): string {
  return `${className}||${subjectName}`;
}

export async function getAllSnapshots(): Promise<LearningStatsSnapshots> {
  const stored = await getStorage([SNAPSHOTS_KEY]);
  return (stored[SNAPSHOTS_KEY] || {}) as LearningStatsSnapshots;
}

export async function getSnapshot(key: string): Promise<LearningStatsSnapshot | null> {
  const snapshots = await getAllSnapshots();
  return snapshots[key] || null;
}

export async function saveSnapshot(snapshot: LearningStatsSnapshot): Promise<string> {
  const key = makeSnapshotKey(snapshot.className, snapshot.subjectName);
  const snapshots = await getAllSnapshots();
  snapshots[key] = snapshot;
  await setStorage({ [SNAPSHOTS_KEY]: snapshots });
  return key;
}

export async function deleteSnapshot(key: string): Promise<void> {
  const snapshots = await getAllSnapshots();
  delete snapshots[key];
  await setStorage({ [SNAPSHOTS_KEY]: snapshots });
}
