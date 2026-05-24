import { create } from "zustand";
import { defaultCredentials } from "./constants";
import {
  loadActiveSession,
  loadCredentials,
  saveActiveSession,
  saveCredentials,
} from "./storage";
import type { GameSession, Locale, UserCredentials } from "./types";

interface SoupTalkState {
  credentials: UserCredentials;
  loaded: boolean;
  activeSession: GameSession | null;
  hydrate: () => void;
  setCredentials: (credentials: UserCredentials) => void;
  updateCredentials: (patch: Partial<UserCredentials>) => void;
  setLocale: (locale: Locale) => void;
  setActiveSession: (session: GameSession | null) => void;
  updateActiveSession: (updater: (session: GameSession) => GameSession) => void;
}

export const useSoupTalkStore = create<SoupTalkState>((set) => ({
  credentials: defaultCredentials,
  loaded: false,
  activeSession: null,
  hydrate: () =>
    set({
      credentials: loadCredentials(),
      activeSession: loadActiveSession(),
      loaded: true,
    }),
  setCredentials: (credentials) => {
    saveCredentials(credentials);
    set({ credentials });
  },
  updateCredentials: (patch) =>
    set((state) => {
      const credentials = { ...state.credentials, ...patch };
      saveCredentials(credentials);
      return { credentials };
    }),
  setLocale: (locale) =>
    set((state) => {
      const credentials = { ...state.credentials, locale };
      saveCredentials(credentials);
      const activeSession = state.activeSession
        ? { ...state.activeSession, locale }
        : state.activeSession;
      if (activeSession) saveActiveSession(activeSession);
      return { credentials, activeSession };
    }),
  setActiveSession: (activeSession) => {
    saveActiveSession(activeSession);
    set({ activeSession });
  },
  updateActiveSession: (updater) =>
    set((state) => {
      if (!state.activeSession) return state;
      const activeSession = updater(state.activeSession);
      saveActiveSession(activeSession);
      return { activeSession };
    }),
}));
