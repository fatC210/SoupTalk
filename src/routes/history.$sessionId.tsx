import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { translate } from "@/features/souptalk/i18n";
import { loadHistory } from "@/features/souptalk/storage";
import type { GameSession } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";

export const Route = createFileRoute("/history/$sessionId")({
  head: () => ({ meta: [{ title: "Game Detail ? SoupTalk" }] }),
  component: HistoryDetailPage,
});

function HistoryDetailPage() {
  const { sessionId } = Route.useParams();
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);

  useEffect(() => {
    setSession(loadHistory().find((item) => item.id === sessionId) ?? null);
  }, [sessionId]);

  const effectiveLocale = session?.locale ?? locale;

  return (
    <AppFrame
      locale={effectiveLocale}
      onLocaleChange={setLocale}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-5xl italic">
            {translate(effectiveLocale, "viewDetails")}
          </h1>
          <Button
            asChild
            variant="outline"
            className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
          >
            <Link to="/history">{translate(effectiveLocale, "history")}</Link>
          </Button>
        </div>

        {!session ? (
          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardContent className="py-12 text-center text-fog/60">
              {effectiveLocale === "zh" ? "未找到记录。" : "Not found."}
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
                  {session.result === "win"
                    ? translate(effectiveLocale, "won")
                    : session.result === "timeout"
                      ? translate(effectiveLocale, "timeout")
                      : translate(effectiveLocale, "gaveUp")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-5 text-fog">
                <p className="whitespace-pre-line text-lg leading-8">{session.puzzle}</p>
                <div>
                  <h2 className="mb-2 font-serif text-2xl italic text-parchment">
                    {translate(effectiveLocale, "solution")}
                  </h2>
                  <p className="whitespace-pre-line leading-7 text-fog/80">{session.truth}</p>
                </div>
                <div>
                  <h2 className="mb-2 font-serif text-2xl italic text-parchment">
                    {translate(effectiveLocale, "keyProgress")}
                  </h2>
                  <ul className="grid gap-2">
                    {session.keyPoints.map((point, index) => (
                      <li key={point} className="rounded-lg bg-parchment/5 p-3 text-sm">
                        {session.hitKeyPoints.includes(index) ? "?" : "?"} {point}
                      </li>
                    ))}
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
                    className={`rounded-xl p-3 text-sm ${message.role === "user" ? "ml-auto max-w-[80%] bg-parchment text-ink" : "mr-auto max-w-[80%] bg-parchment/8 text-fog"}`}
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
