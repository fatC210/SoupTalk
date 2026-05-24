import type { Difficulty, Locale, PuzzlePayload, SoupType } from "./types";

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

export interface HostVoicePreset {
  id: string;
  name: string;
  voiceStyle: Record<Locale, string>;
  suitableTypes: SoupType[];
  characterDescription: Record<Locale, string>;
  aliases: string[];
  voiceId: string;
}

export const hostVoicePresets: HostVoicePreset[] = [
  {
    id: "detective_marlow",
    name: "Detective Marlow",
    voiceStyle: { en: "Low, calm male voice", zh: "低沉男声、冷静" },
    suitableTypes: ["red"],
    characterDescription: {
      en: "a calm noir detective who speaks in short, smoky sentences",
      zh: "冷静的黑色电影侦探，说话短促而克制",
    },
    aliases: ["detective", "marlow", "midnight", "inspector", "侦探", "督察"],
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_DETECTIVE_MARLOW ?? "ErXwobaYiN019PkySvjV",
  },
  {
    id: "madame_mystery",
    name: "Madame Mystery",
    voiceStyle: { en: "Mysterious, languid female voice", zh: "神秘女声、慵懒" },
    suitableTypes: ["black"],
    characterDescription: {
      en: "a mysterious salon host with a languid voice and elegant menace",
      zh: "神秘沙龙女主人，语气慵懒而优雅",
    },
    aliases: ["madame", "mystery", "mysterious", "神秘", "夫人"],
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_MADAME_MYSTERY ?? "EXAVITQu4vr4xnSDxMaL",
  },
  {
    id: "old_sage",
    name: "Old Sage",
    voiceStyle: { en: "Aged, thoughtful male voice", zh: "苍老男声、智者" },
    suitableTypes: ["clear"],
    characterDescription: {
      en: "an old sage who answers with patient precision",
      zh: "苍老而耐心的智者，回答精确克制",
    },
    aliases: ["sage", "old", "archivist", "智者", "老人", "档案员"],
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_OLD_SAGE ?? "VR6AewLTigWG4xSOukaG",
  },
  {
    id: "the_whisperer",
    name: "The Whisperer",
    voiceStyle: { en: "Whispering, eerie female voice", zh: "低语女声、诡异" },
    suitableTypes: ["black"],
    characterDescription: {
      en: "an eerie whispering host who makes every answer feel like a secret",
      zh: "诡异的低语主持人，让每个回答都像秘密",
    },
    aliases: ["whisper", "whisperer", "低语", "耳语"],
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_THE_WHISPERER ?? "MF3mGyEYCl7XYWbV9V6O",
  },
  {
    id: "the_narrator",
    name: "The Narrator",
    voiceStyle: { en: "Neutral, magnetic narration", zh: "中性叙述、磁性" },
    suitableTypes: ["red", "clear", "black"],
    characterDescription: {
      en: "a neutral narrator with magnetic restraint",
      zh: "克制而有磁性的中性叙述者",
    },
    aliases: ["narrator", "neutral", "host", "旁白", "叙述", "主持"],
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_THE_NARRATOR ?? "21m00Tcm4TlvDq8ikWAM",
  },
];

export const fallbackPuzzles: Record<Locale, Record<Difficulty, PuzzlePayload[]>> = {
  en: {
    easy: [
      {
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
      {
        puzzle:
          "A delivery driver left the same empty box outside Apartment 12 every morning. When the tenant finally opened one, the driver quit with relief.",
        truth:
          "The tenant was an elderly judge under witness protection who never opened suspicious packages. The driver was her grandson, secretly checking that she was alive by seeing whether the box had been moved. When she opened one and left his childhood nickname inside, he knew she recognized him and no longer needed the ritual.",
        keyPoints: [
          "The empty boxes were a safe signal, not real deliveries.",
          "The driver was connected to the tenant personally.",
          "Opening the box proved the tenant recognized him and was safe.",
        ],
        suggestedHost: "The Quiet Courier",
        hostCharacter: "a patient narrator who treats small details as evidence",
      },
      {
        puzzle:
          "Maya watered a dead plant every night for two months. The morning the pot was completely dry, she called the police and smiled.",
        truth:
          "The plant had died in her missing roommate's locked room, and Maya watered it through a cracked window to keep the room looking untouched. Only the roommate knew to move the pot away from the window before sleeping. The dry pot meant the roommate had returned alive, and Maya called police to protect her from the person who had made her hide.",
        keyPoints: [
          "Maya was using the plant to detect whether someone entered the room.",
          "The missing roommate was alive and moved the pot.",
          "Maya called the police because the return created a safety risk.",
        ],
        suggestedHost: "The Window Watcher",
        hostCharacter: "a restrained detective who notices domestic details",
      },
    ],
    medium: [
      {
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
      {
        puzzle:
          "A school principal canceled graduation after finding every student's name spelled correctly on the certificates. Parents were furious, but the police thanked him.",
        truth:
          "The principal had planted a harmless misspelling in one absent student's certificate because that student had been kidnapped and only the kidnapper could know the corrected spelling from a ransom note. Finding all names corrected meant someone had accessed the secure files using information from the kidnapper. Canceling graduation kept the suspect on campus until police arrived.",
        keyPoints: [
          "One certificate was intentionally prepared with a wrong spelling.",
          "The corrected spelling revealed unauthorized access tied to a crime.",
          "Canceling graduation was a tactic to keep the suspect nearby.",
          "The missing or absent student was central to the trap.",
        ],
        suggestedHost: "The Velvet Archivist",
        hostCharacter: "an elegant old archivist who enjoys precise answers",
      },
    ],
    hard: [
      {
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
      {
        puzzle:
          "A museum guard reported a theft before the alarm sounded, then proved he had never left his chair. The missing painting was found in the gallery, but he was arrested anyway.",
        truth:
          "The painting had not been stolen that night; the guard had replaced it days earlier with a convincing copy and used the delayed alarm test schedule to stage a discovery. He reported the theft before the alarm because he already knew the real painting was gone. The painting found in the gallery was his copy, and staying in his chair only proved the crime was prepared earlier.",
        keyPoints: [
          "The real theft happened before the reported incident.",
          "The guard used a copy to stage a fake theft.",
          "Reporting before the alarm revealed prior knowledge.",
          "His alibi for that night did not cover the earlier replacement.",
          "The recovered painting was not the real one.",
        ],
        suggestedHost: "The Midnight Detective",
        hostCharacter: "a calm noir detective who speaks in short, smoky sentences",
      },
    ],
  },
  zh: {
    easy: [
      {
        puzzle:
          "每个周五，琳娜都会买一个生日蛋糕，放在空无一人的公园长椅上。某天傍晚，蛋糕消失后，她终于不再哭了。",
        truth:
          "琳娜的哥哥多年前在生日那天离家后失踪。她一直把蛋糕放在两人最后见面的长椅上，希望哥哥还活着。那天蛋糕被哥哥拿走了，他还在盒子下留下了童年的小玩具，证明自己找到了她。",
        keyPoints: [
          "蛋糕是给失踪哥哥的。",
          "长椅和哥哥失踪有关。",
          "蛋糕消失证明哥哥还活着并来过。",
        ],
        suggestedHost: "午夜侦探",
        hostCharacter: "冷静的黑色电影侦探，说话短促而克制",
      },
      {
        puzzle:
          "快递员每天早上都把同一个空盒子放在 12 号门口。住户终于打开盒子那天，快递员如释重负地辞职了。",
        truth:
          "12 号住户是一位被保护起来的老法官，从不打开可疑包裹。快递员其实是她的孙子，他用空盒子是否被移动来确认她还安全活着。那天她打开盒子，并在里面留下只有家人才知道的童年外号，说明她认出了他，他不用再继续这种秘密确认。",
        keyPoints: [
          "空盒子不是正常快递，而是安全信号。",
          "快递员和住户有亲属关系。",
          "住户打开盒子说明她认出了快递员并且安全。",
        ],
        suggestedHost: "安静信使",
        hostCharacter: "耐心的叙述者，把小细节都当作证据",
      },
      {
        puzzle: "玛雅连续两个月每晚都给一盆死掉的植物浇水。某天早上花盆彻底干了，她微笑着报了警。",
        truth:
          "那盆植物在失踪室友锁住的房间里，玛雅通过裂开的窗户浇水，是为了判断房间有没有人进出。只有那位室友知道睡前要把花盆挪离窗边。花盆变干说明室友活着回来过，玛雅报警是为了保护她免受逼她躲藏的人伤害。",
        keyPoints: [
          "玛雅用花盆判断房间是否有人回来过。",
          "失踪室友还活着并移动了花盆。",
          "报警是因为室友回来后可能仍有危险。",
        ],
        suggestedHost: "窗边守望者",
        hostCharacter: "克制的侦探，擅长注意日常细节",
      },
    ],
    medium: [
      {
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
      {
        puzzle:
          "校长发现所有毕业证上的学生姓名都拼对了，于是取消了毕业典礼。家长们非常愤怒，警察却感谢了他。",
        truth:
          "校长故意把一名缺席学生的毕业证名字拼错，因为那名学生被绑架，只有绑匪才会从勒索信中知道正确拼写。所有名字都被改正，说明有人用绑匪掌握的信息进入了安全文件。取消典礼是为了把嫌疑人留在学校等警方到场。",
        keyPoints: [
          "有一张毕业证上的错字是校长故意留下的。",
          "正确拼写暴露了与犯罪相关的未授权访问。",
          "取消典礼是为了拖住嫌疑人。",
          "缺席学生和陷阱有关。",
        ],
        suggestedHost: "丝绒档案员",
        hostCharacter: "优雅而古旧的档案员，喜欢精确的回答",
      },
    ],
    hard: [
      {
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
      {
        puzzle:
          "博物馆保安在警报响起前就报告了失窃，随后又证明自己整晚没离开椅子。失踪的画在展厅里被找到，但他还是被逮捕了。",
        truth:
          "画并不是当晚被偷的。保安几天前已经把真画换成了仿品，又利用延迟警报测试制造失窃现场。他在警报前报告失窃，是因为他早就知道真画已经不见。展厅里找到的是他的仿品，而他当晚没离开椅子只证明作案发生在更早之前。",
        keyPoints: [
          "真正的失窃发生在报告之前。",
          "保安用仿品制造了假失窃。",
          "警报前报告说明他事先知道真画不见了。",
          "当晚的不在场证明无法覆盖更早的调包。",
          "找回的画不是真品。",
        ],
        suggestedHost: "午夜侦探",
        hostCharacter: "冷静的黑色电影侦探，说话短促而克制",
      },
    ],
  },
};
