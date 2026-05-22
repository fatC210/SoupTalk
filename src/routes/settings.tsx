import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { useCredentials } from "@/features/souptalk/useCredentials";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · SoupTalk" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) navigate({ to: "/" });
  }, [open, navigate]);

  return (
    <AppFrame locale={locale} onLocaleChange={setLocale} onOpenSettings={() => setOpen(true)}>
      <div className="min-h-[calc(100vh-73px)]" />
      <SettingsDialog
        open={open}
        credentials={credentials}
        onChange={setCredentials}
        onOpenChange={setOpen}
      />
    </AppFrame>
  );
}
