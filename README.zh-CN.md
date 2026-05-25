<div align="center">
  <h1>SoupTalk</h1>
  <img src="./public/souptalk-banner.png" alt="SoupTalk banner" width="100%" />

  <p><strong>AI 语音海龟汤推理游戏</strong></p>
  <p>
    <a href="./README.md">English README</a>
    ·
    <span>🎙️ 语音交互</span>
    ·
    <span>🧠 LLM 驱动</span>
    ·
    <span>🌏 中英双语</span>
  </p>
</div>

SoupTalk 是一款基于 AI 语音交互的海龟汤推理游戏。玩家可以选择汤面类型与难度，向 AI 主持人提出“是 / 否 / 无关”问题，逐步确认线索，最后提交完整汤底。

## ✨ 功能特性

- 支持红汤、清汤、黑汤三类 AI 生成汤面。
- 支持英文与简体中文界面及出题语言。
- 支持自定义 LLM Base URL、API Key 与模型名称，兼容 OpenAI 风格接口。
- 支持 ElevenLabs TTS/STT 语音玩法，并在不可用时回退到浏览器语音能力。
- 可选通过 ElevenLabs 生成悬疑氛围背景音乐。
- 根据汤面氛围和类型匹配主持人声音预设。
- 支持提示、已确认线索、关键点进度、最终答案判定与推理总结。
- 本地保存游戏进度与历史记录，支持详情查看、删除和 JSON 导出。
- 生产环境 SSR 异常会展示定制错误页。

## 🧰 技术栈

- React 19 与 TypeScript
- TanStack Start、TanStack Router、TanStack Query
- Vite 7 与 Cloudflare Workers 构建支持
- Tailwind CSS 4，Radix UI / shadcn 风格组件
- Zustand 管理当前游戏状态
- IndexedDB 与 localStorage 本地持久化
- AI SDK OpenAI 兼容客户端与 ElevenLabs 客户端/API

## 📦 环境要求

- 推荐使用 Bun，项目已包含 `bun.lock`。
- AI 出题与主持人回答需要可用的 OpenAI 兼容 LLM 接口。
- ElevenLabs API Key 为可选项，用于增强语音、语音识别和背景音乐能力。

## 🚀 快速开始

```bash
bun install
bun run dev
```

打开 Vite 输出的本地地址后，进入设置并配置：

- `LLM Base URL`，例如 `https://api.openai.com/v1`
- `LLM API Key`
- `模型名称`，默认值为 `gpt-4o-mini`
- `ElevenLabs API Key`，可选，用于增强语音功能
- 界面语言：英文或简体中文

## 🎮 游戏流程

1. 选择汤面类型：红汤、清汤或黑汤。
2. 选择难度：简单、中等或困难。
3. 可选开启背景音乐。
4. 开始游戏并阅读汤面。
5. 通过文字或语音一次提出一个“是 / 否 / 无关”问题。
6. 卡住时可以使用提示。
7. 确认足够关键点后提交完整汤底。
8. 在历史记录中查看、删除或导出过往对局。

## ⚙️ 配置说明

- 凭据与偏好设置保存在浏览器本地。
- 当前未结束对局保存在 localStorage。
- 已完成历史记录保存在 IndexedDB，并在不可用或兼容旧数据时回退到 localStorage。
- LLM 生成失败时，应用会回退到内置汤面。
- ElevenLabs 语音不可用或未配置时，会尽量回退到浏览器语音能力。
- 可通过 `VITE_ELEVENLABS_VOICE_DETECTIVE_MARLOW`、`VITE_ELEVENLABS_VOICE_MADAME_MYSTERY`、`VITE_ELEVENLABS_VOICE_OLD_SAGE`、`VITE_ELEVENLABS_VOICE_THE_WHISPERER`、`VITE_ELEVENLABS_VOICE_THE_NARRATOR` 覆盖默认 Voice ID。

## 🛠️ 常用脚本

```bash
bun run dev        # 启动本地开发服务器
bun run build      # 生产构建
bun run build:dev  # 以 development mode 构建
bun run preview    # 预览生产构建
bun run lint       # 运行 ESLint
bun run format     # 使用 Prettier 格式化文件
```
