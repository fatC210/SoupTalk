import { difficultyConfig, fallbackPuzzles, hostVoiceIds } from "./constants";
import type {
  Difficulty,
  HostAnswer,
  Locale,
  PuzzlePayload,
  SoupType,
  UserCredentials,
  WinEvaluation,
} from "./types";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]) as T;
    } catch {
      return null;
    }
  }
}

async function chatCompletion(
  credentials: UserCredentials,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const response = await fetch(`${normalizeBaseUrl(credentials.llmBaseURL)}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${credentials.llmApiKey}`,
    },
    body: JSON.stringify({
      model: credentials.llmModel,
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content ?? text;
}

export async function validateLlm(credentials: UserCredentials) {
  if (!credentials.llmBaseURL || !credentials.llmApiKey || !credentials.llmModel) {
    throw new Error("Missing LLM base URL, API key, or model.");
  }
  await chatCompletion(credentials, [
    { role: "system", content: "Return JSON only." },
    { role: "user", content: 'Return {"ok":true}.' },
  ]);
}

export async function validateElevenLabs(apiKey: string) {
  if (!apiKey) throw new Error("Missing ElevenLabs API key.");
  const response = await fetch("https://api.elevenlabs.io/v1/user", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
}

export async function generatePuzzle(
  credentials: UserCredentials,
  difficulty: Difficulty,
  soupTypes: SoupType[],
  locale: Locale,
): Promise<{ puzzle: PuzzlePayload; usedFallback: boolean }> {
  const fallback = fallbackPuzzles[locale][difficulty];
  if (!credentials.llmApiKey || !credentials.llmBaseURL || !credentials.llmModel) {
    return { puzzle: fallback, usedFallback: true };
  }

  const config = difficultyConfig[difficulty];
  const language = locale === "zh" ? "Simplified Chinese" : "English";
  const prompt = `You are a master lateral thinking puzzle designer.
Generate a complete original puzzle with this JSON shape:
{
  "puzzle": "surface story visible to player",
  "truth": "complete hidden solution",
  "keyPoints": ["critical insight 1"],
  "suggestedHost": "short host name",
  "hostCharacter": "host persona description"
}
Difficulty: ${difficulty}
Key points count: ${config.keyRange}
Surface complexity: ${config.surface}
Allowed soup types: ${soupTypes.join(", ")}
Language: ${language}
Critical rules:
- The puzzle must be solvable through yes/no questions.
- Key points must be specific, testable propositions.
- Avoid common or famous puzzles; create something novel.
- Do not include markdown.`;

  try {
    const content = await chatCompletion(credentials, [
      { role: "system", content: "Return valid JSON only. No markdown." },
      { role: "user", content: prompt },
    ]);
    const parsed = extractJson<PuzzlePayload>(content);
    if (!parsed?.puzzle || !parsed.truth || !Array.isArray(parsed.keyPoints)) {
      throw new Error("Puzzle response was not valid JSON.");
    }
    return {
      puzzle: {
        puzzle: parsed.puzzle,
        truth: parsed.truth,
        keyPoints: parsed.keyPoints,
        suggestedHost: parsed.suggestedHost || fallback.suggestedHost,
        hostCharacter: parsed.hostCharacter || fallback.hostCharacter,
      },
      usedFallback: false,
    };
  } catch (error) {
    console.warn("Puzzle generation failed; using fallback.", error);
    return { puzzle: fallback, usedFallback: true };
  }
}

function localQuestionAnswer(question: string, keyPoints: string[], locale: Locale): HostAnswer {
  const normalizedQuestion = question.toLowerCase();
  const hitIndex = keyPoints.findIndex((point) =>
    point
      .toLowerCase()
      .split(/[\s,.;，。；、]+/)
      .filter((word) => word.length > 2)
      .slice(0, 4)
      .some((word) => normalizedQuestion.includes(word)),
  );

  if (hitIndex >= 0) {
    return {
      answerType: "yes",
      speech: locale === "zh" ? "是。你碰到了一个关键线索。" : "Yes. That touches a key clue.",
      newClue: keyPoints[hitIndex],
      keyPointHit: hitIndex,
    };
  }

  const negativeWords = ["not", "never", "没有", "不是", "并非"];
  const hasNegative = negativeWords.some((word) => normalizedQuestion.includes(word));
  return {
    answerType: hasNegative ? "yes_and_no" : "irrelevant",
    speech:
      locale === "zh"
        ? hasNegative
          ? "是也不是。"
          : "无关。"
        : hasNegative
          ? "Yes and No."
          : "Irrelevant.",
    newClue: null,
    keyPointHit: null,
  };
}

export async function answerQuestion(
  credentials: UserCredentials,
  session: {
    puzzle: string;
    truth: string;
    keyPoints: string[];
    hitKeyPoints: number[];
    hostCharacter: string;
    locale: Locale;
  },
  question: string,
): Promise<HostAnswer> {
  if (!credentials.llmApiKey || !credentials.llmBaseURL || !credentials.llmModel) {
    return localQuestionAnswer(question, session.keyPoints, session.locale);
  }

  const language = session.locale === "zh" ? "Simplified Chinese" : "English";
  const prompt = `You are ${session.hostCharacter}, hosting a lateral thinking puzzle game.
PUZZLE visible to player: ${session.puzzle}
TRUTH hidden from player: ${session.truth}
KEY POINTS hidden from player: ${JSON.stringify(session.keyPoints)}
ALREADY HIT KEY POINT INDEXES: ${JSON.stringify(session.hitKeyPoints)}
PLAYER QUESTION: ${question}

Strict rules:
1. Answer only with answerType yes, no, irrelevant, yes_and_no, or clarify.
2. Never reveal the truth or key points directly in speech.
3. If ambiguous, use clarify and politely request a clearer question.
4. Determine whether this confirms a new clue and which key point index it hits.
5. Respond in ${language}.
Return JSON exactly:
{"answerType":"yes|no|irrelevant|yes_and_no|clarify","speech":"short in-character response","newClue":"clue text or null","keyPointHit":0}`;

  try {
    const content = await chatCompletion(credentials, [
      { role: "system", content: "Return valid JSON only. No markdown." },
      { role: "user", content: prompt },
    ]);
    const parsed = extractJson<HostAnswer>(content);
    if (!parsed?.answerType || !parsed.speech) throw new Error("Host response was not valid JSON.");
    return {
      answerType: parsed.answerType,
      speech: parsed.speech,
      newClue: parsed.newClue ?? null,
      keyPointHit: typeof parsed.keyPointHit === "number" ? parsed.keyPointHit : null,
    };
  } catch (error) {
    console.warn("Host answer failed; using local heuristic.", error);
    return localQuestionAnswer(question, session.keyPoints, session.locale);
  }
}

export async function evaluateFinalAnswer(
  credentials: UserCredentials,
  keyPoints: string[],
  playerAnswer: string,
  locale: Locale,
): Promise<WinEvaluation> {
  const localCovered = keyPoints
    .map((point, index) => ({ point, index }))
    .filter(({ point }) =>
      point
        .toLowerCase()
        .split(/[\s,.;，。；、]+/)
        .filter((word) => word.length > 2)
        .slice(0, 5)
        .some((word) => playerAnswer.toLowerCase().includes(word)),
    )
    .map(({ index }) => index);

  if (!credentials.llmApiKey || !credentials.llmBaseURL || !credentials.llmModel) {
    return {
      coveredKeyPoints: localCovered,
      missingCount: keyPoints.length - localCovered.length,
      isWin: localCovered.length === keyPoints.length,
      feedback:
        locale === "zh"
          ? "我会按已覆盖的关键点来判断。"
          : "I will judge by the key points you covered.",
    };
  }

  const language = locale === "zh" ? "Simplified Chinese" : "English";
  const prompt = `Evaluate whether the player's final answer covers ALL key points.
KEY POINTS with indexes: ${JSON.stringify(keyPoints)}
PLAYER ANSWER: ${playerAnswer}
For each key point, decide if the player's answer semantically covers it.
Respond in ${language} with JSON only:
{"coveredKeyPoints":[0],"missingCount":0,"isWin":true,"feedback":"encouraging message"}`;

  try {
    const content = await chatCompletion(credentials, [
      { role: "system", content: "Return valid JSON only. No markdown." },
      { role: "user", content: prompt },
    ]);
    const parsed = extractJson<WinEvaluation>(content);
    if (!parsed || !Array.isArray(parsed.coveredKeyPoints))
      throw new Error("Evaluation was not valid JSON.");
    return parsed;
  } catch (error) {
    console.warn("Evaluation failed; using local heuristic.", error);
    return {
      coveredKeyPoints: localCovered,
      missingCount: keyPoints.length - localCovered.length,
      isWin: localCovered.length === keyPoints.length,
      feedback:
        locale === "zh"
          ? "我会按已覆盖的关键点来判断。"
          : "I will judge by the key points you covered.",
    };
  }
}

export function getVoiceId(locale: Locale) {
  return hostVoiceIds[locale];
}
