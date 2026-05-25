import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CircleHelp, Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { soupTypeLabels } from "@/features/souptalk/constants";
import { translate } from "@/features/souptalk/i18n";
import { generatePuzzle, getHostPreset } from "@/features/souptalk/llm";
import {
  createSession,
  hasRequiredLlmCredentials,
  saveActiveSession,
} from "@/features/souptalk/storage";
import type { Difficulty, SoupType } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";
import { useSoupTalkStore } from "@/features/souptalk/store";

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
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const setActiveSession = useSoupTalkStore((state) => state.setActiveSession);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [soupType, setSoupType] = useState<SoupType>("red");
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const missingLlmCredentials = !hasRequiredLlmCredentials(credentials);
  const howToSteps =
    locale === "zh"
      ? [
          "先读汤面，找出最反常的地方。",
          "一次只问一个能回答“是/否/无关”的问题。",
          "把已确认线索串成因果链，最后提交完整汤底。",
        ]
      : [
          "Read the surface and identify the strangest detail.",
          "Ask one yes/no question at a time.",
          "Connect confirmed clues into a cause-and-effect chain, then submit the full truth.",
        ];
  const exampleTurns =
    locale === "zh"
      ? [
          ["你问", "蛋糕是给琳娜自己的吗？"],
          ["主持人", "否。"],
          ["你问", "蛋糕是给一个已经不在她身边的人的吗？"],
          ["主持人", "是。"],
          ["你问", "长椅和那个人失踪有关吗？"],
          ["主持人", "是。"],
        ]
      : [
          ["You ask", "Was the cake for Lina herself?"],
          ["Host", "No."],
          ["You ask", "Was it for someone who is no longer with her?"],
          ["Host", "Yes."],
          ["You ask", "Is the bench connected to that person's disappearance?"],
          ["Host", "Yes."],
        ];

  useEffect(() => {
    if (missingLlmCredentials) return;
    setNotice((current) =>
      current === translate("en", "configureLlmFirst") ||
      current === translate("zh", "configureLlmFirst")
        ? null
        : current,
    );
  }, [missingLlmCredentials]);

  async function startGame() {
    if (missingLlmCredentials) {
      setNotice(translate(locale, "configureLlmFirst"));
      return;
    }
    setIsStarting(true);
    setNotice(null);
    const soupTypes = [soupType];
    const { puzzle, usedFallback, fallbackReason } = await generatePuzzle(
      credentials,
      difficulty,
      soupTypes,
      locale,
    );
    const host = getHostPreset(
      `${puzzle.suggestedHost} ${puzzle.hostCharacter}`,
      locale,
      soupTypes,
    );
    const session = createSession(
      { difficulty, soupTypes, bgmEnabled },
      {
        puzzle: puzzle.puzzle,
        truth: puzzle.truth,
        keyPoints: puzzle.keyPoints,
        hostId: host.id,
        hostName: host.name,
        hostCharacter: puzzle.hostCharacter || host.characterDescription[locale],
        hostVoiceId: host.voiceId,
        locale,
      },
    );
    session.messages = [
      {
        role: "host",
        content: session.puzzle,
        answerType: "narrative",
        timestamp: Date.now(),
      },
    ];
    if (usedFallback) {
      session.fallbackNotice = fallbackReason ?? translate(locale, "localFallback");
    }
    setActiveSession(session);
    saveActiveSession(session);
    await navigate({ to: "/play" });
  }

  return (
    <AppFrame
      locale={locale}
      onLocaleChange={setLocale}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <section className="mx-auto grid h-[calc(100dvh-73px)] max-w-6xl items-center gap-6 overflow-hidden px-4 py-5 md:grid-cols-[1fr_0.95fr] md:px-8 lg:gap-8">
        <div className="grid gap-4">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-fog/80">
                <Sparkles className="size-3.5 text-ember" /> SoupTalk
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-full border-ember/35 bg-ember/10 text-ember hover:bg-ember hover:text-ink"
                onClick={() => setGuideOpen(true)}
                aria-label={locale === "zh" ? "新手引导" : "How to play"}
                title={locale === "zh" ? "新手引导" : "How to play"}
              >
                <CircleHelp className="size-4" />
              </Button>
            </div>
            <h1 className="font-serif text-5xl italic leading-none md:text-7xl lg:text-8xl">
              {locale === "zh" ? "真相藏在汤底。" : "Truth is a cold dish."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-fog/75 lg:text-lg lg:leading-8">
              {locale === "zh"
                ? "这不是填空题。你会看到一段反常的故事开头，然后全程用语音连续提问；主持人只能回答：是、否、无关、是也不是。"
                : "Choose difficulty and soup types, then let your LLM generate a fresh mystery. Ask aloud through ElevenLabs Speech Engine; the host can only answer Yes, No, Irrelevant, or Yes and No."}
            </p>
          </div>
          {notice && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember sm:flex-row sm:items-center sm:justify-between">
              <p>{notice}</p>
              {missingLlmCredentials && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-fit border-ember/40 bg-transparent text-parchment hover:bg-ember hover:text-ink"
                  onClick={() => setSettingsOpen(true)}
                >
                  {translate(locale, "openSettings")}
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="border-parchment/10 bg-[#14110f]/90 shadow-2xl shadow-blood/10">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-3xl italic md:text-4xl">
              {translate(locale, "chooseDifficulty")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              {(["easy", "medium", "hard"] as Difficulty[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficulty(item)}
                  className={`rounded-lg border px-4 py-5 text-left transition ${
                    difficulty === item
                      ? "border-blood bg-blood/25 text-parchment"
                      : "border-parchment/10 bg-parchment/5 text-fog hover:border-parchment/30"
                  }`}
                >
                  <div className="text-lg font-medium">{translate(locale, item)}</div>
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <h2 className="font-serif text-xl italic">{translate(locale, "soupType")}</h2>
              <RadioGroup
                value={soupType}
                onValueChange={(value) => setSoupType(value as SoupType)}
              >
                {(["red", "clear", "black"] as SoupType[]).map((type) => (
                  <Label
                    key={type}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-parchment/10 bg-parchment/5 p-3 text-fog"
                  >
                    <RadioGroupItem
                      value={type}
                      className="border-parchment/40 text-blood [&_svg]:fill-blood"
                    />
                    {soupTypeLabels[type][locale]}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-parchment/10 bg-parchment/5 p-3">
              <Label className="text-fog">{translate(locale, "bgm")}</Label>
              <Switch checked={bgmEnabled} onCheckedChange={setBgmEnabled} />
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
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto border-parchment/10 bg-[#14110f] text-parchment">
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl italic">
              {locale === "zh" ? "第一次玩该怎么问？" : "How to play"}
            </DialogTitle>
            <DialogDescription className="text-fog/70">
              {locale === "zh"
                ? "海龟汤的常见玩法是“玩家提问，主持人按汤底判断”。你不是从原文里猜空格，而是通过问题缩小真相范围。"
                : "A lateral thinking puzzle is usually played by asking questions. You are not filling blanks in the text; you narrow the hidden truth by testing assumptions."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {howToSteps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-lg border border-parchment/10 bg-parchment/[0.04] p-3 text-sm leading-6 text-fog/75"
                >
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-ember">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  {step}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-parchment/10 bg-ink/45 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-ember">
                {locale === "zh" ? "示例" : "Example"}
              </div>
              <p className="mt-2 text-sm leading-6 text-fog/75">
                {locale === "zh"
                  ? "汤面：每周五，琳娜把生日蛋糕放在空长椅上。某天蛋糕消失后，她终于不哭了。"
                  : "Surface: Every Friday, Lina leaves a birthday cake on an empty bench. One evening it disappears, and she finally stops crying."}
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                {exampleTurns.map(([speaker, text]) => (
                  <div key={`${speaker}-${text}`} className="grid grid-cols-[4.5rem_1fr] gap-3">
                    <span className="text-ember/90">{speaker}</span>
                    <span className="text-fog/80">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SettingsDialog
        open={settingsOpen}
        credentials={credentials}
        onChange={setCredentials}
        onOpenChange={setSettingsOpen}
      />
    </AppFrame>
  );
}
