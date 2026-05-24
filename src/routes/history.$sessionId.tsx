import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { translate } from "@/features/souptalk/i18n";
import {
  deleteHistorySession,
  downloadHistoryJson,
  loadHistorySession,
} from "@/features/souptalk/storage";
import type { GameSession } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";

export const Route = createFileRoute("/history/$sessionId")({
  head: () => ({ meta: [{ title: "Game Detail · SoupTalk" }] }),
  component: HistoryDetailPage,
});

function HistoryDetailPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void loadHistorySession(sessionId).then((nextSession) => {
      if (!cancelled) {
        setSession(nextSession);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const effectiveLocale = session?.locale ?? locale;

  async function deleteCurrentSession() {
    if (!session) return;
    await deleteHistorySession(session.id);
    await navigate({ to: "/history" });
  }

  return (
    <AppFrame
      locale={effectiveLocale}
      onLocaleChange={setLocale}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-5xl italic">
            {translate(effectiveLocale, "viewDetails")}
          </h1>
          <div className="flex flex-wrap gap-2">
            {session && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                  onClick={() => downloadHistoryJson(session)}
                >
                  <Download className="mr-2 size-4" />
                  {translate(effectiveLocale, "exportJson")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-blood/50 bg-blood/10 text-parchment hover:bg-blood"
                  onClick={deleteCurrentSession}
                >
                  <Trash2 className="mr-2 size-4" />
                  {translate(effectiveLocale, "deleteRecord")}
                </Button>
              </>
            )}
            <Button
              asChild
              variant="outline"
              className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
            >
              <Link to="/history">{translate(effectiveLocale, "history")}</Link>
            </Button>
          </div>
        </div>

        {!session ? (
          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardContent className="py-12 text-center text-fog/60">
              {loaded
                ? effectiveLocale === "zh"
                  ? "未找到记录。"
                  : "Not found."
                : effectiveLocale === "zh"
                  ? "正在加载..."
                  : "Loading..."}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-parchment/10 bg-[#14110f]/90">
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <CardTitle className="font-serif text-3xl italic">
                  {translate(effectiveLocale, "surface")}
                </CardTitle>
                <Badge className="bg-blood text-parchment">
                  {resultLabel(session, effectiveLocale)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6 text-fog">
                <div className="grid gap-3 text-sm text-fog/70 sm:grid-cols-2 lg:grid-cols-4">
                  <MetaItem
                    label={translate(effectiveLocale, "date")}
                    value={new Date(session.startTime).toLocaleString()}
                  />
                  <MetaItem
                    label={translate(effectiveLocale, "duration")}
                    value={formatDuration(session)}
                  />
                  <MetaItem
                    label={translate(effectiveLocale, "soupTypes")}
                    value={session.soupTypes.join(", ")}
                  />
                  <MetaItem
                    label={translate(effectiveLocale, "hintsLeft")}
                    value={`${Math.max(0, 3 - session.hintsUsed)}/3`}
                  />
                </div>

                <p className="whitespace-pre-line text-lg leading-8">{session.puzzle}</p>

                <div>
                  <h2 className="mb-2 font-serif text-2xl italic text-parchment">
                    {translate(effectiveLocale, "solution")}
                  </h2>
                  <p className="whitespace-pre-line leading-7 text-fog/80">{session.truth}</p>
                </div>

                <div>
                  <h2 className="mb-2 font-serif text-2xl italic text-parchment">
                    {translate(effectiveLocale, "finalAnswer")}
                  </h2>
                  <p className="whitespace-pre-line rounded-lg bg-parchment/5 p-3 text-sm leading-6 text-fog/80">
                    {session.finalAnswer || translate(effectiveLocale, "noFinalAnswer")}
                  </p>
                </div>

                <div>
                  <h2 className="mb-2 font-serif text-2xl italic text-parchment">
                    {translate(effectiveLocale, "keyPoints")}
                  </h2>
                  <ul className="grid gap-2">
                    {session.keyPoints.map((point, index) => {
                      const hit = session.hitKeyPoints.includes(index);
                      return (
                        <li
                          key={point}
                          className="flex flex-col gap-2 rounded-lg bg-parchment/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span>{point}</span>
                          <Badge
                            variant="outline"
                            className={
                              hit
                                ? "w-fit border-ember/40 text-ember"
                                : "w-fit border-parchment/20 text-fog/60"
                            }
                          >
                            {translate(effectiveLocale, hit ? "hit" : "missed")}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-parchment/10 bg-[#14110f]/90">
              <CardHeader>
                <CardTitle className="font-serif text-2xl italic">
                  {translate(effectiveLocale, "transcript")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {session.messages.map((message, index) => (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`rounded-xl p-3 text-sm ${
                      message.role === "user"
                        ? "ml-auto max-w-[80%] bg-parchment text-ink"
                        : "mr-auto max-w-[80%] bg-parchment/8 text-fog"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-6">{message.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </section>
      <SettingsDialog
        open={settingsOpen}
        credentials={credentials}
        onChange={setCredentials}
        onOpenChange={setSettingsOpen}
      />
    </AppFrame>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-parchment/5 p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-fog/45">{label}</div>
      <div className="mt-1 text-parchment">{value}</div>
    </div>
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
