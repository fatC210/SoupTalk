import type { Difficulty, Locale, SoupType } from "./types";

export const defaultCredentials = {
  llmBaseURL: "https://api.openai.com/v1",
  llmApiKey: "",
  llmModel: "gpt-4o-mini",
  elevenLabsApiKey: "",
  locale: "en" as Locale,
};

export const difficultyConfig: Record<
  Difficulty,
  { keyRange: string; hints: number; timeLimit?: number; surface: string }
> = {
  easy: { keyRange: "2-3", hints: 3, surface: "short, 2-3 sentences" },
  medium: { keyRange: "3-4", hints: 3, surface: "medium, 3-5 sentences" },
  hard: { keyRange: "4-5", hints: 3, timeLimit: 900, surface: "longer with subtle foreshadowing" },
};

export const soupTypeLabels: Record<SoupType, Record<Locale, string>> = {
  red: { en: "Red soup · death or horror", zh: "红汤 · 死亡/恐怖" },
  clear: { en: "Clear soup · everyday logic", zh: "清汤 · 日常逻辑" },
  black: { en: "Black soup · supernatural or strange", zh: "黑汤 · 超自然/猎奇" },
};

export const hostVoiceIds: Record<Locale, string> = {
  en: "EXAVITQu4vr4xnSDxMaL",
  zh: "21m00Tcm4TlvDq8ikWAM",
};

export const fallbackPuzzles = {
  en: {
    easy: {
      puzzle:
        "Every Friday, Lina buys a birthday cake and leaves it untouched on an empty park bench. One evening, after the cake disappears, she finally stops crying.",
      truth:
        "Lina's brother vanished years ago after leaving home on his birthday. She placed cakes on the bench where they last met, hoping he might be alive. The missing cake was taken by her brother, who left a small childhood toy beneath the box to prove he had found her.",
      keyPoints: [
        "The cakes were meant for Lina's missing brother.",
        "The park bench was the place connected to his disappearance.",
        "The disappeared cake proved he was alive and nearby.",
      ],
      suggestedHost: "The Midnight Detective",
      hostCharacter: "a calm noir detective who speaks in short, smoky sentences",
    },
    medium: {
      puzzle:
        "A famous pianist locked herself in a silent room before every concert. The night she forgot to do it, the audience applauded louder than ever, and she resigned the next morning.",
      truth:
        "The pianist had secretly lost most of her hearing and used the silent room to memorize vibrations from a hidden metronome and floor markers. That night she played brilliantly only because a stage technician intentionally adjusted the piano and cues to guide her. The applause proved the lie could continue, but she resigned because someone else now controlled her performance.",
      keyPoints: [
        "The pianist had a hidden hearing loss.",
        "The silent room helped her rehearse using vibration or non-audio cues.",
        "Another person manipulated the concert conditions to help her.",
        "She resigned because the success exposed her dependence or deception.",
      ],
      suggestedHost: "The Velvet Archivist",
      hostCharacter: "an elegant old archivist who enjoys precise answers",
    },
    hard: {
      puzzle:
        "A lighthouse keeper sent three perfect weather reports during a storm that destroyed no ships. When rescuers arrived, they arrested him for murder after seeing a dry pair of boots by the radio.",
      truth:
        "The keeper murdered his assistant before the storm and used the assistant's scheduled radio reports to create an alibi. The reports were perfect because he copied them from a prewritten routine log, not current observations. The dry boots showed he never climbed to inspect the light during the storm, proving he could not have known conditions firsthand and exposing the staged reports.",
      keyPoints: [
        "The assistant was murdered before or during the storm.",
        "The weather reports were used as an alibi.",
        "The reports were copied or prewritten rather than observed live.",
        "The dry boots proved the keeper did not go outside during the storm.",
        "That contradiction exposed the murder staging.",
      ],
      suggestedHost: "The Fogbound Inspector",
      hostCharacter: "a severe coastal inspector with a dry, ominous tone",
    },
  },
  zh: {
    easy: {
      puzzle:
        "每个周五，琳娜都会买一个生日蛋糕，放在空无一人的公园长椅上。某天傍晚，蛋糕消失后，她终于不再哭了。",
      truth:
        "琳娜的哥哥多年前在生日那天离家后失踪。她一直把蛋糕放在两人最后见面的长椅上，希望哥哥还活着。那天蛋糕被哥哥拿走了，他还在盒子下留下了童年的小玩具，证明自己找到了她。",
      keyPoints: ["蛋糕是给失踪哥哥的。", "长椅和哥哥失踪有关。", "蛋糕消失证明哥哥还活着并来过。"],
      suggestedHost: "午夜侦探",
      hostCharacter: "冷静的黑色电影侦探，说话短促而克制",
    },
    medium: {
      puzzle:
        "一位著名钢琴家每次演出前都会把自己锁进一间无声房。她唯一一次忘记这样做，观众掌声空前热烈，而她第二天就辞职了。",
      truth:
        "钢琴家其实几乎失聪，她靠无声房里的震动节拍器和地面标记记忆演奏提示。那晚她表现出色，是因为舞台技师偷偷调整钢琴和提示帮助了她。掌声证明谎言可以继续，但她意识到自己的演出已被别人控制，于是辞职。",
      keyPoints: [
        "钢琴家隐藏了听力障碍。",
        "无声房帮助她利用震动或非听觉线索排练。",
        "有人在演出时暗中帮助她。",
        "她辞职是因为成功暴露了依赖或欺骗。",
      ],
      suggestedHost: "丝绒档案员",
      hostCharacter: "优雅而古旧的档案员，喜欢精确的回答",
    },
    hard: {
      puzzle:
        "暴风雨中，一名灯塔守夜人发出了三份完全准确的天气报告，没有船只遇难。救援人员抵达后，却因为无线电旁一双干燥的靴子逮捕了他。",
      truth:
        "守夜人在暴风雨前杀死了助手，并利用助手原本要发送的定时报告制造不在场证明。报告之所以准确，是因为他照抄了预写的例行日志，而不是现场观测。干燥的靴子证明他暴风雨期间从未外出检查灯塔，因此不可能亲自知道天气状况，伪造报告的矛盾暴露了谋杀。",
      keyPoints: [
        "助手在暴风雨前或期间被杀。",
        "天气报告被用来制造不在场证明。",
        "报告来自照抄或预写，并非实时观测。",
        "干燥的靴子证明守夜人没有外出。",
        "这个矛盾暴露了谋杀伪装。",
      ],
      suggestedHost: "雾港督察",
      hostCharacter: "严厉的海岸督察，语气干冷而不祥",
    },
  },
};
