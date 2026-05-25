<div align="center">
  <h1>SoupTalk</h1>
  <img src="./public/souptalk-banner.png" alt="SoupTalk banner" width="100%" />

  <p><strong>AI voice lateral-thinking game for sea turtle soup riddles</strong></p>
  <p>
    <a href="./README.zh-CN.md">中文文档</a>
    ·
    <span>🎙️ Voice</span>
    ·
    <span>🧠 LLM</span>
    ·
    <span>🌏 EN / 中文</span>
  </p>
</div>

SoupTalk is an AI-powered voice lateral-thinking game inspired by "sea turtle soup" riddles. Players choose a puzzle style and difficulty, question an AI host with yes/no prompts, collect clues, and finally submit the hidden truth.

## ✨ Features

- AI-generated puzzles in red, clear, and black soup styles.
- English and Simplified Chinese interface and puzzle output.
- LLM-compatible configuration with custom Base URL, API key, and model name.
- Voice-first gameplay with ElevenLabs TTS/STT support and browser speech fallback.
- Optional suspense background music generated through ElevenLabs.
- Host voice presets matched to puzzle mood and soup type.
- Hints, clue tracking, key-point progress, final-answer judging, and reasoning summaries.
- Local game persistence, history detail pages, delete support, and JSON export.
- Branded SSR error page for production failures.

## 🧰 Tech Stack

- React 19 and TypeScript
- TanStack Start, TanStack Router, and TanStack Query
- Vite 7 and Cloudflare Workers build support
- Tailwind CSS 4 with Radix UI / shadcn-style components
- Zustand for active game state
- IndexedDB and localStorage for local persistence
- AI SDK OpenAI-compatible client and ElevenLabs client/API

## 📦 Requirements

- Bun is recommended because the repository includes `bun.lock`.
- An OpenAI-compatible LLM endpoint is required for AI-generated puzzles and host answers.
- An ElevenLabs API key is optional, but enables ElevenLabs voice, speech recognition, and generated BGM.

## 🚀 Quick Start

```bash
bun install
bun run dev
```

Open the local URL printed by Vite, then go to Settings and configure:

- `LLM Base URL`, for example `https://api.openai.com/v1`
- `LLM API Key`
- `Model Name`, defaulting to `gpt-4o-mini`
- `ElevenLabs API Key`, optional for enhanced voice features
- Interface language: English or Simplified Chinese

## 🎮 Gameplay

1. Select a soup type: red, clear, or black.
2. Select a difficulty: easy, medium, or hard.
3. Optionally enable BGM.
4. Start a game and read the puzzle surface.
5. Ask one yes/no question at a time by text or voice.
6. Use hints when stuck.
7. Submit the final truth when enough key points are confirmed.
8. Review or export previous sessions from History.

## ⚙️ Configuration Notes

- Credentials and preferences are stored locally in the browser.
- Active sessions are stored in localStorage.
- Completed history is stored in IndexedDB, with localStorage fallback for legacy or unavailable environments.
- If LLM generation fails, the app can fall back to built-in puzzles.
- If ElevenLabs voice fails or is not configured, the app falls back to browser speech where available.
- Voice IDs can be overridden with `VITE_ELEVENLABS_VOICE_DETECTIVE_MARLOW`, `VITE_ELEVENLABS_VOICE_MADAME_MYSTERY`, `VITE_ELEVENLABS_VOICE_OLD_SAGE`, `VITE_ELEVENLABS_VOICE_THE_WHISPERER`, and `VITE_ELEVENLABS_VOICE_THE_NARRATOR`.

## 🛠️ Scripts

```bash
bun run dev        # Start local development server
bun run build      # Build for production
bun run build:dev  # Build in development mode
bun run preview    # Preview production build
bun run lint       # Run ESLint
bun run format     # Format files with Prettier
```
