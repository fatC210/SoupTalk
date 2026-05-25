import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { difficultyConfig, fallbackPuzzles, hostVoicePresets } from "./constants";
import type {
  Difficulty,
  GameSession,
  HostAnswer,
  Locale,
  PuzzlePayload,
  ReasoningCheck,
  SoupType,
  UserCredentials,
  WinEvaluation,
} from "./types";

const puzzleSchema = z.object({
  puzzle: z.string().min(1),
  truth: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
  suggestedHost: z.string().min(1),
  hostCharacter: z.string().min(1),
});

const hostAnswerSchema = z.object({
  answerType: z.enum(["yes", "no", "irrelevant", "yes_and_no", "clarify"]),
  speech: z.string().min(1),
  newClue: z.string().nullable(),
  keyPointHit: z.number().int().nullable(),
});

const terseHostSpeech: Record<Locale, Record<HostAnswer["answerType"], string>> = {
  en: {
    yes: "Yes.",
    no: "No.",
    irrelevant: "Irrelevant.",
    yes_and_no: "Yes and No.",
    clarify: "Please ask a clearer yes/no question.",
    narrative: "",
  },
  zh: {
    yes: "是。",
    no: "否。",
    irrelevant: "无关。",
    yes_and_no: "是也不是。",
    clarify: "请提出更清晰的是/否问题。",
    narrative: "",
  },
};

function normalizeHostSpeech(answerType: HostAnswer["answerType"], speech: string, locale: Locale) {
  if (answerType === "clarify") return speech.trim() || terseHostSpeech[locale].clarify;
  return terseHostSpeech[locale][answerType] || speech.trim();
}

const winEvaluationSchema = z.object({
  coveredKeyPoints: z.array(z.number().int()),
  missingCount: z.number().int().nonnegative(),
  hitRate: z.number().min(0).max(100),
  feedback: z.string().min(1),
});

const hintSchema = z.object({
  hint: z.string().min(1),
});

const reasoningCheckSchema = z.object({
  feedback: z.string().min(1),
});

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function createUserModel(credentials: UserCredentials) {
  const provider = createOpenAI({
    baseURL: normalizeBaseUrl(credentials.llmBaseURL),
    apiKey: credentials.llmApiKey,
  });
  return provider.chat(credentials.llmModel);
}

function createRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pickRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getLlmFallbackReason(error: unknown, locale: Locale) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  const prefix =
    locale === "zh"
      ? "LLM 生成失败，已使用内置汤面。原因："
      : "Using a bundled puzzle because LLM generation failed. Reason: ";
  const modelSwitchSuggestion =
    locale === "zh"
      ? " 建议在设置中尝试更换一个更稳定、支持 JSON/结构化输出的模型。"
      : " Try switching to a more stable model with JSON/structured-output support in Settings.";

  if (
    normalized.includes("api key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return `${prefix}${locale === "zh" ? "API Key 无效或未授权。" : "the API key is invalid or unauthorized."}`;
  }
  if (
    normalized.includes("timeout") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return `${prefix}${locale === "zh" ? "网络连接或服务端点不可用。" : "the network or provider endpoint is unavailable."}`;
  }
  if (normalized.includes("rate limit") || normalized.includes("429")) {
    return `${prefix}${locale === "zh" ? "触发限流或额度不足。" : "rate limit or quota was reached."}`;
  }
  if (
    normalized.includes("overloaded") ||
    normalized.includes("service unavailable") ||
    normalized.includes("503")
  ) {
    return `${prefix}${
      locale === "zh"
        ? "模型服务过载或暂时不可用，请稍后重试。"
        : "the model service is overloaded or temporarily unavailable."
    }`;
  }
  if (
    normalized.includes("not found") ||
    normalized.includes("model name") ||
    normalized.includes("model id") ||
    normalized.includes("404")
  ) {
    return `${prefix}${
      locale === "zh"
        ? "模型名称或 Base URL 与服务商不匹配。"
        : "the model name or Base URL does not match the provider."
    }${modelSwitchSuggestion}`;
  }
  if (normalized.includes("returned no text")) {
    return `${prefix}${locale === "zh" ? "模型返回了空内容。" : "the model returned no text."}${modelSwitchSuggestion}`;
  }
  if (normalized.includes("no output generated")) {
    return `${prefix}${
      locale === "zh"
        ? "模型没有生成可读取的文本内容。"
        : "the model generated no readable text output."
    }${modelSwitchSuggestion}`;
  }
  if (normalized.includes("finishreason=length") || normalized.includes("rawfinishreason=length")) {
    return `${prefix}${
      locale === "zh"
        ? "模型输出被长度限制截断。"
        : "the model output was cut off by the length limit."
    }${modelSwitchSuggestion}`;
  }
  if (
    normalized.includes("invalid json") ||
    normalized.includes("no json object") ||
    normalized.includes("complete json object") ||
    normalized.includes("validation=")
  ) {
    return `${prefix}${
      locale === "zh"
        ? "模型返回内容不是有效 JSON 或字段不符合出题格式。"
        : "the model did not return valid JSON or the fields did not match the required format."
    }${modelSwitchSuggestion}`;
  }

  return `${prefix}${locale === "zh" ? "未知错误，请查看控制台详情。" : "unknown error; check the console for details."}`;
}
function previewText(text: string, maxLength = 240) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
}

function extractJsonObject(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fencedMatch?.[1]?.trim() ?? text.trim();

  try {
    return JSON.parse(source);
  } catch {
    const start = source.indexOf("{");
    if (start < 0) throw new Error("No JSON object found in model response.");

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < source.length; index += 1) {
      const char = source[index];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = inString;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return JSON.parse(source.slice(start, index + 1));
        }
      }
    }
  }

  throw new Error("Model response did not contain a complete JSON object.");
}

const jsonSystemPrompt =
  'You are a strict JSON API. Return only the final JSON object. Do not think aloud, explain, translate the instructions, restate the task, or include markdown. The first character must be "{" and the last character must be "}".';

function buildRepairJsonPrompt(text: string, schemaHint: string) {
  return `Convert the following model response into exactly one compact valid JSON object that matches the schema.
If the response contains analysis, markdown, a TypeScript-like shape, or extra prose, discard it.
If a required value is missing, infer the smallest safe value from the response.

${schemaHint}

Model response:
${text}

Return only valid JSON. The first character must be "{" and the last character must be "}".`;
}

function buildJsonPrompt(prompt: string, schemaHint: string) {
  return `${prompt}

${schemaHint}
Return exactly one compact valid JSON object now. No prose. No reasoning. No markdown.`;
}

function getPlainJsonTokenBudget(maxOutputTokens: number) {
  return Math.min(Math.max(maxOutputTokens * 3, 4000), 8000);
}

function parseAndValidateJson<TSchema extends z.ZodTypeAny>(
  text: string,
  schema: TSchema,
): z.infer<TSchema> {
  const parsed = extractJsonObject(text);
  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(validation.error.message);
  }
  return validation.data;
}

async function generateJson<TSchema extends z.ZodTypeAny>({
  credentials,
  label,
  schema,
  schemaHint,
  prompt,
  temperature,
  maxOutputTokens,
}: {
  credentials: UserCredentials;
  label: string;
  schema: TSchema;
  schemaHint: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<z.infer<TSchema>> {
  const model = createUserModel(credentials);
  const jsonPrompt = buildJsonPrompt(prompt, schemaHint);

  try {
    const structured = await generateText({
      model,
      output: Output.object({ schema }),
      temperature,
      maxOutputTokens,
      system: jsonSystemPrompt,
      prompt: jsonPrompt,
    });

    return structured.output;
  } catch (structuredError) {
    console.warn(`${label} structured output failed; retrying with plain JSON.`, structuredError);
  }

  const result = await generateText({
    model,
    temperature,
    maxOutputTokens: getPlainJsonTokenBudget(maxOutputTokens),
    system: jsonSystemPrompt,
    prompt: jsonPrompt,
  });

  const text = result.text.trim();
  if (!text) {
    throw new Error(
      `${label} returned no text. finishReason=${result.finishReason}; rawFinishReason=${String(
        result.rawFinishReason,
      )}`,
    );
  }

  try {
    return parseAndValidateJson(text, schema);
  } catch (firstError) {
    const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);

    const repair = await generateText({
      model,
      temperature: 0,
      maxOutputTokens: getPlainJsonTokenBudget(maxOutputTokens),
      system: jsonSystemPrompt,
      prompt: buildRepairJsonPrompt(text, schemaHint),
    });
    const repairedText = repair.text.trim();

    if (!repairedText) {
      throw new Error(
        `${label} returned invalid JSON and repair returned no text. finishReason=${result.finishReason}; rawFinishReason=${String(
          result.rawFinishReason,
        )}; outputPreview=${previewText(text)}; validation=${firstMessage}; repairFinishReason=${
          repair.finishReason
        }; repairRawFinishReason=${String(repair.rawFinishReason)}`,
      );
    }

    try {
      return parseAndValidateJson(repairedText, schema);
    } catch (repairError) {
      const repairMessage =
        repairError instanceof Error ? repairError.message : String(repairError);
      throw new Error(
        `${label} returned invalid JSON. finishReason=${result.finishReason}; rawFinishReason=${String(
          result.rawFinishReason,
        )}; outputPreview=${previewText(text)}; validation=${firstMessage}; repairFinishReason=${
          repair.finishReason
        }; repairRawFinishReason=${String(repair.rawFinishReason)}; repairPreview=${previewText(
          repairedText,
        )}; repairValidation=${repairMessage}`,
      );
    }
  }
}

export async function validateLlm(credentials: UserCredentials) {
  if (!credentials.llmBaseURL || !credentials.llmApiKey || !credentials.llmModel) {
    throw new Error("Missing LLM base URL, API key, or model.");
  }
  await generateJson({
    credentials,
    label: "LLM validation",
    schema: z.object({ ok: z.boolean() }),
    schemaHint: 'Required JSON shape: {"ok": true}',
    temperature: 0,
    maxOutputTokens: 64,
    prompt: "Return a minimal JSON object confirming that you can answer.",
  });
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
): Promise<{ puzzle: PuzzlePayload; usedFallback: boolean; fallbackReason?: string }> {
  const fallback = pickRandomItem(fallbackPuzzles[locale][difficulty]);
  const config = difficultyConfig[difficulty];
  const language = locale === "zh" ? "Simplified Chinese" : "English";
  const requestId = createRequestId();
  const prompt = `You are a master lateral thinking puzzle designer.
Generate a complete original puzzle.
Request id: ${requestId}
Difficulty: ${difficulty}
Key points count: ${config.keyRange}
Surface complexity: ${config.surface}
Allowed soup types: ${soupTypes.join(", ")}
Language: ${language}
Critical rules:
- The puzzle must be solvable through yes/no questions.
- Key points must be specific, testable propositions.
- The visible puzzle should be a short strange situation with a clear contradiction or anomaly.
- Do not make a fill-in-the-blank quiz. The player should investigate by asking yes/no questions.
- Avoid common or famous puzzles; create something novel.
- Treat the request id as a uniqueness seed. Do not repeat a puzzle premise from a previous request.
- Do not include markdown.`;

  try {
    const output = await generateJson({
      credentials,
      label: "Puzzle generation",
      schema: puzzleSchema,
      schemaHint:
        'Required JSON example: {"puzzle":"A short strange situation for the player.","truth":"The hidden full explanation.","keyPoints":["A specific testable clue."],"suggestedHost":"Host name","hostCharacter":"Short host persona"}',
      temperature: 0.8,
      maxOutputTokens: 2400,
      prompt,
    });
    return {
      puzzle: {
        puzzle: output.puzzle,
        truth: output.truth,
        keyPoints: output.keyPoints,
        suggestedHost: output.suggestedHost || fallback.suggestedHost,
        hostCharacter: output.hostCharacter || fallback.hostCharacter,
      },
      usedFallback: false,
    };
  } catch (error) {
    console.warn("Puzzle generation failed; using fallback.", error);
    return {
      puzzle: fallback,
      usedFallback: true,
      fallbackReason: getLlmFallbackReason(error, locale),
    };
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
      speech: normalizeHostSpeech("yes", "", locale),
      newClue: keyPoints[hitIndex],
      keyPointHit: hitIndex,
    };
  }

  const negativeWords = ["not", "never", "没有", "不是", "并非"];
  const hasNegative = negativeWords.some((word) => normalizedQuestion.includes(word));
  const answerType = hasNegative ? "yes_and_no" : "irrelevant";
  return {
    answerType,
    speech: normalizeHostSpeech(answerType, "", locale),
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
    messages?: GameSession["messages"];
    hostName?: string;
    hostCharacter: string;
    locale: Locale;
  },
  question: string,
): Promise<HostAnswer> {
  const language = session.locale === "zh" ? "Simplified Chinese" : "English";
  const prompt = `You are ${session.hostName ?? "the host"}: ${session.hostCharacter}, hosting a lateral thinking puzzle game.
PUZZLE visible to player: ${session.puzzle}
TRUTH hidden from player: ${session.truth}
KEY POINTS hidden from player: ${JSON.stringify(session.keyPoints)}
ALREADY HIT KEY POINT INDEXES: ${JSON.stringify(session.hitKeyPoints)}
CONVERSATION HISTORY: ${JSON.stringify((session.messages ?? []).slice(-20))}
PLAYER QUESTION: ${question}

Strict rules:
1. Answer only with answerType yes, no, irrelevant, yes_and_no, or clarify.
2. For yes/no/irrelevant/yes_and_no, speech must be only the short answer label with no explanation.
3. Never reveal the truth or key points directly in speech.
4. If ambiguous, use clarify and politely request a clearer yes/no question.
5. Determine whether this confirms a new clue and which key point index it hits.
6. Respond in ${language}.`;

  try {
    const output = await generateJson({
      credentials,
      label: "Host answer",
      schema: hostAnswerSchema,
      schemaHint:
        'Required JSON example: {"answerType":"yes","speech":"Yes.","newClue":"A newly confirmed clue or null","keyPointHit":0}',
      temperature: 0.2,
      maxOutputTokens: 300,
      prompt,
    });
    return {
      answerType: output.answerType,
      speech: normalizeHostSpeech(output.answerType, output.speech, session.locale),
      newClue: output.newClue ?? null,
      keyPointHit: typeof output.keyPointHit === "number" ? output.keyPointHit : null,
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
  const requiredHitRate = 90;
  const buildEvaluation = (
    coveredKeyPoints: number[],
    hitRate: number,
    fallbackFeedback: string,
  ): WinEvaluation => {
    const normalizedCovered = Array.from(
      new Set(
        coveredKeyPoints.filter(
          (index) => Number.isInteger(index) && index >= 0 && index < keyPoints.length,
        ),
      ),
    ).sort((a, b) => a - b);
    const normalizedHitRate = Math.round(Math.min(Math.max(hitRate, 0), 100));

    return {
      coveredKeyPoints: normalizedCovered,
      missingCount: Math.max(keyPoints.length - normalizedCovered.length, 0),
      hitRate: normalizedHitRate,
      isWin: normalizedHitRate >= requiredHitRate,
      feedback: fallbackFeedback,
    };
  };
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

  const language = locale === "zh" ? "Simplified Chinese" : "English";
  const prompt = `Evaluate how many key points the player's final answer covers.
KEY POINTS with indexes: ${JSON.stringify(keyPoints)}
PLAYER ANSWER: ${playerAnswer}
For each key point, decide if the player's answer semantically covers it.
Set hitRate from 0 to 100 for the overall semantic match to the full truth. A near-complete answer with minor wording differences can be around 90.
The player is correct if hitRate is at least ${requiredHitRate}%.
Respond in ${language}.`;

  try {
    const output = await generateJson({
      credentials,
      label: "Final answer evaluation",
      schema: winEvaluationSchema,
      schemaHint:
        'Required JSON example: {"coveredKeyPoints":[0],"missingCount":1,"hitRate":50,"feedback":"Brief feedback."}',
      temperature: 0,
      maxOutputTokens: 400,
      prompt,
    });
    return buildEvaluation(output.coveredKeyPoints, output.hitRate, output.feedback);
  } catch (error) {
    console.warn("Evaluation failed; using local heuristic.", error);
    return buildEvaluation(
      localCovered,
      keyPoints.length > 0 ? (localCovered.length / keyPoints.length) * 100 : 0,
      locale === "zh"
        ? "我会按已覆盖的关键点来判断。"
        : "I will judge by the key points you covered.",
    );
  }
}

export async function generateHint(
  credentials: UserCredentials,
  session: Pick<
    GameSession,
    | "puzzle"
    | "truth"
    | "keyPoints"
    | "hitKeyPoints"
    | "messages"
    | "hintsUsed"
    | "hostName"
    | "hostCharacter"
    | "locale"
  >,
): Promise<string> {
  const hintNumber = session.hintsUsed + 1;
  const visibleFocus = pickVisibleFocus(session.puzzle, session.locale);
  const localHint =
    session.locale === "zh"
      ? [
          `提示 ${hintNumber}：先抓住汤面里最反常的一点：“${visibleFocus}”。试着问它是不是被某个人有意安排的。`,
          `提示 ${hintNumber}：有个关键背景还没被确认。可以把问题缩小到身份、过往关系或动机。`,
          `提示 ${hintNumber}：沿着“${visibleFocus}”继续问原因，不要只问它是否发生过。重点查为什么这样做之后，情绪或结果发生了变化。`,
        ][Math.min(hintNumber, 3) - 1]
      : [
          `Hint ${hintNumber}: Start with the strangest visible detail: "${visibleFocus}". Try asking whether someone arranged it on purpose.`,
          `Hint ${hintNumber}: One key background fact is still untested. Narrow your next question to identity, history, relationship, or motive.`,
          `Hint ${hintNumber}: Keep asking why "${visibleFocus}" changed the outcome. Focus on the reason, not whether the event simply happened.`,
        ][Math.min(hintNumber, 3) - 1];
  const language = session.locale === "zh" ? "Simplified Chinese" : "English";
  const prompt = `You are ${session.hostName}: ${session.hostCharacter}, hosting a lateral thinking puzzle game.
PUZZLE visible to player: ${session.puzzle}
TRUTH hidden from player: ${session.truth}
KEY POINTS hidden from player: ${JSON.stringify(session.keyPoints)}
ALREADY HIT KEY POINT INDEXES: ${JSON.stringify(session.hitKeyPoints)}
CONVERSATION HISTORY: ${JSON.stringify(session.messages.slice(-24))}
HINT NUMBER: ${hintNumber} of 3

Give one progressive hint in ${language}.
Rules:
- Do not reveal the truth or quote a hidden key point directly.
- Every hint must name one concrete visible detail from the puzzle or conversation.
- Guide the player toward the next useful yes/no question they can ask.
- Do not give vague coaching such as "check your direction" unless paired with a concrete detail.
- Hint 1: identify the main anomaly in the surface and suggest a broad test question.
- Hint 2: imply one overlooked relationship, motive, identity, or timeline point.
- Hint 3: give a clearer direction, still without directly solving it.
- Keep it concise and in character.`;

  try {
    const output = await generateJson({
      credentials,
      label: "Hint generation",
      schema: hintSchema,
      schemaHint: 'Required JSON example: {"hint":"One concise progressive hint."}',
      temperature: 0.4,
      maxOutputTokens: 220,
      prompt,
    });
    return output.hint;
  } catch (error) {
    console.warn("Hint generation failed; using local hint.", error);
    return localHint;
  }
}

export async function checkReasoning(
  credentials: UserCredentials,
  session: Pick<
    GameSession,
    | "puzzle"
    | "truth"
    | "keyPoints"
    | "hitKeyPoints"
    | "messages"
    | "hostName"
    | "hostCharacter"
    | "locale"
  >,
): Promise<ReasoningCheck> {
  const language = session.locale === "zh" ? "Simplified Chinese" : "English";
  const localFeedback =
    session.locale === "zh"
      ? `你已经确认了 ${session.hitKeyPoints.length}/${session.keyPoints.length} 个关键点。继续把已确认线索连成因果链，重点关注还没有被解释的异常。`
      : `You have confirmed ${session.hitKeyPoints.length}/${session.keyPoints.length} key points. Keep connecting the confirmed clues into a causal chain and focus on the remaining odd detail.`;
  const prompt = `You are ${session.hostName}: ${session.hostCharacter}, hosting a lateral thinking puzzle game.
PUZZLE visible to player: ${session.puzzle}
TRUTH hidden from player: ${session.truth}
KEY POINTS hidden from player: ${JSON.stringify(session.keyPoints)}
ALREADY HIT KEY POINT INDEXES: ${JSON.stringify(session.hitKeyPoints)}
CONVERSATION HISTORY: ${JSON.stringify(session.messages.slice(-24))}

Summarize the player's current reasoning path in ${language}.
Rules:
- Mention what they seem to have right.
- Mention what is still missing only at a high level.
- Do not reveal specific hidden key points or the full solution.
- Keep it concise and in character.`;

  try {
    const output = await generateJson({
      credentials,
      label: "Reasoning check",
      schema: reasoningCheckSchema,
      schemaHint: 'Required JSON example: {"feedback":"Brief reasoning feedback."}',
      temperature: 0.3,
      maxOutputTokens: 260,
      prompt,
    });
    return output;
  } catch (error) {
    console.warn("Reasoning check failed; using local summary.", error);
    return { feedback: localFeedback };
  }
}

export function getVoiceId(host: string, locale: Locale) {
  return getHostPreset(host, locale).voiceId;
}

export function getHostPreset(host: string, locale: Locale, soupTypes: SoupType[] = []) {
  const normalizedHost = host.toLowerCase();
  const matchedPreset = hostVoicePresets.find((preset) =>
    [preset.name, ...preset.aliases].some((alias) => normalizedHost.includes(alias.toLowerCase())),
  );
  if (matchedPreset) return matchedPreset;
  const typeMatchedPreset = hostVoicePresets.find(
    (preset) =>
      preset.id !== "the_narrator" &&
      soupTypes.some((soupType) => preset.suitableTypes.includes(soupType)),
  );
  return typeMatchedPreset ?? hostVoicePresets[locale === "zh" ? 4 : 0];
}

function pickVisibleFocus(puzzle: string, locale: Locale) {
  const parts = puzzle
    .split(locale === "zh" ? /[。！？；]/ : /[.!?;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.at(-1) ?? parts[0] ?? (locale === "zh" ? "那个异常结果" : "the odd outcome");
}
