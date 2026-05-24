export type Locale = "en" | "zh";
export type Difficulty = "easy" | "medium" | "hard";
export type SoupType = "red" | "clear" | "black";
export type AnswerType = "yes" | "no" | "irrelevant" | "yes_and_no" | "clarify" | "narrative";
export type GameResult = "win" | "give_up" | "timeout";
export type CredentialValidationStatus = "valid" | "invalid";

export interface CredentialValidationRecord {
  status: CredentialValidationStatus;
  fingerprint: string;
  checkedAt: number;
  message?: string;
}

export interface CredentialValidation {
  llm?: CredentialValidationRecord;
  elevenLabs?: CredentialValidationRecord;
}

export interface UserCredentials {
  llmBaseURL: string;
  llmApiKey: string;
  llmModel: string;
  elevenLabsApiKey: string;
  locale: Locale;
  validation?: CredentialValidation;
}

export interface PuzzlePayload {
  puzzle: string;
  truth: string;
  keyPoints: string[];
  suggestedHost: string;
  hostCharacter: string;
}

export interface Message {
  role: "user" | "host";
  content: string;
  answerType?: AnswerType;
  timestamp: number;
}

export interface GameSession {
  id: string;
  difficulty: Difficulty;
  soupTypes: SoupType[];
  puzzle: string;
  truth: string;
  keyPoints: string[];
  hitKeyPoints: number[];
  hostId: string;
  hostName: string;
  hostVoiceId: string;
  hostCharacter: string;
  messages: Message[];
  confirmedClues: string[];
  hintsUsed: number;
  finalAnswer?: string;
  startTime: number;
  endTime?: number;
  result?: GameResult;
  bgmEnabled: boolean;
  bgmVolume: number;
  openingSpoken: boolean;
  fallbackNotice?: string;
  timeLimit?: number;
  locale: Locale;
}

export interface HostAnswer {
  answerType: AnswerType;
  speech: string;
  newClue: string | null;
  keyPointHit: number | null;
}

export interface WinEvaluation {
  coveredKeyPoints: number[];
  missingCount: number;
  isWin: boolean;
  feedback: string;
}

export interface ReasoningCheck {
  feedback: string;
}

export interface StartGameOptions {
  difficulty: Difficulty;
  soupTypes: SoupType[];
  bgmEnabled: boolean;
}
