import { defaultCredentials, difficultyConfig, hostVoicePresets } from "./constants";
import type {
  CredentialValidationRecord,
  GameSession,
  StartGameOptions,
  UserCredentials,
} from "./types";

const credentialsKey = "souptalk.credentials";
const activeSessionKey = "souptalk.activeSession";
const bgmPreferenceKey = "souptalk.bgmEnabled";
const historyKey = "souptalk.history";
const dbName = "souptalk";
const historyStore = "history";
const dbVersion = 1;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadCredentials(): UserCredentials {
  return readJson<UserCredentials>(credentialsKey, defaultCredentials);
}

export function saveCredentials(credentials: UserCredentials) {
  writeJson(credentialsKey, credentials);
}

export function hasRequiredLlmCredentials(credentials: UserCredentials) {
  return Boolean(
    credentials.llmBaseURL.trim() && credentials.llmApiKey.trim() && credentials.llmModel.trim(),
  );
}

export function hasRequiredCredentials(credentials: UserCredentials) {
  return Boolean(hasRequiredLlmCredentials(credentials) && credentials.elevenLabsApiKey.trim());
}

export function fingerprintLlmCredentials(credentials: UserCredentials) {
  return [
    credentials.llmBaseURL.trim().replace(/\/+$/, ""),
    credentials.llmApiKey.trim(),
    credentials.llmModel.trim(),
  ].join("|");
}

export function fingerprintElevenLabsCredentials(credentials: UserCredentials) {
  return credentials.elevenLabsApiKey.trim();
}

function isCurrentValidation(record: CredentialValidationRecord | undefined, fingerprint: string) {
  return record?.status === "valid" && record.fingerprint === fingerprint;
}

export function hasVerifiedLlmCredentials(credentials: UserCredentials) {
  return Boolean(
    hasRequiredLlmCredentials(credentials) &&
    isCurrentValidation(credentials.validation?.llm, fingerprintLlmCredentials(credentials)),
  );
}

export function hasVerifiedElevenLabsCredentials(credentials: UserCredentials) {
  return Boolean(
    credentials.elevenLabsApiKey.trim() &&
    isCurrentValidation(
      credentials.validation?.elevenLabs,
      fingerprintElevenLabsCredentials(credentials),
    ),
  );
}

export function hasVerifiedCredentials(credentials: UserCredentials) {
  return Boolean(
    hasVerifiedLlmCredentials(credentials) && hasVerifiedElevenLabsCredentials(credentials),
  );
}

export function loadActiveSession(): GameSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(activeSessionKey);
    return raw ? normalizeGameSession(JSON.parse(raw) as GameSession) : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: GameSession | null) {
  if (!canUseStorage()) return;
  if (session) writeJson(activeSessionKey, session);
  else window.localStorage.removeItem(activeSessionKey);
}

export function loadBgmPreference() {
  if (!canUseStorage()) return false;
  try {
    return window.localStorage.getItem(bgmPreferenceKey) === "true";
  } catch {
    return false;
  }
}

export function saveBgmPreference(enabled: boolean) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(bgmPreferenceKey, String(enabled));
}

function openSoupTalkDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof window.indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = window.indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(historyStore)) {
        const store = db.createObjectStore(historyStore, { keyPath: "id" });
        store.createIndex("startTime", "startTime");
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
  });
}

function runHistoryTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openSoupTalkDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(historyStore, mode);
        const store = transaction.objectStore(historyStore);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("IndexedDB transaction failed."));
        };
      }),
  );
}

function loadLegacyHistory(): GameSession[] {
  if (!canUseStorage()) return [];
  try {
    return (JSON.parse(window.localStorage.getItem(historyKey) || "[]") as GameSession[]).map(
      normalizeGameSession,
    );
  } catch {
    return [];
  }
}

function clearLegacyHistory() {
  if (canUseStorage()) window.localStorage.removeItem(historyKey);
}

export async function loadHistory(): Promise<GameSession[]> {
  try {
    const history = await runHistoryTransaction<GameSession[]>(
      "readonly",
      (store) => store.getAll() as IDBRequest<GameSession[]>,
    );
    const normalizedHistory = history.map(normalizeGameSession);
    const legacy = loadLegacyHistory().filter(
      (legacySession) => !normalizedHistory.some((session) => session.id === legacySession.id),
    );
    if (legacy.length > 0) {
      await Promise.all(legacy.map((session) => saveToHistory(session)));
      clearLegacyHistory();
      return [...normalizedHistory, ...legacy].sort((a, b) => b.startTime - a.startTime);
    }
    return normalizedHistory.sort((a, b) => b.startTime - a.startTime);
  } catch (error) {
    console.warn("IndexedDB history unavailable; using legacy localStorage history.", error);
    return loadLegacyHistory().sort((a, b) => b.startTime - a.startTime);
  }
}

export async function saveToHistory(session: GameSession) {
  try {
    await runHistoryTransaction<IDBValidKey>("readwrite", (store) => store.put(session));
  } catch (error) {
    console.warn("IndexedDB save failed; falling back to localStorage history.", error);
    const history = loadLegacyHistory().filter((item) => item.id !== session.id);
    writeJson(historyKey, [session, ...history].slice(0, 50));
  }
}

export async function loadHistorySession(id: string): Promise<GameSession | null> {
  try {
    const session = await runHistoryTransaction<GameSession | undefined>(
      "readonly",
      (store) => store.get(id) as IDBRequest<GameSession | undefined>,
    );
    if (session) return normalizeGameSession(session);
  } catch (error) {
    console.warn("IndexedDB history detail unavailable; using legacy localStorage history.", error);
  }
  return loadLegacyHistory().find((session) => session.id === id) ?? null;
}

export async function deleteHistorySession(id: string) {
  try {
    await runHistoryTransaction<undefined>("readwrite", (store) => store.delete(id));
  } catch (error) {
    console.warn("IndexedDB delete failed; falling back to localStorage history delete.", error);
  }
  const legacyHistory = loadLegacyHistory();
  if (legacyHistory.length > 0) {
    writeJson(
      historyKey,
      legacyHistory.filter((session) => session.id !== id),
    );
  }
}

export function buildHistoryExport(session: GameSession) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      session: normalizeGameSession(session),
    },
    null,
    2,
  );
}

export function downloadHistoryJson(session: GameSession) {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildHistoryExport(session)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `souptalk-${session.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeGameSession(session: GameSession): GameSession {
  const host =
    hostVoicePresets.find((preset) => preset.voiceId === session.hostVoiceId) ??
    hostVoicePresets[4];
  const locale = session.locale ?? defaultCredentials.locale;
  const messages = session.messages.map((message, index) =>
    index === 0 && message.role === "host" && message.answerType === "narrative"
      ? { ...message, content: session.puzzle }
      : message,
  );
  return {
    ...session,
    messages,
    hostId: session.hostId ?? host.id,
    hostName: session.hostName ?? host.name,
    hostVoiceId: session.hostVoiceId ?? host.voiceId,
    hostCharacter: session.hostCharacter ?? host.characterDescription[locale],
    bgmVolume: session.bgmVolume ?? 0.35,
    openingSpoken: session.openingSpoken ?? messages.length > 0,
  };
}

export function createSession(
  options: StartGameOptions,
  payload: Omit<
    GameSession,
    | keyof StartGameOptions
    | "id"
    | "messages"
    | "hitKeyPoints"
    | "confirmedClues"
    | "hintsUsed"
    | "startTime"
    | "endTime"
    | "result"
    | "timeLimit"
    | "bgmVolume"
    | "openingSpoken"
    | "fallbackNotice"
  >,
): GameSession {
  const config = difficultyConfig[options.difficulty];
  return {
    id: crypto.randomUUID(),
    difficulty: options.difficulty,
    soupTypes: options.soupTypes,
    puzzle: payload.puzzle,
    truth: payload.truth,
    keyPoints: payload.keyPoints,
    hitKeyPoints: [],
    hostId: payload.hostId,
    hostName: payload.hostName,
    hostVoiceId: payload.hostVoiceId,
    hostCharacter: payload.hostCharacter,
    messages: [],
    confirmedClues: [],
    hintsUsed: 0,
    finalAnswer: undefined,
    startTime: Date.now(),
    bgmEnabled: options.bgmEnabled,
    bgmVolume: 0.35,
    openingSpoken: false,
    locale: payload.locale,
    timeLimit: config.timeLimit,
  };
}
