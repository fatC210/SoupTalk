import { CommitStrategy, Conversation, RealtimeEvents, Scribe } from "@elevenlabs/client";
import type {
  CommittedTranscriptMessage,
  Conversation as ElevenLabsConversation,
  Mode,
  PartialTranscriptMessage,
  RealtimeConnection,
  ScribeErrorMessage,
} from "@elevenlabs/client";
import type { Locale, UserCredentials } from "./types";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export interface SpeechEngineSessionOptions {
  agentId?: string;
  credentials: UserCredentials;
  gameSessionId: string;
  locale: Locale;
  voiceId: string;
  onMessage?: (message: unknown) => void;
  onModeChange?: (mode: Mode) => void;
  onInterruption?: () => void;
  onError?: (message: string) => void;
}

export type VoiceCapability = "elevenlabs" | "browser" | "none";

export function getElevenLabsFallbackReason(
  error: unknown,
  locale: Locale,
  feature: "tts" | "bgm",
) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  const action =
    feature === "tts"
      ? locale === "zh"
        ? "已改用浏览器语音。原因："
        : "Falling back to browser speech. Reason: "
      : locale === "zh"
        ? "背景音乐生成失败。原因："
        : "Background music generation failed. Reason: ";

  if (normalized.includes("payment") || normalized.includes("subscription")) {
    return `${action}${locale === "zh" ? "ElevenLabs 账户存在付款或订阅问题。" : "the ElevenLabs account has a payment or subscription issue."}`;
  }
  if (
    normalized.includes("api key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return `${action}${locale === "zh" ? "ElevenLabs API Key 无效或未授权。" : "the ElevenLabs API key is invalid or unauthorized."}`;
  }
  if (
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("429")
  ) {
    return `${action}${locale === "zh" ? "ElevenLabs 额度不足或触发限流。" : "ElevenLabs quota or rate limit was reached."}`;
  }
  if (normalized.includes("voice") || normalized.includes("404")) {
    return `${action}${locale === "zh" ? "所选 ElevenLabs voice 不可用。" : "the selected ElevenLabs voice is unavailable."}`;
  }
  if (
    normalized.includes("timeout") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return `${action}${locale === "zh" ? "网络连接或 ElevenLabs 服务不可用。" : "the network or ElevenLabs service is unavailable."}`;
  }

  return `${action}${locale === "zh" ? "未知错误，请查看控制台详情。" : "unknown error; check the console for details."}`;
}

export interface ElevenLabsSpeechRecognizerOptions {
  apiKey: string;
  locale: Locale;
  onPartialTranscript?: (transcript: string) => void;
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export interface ElevenLabsSpeechRecognizer {
  stop: () => void;
}

export interface GeneratedBgm {
  objectUrl: string;
  revoke: () => void;
}

const elevenLabsApiBaseUrl = "https://api.elevenlabs.io/v1";
const defaultTtsModel = "eleven_multilingual_v2";
const defaultScribeModel = "scribe_v2_realtime";

export async function startSpeechEngineSession({
  agentId,
  credentials,
  gameSessionId,
  locale,
  voiceId,
  onMessage,
  onModeChange,
  onInterruption,
  onError,
}: SpeechEngineSessionOptions): Promise<ElevenLabsConversation | null> {
  if (!agentId) return null;
  return Conversation.startSession({
    agentId,
    overrides: {
      agent: { language: locale === "zh" ? "zh" : "en" },
      tts: { voiceId },
    },
    customLlmExtraBody: {
      gameSessionId,
      llmBaseURL: credentials.llmBaseURL,
      llmModel: credentials.llmModel,
    },
    dynamicVariables: {
      gameSessionId,
      llmModel: credentials.llmModel,
    },
    onMessage,
    onModeChange: onModeChange ? ({ mode }) => onModeChange(mode) : undefined,
    onInterruption,
    onError,
  });
}

export async function stopSpeechEngineSession(session: ElevenLabsConversation | null) {
  if (session?.isOpen()) await session.endSession();
}

export function getVoiceCapability(credentials: UserCredentials): VoiceCapability {
  if (credentials.elevenLabsApiKey.trim()) return "elevenlabs";
  if (typeof window !== "undefined" && "speechSynthesis" in window) return "browser";
  return "none";
}

export function normalizeSpeechText(text: string, locale: Locale) {
  if (locale !== "zh") return text;
  const normalized = text.trim();
  const shortHostReplies: Record<string, string> = {
    是: "是的。",
    "是。": "是的。",
    "是！": "是的。",
    "是?": "是的。",
    "是？": "是的。",
    否: "否。",
    "否。": "否。",
    "否！": "否。",
    "否?": "否。",
    "否？": "否。",
    无关: "无关。",
    "无关。": "无关。",
    是也不是: "是，也不是。",
    "是也不是。": "是，也不是。",
  };
  return shortHostReplies[normalized] ?? text;
}

export async function speakWithElevenLabs({
  apiKey,
  text,
  voiceId,
  locale,
  signal,
  onPlayStart,
}: {
  apiKey: string;
  text: string;
  voiceId: string;
  locale: Locale;
  signal?: AbortSignal;
  onPlayStart?: () => void;
}) {
  if (!apiKey.trim()) throw new Error("Missing ElevenLabs API key.");
  const speechText = normalizeSpeechText(text, locale);
  const response = await fetch(
    `${elevenLabsApiBaseUrl}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: speechText,
        model_id: defaultTtsModel,
        ...(locale === "zh" ? { language_code: "zh" } : {}),
        voice_settings: {
          stability: 0.52,
          similarity_boost: 0.75,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
      signal,
    },
  );
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `ElevenLabs TTS failed with HTTP ${response.status}.`);
  }
  const audio = await response.blob();
  const objectUrl = URL.createObjectURL(audio);
  const player = new Audio(objectUrl);
  try {
    await playAudio(player, onPlayStart, signal);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function generateBgmWithElevenLabs({
  apiKey,
  prompt,
  durationSeconds = 30,
  signal,
}: {
  apiKey: string;
  prompt: string;
  durationSeconds?: number;
  signal?: AbortSignal;
}): Promise<GeneratedBgm> {
  if (!apiKey.trim()) throw new Error("Missing ElevenLabs API key.");
  const response = await fetch(
    `${elevenLabsApiBaseUrl}/sound-generation?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: durationSeconds,
        loop: true,
        model_id: "eleven_text_to_sound_v2",
      }),
      signal,
    },
  );
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `ElevenLabs sound generation failed with HTTP ${response.status}.`);
  }
  const audio = await response.blob();
  const objectUrl = URL.createObjectURL(audio);
  return {
    objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

export function playAnswerCue(
  answerType: "yes" | "no" | "irrelevant" | "yes_and_no" | "clarify" | "narrative",
) {
  if (typeof window === "undefined") return;
  if (answerType === "narrative") return;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  const audioContext = new AudioContextCtor();
  const now = audioContext.currentTime;
  const output = audioContext.createGain();
  output.gain.setValueAtTime(0.001, now);
  output.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
  output.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  output.connect(audioContext.destination);

  const frequencies: Record<typeof answerType, number[]> = {
    yes: [660, 880],
    no: [196, 146],
    irrelevant: [440, 554],
    yes_and_no: [330, 660, 247],
    clarify: [523, 523],
  };
  frequencies[answerType].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = answerType === "irrelevant" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.11);
    oscillator.connect(output);
    oscillator.start(now + index * 0.11);
    oscillator.stop(now + index * 0.11 + 0.18);
  });
  window.setTimeout(() => void audioContext.close(), 700);
}

export async function startElevenLabsSpeechRecognizer({
  apiKey,
  locale,
  onPartialTranscript,
  onTranscript,
  onError,
  onEnd,
}: ElevenLabsSpeechRecognizerOptions): Promise<ElevenLabsSpeechRecognizer> {
  const token = await createScribeRealtimeToken(apiKey);
  const connection = Scribe.connect({
    token,
    modelId: defaultScribeModel,
    languageCode: locale === "zh" ? "zh" : "en",
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 1.1,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (message: PartialTranscriptMessage) => {
    const transcript = getTranscriptText(message);
    if (transcript) onPartialTranscript?.(transcript);
  });
  connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (message: CommittedTranscriptMessage) => {
    const transcript = getTranscriptText(message);
    if (transcript) onTranscript(transcript);
  });
  connection.on(RealtimeEvents.ERROR, (message: ScribeErrorMessage | Error) => {
    onError?.(getScribeErrorMessage(message));
  });
  connection.on(RealtimeEvents.CLOSE, () => onEnd?.());

  return {
    stop: () => {
      commitAndClose(connection);
    },
  };
}

async function createScribeRealtimeToken(apiKey: string) {
  if (!apiKey.trim()) throw new Error("Missing ElevenLabs API key.");
  const response = await fetch(`${elevenLabsApiBaseUrl}/single-use-token/realtime_scribe`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `ElevenLabs STT token failed with HTTP ${response.status}.`);
  }
  const payload = (await response.json()) as { token?: string; access_token?: string };
  const token = payload.token ?? payload.access_token;
  if (!token) throw new Error("ElevenLabs STT token response did not include a token.");
  return token;
}

function commitAndClose(connection: RealtimeConnection) {
  try {
    connection.commit();
  } catch {
    // The socket may already be closing after VAD committed the final segment.
  }
  connection.close();
}

function getTranscriptText(message: PartialTranscriptMessage | CommittedTranscriptMessage) {
  const payload = message as PartialTranscriptMessage & {
    text?: string;
    transcript?: string;
  };
  return (payload.text ?? payload.transcript ?? "").trim();
}

function getScribeErrorMessage(message: ScribeErrorMessage | Error) {
  if (message instanceof Error) return message.message;
  const payload = message as ScribeErrorMessage & { error?: string; message?: string };
  return payload.error ?? payload.message ?? "ElevenLabs speech recognition failed.";
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      detail?: unknown;
      message?: string;
      error?: string;
    };
    if (typeof payload.detail === "string") return payload.detail;
    if (payload.message) return payload.message;
    if (payload.error) return payload.error;
    return JSON.stringify(payload);
  } catch {
    return response.text();
  }
}

function playAudio(player: HTMLAudioElement, onPlayStart?: () => void, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      player.onended = null;
      player.onerror = null;
    };
    const handleAbort = () => {
      player.pause();
      player.src = "";
      cleanup();
      reject(new DOMException("Audio playback aborted.", "AbortError"));
    };
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    signal?.addEventListener("abort", handleAbort, { once: true });
    player.onended = () => {
      cleanup();
      resolve();
    };
    player.onerror = () => {
      cleanup();
      reject(new Error("Failed to play ElevenLabs audio."));
    };
    void player
      .play()
      .then(() => {
        if (!signal?.aborted) onPlayStart?.();
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
}
