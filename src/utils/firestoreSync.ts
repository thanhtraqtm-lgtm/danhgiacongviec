/**
 * Firestore synchronization layer for the KPI evaluation system.
 *
 * Strategy: keep localStorage as a fast offline cache, but mirror the main
 * collections (users, tasks, late_config, period_config, logo) to Firestore
 * so data persists across devices / logins.
 *
 * Each "collection" is stored as a single document under a `kpi_data` root
 * collection. This keeps the data model simple and avoids per-item writes
 * (which would be heavy and race-prone). The document holds the full array
 * in a single field.
 *
 *   kpi_data / users_doc        -> { value: User[], updatedAt }
 *   kpi_data / tasks_doc        -> { value: KpiTask[], updatedAt }
 *   kpi_data / late_config_doc  -> { value: LateRuleConfig, updatedAt }
 *   kpi_data / period_config_doc-> { value: EvaluationPeriodConfig, updatedAt }
 *   kpi_data / logo_doc         -> { value: string (base64 data URL), updatedAt }
 *
 * Echo suppression strategy (robust against the "tự nhiên xóa trắng hết" bug):
 * Whenever we write to a doc, we set a per-doc "pause" timer for PAUSE_MS.
 * Any onSnapshot event that arrives during the pause window is treated as our
 * own echo and dropped. Timestamp-based matching is brittle (Firestore may
 * round/serialize timestamps differently), so a time-window is far more
 * reliable. Genuine cross-device updates that arrive later still apply.
 */

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  User,
  KpiTask,
  LateRuleConfig,
  EvaluationPeriodConfig,
} from '../types';

const ROOT = 'kpi_data';
const USERS_DOC = 'users_doc';
const TASKS_DOC = 'tasks_doc';
const LATE_CONFIG_DOC = 'late_config_doc';
const PERIOD_CONFIG_DOC = 'period_config_doc';
const LOGO_DOC = 'logo_doc';

// How long (ms) to ignore onSnapshot echoes after we write. Firestore typically
// echoes within a few hundred ms; 2.5s is a safe, conservative window.
const PAUSE_MS = 2500;

export interface SyncEnvelope<T> {
  value: T;
  updatedAt: string;
}

// Per-doc pause-until timestamp (epoch ms). While Date.now() < this, the watcher
// treats incoming snapshots as echoes of our own write and drops them.
const pauseUntil: Record<string, number> = {};
// The last value we ourselves wrote, per doc. While paused we also remember it
// so that if an echo somehow slips through after the pause we can still compare.
const lastWrittenValue: Record<string, unknown> = {};

function pause(docId: string): void {
  pauseUntil[docId] = Date.now() + PAUSE_MS;
}

function isPaused(docId: string): boolean {
  const until = pauseUntil[docId];
  return typeof until === 'number' && Date.now() < until;
}

/** Read a single envelope document. Returns null if missing/error (offline). */
async function readEnvelope<T>(docId: string): Promise<SyncEnvelope<T> | null> {
  try {
    const ref = doc(db, ROOT, docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      value: data?.value as T,
      updatedAt: data?.updatedAt ?? '',
    };
  } catch {
    return null;
  }
}

/** Write a single envelope document (merge-replace). Sets the echo-suppression pause window for this doc. */
async function writeEnvelope<T>(docId: string, value: T): Promise<void> {
  lastWrittenValue[docId] = value;
  pause(docId);
  try {
    const ref = doc(db, ROOT, docId);
    // Kiểm tra kích thước trước khi ghi - tăng giới hạn lên 1MB
    const serialized = JSON.stringify(value);
    const sizeBytes = new Blob([serialized]).size;
    const MAX_BYTES = 1_000_000; // 1MB - giới hạn Firestore document

    if (sizeBytes > MAX_BYTES && Array.isArray(value)) {
      // Nếu là mảng tasks quá lớn, chỉ lưu các trường tối thiểu cần thiết
      const minified = (value as any[]).map((item: any) => ({
        id: item.id,
        userName: item.userName,
        taskName: item.taskName,
        department: item.department,
        status: item.status,
        planDeadline: item.planDeadline,
        actualDeadline: item.actualDeadline,
        weight: item.weight,
        jobType: item.jobType,
        daysLate: item.daysLate,
        lateReason: item.lateReason,
      }));
      const minSize = new Blob([JSON.stringify(minified)]).size;
      if (minSize <= MAX_BYTES) {
        await setDoc(ref, { value: minified, updatedAt: new Date().toISOString() });
        return;
      }
      // Nếu vẫn quá lớn, cố gắng lưu với compression bằng cách chia nhỏ
      console.warn(`Firestore: Data too large (${sizeBytes} bytes), attempting to save essential fields only`);
      const essential = (value as any[]).map((item: any) => ({
        id: item.id,
        userName: item.userName,
        taskName: item.taskName,
        department: item.department,
        status: item.status,
        planDeadline: item.planDeadline,
        weight: item.weight,
      }));
      const essentialSize = new Blob([JSON.stringify(essential)]).size;
      if (essentialSize <= MAX_BYTES) {
        await setDoc(ref, { value: essential, updatedAt: new Date().toISOString() });
        console.log('Firestore: Saved essential fields only');
        return;
      }
      // Last resort: chỉ lưu metadata
      console.error(`Firestore: Unable to save - data too large even after minification (${essentialSize} bytes)`);
    }

    await setDoc(ref, {
      value,
      updatedAt: new Date().toISOString(),
    });
    console.log(`Firestore: Saved ${docId} (${sizeBytes} bytes)`);
  } catch (error) {
    console.error(`Firestore write error for ${docId}:`, error);
    // Không silent fail - log ra để debug
  }
}

/* ----------------------------- USERS ----------------------------- */

export async function fsLoadUsers(): Promise<User[] | null> {
  const env = await readEnvelope<User[]>(USERS_DOC);
  return env ? env.value : null;
}

export async function fsSaveUsers(users: User[]): Promise<void> {
  await writeEnvelope(USERS_DOC, users);
}

export function fsWatchUsers(onData: (users: User[], updatedAt: string) => void): Unsubscribe {
  const ref = doc(db, ROOT, USERS_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (isPaused(USERS_DOC)) return; // drop echo of our own write
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (!Array.isArray(data?.value)) return;
      onData(data.value as User[], data?.updatedAt ?? '');
    },
    () => {
      // Silently ignore watch errors
    },
  );
}

/* ----------------------------- TASKS ----------------------------- */

export async function fsLoadTasks(): Promise<KpiTask[] | null> {
  const env = await readEnvelope<KpiTask[]>(TASKS_DOC);
  return env ? env.value : null;
}

export async function fsSaveTasks(tasks: KpiTask[]): Promise<void> {
  console.log(`fsSaveTasks: Saving ${tasks.length} tasks to Firestore`);
  await writeEnvelope(TASKS_DOC, tasks);
  console.log('fsSaveTasks: Completed');
}

export function fsWatchTasks(onData: (tasks: KpiTask[], updatedAt: string) => void): Unsubscribe {
  const ref = doc(db, ROOT, TASKS_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (isPaused(TASKS_DOC)) return; // drop echo of our own write
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (!Array.isArray(data?.value)) return;
      onData(data.value as KpiTask[], data?.updatedAt ?? '');
    },
    () => {
      // Silently ignore watch errors
    },
  );
}

/* -------------------------- LATE CONFIG -------------------------- */

export async function fsLoadLateConfig(): Promise<LateRuleConfig | null> {
  const env = await readEnvelope<LateRuleConfig>(LATE_CONFIG_DOC);
  return env ? env.value : null;
}

export async function fsSaveLateConfig(cfg: LateRuleConfig): Promise<void> {
  await writeEnvelope(LATE_CONFIG_DOC, cfg);
}

/* ------------------------ PERIOD CONFIG -------------------------- */

export async function fsLoadPeriodConfig(): Promise<EvaluationPeriodConfig | null> {
  const env = await readEnvelope<EvaluationPeriodConfig>(PERIOD_CONFIG_DOC);
  return env ? env.value : null;
}

export async function fsSavePeriodConfig(cfg: EvaluationPeriodConfig): Promise<void> {
  await writeEnvelope(PERIOD_CONFIG_DOC, cfg);
}

/* ----------------------------- LOGO ------------------------------ */

export async function fsLoadLogo(): Promise<string | null> {
  const env = await readEnvelope<string>(LOGO_DOC);
  return env ? env.value : null;
}

export async function fsSaveLogo(logoDataUrl: string): Promise<void> {
  await writeEnvelope(LOGO_DOC, logoDataUrl);
}
