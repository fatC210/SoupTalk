import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Loader2, Mic, MicOff, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { translate } from "@/features/souptalk/i18n";
import { answerQuestion, evaluateFinalAnswer } from "@/features/souptalk/llm";
import { loadActiveSession, saveActiveSession, saveToHistory } from "@/features/souptalk/storage";
import type { AnswerType, GameResult, GameSession, Message } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play · SoupTalk" }] }),
  component: PlayPage,
});

type SpeechRecognitionResultLike = { 0?: { transcript?: string } };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

function PlayPage() {
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [session, setSession] = useState<GameSession | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [speakAnswer, setSpeakAnswer] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const activeSession = loadActiveSession();
    setSession(activeSession);
    if (activeSession?.timeLimit && !activeSession.result) {
      setSecondsLeft(
        Math.max(
          0,
          activeSession.timeLimit - Math.floor((Date.now() - activeSession.startTime) / 1000),
        ),
      );
    }
  }, []);

  useEffect(() => {
    if (!session?.timeLimit || session.result) return;
    const timer = window.setInterval(() => {
      const nextSecondsLeft = Math.max(
        0,
        session.timeLimit! - Math.floor((Date.now() - session.startTime) / 1000),
      );
      setSecondsLeft(nextSecondsLeft);
      if (nextSecondsLeft <= 0) endGame("timeout");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.result]);

  useEffect(() => {
    if (session) saveActiveSession(session);
  }, [session]);

  const effectiveLocale = session?.locale ?? locale;
  const speechSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const progress = session
    ? Math.round((session.hitKeyPoints.length / session.keyPoints.length) * 100)
    : 0;

  function updateSession(updater: (session: GameSession) => GameSession) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;
      const nextSession = updater(currentSession);
      saveActiveSession(nextSession);
      return nextSession;
    });
  }

  function appendMessages(messages: Message[]) {
    updateSession((currentSession) => ({
      ...currentSession,
      messages: [...currentSession.messages, ...messages],
    }));
  }

  function speak(text: string) {
    if (!speakAnswer || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = effectiveLocale === "zh" ? "zh-CN" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function submitQuestion(finalGuess = false) {
    const content = input.trim();
    if (!session || !content || busy || session.result) return;
    setBusy(true);
    setInput("");
    const userMessage: Message = { role: "user", content, timestamp: Date.now() };

    if (finalGuess) {
      const evaluation = await evaluateFinalAnswer(
        credentials,
        session.keyPoints,
        content,
        session.locale,
      );
      const mergedHits = Array.from(
        new Set([...session.hitKeyPoints, ...evaluation.coveredKeyPoints]),
      ).sort((a, b) => a - b);
      const hostText = evaluation.isWin
        ? `${evaluation.feedback}\n\n${session.truth}`
        : evaluation.feedback;
      const hostMessage: Message = {
        role: "host",
        content: hostText,
        answerType: evaluation.isWin ? "narrative" : "yes_and_no",
        timestamp: Date.now(),
      };
      const nextSession: GameSession = {
        ...session,
        hitKeyPoints: mergedHits,
        messages: [...session.messages, userMessage, hostMessage],
        ...(evaluation.isWin ? { result: "win", endTime: Date.now() } : {}),
      };
      setSession(nextSession);
      saveActiveSession(evaluation.isWin ? null : nextSession);
      if (evaluation.isWin) saveToHistory(nextSession);
      speak(hostText);
      setBusy(false);
      return;
    }

    const answer = await answerQuestion(credentials, session, content);
    const hit =
      typeof answer.keyPointHit === "number" && answer.keyPointHit >= 0 ? answer.keyPointHit : null;
    const hitKeyPoints =
      hit === null ? session.hitKeyPoints : Array.from(new Set([...session.hitKeyPoints, hit]));
    const confirmedClues = answer.newClue
      ? Array.from(new Set([...session.confirmedClues, answer.newClue]))
      : session.confirmedClues;
    const wonByClues = hitKeyPoints.length >= session.keyPoints.length;
    const hostText = wonByClues ? `${answer.speech}\n\n${session.truth}` : answer.speech;
    const hostMessage: Message = {
      role: "host",
      content: hostText,
      answerType: wonByClues ? "narrative" : answer.answerType,
      timestamp: Date.now(),
    };
    const nextSession: GameSession = {
      ...session,
      hitKeyPoints,
      confirmedClues,
      messages: [...session.messages, userMessage, hostMessage],
      ...(wonByClues ? { result: "win", endTime: Date.now() } : {}),
    };
    setSession(nextSession);
    saveActiveSession(wonByClues ? null : nextSession);
    if (wonByClues) saveToHistory(nextSession);
    speak(hostText);
    setBusy(false);
  }

  function useHint() {
    if (!session || session.hintsUsed >= 3 || session.result) return;
    const missingIndex = session.keyPoints.findIndex(
      (_, index) => !session.hitKeyPoints.includes(index),
    );
    const clue = missingIndex >= 0 ? session.keyPoints[missingIndex] : session.keyPoints[0];
    const hintText =
      effectiveLocale === "zh" ? `提示：留意「${clue}」。` : `Hint: pay attention to “${clue}.”`;
    appendMessages([
      { role: "host", content: hintText, answerType: "narrative", timestamp: Date.now() },
    ]);
    updateSession((currentSession) => ({
      ...currentSession,
      hintsUsed: currentSession.hintsUsed + 1,
    }));
    speak(hintText);
  }

  function endGame(result: GameResult) {
    setSession((currentSession) => {
      if (!currentSession || currentSession.result) return currentSession;
      const message =
        result === "timeout"
          ? translate(currentSession.locale, "timeout")
          : translate(currentSession.locale, "gaveUp");
      const nextSession: GameSession = {
        ...currentSession,
        result,
        endTime: Date.now(),
        messages: [
          ...currentSession.messages,
          {
            role: "host",
            content: `${message}\n\n${currentSession.truth}`,
            answerType: "narrative",
            timestamp: Date.now(),
          },
        ],
      };
      saveToHistory(nextSession);
      saveActiveSession(null);
      speak(nextSession.truth);
      return nextSession;
    });
  }

  function toggleListening() {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = effectiveLocale === "zh" ? "zh-CN" : "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result: SpeechRecognitionResultLike) => result[0]?.transcript ?? "")
        .join(" ");
      setInput((current) => `${current}${current ? " " : ""}${transcript}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const resultLabel = useMemo(() => {
    if (!session?.result) return null;
    if (session.result === "win") return translate(effectiveLocale, "won");
    if (session.result === "timeout") return translate(effectiveLocale, "timeout");
    return translate(effectiveLocale, "gaveUp");
  }, [session?.result, effectiveLocale]);

  if (!session) {
    return (
      <AppFrame
        locale={locale}
        onLocaleChange={setLocale}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        <div className="mx-auto flex min-h-[calc(100vh-73px)] max-w-xl flex-col items-center justify-center px-4 text-center">
          <p className="text-fog/70">{translate(locale, "noGame")}</p>
          <Button
            asChild
            className="mt-6 bg-parchment text-ink hover:bg-blood hover:text-parchment"
          >
            <Link to="/">{translate(locale, "backHome")}</Link>
          </Button>
        </div>
        <SettingsDialog
          open={settingsOpen}
          credentials={credentials}
          onChange={setCredentials}
          onOpenChange={setSettingsOpen}
        />
      </AppFrame>
    );
  }

  return (
    <AppFrame
      locale={effectiveLocale}
      onLocaleChange={setLocale}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="grid gap-6">
          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="font-serif text-3xl italic">
                  {translate(effectiveLocale, "surface")}
                </CardTitle>
                {resultLabel && <Badge className="bg-blood text-parchment">{resultLabel}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="whitespace-pre-line text-lg leading-8 text-fog">{session.puzzle}</p>
              <div className="grid gap-2 text-sm text-fog/70">
                <div className="flex justify-between">
                  <span>{translate(effectiveLocale, "keyProgress")}</span>
                  <span>
                    {session.hitKeyPoints.length}/{session.keyPoints.length}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-parchment/10">
                  <div className="h-full bg-blood" style={{ width: `${progress}%` }} />
                </div>
                {secondsLeft !== null && (
                  <div className="flex justify-between">
                    <span>{translate(effectiveLocale, "timeLeft")}</span>
                    <span>{formatSeconds(secondsLeft)}</span>
                  </div>
                )}
                <div>
                  {translate(effectiveLocale, "hintsLeft")}: {Math.max(0, 3 - session.hintsUsed)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                  onClick={useHint}
                  disabled={session.hintsUsed >= 3 || Boolean(session.result)}
                >
                  {translate(effectiveLocale, "getHint")}
                </Button>
                <Button
                  variant="outline"
                  className="border-blood/50 bg-blood/10 text-parchment hover:bg-blood"
                  onClick={() => endGame("give_up")}
                  disabled={Boolean(session.result)}
                >
                  {translate(effectiveLocale, "giveUp")}
                </Button>
                <Button asChild variant="ghost" className="text-fog hover:text-ink">
                  <Link to="/">
                    <Home className="mr-2 size-4" />
                    {translate(effectiveLocale, "newGame")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardHeader>
              <CardTitle className="font-serif text-2xl italic">
                {translate(effectiveLocale, "clues")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session.confirmedClues.length ? (
                <ul className="grid gap-2 text-sm text-fog/80">
                  {session.confirmedClues.map((clue) => (
                    <li key={clue} className="rounded-lg bg-parchment/5 p-3">
                      {clue}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fog/50">{translate(effectiveLocale, "noClues")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardHeader>
              <CardTitle className="font-serif text-2xl italic">
                {translate(effectiveLocale, "voicePanel")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-fog/65">
                {translate(effectiveLocale, speechSupported ? "voiceNote" : "unsupportedVoice")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                  onClick={toggleListening}
                  disabled={!speechSupported || Boolean(session.result)}
                >
                  {listening ? <MicOff className="mr-2 size-4" /> : <Mic className="mr-2 size-4" />}
                  {listening
                    ? translate(effectiveLocale, "stop")
                    : translate(effectiveLocale, "listen")}
                </Button>
                <Label className="flex items-center gap-2 text-sm text-fog">
                  <Switch checked={speakAnswer} onCheckedChange={setSpeakAnswer} />
                  <Volume2 className="size-4" /> {translate(effectiveLocale, "speakAnswer")}
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-parchment/10 bg-[#14110f]/90">
            <CardHeader>
              <CardTitle className="font-serif text-2xl italic">
                {translate(effectiveLocale, "transcript")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[430px] space-y-3 overflow-y-auto pr-2">
                {session.messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.timestamp}-${index}`}
                    message={message}
                    locale={effectiveLocale}
                  />
                ))}
              </div>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={translate(effectiveLocale, "askPlaceholder")}
                className="min-h-24 border-parchment/15 bg-ink/50 text-parchment"
                disabled={Boolean(session.result)}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                  onClick={() => submitQuestion(true)}
                  disabled={busy || Boolean(session.result)}
                >
                  {translate(effectiveLocale, "finalGuess")}
                </Button>
                <Button
                  className="bg-parchment text-ink hover:bg-blood hover:text-parchment"
                  onClick={() => submitQuestion(false)}
                  disabled={busy || Boolean(session.result)}
                >
                  {busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  {busy
                    ? translate(effectiveLocale, "thinking")
                    : translate(effectiveLocale, "ask")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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

function MessageBubble({ message, locale }: { message: Message; locale: "en" | "zh" }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "bg-parchment text-ink" : "bg-parchment/8 text-fog"}`}
      >
        {!isUser && message.answerType && (
          <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-ember">
            {answerLabel(message.answerType, locale)}
          </div>
        )}
        <p className="whitespace-pre-line text-sm leading-6">{message.content}</p>
      </div>
    </div>
  );
}

function answerLabel(type: AnswerType, locale: "en" | "zh") {
  const labels: Record<AnswerType, Record<"en" | "zh", string>> = {
    yes: { en: "Yes", zh: "是" },
    no: { en: "No", zh: "否" },
    irrelevant: { en: "Irrelevant", zh: "无关" },
    yes_and_no: { en: "Yes and No", zh: "是也不是" },
    clarify: { en: "Clarify", zh: "请澄清" },
    narrative: { en: "Narrative", zh: "叙述" },
  };
  return labels[type][locale];
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}
