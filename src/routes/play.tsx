import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  History,
  Home,
  Loader2,
  Mic,
  MicOff,
  Music,
  Music2,
  PartyPopper,
  Radio,
  RefreshCcw,
  Send,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppFrame } from "@/features/souptalk/AppFrame";
import { SettingsDialog } from "@/features/souptalk/SettingsDialog";
import { translate } from "@/features/souptalk/i18n";
import {
  answerQuestion,
  checkReasoning,
  evaluateFinalAnswer,
  generateHint,
} from "@/features/souptalk/llm";
import {
  hasRequiredLlmCredentials,
  hasVerifiedElevenLabsCredentials,
  saveToHistory,
} from "@/features/souptalk/storage";
import {
  getVoiceCapability,
  generateBgmWithElevenLabs,
  getElevenLabsFallbackReason,
  normalizeSpeechText,
  playAnswerCue,
  speakWithElevenLabs,
  startElevenLabsSpeechRecognizer,
} from "@/features/souptalk/speech";
import { useSoupTalkStore } from "@/features/souptalk/store";
import type { AnswerType, GameResult, GameSession, Message } from "@/features/souptalk/types";
import { useCredentials } from "@/features/souptalk/useCredentials";
import type { ElevenLabsSpeechRecognizer } from "@/features/souptalk/speech";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Play \u00b7 SoupTalk" }] }),
  component: PlayPage,
});

type VoiceCaptureStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "paused"
  | "unavailable"
  | "error";

function PlayPage() {
  const { credentials, locale, setCredentials, setLocale } = useCredentials();
  const storeSession = useSoupTalkStore((state) => state.activeSession);
  const setActiveSession = useSoupTalkStore((state) => state.setActiveSession);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [finishedSession, setFinishedSession] = useState<GameSession | null>(null);
  const [input, setInput] = useState("");
  const [finalAnswer, setFinalAnswer] = useState("");
  const [finalAnswerOpen, setFinalAnswerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [reasoningBusy, setReasoningBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<VoiceCaptureStatus>("idle");
  const [voicePaused, setVoicePaused] = useState(false);
  const [speechInputBlocked, setSpeechInputBlocked] = useState(false);
  const speechRecognizerRef = useRef<ElevenLabsSpeechRecognizer | null>(null);
  const audioAbortRef = useRef<AbortController | null>(null);
  const bgmAbortRef = useRef<AbortController | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmObjectUrlRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const finalAnswerOpenRef = useRef(false);
  const pendingVoiceQuestionRef = useRef<string | null>(null);
  const lastVoiceQuestionRef = useRef<{ content: string; timestamp: number } | null>(null);
  const openingPlaybackSessionRef = useRef<string | null>(null);
  const session = storeSession ?? finishedSession;
  const effectiveLocale = session?.locale ?? locale;
  const voiceCapability = getVoiceCapability(credentials);
  const usingElevenLabsVoice = voiceCapability === "elevenlabs";
  const canUseSpeechEngine =
    Boolean(storeSession) &&
    !storeSession?.result &&
    hasVerifiedElevenLabsCredentials(credentials) &&
    usingElevenLabsVoice;
  const activeSessionId = storeSession?.id;
  const activeSessionLocale = storeSession?.locale;
  const activeSessionResult = storeSession?.result;
  const activeSessionOpeningSpoken = storeSession?.openingSpoken;
  const activeSessionPuzzle = storeSession?.puzzle;
  const progress = session
    ? Math.round((session.hitKeyPoints.length / session.keyPoints.length) * 100)
    : 0;
  const voiceState = getVoiceState(voiceStatus, effectiveLocale);

  function updateSession(updater: (session: GameSession) => GameSession) {
    useSoupTalkStore.getState().updateActiveSession(updater);
  }

  function appendMessages(messages: Message[]) {
    if (finishedSession) {
      setFinishedSession((currentSession) =>
        currentSession
          ? { ...currentSession, messages: [...currentSession.messages, ...messages] }
          : currentSession,
      );
      return;
    }
    updateSession((currentSession) => ({
      ...currentSession,
      messages: [...currentSession.messages, ...messages],
    }));
  }

  const stopSpeaking = useCallback(() => {
    audioAbortRef.current?.abort();
    audioAbortRef.current = null;
    setSpeechInputBlocked(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopBgm = useCallback(() => {
    bgmAbortRef.current?.abort();
    bgmAbortRef.current = null;
    if (bgmAudioRef.current) {
      bgmAudioRef.current.pause();
      bgmAudioRef.current.src = "";
      bgmAudioRef.current = null;
    }
    if (bgmObjectUrlRef.current) {
      URL.revokeObjectURL(bgmObjectUrlRef.current);
      bgmObjectUrlRef.current = null;
    }
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, onEnd?: () => void) => {
      return new Promise<void>((resolve) => {
        const finish = () => {
          onEnd?.();
          resolve();
        };
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          finish();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = effectiveLocale === "zh" ? "zh-CN" : "en-US";
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    },
    [effectiveLocale],
  );

  const speak = useCallback(
    (text: string, onStart?: () => void, onEnd?: () => void) => {
      if (typeof window === "undefined") return;
      stopSpeaking();
      setSpeechInputBlocked(true);
      speechRecognizerRef.current?.stop();
      speechRecognizerRef.current = null;
      setLiveTranscript("");
      if (usingElevenLabsVoice) {
        const abortController = new AbortController();
        audioAbortRef.current = abortController;
        setVoiceStatus("speaking");
        void speakWithElevenLabs({
          apiKey: credentials.elevenLabsApiKey,
          text,
          voiceId: session?.hostVoiceId ?? "",
          locale: effectiveLocale,
          signal: abortController.signal,
          onPlayStart: onStart,
        })
          .then(() => {
            if (!abortController.signal.aborted) onEnd?.();
          })
          .catch((error) => {
            if (abortController.signal.aborted) return;
            console.warn("ElevenLabs TTS failed; falling back to browser speech.", error);
            setNotice(getElevenLabsFallbackReason(error, effectiveLocale, "tts"));
            onStart?.();
            return speakWithBrowser(normalizeSpeechText(text, effectiveLocale), onEnd);
          })
          .finally(() => {
            if (audioAbortRef.current === abortController) audioAbortRef.current = null;
            if (!abortController.signal.aborted) setSpeechInputBlocked(false);
            setVoiceStatus((currentStatus) =>
              currentStatus === "speaking" ? "listening" : currentStatus,
            );
          });
        return;
      }
      setVoiceStatus("speaking");
      onStart?.();
      void speakWithBrowser(normalizeSpeechText(text, effectiveLocale), () => {
        setSpeechInputBlocked(false);
        setVoiceStatus((currentStatus) =>
          currentStatus === "speaking" ? "listening" : currentStatus,
        );
        onEnd?.();
      });
    },
    [
      credentials.elevenLabsApiKey,
      effectiveLocale,
      session?.hostVoiceId,
      speakWithBrowser,
      stopSpeaking,
      usingElevenLabsVoice,
    ],
  );

  const startBgm = useCallback(
    (currentSession: GameSession) => {
      stopBgm();
      const abortController = new AbortController();
      bgmAbortRef.current = abortController;
      const soupText = currentSession.soupTypes.join(", ");
      const prompt =
        currentSession.locale === "zh"
          ? `\u4e3a\u6d77\u9f9f\u6c64\u63a8\u7406\u6e38\u620f\u751f\u6210\u4e00\u6bb5\u53ef\u65e0\u7f1d\u5faa\u73af\u7684\u60ac\u7591\u6c1b\u56f4\u80cc\u666f\u97f3\u4e50\u3002\u4e0d\u8981\u4eba\u58f0\uff0c\u4e0d\u8981\u7a81\u5140\u7684\u9f13\u70b9\u3002\u6545\u4e8b\u6458\u8981\uff1a${currentSession.puzzle}\u3002\u6c64\u578b\uff1a${soupText}\u3002`
          : `Create a seamless looping suspense ambience background track for a lateral thinking puzzle game. No vocals, no harsh drums. Puzzle mood: ${currentSession.puzzle}. Soup types: ${soupText}.`;
      void generateBgmWithElevenLabs({
        apiKey: credentials.elevenLabsApiKey,
        prompt,
        durationSeconds: 30,
        signal: abortController.signal,
      })
        .then((bgm) => {
          if (abortController.signal.aborted) {
            bgm.revoke();
            return;
          }
          bgmObjectUrlRef.current = bgm.objectUrl;
          const audio = new Audio(bgm.objectUrl);
          audio.loop = true;
          audio.volume = currentSession.bgmVolume;
          bgmAudioRef.current = audio;
          void audio.play().catch((error) => {
            setNotice(error instanceof Error ? error.message : String(error));
          });
        })
        .catch((error) => {
          if (abortController.signal.aborted) return;
          console.warn("ElevenLabs BGM failed.", error);
          setNotice(getElevenLabsFallbackReason(error, effectiveLocale, "bgm"));
        })
        .finally(() => {
          if (bgmAbortRef.current === abortController) bgmAbortRef.current = null;
        });
    },
    [credentials.elevenLabsApiKey, effectiveLocale, stopBgm],
  );

  const submitQuestionContent = useCallback(
    async (content: string) => {
      const activeSession = useSoupTalkStore.getState().activeSession;
      if (!activeSession || !content.trim() || busyRef.current || activeSession.result) return;
      if (!hasRequiredLlmCredentials(credentials)) {
        setNotice(translate(activeSession.locale, "configureLlmFirst"));
        return;
      }
      busyRef.current = true;
      setBusy(true);
      setVoiceStatus("thinking");
      setNotice(null);
      const normalizedContent = content.trim();
      const userMessage: Message = {
        role: "user",
        content: normalizedContent,
        timestamp: Date.now(),
      };
      const sessionWithUserMessage: GameSession = {
        ...activeSession,
        messages: [...activeSession.messages, userMessage],
      };
      setActiveSession(sessionWithUserMessage);

      try {
        const answer = await answerQuestion(credentials, activeSession, normalizedContent);
        playAnswerCue(answer.answerType);
        const hit =
          typeof answer.keyPointHit === "number" && answer.keyPointHit >= 0
            ? answer.keyPointHit
            : null;
        const hitKeyPoints =
          hit === null
            ? activeSession.hitKeyPoints
            : Array.from(new Set([...activeSession.hitKeyPoints, hit]));
        const confirmedClues = answer.newClue
          ? Array.from(new Set([...activeSession.confirmedClues, answer.newClue]))
          : activeSession.confirmedClues;
        const hostText = answer.speech;
        const hostMessage: Message = {
          role: "host",
          content: hostText,
          answerType: answer.answerType,
          timestamp: Date.now(),
        };
        const nextSession: GameSession = {
          ...sessionWithUserMessage,
          hitKeyPoints,
          confirmedClues,
          messages: [...sessionWithUserMessage.messages, hostMessage],
        };
        setActiveSession(nextSession);
        setLiveTranscript("");
        speak(hostText);
      } finally {
        busyRef.current = false;
        setBusy(false);
        const pendingQuestion = pendingVoiceQuestionRef.current;
        pendingVoiceQuestionRef.current = null;
        if (pendingQuestion && useSoupTalkStore.getState().activeSession) {
          void submitQuestionContent(pendingQuestion);
        } else {
          setVoiceStatus((currentStatus) =>
            currentStatus === "thinking" ? "listening" : currentStatus,
          );
        }
      }
    },
    [credentials, setActiveSession, speak, stopBgm],
  );

  async function submitQuestion() {
    const content = input.trim();
    if (!session || !content || busy || session.result) return;
    if (!hasRequiredLlmCredentials(credentials)) {
      setNotice(translate(effectiveLocale, "configureLlmFirst"));
      return;
    }
    setInput("");
    await submitQuestionContent(content);
  }

  async function submitFinalAnswer() {
    const content = finalAnswer.trim();
    if (!session || busy || session.result) return;
    if (!content) {
      setNotice(translate(effectiveLocale, "answerRequired"));
      return;
    }
    if (!hasRequiredLlmCredentials(credentials)) {
      setNotice(translate(effectiveLocale, "configureLlmFirst"));
      return;
    }
    setBusy(true);
    busyRef.current = true;
    setVoiceStatus("thinking");
    setNotice(null);
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: Date.now(),
    };
    const sessionWithUserMessage: GameSession = {
      ...session,
      finalAnswer: content,
      messages: [...session.messages, userMessage],
    };
    setActiveSession(sessionWithUserMessage);
    try {
      const evaluation = await evaluateFinalAnswer(
        credentials,
        sessionWithUserMessage.keyPoints,
        content,
        sessionWithUserMessage.locale,
      );
      const mergedHits = Array.from(
        new Set([...sessionWithUserMessage.hitKeyPoints, ...evaluation.coveredKeyPoints]),
      ).sort((a, b) => a - b);
      const hostText = evaluation.isWin
        ? `${evaluation.feedback}\n\n${sessionWithUserMessage.truth}`
        : evaluation.feedback;
      const hostMessage: Message = {
        role: "host",
        content: hostText,
        answerType: evaluation.isWin ? "narrative" : "yes_and_no",
        timestamp: Date.now(),
      };
      const nextSession: GameSession = {
        ...sessionWithUserMessage,
        hitKeyPoints: mergedHits,
        messages: [...sessionWithUserMessage.messages, hostMessage],
        ...(evaluation.isWin ? { result: "win", endTime: Date.now() } : {}),
      };
      if (evaluation.isWin) {
        setFinalAnswerOpen(false);
        setFinishedSession(nextSession);
        setActiveSession(null);
        void saveToHistory(nextSession);
        stopBgm();
      } else {
        setActiveSession(nextSession);
      }
      speak(hostText);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setVoiceStatus((currentStatus) =>
        currentStatus === "thinking" ? "listening" : currentStatus,
      );
    }
  }

  const endGame = useCallback(
    (result: GameResult) => {
      const currentSession = useSoupTalkStore.getState().activeSession;
      if (!currentSession || currentSession.result) return;
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
      void saveToHistory(nextSession);
      setFinishedSession(nextSession);
      setActiveSession(null);
      stopBgm();
      speak(`${message}\n\n${nextSession.truth}`);
    },
    [setActiveSession, speak, stopBgm],
  );

  async function useHint() {
    if (!session || session.hintsUsed >= 3 || session.result || hintBusy) return;
    if (!hasRequiredLlmCredentials(credentials)) {
      setNotice(translate(effectiveLocale, "configureLlmFirst"));
      return;
    }
    setHintBusy(true);
    setNotice(null);
    try {
      const hintText = await generateHint(credentials, session);
      appendMessages([
        { role: "host", content: hintText, answerType: "narrative", timestamp: Date.now() },
      ]);
      updateSession((currentSession) => ({
        ...currentSession,
        hintsUsed: currentSession.hintsUsed + 1,
      }));
      speak(hintText);
    } finally {
      setHintBusy(false);
    }
  }

  async function inspectReasoning() {
    if (!session || session.result || reasoningBusy) return;
    if (!hasRequiredLlmCredentials(credentials)) {
      setNotice(translate(effectiveLocale, "configureLlmFirst"));
      return;
    }
    setReasoningBusy(true);
    setVoiceStatus("thinking");
    setNotice(null);
    try {
      const reasoning = await checkReasoning(credentials, session);
      appendMessages([
        {
          role: "host",
          content: reasoning.feedback,
          answerType: "narrative",
          timestamp: Date.now(),
        },
      ]);
      speak(reasoning.feedback);
    } finally {
      setReasoningBusy(false);
      setVoiceStatus((currentStatus) =>
        currentStatus === "thinking" ? "listening" : currentStatus,
      );
    }
  }

  const resultLabel = useMemo(() => {
    if (!session?.result) return null;
    if (session.result === "win") return translate(effectiveLocale, "won");
    if (session.result === "timeout") return translate(effectiveLocale, "timeout");
    return translate(effectiveLocale, "gaveUp");
  }, [session?.result, effectiveLocale]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    finalAnswerOpenRef.current = finalAnswerOpen;
  }, [finalAnswerOpen]);

  useEffect(() => {
    if (!activeSessionId || activeSessionResult || voicePaused) {
      speechRecognizerRef.current?.stop();
      speechRecognizerRef.current = null;
      setLiveTranscript("");
      setVoiceStatus(voicePaused && activeSessionId && !activeSessionResult ? "paused" : "idle");
      return;
    }
    if (!activeSessionOpeningSpoken || speechInputBlocked) {
      speechRecognizerRef.current?.stop();
      speechRecognizerRef.current = null;
      setLiveTranscript("");
      setVoiceStatus((currentStatus) =>
        currentStatus === "speaking" ? currentStatus : "idle",
      );
      return;
    }
    if (!canUseSpeechEngine) {
      speechRecognizerRef.current?.stop();
      speechRecognizerRef.current = null;
      setVoiceStatus("unavailable");
      return;
    }

    let cancelled = false;
    setVoiceStatus("connecting");
    void startElevenLabsSpeechRecognizer({
      apiKey: credentials.elevenLabsApiKey,
      locale: activeSessionLocale ?? effectiveLocale,
      onPartialTranscript: (transcript) => {
        if (cancelled) return;
        if (!transcript) return;
        setLiveTranscript(transcript);
        setVoiceStatus("transcribing");
        stopSpeaking();
      },
      onTranscript: (transcript) => {
        if (cancelled) return;
        const content = transcript.trim();
        if (!content) return;
        setLiveTranscript(content);
        const lastQuestion = lastVoiceQuestionRef.current;
        const now = Date.now();
        if (
          lastQuestion &&
          lastQuestion.content === content &&
          now - lastQuestion.timestamp < 1200
        ) {
          return;
        }
        lastVoiceQuestionRef.current = { content, timestamp: now };
        if (finalAnswerOpenRef.current) {
          setFinalAnswer((currentAnswer) =>
            currentAnswer.trim() ? `${currentAnswer.trim()}\n${content}` : content,
          );
          setVoiceStatus("listening");
          return;
        }
        if (busyRef.current) {
          pendingVoiceQuestionRef.current = content;
          setVoiceStatus("listening");
          return;
        }
        void submitQuestionContent(content);
      },
      onError: (message) => {
        if (cancelled) return;
        setNotice(message);
        setVoiceStatus("error");
      },
      onEnd: () => {
        if (!cancelled) setVoiceStatus("idle");
      },
    })
      .then((recognizer) => {
        if (cancelled) {
          recognizer.stop();
          return;
        }
        speechRecognizerRef.current = recognizer;
        setVoiceStatus("listening");
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setNotice(message);
        setVoiceStatus("error");
      });

    return () => {
      cancelled = true;
      speechRecognizerRef.current?.stop();
      speechRecognizerRef.current = null;
    };
  }, [
    canUseSpeechEngine,
    activeSessionId,
    activeSessionLocale,
    activeSessionOpeningSpoken,
    activeSessionResult,
    credentials.elevenLabsApiKey,
    effectiveLocale,
    speechInputBlocked,
    stopSpeaking,
    submitQuestionContent,
    voicePaused,
  ]);

  useEffect(() => {
    if (storeSession?.timeLimit && !storeSession.result) {
      setSecondsLeft(
        Math.max(
          0,
          storeSession.timeLimit - Math.floor((Date.now() - storeSession.startTime) / 1000),
        ),
      );
    }
  }, [storeSession?.id, storeSession?.result, storeSession?.startTime, storeSession?.timeLimit]);

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
  }, [endGame, session?.id, session?.result, session?.startTime, session?.timeLimit]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopBgm();
      speechRecognizerRef.current?.stop();
    };
  }, [stopBgm, stopSpeaking]);

  useEffect(() => {
    if (!storeSession?.fallbackNotice) return;
    setNotice(storeSession.fallbackNotice);
    updateSession((currentSession) => {
      const { fallbackNotice, ...nextSession } = currentSession;
      return nextSession;
    });
  }, [storeSession?.fallbackNotice]);

  useEffect(() => {
    if (!activeSessionId || !activeSessionPuzzle || activeSessionOpeningSpoken) return;
    if (openingPlaybackSessionRef.current === activeSessionId) return;
    const opening = activeSessionPuzzle.trim();
    if (!opening) return;
    let completed = false;
    openingPlaybackSessionRef.current = activeSessionId;
    speak(opening, undefined, () => {
      completed = true;
      updateSession((currentSession) => ({ ...currentSession, openingSpoken: true }));
    });
    return () => {
      if (!completed && openingPlaybackSessionRef.current === activeSessionId) {
        openingPlaybackSessionRef.current = null;
      }
    };
  }, [
    activeSessionId,
    activeSessionOpeningSpoken,
    activeSessionPuzzle,
    speak,
  ]);

  useEffect(() => {
    if (!storeSession?.bgmEnabled || storeSession.result) {
      stopBgm();
      return;
    }
    if (!usingElevenLabsVoice || !hasVerifiedElevenLabsCredentials(credentials)) {
      setNotice(translate(storeSession.locale, "configureElevenLabsFirst"));
      return;
    }
    startBgm(storeSession);
    return stopBgm;
  }, [credentials, startBgm, stopBgm, storeSession, usingElevenLabsVoice]);

  useEffect(() => {
    if (bgmAudioRef.current && session) bgmAudioRef.current.volume = session.bgmVolume;
  }, [session]);

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
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-2 lg:px-8">
        <div className="grid min-h-0 gap-6">
          <Card className="flex min-h-[calc(100vh-145px)] flex-col border-parchment/10 bg-[#14110f]/90">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="font-serif text-3xl italic">
                  {translate(effectiveLocale, "surface")}
                </CardTitle>
                {resultLabel && <Badge className="bg-blood text-parchment">{resultLabel}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-fog/70">
                <Badge variant="outline" className="border-parchment/20 text-fog">
                  {session.hostName}
                </Badge>
                <Badge variant="outline" className="border-parchment/20 text-fog">
                  {translate(effectiveLocale, session.difficulty)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    session.bgmEnabled
                      ? "border-ember/40 text-ember"
                      : "border-parchment/20 text-fog/55"
                  }
                >
                  {session.bgmEnabled ? (
                    <Music2 className="mr-1 size-3" />
                  ) : (
                    <Music className="mr-1 size-3" />
                  )}
                  {translate(effectiveLocale, "bgm")}
                </Badge>
              </div>
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
                  disabled={hintBusy || session.hintsUsed >= 3 || Boolean(session.result)}
                >
                  {hintBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {translate(effectiveLocale, "getHint")}
                </Button>
                <Button
                  variant="outline"
                  className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                  onClick={inspectReasoning}
                  disabled={reasoningBusy || Boolean(session.result)}
                >
                  {reasoningBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {translate(effectiveLocale, "checkReasoning")}
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

          {session.result && (
            <Card className="border-blood/30 bg-[#14110f]/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-2xl italic">
                  <PartyPopper className="size-5 text-ember" />
                  {translate(effectiveLocale, "gameOver")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm text-fog/75">
                  <div className="flex justify-between gap-4">
                    <span>{translate(effectiveLocale, "resultSummary")}</span>
                    <span className="text-parchment">{resultLabel}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>{translate(effectiveLocale, "elapsedTime")}</span>
                    <span className="text-parchment">
                      {formatSeconds(
                        Math.floor(((session.endTime ?? Date.now()) - session.startTime) / 1000),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>{translate(effectiveLocale, "hintsLeft")}</span>
                    <span className="text-parchment">{Math.max(0, 3 - session.hintsUsed)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    className="bg-parchment text-ink hover:bg-blood hover:text-parchment"
                  >
                    <Link to="/">
                      <RefreshCcw className="mr-2 size-4" />
                      {translate(effectiveLocale, "playAgain")}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="text-fog hover:text-ink">
                    <Link to="/history">
                      <History className="mr-2 size-4" />
                      {translate(effectiveLocale, "history")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid min-h-0 gap-6">
          <Card className="flex min-h-[calc(100vh-96px)] flex-col border-parchment/10 bg-[#14110f]/90">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="font-serif text-2xl italic">
                  {translate(effectiveLocale, "transcript")}
                </CardTitle>
                <Badge variant="outline" className={`w-fit border-parchment/20 ${voiceState.tone}`}>
                  <Radio
                    className={`mr-1 size-3 ${voiceState.active ? "animate-pulse text-blood" : ""}`}
                  />
                  {voiceState.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
              {notice && (
                <div className="flex flex-col gap-3 rounded-lg border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember sm:flex-row sm:items-center sm:justify-between">
                  <p>{notice}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-fit border-ember/40 bg-transparent text-parchment hover:bg-ember hover:text-ink"
                    onClick={() => setSettingsOpen(true)}
                  >
                    {translate(effectiveLocale, "openSettings")}
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-blood/30 bg-ink/45 px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`relative flex size-12 shrink-0 items-center justify-center rounded-full border ${
                      voiceState.active
                        ? "border-blood/60 bg-blood/20 shadow-[0_0_38px_rgba(142,26,26,0.35)]"
                        : "border-parchment/15 bg-parchment/5"
                    }`}
                  >
                    {voiceState.active && (
                      <>
                        <span className="absolute size-full animate-ping rounded-full bg-blood/20" />
                        <span className="absolute size-8 animate-pulse rounded-full border border-blood/35" />
                      </>
                    )}
                    {voiceStatus === "paused" || voiceStatus === "unavailable" ? (
                      <MicOff className="relative size-5 text-fog" />
                    ) : voiceStatus === "speaking" ? (
                      <Volume2 className="relative size-5 text-ember" />
                    ) : voiceStatus === "thinking" || voiceStatus === "connecting" ? (
                      <Loader2 className="relative size-5 animate-spin text-ember" />
                    ) : (
                      <Mic className="relative size-5 text-parchment" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-fog/55">
                      <AudioLines className="size-4 text-ember" />
                      <span>{translate(effectiveLocale, "speechEngineActive")}</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-parchment">
                      {liveTranscript || voiceState.description}
                    </p>
                    {pendingVoiceQuestionRef.current && (
                      <p className="mt-1 text-sm text-ember">
                        {translate(effectiveLocale, "voiceQueued")}
                      </p>
                    )}
                  </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                      onClick={() => setVoicePaused((current) => !current)}
                      disabled={Boolean(session.result) || !usingElevenLabsVoice}
                    >
                      {voicePaused ? (
                        <Mic className="mr-2 size-4" />
                      ) : (
                        <MicOff className="mr-2 size-4" />
                      )}
                      {voicePaused
                        ? translate(effectiveLocale, "resumeVoice")
                        : translate(effectiveLocale, "pauseVoice")}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="min-h-[22rem] flex-1 space-y-3 overflow-y-auto pr-2">
                {session.messages.map((message, index) => (
                  <MessageBubble
                    key={`${message.timestamp}-${index}`}
                    message={message}
                    locale={effectiveLocale}
                  />
                ))}
              </div>
              <div className="mt-auto space-y-4">
                <div className="rounded-lg border border-parchment/10 bg-parchment/5 p-3">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={translate(effectiveLocale, "askPlaceholder")}
                    className="min-h-16 border-parchment/15 bg-ink/50 text-parchment"
                    disabled={Boolean(session.result)}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
                    onClick={() => setFinalAnswerOpen(true)}
                    disabled={busy || Boolean(session.result)}
                  >
                    {translate(effectiveLocale, "finalGuess")}
                  </Button>
                  <Button
                    className="bg-parchment text-ink hover:bg-blood hover:text-parchment"
                    onClick={submitQuestion}
                    disabled={busy || Boolean(session.result) || !input.trim()}
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
      <Dialog open={finalAnswerOpen} onOpenChange={setFinalAnswerOpen}>
        <DialogContent className="border-parchment/10 bg-[#14110f] text-parchment">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl italic">
              {translate(effectiveLocale, "finalAnswerTitle")}
            </DialogTitle>
            <DialogDescription className="text-fog/65">
              {translate(effectiveLocale, "finalAnswerDesc")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={finalAnswer}
            onChange={(event) => setFinalAnswer(event.target.value)}
            placeholder={translate(effectiveLocale, "finalAnswerPlaceholder")}
            className="min-h-36 border-parchment/15 bg-ink/50 text-parchment"
            disabled={busy}
          />
          <p className="text-sm text-fog/60">
            {translate(effectiveLocale, "finalAnswerVoiceHint")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
              onClick={() => setFinalAnswerOpen(false)}
              disabled={busy}
            >
              {translate(effectiveLocale, "cancel")}
            </Button>
            <Button
              type="button"
              className="bg-parchment text-ink hover:bg-blood hover:text-parchment"
              onClick={submitFinalAnswer}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {translate(effectiveLocale, "submitAnswer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    yes: { en: "Yes", zh: "\u662f" },
    no: { en: "No", zh: "\u5426" },
    irrelevant: { en: "Irrelevant", zh: "\u65e0\u5173" },
    yes_and_no: { en: "Yes and No", zh: "\u662f\u4e5f\u4e0d\u662f" },
    clarify: { en: "Clarify", zh: "\u8bf7\u6f84\u6e05" },
    narrative: { en: "Narrative", zh: "\u53d9\u8ff0" },
  };
  return labels[type][locale];
}
function getVoiceState(status: VoiceCaptureStatus, locale: "en" | "zh") {
  const labels: Record<
    VoiceCaptureStatus,
    {
      active: boolean;
      tone: string;
      label: Record<"en" | "zh", string>;
      description: Record<"en" | "zh", string>;
    }
  > = {
    idle: {
      active: false,
      tone: "text-fog/60",
      label: { en: "Voice idle", zh: "\u8bed\u97f3\u5f85\u673a" },
      description: {
        en: "ElevenLabs voice capture will start with the game.",
        zh: "ElevenLabs \u8bed\u97f3\u91c7\u96c6\u4f1a\u968f\u6e38\u620f\u81ea\u52a8\u5f00\u542f\u3002",
      },
    },
    connecting: {
      active: true,
      tone: "text-ember",
      label: { en: "Connecting", zh: "\u6b63\u5728\u8fde\u63a5" },
      description: {
        en: "Connecting to ElevenLabs Speech Engine...",
        zh: "\u6b63\u5728\u8fde\u63a5 ElevenLabs Speech Engine...",
      },
    },
    listening: {
      active: true,
      tone: "text-blood",
      label: { en: "Recording", zh: "\u5168\u7a0b\u5f55\u97f3\u4e2d" },
      description: {
        en: "Speak your question. Silence commits the turn automatically.",
        zh: "\u76f4\u63a5\u8bf4\u51fa\u95ee\u9898\uff0c\u505c\u987f\u540e\u4f1a\u81ea\u52a8\u63d0\u4ea4\u8fd9\u4e00\u8f6e\u3002",
      },
    },
    transcribing: {
      active: true,
      tone: "text-blood",
      label: { en: "Transcribing", zh: "\u6b63\u5728\u8f6c\u5199" },
      description: {
        en: "Listening and transcribing with ElevenLabs Scribe...",
        zh: "\u6b63\u5728\u7528 ElevenLabs Scribe \u5b9e\u65f6\u8f6c\u5199...",
      },
    },
    thinking: {
      active: true,
      tone: "text-ember",
      label: { en: "Host thinking", zh: "\u4e3b\u6301\u4eba\u601d\u8003\u4e2d" },
      description: {
        en: "Your voice turn was received. The host is judging it.",
        zh: "\u5df2\u6536\u5230\u4f60\u7684\u8bed\u97f3\u56de\u5408\uff0c\u4e3b\u6301\u4eba\u6b63\u5728\u5224\u65ad\u3002",
      },
    },
    speaking: {
      active: true,
      tone: "text-ember",
      label: { en: "Host speaking", zh: "\u4e3b\u6301\u4eba\u8bed\u97f3\u4e2d" },
      description: {
        en: "The host is speaking through ElevenLabs. Start talking to interrupt.",
        zh: "\u4e3b\u6301\u4eba\u6b63\u5728\u7528 ElevenLabs \u53d1\u58f0\u3002\u4f60\u53ef\u4ee5\u76f4\u63a5\u5f00\u53e3\u6253\u65ad\u3002",
      },
    },
    paused: {
      active: false,
      tone: "text-fog/65",
      label: { en: "Voice paused", zh: "\u8bed\u97f3\u5df2\u6682\u505c" },
      description: {
        en: "Voice capture is paused. Resume when you want to continue by speech.",
        zh: "\u8bed\u97f3\u91c7\u96c6\u5df2\u6682\u505c\u3002\u6062\u590d\u540e\u53ef\u7ee7\u7eed\u7528\u8bed\u97f3\u63d0\u95ee\u3002",
      },
    },
    unavailable: {
      active: false,
      tone: "text-ember",
      label: { en: "Voice unavailable", zh: "\u8bed\u97f3\u4e0d\u53ef\u7528" },
      description: {
        en: "Verify your ElevenLabs key in Settings to play the whole game by voice.",
        zh: "\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u9a8c\u8bc1 ElevenLabs Key\uff0c\u624d\u80fd\u5168\u7a0b\u8bed\u97f3\u6e38\u620f\u3002",
      },
    },
    error: {
      active: false,
      tone: "text-ember",
      label: { en: "Voice error", zh: "\u8bed\u97f3\u5f02\u5e38" },
      description: {
        en: "ElevenLabs voice capture stopped. Check the notice above or settings.",
        zh: "ElevenLabs \u8bed\u97f3\u91c7\u96c6\u5df2\u505c\u6b62\uff0c\u8bf7\u67e5\u770b\u4e0a\u65b9\u63d0\u793a\u6216\u8bbe\u7f6e\u3002",
      },
    },
  };
  const state = labels[status];
  return {
    ...state,
    label: state.label[locale],
    description: state.description[locale],
  };
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
