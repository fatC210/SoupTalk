import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultCredentials } from "./constants";
import { loadCredentials, saveCredentials } from "./storage";
import type { Locale, UserCredentials } from "./types";

export function useCredentials() {
  const [credentials, setCredentialsState] = useState<UserCredentials>(defaultCredentials);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCredentialsState(loadCredentials());
    setLoaded(true);
  }, []);

  const setCredentials = useCallback((nextCredentials: UserCredentials) => {
    setCredentialsState(nextCredentials);
    saveCredentials(nextCredentials);
  }, []);

  const updateCredentials = useCallback((patch: Partial<UserCredentials>) => {
    setCredentialsState((currentCredentials) => {
      const nextCredentials = { ...currentCredentials, ...patch };
      saveCredentials(nextCredentials);
      return nextCredentials;
    });
  }, []);

  const locale = credentials.locale;
  const setLocale = useCallback(
    (nextLocale: Locale) => updateCredentials({ locale: nextLocale }),
    [updateCredentials],
  );

  return useMemo(
    () => ({ credentials, loaded, locale, setCredentials, updateCredentials, setLocale }),
    [credentials, loaded, locale, setCredentials, updateCredentials, setLocale],
  );
}
