import { useEffect, useMemo } from "react";
import { useSoupTalkStore } from "./store";

export function useCredentials() {
  const credentials = useSoupTalkStore((state) => state.credentials);
  const loaded = useSoupTalkStore((state) => state.loaded);
  const hydrate = useSoupTalkStore((state) => state.hydrate);
  const setCredentials = useSoupTalkStore((state) => state.setCredentials);
  const updateCredentials = useSoupTalkStore((state) => state.updateCredentials);
  const setLocale = useSoupTalkStore((state) => state.setLocale);

  useEffect(() => {
    if (!loaded) hydrate();
  }, [hydrate, loaded]);

  const locale = credentials.locale;
  return useMemo(
    () => ({ credentials, loaded, locale, setCredentials, updateCredentials, setLocale }),
    [credentials, loaded, locale, setCredentials, updateCredentials, setLocale],
  );
}
