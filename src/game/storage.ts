import { PlayerProgress } from './types';

export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 30 * 60 * 1000; // 30 minutes per life
export const STORAGE_KEY = 'candy_amir_save_v1';
const LEGACY_STORAGE_KEY = 'sugar_rush_kingdom_progress_v1';

const IDB_NAME = 'CandyAmirDB';
const IDB_VERSION = 1;
const IDB_STORE = 'saves';
const IDB_KEY = 'player_progress';

export const DEFAULT_PROGRESS: PlayerProgress = {
  lives: MAX_LIVES,
  lastLifeLostAt: null,
  cash: 0,
  gems: 100,
  keys: 0,
  unlockedLevel: 1,
  purchasedLevels: [],
  unlockedGates: [],
  levelStars: {},
  highScores: {},
  redeemedCodes: [],
  boosters: {
    hammer: 3,
    freeSwitch: 3,
    colorBombStart: 2,
  },
  soundMuted: false,
};

export function syncLivesWithClock(
  progress: PlayerProgress,
  now: number = Date.now()
): { updated: PlayerProgress; msUntilNextLife: number } {
  if (progress.lives >= MAX_LIVES) {
    if (progress.lastLifeLostAt !== null) {
      return {
        updated: { ...progress, lives: MAX_LIVES, lastLifeLostAt: null },
        msUntilNextLife: 0,
      };
    }
    return { updated: progress, msUntilNextLife: 0 };
  }

  const anchor = progress.lastLifeLostAt ?? now;
  const elapsed = Math.max(0, now - anchor);
  const gained = Math.floor(elapsed / LIFE_REGEN_MS);

  if (gained > 0) {
    const newLives = Math.min(MAX_LIVES, progress.lives + gained);
    if (newLives >= MAX_LIVES) {
      return {
        updated: {
          ...progress,
          lives: MAX_LIVES,
          lastLifeLostAt: null,
        },
        msUntilNextLife: 0,
      };
    }
    const newAnchor = anchor + gained * LIFE_REGEN_MS;
    const msUntilNextLife = Math.max(0, LIFE_REGEN_MS - (now - newAnchor));
    return {
      updated: {
        ...progress,
        lives: newLives,
        lastLifeLostAt: newAnchor,
      },
      msUntilNextLife,
    };
  }

  const msUntilNextLife = Math.max(0, LIFE_REGEN_MS - elapsed);
  if (progress.lastLifeLostAt === null) {
    return { updated: { ...progress, lastLifeLostAt: now }, msUntilNextLife };
  }
  return { updated: progress, msUntilNextLife };
}

function sanitizeProgress(rawObj: Partial<PlayerProgress>): PlayerProgress {
  const merged: PlayerProgress = {
    ...DEFAULT_PROGRESS,
    ...rawObj,
    cash: typeof rawObj.cash === 'number' && Number.isFinite(rawObj.cash) ? Math.max(0, rawObj.cash) : 0,
    boosters: {
      ...DEFAULT_PROGRESS.boosters,
      ...(rawObj.boosters ?? {}),
    },
    levelStars: rawObj.levelStars ?? {},
    highScores: rawObj.highScores ?? {},
    purchasedLevels: Array.isArray(rawObj.purchasedLevels)
      ? Array.from(
          new Set(
            rawObj.purchasedLevels.filter(
              (n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1
            )
          )
        ).sort((a, b) => a - b)
      : [],
    unlockedGates: Array.isArray(rawObj.unlockedGates) ? rawObj.unlockedGates : [],
    redeemedCodes: Array.isArray(rawObj.redeemedCodes) ? rawObj.redeemedCodes : [],
  };
  return syncLivesWithClock(merged, Date.now()).updated;
}

function openCandyDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveToIndexedDB(progress: PlayerProgress): Promise<void> {
  const db = await openCandyDB();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(progress, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB write failures gracefully
  }
}

export async function loadFromIndexedDB(): Promise<PlayerProgress | null> {
  const db = await openCandyDB();
  if (!db) return null;
  try {
    return await new Promise<PlayerProgress | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => {
        if (req.result && typeof req.result === 'object') {
          resolve(sanitizeProgress(req.result as Partial<PlayerProgress>));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted?.();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Ignore unsupported environments
  }
  return false;
}

export function loadProgress(): PlayerProgress {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const sanitized = sanitizeProgress(parsed);
    // Migrate legacy key if needed
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function hasLocalStorageSave(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota issues gracefully
  }
  void saveToIndexedDB(progress);
}

export function resetStoredProgress(): PlayerProgress {
  const fresh = { ...DEFAULT_PROGRESS };
  saveProgress(fresh);
  return fresh;
}

export function pickRicherProgress(a: PlayerProgress, b: PlayerProgress): PlayerProgress {
  const starsA = Object.keys(a.levelStars).length;
  const starsB = Object.keys(b.levelStars).length;
  const purchasedUnion = Array.from(
    new Set([...(a.purchasedLevels ?? []), ...(b.purchasedLevels ?? [])])
  ).sort((x, y) => x - y);
  const gatesUnion = Array.from(
    new Set([...(a.unlockedGates ?? []), ...(b.unlockedGates ?? [])])
  ).sort((x, y) => x - y);
  const redeemedUnion = Array.from(
    new Set([...(a.redeemedCodes ?? []), ...(b.redeemedCodes ?? [])])
  );

  const primary =
    b.unlockedLevel > a.unlockedLevel ||
    (b.unlockedLevel === a.unlockedLevel && starsB > starsA) ||
    (b.unlockedLevel === a.unlockedLevel &&
      starsB === starsA &&
      (b.purchasedLevels?.length ?? 0) > (a.purchasedLevels?.length ?? 0))
      ? b
      : a;

  return {
    ...primary,
    purchasedLevels: purchasedUnion,
    unlockedGates: gatesUnion,
    redeemedCodes: redeemedUnion,
  };
}

export function exportBackupCode(progress: PlayerProgress): string {
  const json = JSON.stringify(progress);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `CA1:${btoa(bin)}`;
}

export function importBackupCode(code: string): PlayerProgress | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith('CA1:')) return null;
    const b64 = trimmed.slice(4);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<PlayerProgress>;
    if (typeof parsed.unlockedLevel !== 'number' || typeof parsed.gems !== 'number') {
      return null;
    }
    return sanitizeProgress(parsed);
  } catch {
    return null;
  }
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
