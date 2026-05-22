    # 📄 PRD：SoupTalk
    
    ---
    
    ## 1. 项目概述
    
    ### 1.1 背景
    
    基于经典"海龟汤"（Lateral Thinking Puzzle）玩法，结合 ElevenLabs Speech Engine 的语音能力（STT + TTS + 话轮转换 + 打断检测），Vercel AI SDK 的 LLM 编排能力，以及用户自带 LLM 凭证，打造一款**沉浸式语音推理游戏**。
    
    ### 1.2 核心价值主张
    
    - **语音原生体验**：玩家用语音提问，AI 用角色化声音回答，远超文字版的沉浸感
    - **AI 动态出题**：每局都是全新题目，无重复
    - **氛围沉浸**：可选 AI 生成的悬疑 BGM + 角色化人设
    - **零门槛**：无需注册，自带 LLM 凭证，本地存储
    - **公平推理**：基于"关键点"判定胜利，AI 全程严格遵守 是 / 否 / 无关 / 是也不是 的回答规则
    
    ---
    
    ## 2. 海龟汤游戏规则
    
    ### 2.1 核心概念
    
    | 术语 | 英文 | 说明 |
    | --- | --- | --- |
    | 汤面 | Surface / Puzzle | 题目，一段看似不合逻辑的简短情境描述 |
    | 汤底 | Truth / Solution | 事件完整真相 |
    | 关键点 | Key Points | 玩家必须猜中的核心要素 |
    
    ### 2.2 出题人（AI 主持人）的回答规则
    
    AI 只能用以下 4 种回答之一：
    
    - ✅ **是 / Yes**
    - ❌ **否 / No**
    - ❓ **无关 / Irrelevant**
    - ⚖️ **是也不是 / Yes and No**（部分正确）
    
    **额外允许**：当玩家问题表述含糊时，AI 可礼貌追问让其重述。
    
    ### 2.3 胜利判定
    
    玩家通过提问逐步猜出"关键点"。当玩家的某次陈述/猜测**覆盖了全部关键点**（语义相似即可，由 LLM 判断），游戏胜利结束，AI 公布完整汤底。
    
    ### 2.4 失败/结束条件
    
    - 玩家点击"我放弃" → 直接公布汤底
    - 困难难度计时器到达 15 分钟上限 → 公布汤底
    - 提示次数用尽后玩家仍未推理出关键点（非强制结束，玩家可继续猜）
    
    ---
    
    ## 3. 功能需求
    
    ### 3.1 首次进入（Onboarding）
    
    **用户首次访问时显示设置弹窗：**
    
    | 字段 | 类型 | 必填 | 说明 |
    | --- | --- | --- | --- |
    | LLM Base URL | Text | ✅ | 例：`https://api.openai.com/v1` |
    | LLM API Key | Password | ✅ | 用户的 LLM 密钥 |
    | Model Name | Text | ✅ | 例：`gpt-4o`、`claude-3-5-sonnet-20241022` |
    | ElevenLabs API Key | Password | ✅ | 用户的 ElevenLabs 密钥 |
    | 界面语言 | Select | - | 默认 English，可切中文 |
    
    **验证逻辑：**
    
    - 每个输入框 `onBlur` 触发验证
    - LLM 验证：发一条简短测试请求，**只要有返回（任意响应）即视为通过**
    - ElevenLabs 验证：调用 `/v1/user` 端点确认 key 可用
    - 验证状态实时显示（✅ 已验证 / ⚠️ 验证中 / ❌ 失败 + 原因）
    - 所有凭证 **仅存 localStorage**，永不上送服务端
    - 右上角持续显示"设置"齿轮图标，可随时修改
    
    ### 3.2 主菜单（开始页）
    
    ```
    ┌──────────────────────────────────────┐
    │        🐢 SoupTalk                   │
    │   AI Voice Lateral Thinking Game     │
    │                                      │
    │   选择难度 / Choose Difficulty       │
    │   ┌──────┐ ┌──────┐ ┌──────┐         │
    │   │ Easy │ │ Med  │ │ Hard │         │
    │   └──────┘ └──────┘ └──────┘         │
    │                                      │
    │   汤面类型 / Soup Type               │
    │   ☑ 红汤 (Red - 涉及死亡/恐怖)        │
    │   ☑ 清汤 (Clear - 逻辑日常)          │
    │   ☑ 黑汤 (Black - 超自然/猎奇)       │
    │                                      │
    │   [ 🎬 开始游戏 / Start Game ]       │
    │                                      │
    │   [ 历史游戏 ] [ 设置 ]              │
    └──────────────────────────────────────┘
    ```
    
    ### 3.3 难度系统
    
    | 难度 | 关键点数量 | 提示次数 | 计时 | 汤面复杂度 |
    | --- | --- | --- | --- | --- |
    | **简单 Easy** | 2-3 个 | 3 次 | 无 | 短，2-3 句 |
    | **中等 Medium** | 3-4 个 | 3 次 | 无 | 中等，3-5 句 |
    | **困难 Hard** | 4-5 个 | 3 次 | **15 分钟** | 长，伏笔多 |
    
    ### 3.4 游戏主界面
    
    ```
    ┌──────────────────────────────────────────────────┐
    │ 🐢 SoupTalk  [Medium]    BGM 🔇  Lang:EN  ⚙️    │
    ├──────────────────────────────────────────────────┤
    │                                                  │
    │ 📜 汤面 / Puzzle                                  │
    │ ┌────────────────────────────────────────────┐  │
    │ │ A man walks into a bar and orders water.   │  │
    │ │ The bartender pulls out a gun, the man     │  │
    │ │ says "thank you" and leaves...             │  │
    │ └────────────────────────────────────────────┘  │
    │                                                  │
    │ 🎭 Host: Detective Marlow (低沉男声)             │
    │                                                  │
    │ ─────────────── 对话区 ───────────────           │
    │ 🗣 You: Is the man sick?                         │
    │ 🎭 Host: ❌ No                                   │
    │ 🗣 You: Does he need water for a special reason? │
    │ 🎭 Host: ✅ Yes                                  │
    │ ...                                              │
    │                                                  │
    │ ┌─ 🎤 [按住说话 / Hold to Talk] ──────────────┐ │
    │ │   或输入文字 / Or type...           [Send] │ │
    │ └────────────────────────────────────────────┘ │
    │                                                  │
    │ ─── 已确认线索 / Confirmed Clues ───             │
    │ ✓ 男人需要水有特殊原因                            │
    │ ✓ 这不是疾病相关                                  │
    │                                                  │
    │ ─── 推理进度 / Progress ───                       │
    │ [█████░░░░░] 2/3 关键点                           │
    │                                                  │
    │ [💡 提示(3)] [🤔 我推理对吗?] [🏳️ 放弃] [✅ 我知道答案了] │
    └──────────────────────────────────────────────────┘
    ```
    
    ### 3.5 核心交互流程
    
    ### 3.5.1 游戏开始
    
    1. 用户选难度 + 汤类型 → 点击"开始"
    2. 调 LLM：根据选择**动态生成** `{汤面, 汤底, 关键点[], 推荐主持人}`，存当前会话内存
    3. 根据 LLM 推荐，**从预设的 5 个 ElevenLabs voice 中选一个**作为主持人
    4. ElevenLabs TTS 用所选 voice 朗读"开场白 + 汤面"
    5. 若 BGM 开启，调 ElevenLabs Music API 根据汤面氛围生成一段 30-60s 可循环 BGM
    6. 困难难度启动 15 分钟倒计时
    
    ### 3.5.2 提问与回答（核心循环）
    
    1. 用户按住麦克风按钮（或输入文字）
    2. **Speech Engine STT** 实时转录用户语音 → 文本
    3. 文本发给 LLM（带完整对话历史 + 汤底 + 关键点 + 系统提示词）
    4. LLM 返回结构化结果：`{回答类型: "Yes"|"No"|"Irrelevant"|"Yes and No", 新线索文本?: string, 命中的关键点索引?: number}`
    5. **Speech Engine TTS** 用主持人 voice 朗读回答
    6. 同步触发音效（"是"=轻快提示音 / "否"=低沉音 / "无关"=空灵音 / "是也不是"=混合音）
    7. 若有新线索 → 追加到"已确认线索"列表
    8. 更新推理进度条（基于已命中关键点数量 / 总关键点数）
    9. 支持**打断检测**：玩家在主持人讲话时开口，主持人立即停止
    
    ### 3.5.3 提示系统（3 次/局）
    
    点击"💡 提示"按钮：
    
    - AI 分析当前对话历史
    - 输出**渐进式提示**（不直接给答案）：
        - 第 1 次：指出当前推理方向偏差
        - 第 2 次：暗示某个被忽略的关键点
        - 第 3 次：给出更明确的方向引导
    - 用主持人 voice 朗读
    
    点击"🤔 我推理对吗?"按钮（**不消耗提示次数**）：
    
    - AI 总结玩家目前推理路径，指出哪些已对、哪些还差
    - 但不揭示具体答案
    
    ### 3.5.4 提交答案
    
    点击"✅ 我知道答案了"：
    
    - 弹出文本框，玩家用文字或语音陈述完整推理
    - LLM 对照"关键点"判断覆盖度：
        - **全部覆盖** → 🎉 胜利，朗读汤底
        - **部分覆盖** → 显示"还差 X 个关键点"，**允许无限次重试**，不扣提示次数
        - **完全偏离** → 提示"再想想"，继续游戏
    
    ### 3.5.5 游戏结束
    
    - **胜利**：主持人 voice 朗读完整汤底 + 关键点解析 + 庆祝音效
    - **放弃**：主持人 voice 朗读汤底（语气惋惜）
    - **超时**（仅困难）：主持人 voice 朗读汤底（提示时间到）
    - 提供按钮：[再来一局] [分享战绩]（截图/复制对话摘要）[查看历史]
    
    ### 3.6 AI 主持人角色（5 个预设 Voice）
    
    根据汤面内容自动匹配（性别/年龄合理）：
    
    | 角色 | Voice 风格 | 适用汤面类型 |
    | --- | --- | --- |
    | **Detective Marlow** | 低沉男声、冷静 | 红汤、悬疑 |
    | **Madame Mystery** | 神秘女声、慵懒 | 黑汤、超自然 |
    | **Old Sage** | 苍老男声、智者 | 清汤、哲思 |
    | **The Whisperer** | 低语女声、诡异 | 黑汤、恐怖 |
    | **The Narrator** | 中性叙述、磁性 | 任意 |
    
    LLM 在生成汤面时同时返回 `suggestedHost` 字段。
    
    ### 3.7 BGM 系统
    
    - 默认 **关闭**
    - 开关按钮位于顶部
    - 打开后：调用 **ElevenLabs Music API** 根据汤面摘要生成一段 30-60s 悬疑氛围曲，前端循环播放
    - 用户可调节音量（0-100%）
    - 切换游戏时重新生成
    
    ### 3.8 历史记录（本地存储）
    
    - 所有完成的游戏存 IndexedDB
    - 列表项：日期、难度、汤类型、用时、是否胜利
    - 详情：完整对话记录、汤面、汤底、玩家最终推理
    - 支持导出 JSON / 删除
    - **不支持云端同步**
    
    ---
    
    ## 4. 技术架构
    
    ### 4.1 技术栈
    
    | 层 | 技术 |
    | --- | --- |
    | 框架 | **Next.js 15 (App Router)** + TypeScript |
    | UI | shadcn/ui + Tailwind CSS + Framer Motion |
    | 状态管理 | Zustand（轻量，本地状态） |
    | AI 编排 | **Vercel AI SDK** (`ai` + `@ai-sdk/openai` / 通用 provider) |
    | 语音 | **ElevenLabs Speech Engine SDK** (`@elevenlabs/client` / React SDK) |
    | 音效/BGM | ElevenLabs Sound Effects API + Music API |
    | 国际化 | `next-intl`（中英切换） |
    | 本地存储 | localStorage（凭证）+ IndexedDB（游戏历史） |
    | 部署 | Vercel |
    
    ### 4.2 Vercel AI SDK 使用方式
    
    ```tsx
    // 用户自带 LLM 配置，通过 createOpenAI 自定义 baseURL
    import { createOpenAI } from '@ai-sdk/openai';
    import { streamText, generateObject } from 'ai';
    
    const userLLM = createOpenAI({
      baseURL: userConfig.baseURL,
      apiKey: userConfig.apiKey,
    });
    
    // 生成汤面（结构化输出）
    const { object } = await generateObject({
      model: userLLM(userConfig.model),
      schema: soupSchema, // {puzzle, truth, keyPoints[], suggestedHost}
      prompt: soupGenerationPrompt,
    });
    
    // 主持人回答（结构化）
    const { object: answer } = await generateObject({
      model: userLLM(userConfig.model),
      schema: hostAnswerSchema,
      system: hostSystemPrompt,
      messages: conversationHistory,
    });
    ```
    
    ### 4.3 ElevenLabs Speech Engine 集成
    
    ```tsx
    // Speech Engine 处理 STT/TTS/turn-taking/打断检测
    // 业务逻辑（LLM 调用）由我们自己的 server 提供
    import { Conversation } from '@elevenlabs/client';
    
    const conversation = await Conversation.startSession({
      apiKey: userConfig.elevenLabsKey,
      voiceId: selectedHostVoiceId,
      customLlmExtraBody: { gameSessionId },
      onMessage: (msg) => { ... },
      onModeChange: (mode) => { ... }, // listening / speaking
      onInterruption: () => { ... },
    });
    ```
    
    ### 4.4 数据结构（核心 Schema）
    
    ```tsx
    // 凭证（localStorage）
    interface UserCredentials {
      llmBaseURL: string;
      llmApiKey: string;
      llmModel: string;
      elevenLabsApiKey: string;
      locale: 'en' | 'zh';
    }
    
    // 游戏会话（内存 + IndexedDB）
    interface GameSession {
      id: string;
      difficulty: 'easy' | 'medium' | 'hard';
      soupTypes: ('red' | 'clear' | 'black')[];
      puzzle: string;          // 汤面（玩家可见）
      truth: string;           // 汤底（玩家不可见）
      keyPoints: string[];     // 关键点（玩家不可见）
      hitKeyPoints: number[];  // 已命中的关键点索引
      hostVoiceId: string;
      hostCharacter: string;
      messages: Message[];
      confirmedClues: string[];
      hintsUsed: number;
      startTime: number;
      endTime?: number;
      result?: 'win' | 'give_up' | 'timeout';
      bgmEnabled: boolean;
      timeLimit?: number;      // 困难模式：900 秒
    }
    
    interface Message {
      role: 'user' | 'host';
      content: string;
      answerType?: 'yes' | 'no' | 'irrelevant' | 'yes_and_no' | 'narrative';
      timestamp: number;
    }
    ```
    
    ### 4.5 关键 Prompt 设计
    
    ### 汤面生成 Prompt
    
    ```
    You are a master lateral thinking puzzle designer.
    Generate a complete puzzle with:
    - puzzle (surface): A 2-5 sentence mysterious scenario
    - truth (full solution): Complete backstory explaining the puzzle
    - keyPoints: {N} critical insights the player MUST discover to win
    - suggestedHost: Best matching host character based on tone
    
    Difficulty: {difficulty}
    Key points count: {2-3 | 3-4 | 4-5 based on difficulty}
    Allowed types: {soupTypes}
    Language: {locale}
    
    Critical rules:
    - The puzzle MUST be solvable through yes/no questions
    - KeyPoints must be specific, testable propositions
    - Avoid common/famous puzzles; create something novel
    ```
    
    ### 主持人 Prompt
    
    ```
    You are {hostCharacter}, hosting a lateral thinking puzzle game.
    
    PUZZLE (visible to player): {puzzle}
    TRUTH (HIDDEN): {truth}
    KEY POINTS (HIDDEN): {keyPoints}
    ALREADY HIT KEY POINTS: {hitKeyPoints}
    
    STRICT RULES:
    1. Answer ONLY with: "Yes" / "No" / "Irrelevant" / "Yes and No"
    2. NEVER reveal the truth or key points directly
    3. If player's question is ambiguous, return type "clarify" with a polite rephrase request
    4. Stay in character: {characterDescription}
    5. Determine if this question confirms a new clue and which key point it hits
    
    Respond in JSON:
    {
      "answerType": "yes" | "no" | "irrelevant" | "yes_and_no" | "clarify",
      "speech": "<short character-flavored response>",
      "newClue": "<clue text or null>",
      "keyPointHit": <index or null>
    }
    ```
    
    ### 答案判定 Prompt
    
    ```
    Evaluate whether the player's final answer covers ALL key points.
    
    KEY POINTS: {keyPoints}
    PLAYER ANSWER: {playerAnswer}
    
    For each key point, decide if the player's answer semantically covers it.
    
    Respond in JSON:
    {
      "coveredKeyPoints": [<indices>],
      "missingCount": <number>,
      "isWin": <bool>,
      "feedback": "<encouraging message in player's language>"
    }
    ```
    
    ---
    
    ## 5. 国际化 (i18n)
    
    - 默认 **English**
    - 顶部语言切换：EN / 中文
    - 所有 UI 文案双语
    - LLM 生成内容（汤面/汤底/主持人回答）**跟随界面语言**
    - 语音也跟随语言（中文用中文 voice，英文用英文 voice）
    
    ---
    
    ## 6. 关键页面/路由
    
    | 路由 | 说明 |
    | --- | --- |
    | `/` | 首页（含 onboarding 弹窗 + 主菜单） |
    | `/play` | 游戏主界面 |
    | `/history` | 历史记录列表 |
    | `/history/[id]` | 单局详情回看 |
    | `/settings` | 设置页（也可弹窗形式） |
    
    ---