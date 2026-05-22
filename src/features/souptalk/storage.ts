import { defaultCredentials, difficultyConfig } from "./constants";
import type { GameSession, StartGameOptions, UserCredentials } from "./types";

const credentialsKey = "souptalk.credentials";
const activeSessionKey = "souptalk.activeSession";
const historyKey = "souptalk.history";

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

export function hasRequiredCredentials(credentials: UserCredentials) {
  return Boolean(
    credentials.llmBaseURL.trim() &&
    credentials.llmApiKey.trim() &&
    credentials.llmModel.trim() &&
    credentials.elevenLabsApiKey.trim(),
  );
}

export function loadActiveSession(): GameSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(activeSessionKey);
    return raw ? (JSON.parse(raw) as GameSession) : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: GameSession | null) {
  if (!canUseStorage()) return;
  if (session) writeJson(activeSessionKey, session);
  else window.localStorage.removeItem(activeSessionKey);
}

export function loadHistory(): GameSession[] {
  if (!canUseStorage()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(historyKey) || "[]") as GameSession[];
  } catch {
    return [];
  }
}

export function saveToHistory(session: GameSession) {
  const history = loadHistory().filter((item) => item.id !== session.id);
  writeJson(historyKey, [session, ...history].slice(0, 50));
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
    hostVoiceId: payload.hostVoiceId,
    hostCharacter: payload.hostCharacter,
    messages: [],
    confirmedClues: [],
    hintsUsed: 0,
    startTime: Date.now(),
    bgmEnabled: options.bgmEnabled,
    locale: payload.locale,
    timeLimit: config.timeLimit,
  };
}
