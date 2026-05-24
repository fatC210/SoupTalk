import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { translate } from "@/features/souptalk/i18n";
import {
  deleteHistorySession,
  downloadHistoryJson,
  loadHistory,
} from "@/features/souptalk/storage";
import type { GameSession } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History · SoupTalk" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState<GameSession[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<GameSession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHistory().then((sessions) => {
      if (!cancelled) setHistory(sessions);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteHistorySession(deleteTarget.id);
    setDeleteTarget(null);
    setNotice(translate(locale, "deleted"));
    setHistory(await loadHistory());
  }

  return (
    <AppFrame
      locale={locale}
      onLocaleChange={setLocale}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-5xl italic">{translate(locale, "historyTitle")}</h1>
            <p className="mt-3 text-fog/60">
              {locale === "zh"
                ? "回看你完成或放弃的每一局。"
                : "Review every solved, abandoned, or timed-out game."}
            </p>
          </div>
          <Button asChild className="bg-parchment text-ink hover:bg-blood hover:text-parchment">
            <Link to="/">{translate(locale, "startGame")}</Link>
          </Button>
        </div>

        {notice && (
          <div className="mb-4 rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
            {notice}
          </div>
        )}

        {history.length === 0 ? (
          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardContent className="py-12 text-center text-fog/60">
              {translate(locale, "emptyHistory")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {history.map((session) => (
              <Card key={session.id} className="border-parchment/10 bg-[#14110f]/90">
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="font-serif text-2xl italic">
                      {session.puzzle.slice(0, 90)}
                      {session.puzzle.length > 90 ? "..." : ""}
                    </CardTitle>
                    <p className="mt-2 text-sm text-fog/60">
                      {new Date(session.startTime).toLocaleString()} ·{" "}
                      {translate(locale, session.difficulty)} · {translate(locale, "duration")}{" "}
                      {formatDuration(session)}
                    </p>
                  </div>
                  <Badge className="bg-blood text-parchment">{resultLabel(session, locale)}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-fog/70">
                    {translate(locale, "keyProgress")}: {session.hitKeyPoints.length}/
                    {session.keyPoints.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                      onClick={() => downloadHistoryJson(session)}
                    >
                      <Download className="mr-2 size-4" />
                      {translate(locale, "exportJson")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blood/50 bg-blood/10 text-parchment hover:bg-blood"
                      onClick={() => setDeleteTarget(session)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      {translate(locale, "deleteRecord")}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                    >
                      <Link to="/history/$sessionId" params={{ sessionId: session.id }}>
                        {translate(locale, "viewDetails")} <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      <SettingsDialog
        open={settingsOpen}
        credentials={credentials}
        onChange={setCredentials}
        onOpenChange={setSettingsOpen}
      />
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-parchment/10 bg-[#14110f] text-parchment">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl italic">
              {translate(locale, "deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-fog/65">
              {translate(locale, "deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink">
              {translate(locale, "cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-blood text-parchment hover:bg-blood/80"
              onClick={confirmDelete}
            >
              {translate(locale, "deleteRecord")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppFrame>
  );
}

function resultLabel(session: GameSession, locale: "en" | "zh") {
  if (session.result === "win") return translate(locale, "won");
  if (session.result === "timeout") return translate(locale, "timeout");
  return translate(locale, "gaveUp");
}

function formatDuration(session: GameSession) {
  const seconds = Math.max(
    0,
    Math.floor(((session.endTime ?? Date.now()) - session.startTime) / 1000),
  );
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}
