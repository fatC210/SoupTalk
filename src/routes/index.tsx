import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { difficultyConfig, soupTypeLabels } from "@/features/souptalk/constants";
import { translate } from "@/features/souptalk/i18n";
import { generatePuzzle, getVoiceId } from "@/features/souptalk/llm";
import {
  createSession,
  hasRequiredCredentials,
  saveActiveSession,
} from "@/features/souptalk/storage";
import type { Difficulty, SoupType } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SoupTalk · AI Voice Lateral Thinking Game" },
      {
        name: "description",
        content:
          "Play AI-generated lateral thinking puzzles with local credentials, voice controls, history, and English/Chinese UI.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { credentials, loaded, locale, setCredentials, setLocale } = useCredentials();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [soupTypes, setSoupTypes] = useState<SoupType[]>(["red", "clear", "black"]);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (loaded && !hasRequiredCredentials(credentials)) setSettingsOpen(true);
  }, [credentials, loaded]);

  function toggleSoupType(type: SoupType) {
    setSoupTypes((current) =>
      current.includes(type)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  async function startGame() {
    setIsStarting(true);
    setNotice(null);
    const { puzzle, usedFallback } = await generatePuzzle(
      credentials,
      difficulty,
      soupTypes,
      locale,
    );
    const session = createSession(
      { difficulty, soupTypes, bgmEnabled },
      {
        puzzle: puzzle.puzzle,
        truth: puzzle.truth,
        keyPoints: puzzle.keyPoints,
        hostCharacter: puzzle.hostCharacter || puzzle.suggestedHost,
        hostVoiceId: getVoiceId(locale),
        locale,
      },
    );
    saveActiveSession(session);
    if (usedFallback) setNotice(translate(locale, "localFallback"));
    await navigate({ to: "/play" });
  }

  return (
    <AppFrame
      locale={locale}
      onLocaleChange={setLocale}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-fog/80">
            <Sparkles className="size-3.5 text-ember" /> SoupTalk
          </div>
          <h1 className="font-serif text-6xl italic leading-none md:text-8xl">
            {locale === "zh" ? "真相藏在汤底。" : "Truth is a cold dish."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-fog/75">
            {locale === "zh"
              ? "选择难度与汤面类型，由你的 LLM 动态出题。用文字或语音提问，主持人只能回答：是、否、无关、是也不是。"
              : "Choose difficulty and soup types, then let your LLM generate a fresh mystery. Ask by text or voice; the host can only answer Yes, No, Irrelevant, or Yes and No."}
          </p>
          {notice && (
            <p className="mt-4 rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
              {notice}
            </p>
          )}
        </div>

        <Card className="border-parchment/10 bg-[#14110f]/90 shadow-2xl shadow-blood/10">
          <CardHeader>
            <CardTitle className="font-serif text-3xl italic">
              {translate(locale, "chooseDifficulty")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-3 gap-3">
              {(["easy", "medium", "hard"] as Difficulty[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficulty(item)}
                  className={`rounded-xl border p-4 text-left transition ${
                    difficulty === item
                      ? "border-blood bg-blood/25 text-parchment"
                      : "border-parchment/10 bg-parchment/5 text-fog hover:border-parchment/30"
                  }`}
                >
                  <div className="font-medium">{translate(locale, item)}</div>
                  <div className="mt-2 text-xs leading-5 text-fog/60">
                    {translate(
                      locale,
                      ({ easy: "easyDesc", medium: "mediumDesc", hard: "hardDesc" } as const)[item],
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              <h2 className="font-serif text-xl italic">{translate(locale, "soupType")}</h2>
              {(["red", "clear", "black"] as SoupType[]).map((type) => (
                <Label
                  key={type}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-parchment/10 bg-parchment/5 p-3 text-fog"
                >
                  <Checkbox
                    checked={soupTypes.includes(type)}
                    onCheckedChange={() => toggleSoupType(type)}
                    className="border-parchment/40 data-[state=checked]:bg-blood data-[state=checked]:text-parchment"
                  />
                  {soupTypeLabels[type][locale]}
                </Label>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-parchment/10 bg-parchment/5 p-3">
              <Label className="text-fog">{translate(locale, "bgm")}</Label>
              <Switch checked={bgmEnabled} onCheckedChange={setBgmEnabled} />
            </div>

            <div className="rounded-lg border border-parchment/10 bg-ink/40 p-3 text-sm text-fog/70">
              {locale === "zh"
                ? `本局配置：${difficultyConfig[difficulty].keyRange} 个关键点，${difficulty === "hard" ? "15 分钟限时" : "不限时"}，3 次提示。`
                : `This game: ${difficultyConfig[difficulty].keyRange} key points, ${difficulty === "hard" ? "15 min timer" : "no timer"}, 3 hints.`}
            </div>

            <Button
              className="h-12 bg-parchment text-ink hover:bg-blood hover:text-parchment"
              onClick={startGame}
              disabled={isStarting}
            >
              {isStarting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              {isStarting ? translate(locale, "generating") : translate(locale, "startGame")}
            </Button>
          </CardContent>
        </Card>
      </section>
      <SettingsDialog
        open={settingsOpen}
        onboarding={!hasRequiredCredentials(credentials)}
        credentials={credentials}
        onChange={setCredentials}
        onOpenChange={setSettingsOpen}
      />
    </AppFrame>
  );
}
