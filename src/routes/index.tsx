import { createFileRoute, Link } from "@tanstack/react-router";
import heroImage from "@/assets/hero-room.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SoupTalk — Voice Lateral Thinking, by Midnight" },
      {
        name: "description",
        content:
          "An immersive AI voice game of lateral thinking. Speak. Question. Unravel. Powered by ElevenLabs voice and your own LLM key.",
      },
      { property: "og:title", content: "SoupTalk — Voice Lateral Thinking" },
      {
        property: "og:description",
        content:
          "Speak to a noir AI host. Solve impossible riddles through voice and intuition.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-screen bg-ink text-parchment overflow-x-hidden">
      <Nav />
      <Hero />
      <Manifesto />
      <SoupTypes />
      <GamePreview />
      <Hosts />
      <Difficulty />
      <Faq />
      <Cta />
      <Footer />
    </main>
  );
}

/* ----------------------------- Nav ----------------------------- */
function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-6 md:px-10 py-5 flex justify-between items-center border-b border-parchment/10 backdrop-blur-md bg-ink/60">
      <Link to="/" className="flex items-center gap-2.5 group">
        <span className="size-2 rounded-full bg-blood animate-pulse" aria-hidden />
        <span className="font-serif italic text-2xl tracking-tight">SoupTalk</span>
        <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-[0.3em] text-parchment/40">
          海龟汤
        </span>
      </Link>
      <div className="flex items-center gap-2 md:gap-8 text-[11px] md:text-xs uppercase tracking-[0.25em] font-light">
        <a href="#how" className="hidden md:inline hover:text-blood transition-colors">
          How to Play
        </a>
        <a href="#hosts" className="hidden md:inline hover:text-blood transition-colors">
          The Hosts
        </a>
        <a href="#faq" className="hidden md:inline hover:text-blood transition-colors">
          Inquiries
        </a>
        <Link
          to="/"
          className="px-4 md:px-5 py-2.5 bg-parchment text-ink hover:bg-blood hover:text-parchment transition-colors duration-500"
        >
          Begin
        </Link>
      </div>
    </nav>
  );
}

/* ----------------------------- Hero ----------------------------- */
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grain">
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="A porcelain bowl steams under a brass lamp on a dim mahogany desk"
          width={1920}
          height={1280}
          className="w-full h-full object-cover opacity-55"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 60% 55%, transparent 0%, rgba(10,9,8,0.4) 45%, rgba(10,9,8,0.95) 85%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl px-6 text-center pt-24">
        <div className="mb-8 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-parchment/50">
          <span className="h-px w-8 bg-parchment/40" />
          A Voice Game of Lateral Thinking
          <span className="h-px w-8 bg-parchment/40" />
        </div>
        <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl italic font-light leading-[0.95] mb-8 text-balance">
          Truth is a <span className="text-blood not-italic font-normal">Cold</span> Dish.
        </h1>
        <p className="text-base md:text-lg font-light text-fog/80 max-w-xl mx-auto leading-relaxed mb-10 text-pretty">
          Step into a dim room of logic and shadow. Speak your questions aloud — a noir
          AI host answers only{" "}
          <em className="not-italic text-parchment">Yes</em>,{" "}
          <em className="not-italic text-parchment">No</em>,{" "}
          <em className="not-italic text-parchment">Irrelevant</em>, or{" "}
          <em className="not-italic text-parchment">Yes and No</em>. The rest is up to
          you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-10 py-4 bg-parchment text-ink font-medium hover:bg-blood hover:text-parchment transition-all duration-500 uppercase tracking-[0.2em] text-xs"
          >
            Begin the Descent
          </Link>
          <a
            href="#how"
            className="px-10 py-4 border border-parchment/30 hover:border-parchment hover:bg-parchment/5 transition-all uppercase tracking-[0.2em] text-xs"
          >
            How it Works
          </a>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <span className="text-[9px] uppercase tracking-[0.5em] text-parchment/30">
          Scroll
        </span>
        <div className="w-px h-12 bg-gradient-to-b from-parchment/40 to-transparent" />
      </div>
    </section>
  );
}

/* --------------------------- Manifesto --------------------------- */
function Manifesto() {
  return (
    <section id="how" className="px-6 md:px-10 py-32 md:py-48 border-t border-parchment/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.4em] text-parchment/40 mb-12 flex items-center gap-4">
          <span>I.</span>
          <span className="h-px flex-1 bg-parchment/10" />
          <span>The Manifesto</span>
        </div>
        <p className="font-serif text-3xl md:text-5xl italic font-light leading-snug text-balance text-fog">
          The rules are ancient. A scenario is whispered. You ask{" "}
          <span className="text-blood not-italic">anything</span>. The host replies only
          in four verdicts. Inch by inch, the impossible becomes obvious — and the
          obvious becomes terrifying.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mt-24">
          <Step n="01" title="Speak" body="Hold the brass switch. Your voice becomes the case file. ElevenLabs transcribes every breath." />
          <Step n="02" title="Listen" body="A chosen host — detective, sage, whisperer — replies in character with voice and verdict." />
          <Step n="03" title="Solve" body="When your final theory covers every key point, the curtain lifts. The truth is poured." />
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border-t border-parchment/10 pt-6">
      <div className="flex justify-between items-baseline mb-6">
        <span className="font-serif italic text-blood text-lg">{n}</span>
        <span className="text-[10px] uppercase tracking-widest text-parchment/30">
          Step
        </span>
      </div>
      <h3 className="font-serif text-2xl italic mb-3">{title}</h3>
      <p className="text-sm text-fog/60 leading-relaxed font-light">{body}</p>
    </div>
  );
}

/* --------------------------- Soup Types --------------------------- */
function SoupTypes() {
  const soups = [
    {
      cat: "Category I",
      en: "Red Soup",
      zh: "红汤",
      tone: "Visceral. Death, mystery, and the macabre.",
      accent: "bg-blood/10 group-hover:bg-blood/40 border-blood/40",
      text: "text-blood",
      art: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-40 rounded-full bg-gradient-radial from-blood/80 via-blood/20 to-transparent blur-2xl" />
          <div className="absolute size-3 rounded-full bg-blood shadow-[0_0_60px_20px_rgba(142,26,26,0.6)]" />
        </div>
      ),
    },
    {
      cat: "Category II",
      en: "Clear Soup",
      zh: "清汤",
      tone: "Pure logic. Daily life turned inside out.",
      accent: "bg-fog/5 group-hover:bg-fog/15 border-fog/30",
      text: "text-fog",
      art: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-3/4 bg-gradient-to-b from-transparent via-parchment/50 to-transparent" />
          <div className="absolute w-3/4 h-px bg-gradient-to-r from-transparent via-parchment/50 to-transparent" />
          <div className="absolute size-24 border border-parchment/30 rotate-45" />
        </div>
      ),
    },
    {
      cat: "Category III",
      en: "Black Soup",
      zh: "黑汤",
      tone: "The supernatural. Logic meets the impossible.",
      accent: "bg-ink group-hover:bg-stone-900 border-parchment/20",
      text: "text-parchment",
      art: (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-48 rounded-full border border-parchment/20" />
          <div className="absolute size-32 rounded-full border border-parchment/15" />
          <div className="absolute size-2 rounded-full bg-parchment/80" />
        </div>
      ),
    },
  ];

  return (
    <section className="px-6 md:px-10 py-32 max-w-7xl mx-auto">
      <div className="text-[10px] uppercase tracking-[0.4em] text-parchment/40 mb-12 flex items-center gap-4">
        <span>II.</span>
        <span className="h-px flex-1 bg-parchment/10" />
        <span>Three Soups, Three Temperatures</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {soups.map((s) => (
          <div key={s.en} className="group cursor-pointer">
            <div
              className={`relative aspect-[3/4] mb-6 overflow-hidden border ${s.accent} transition-colors duration-700`}
            >
              {s.art}
              <div className="absolute bottom-6 left-6">
                <span
                  className={`text-[10px] uppercase tracking-[0.3em] font-medium ${s.text}`}
                >
                  {s.cat}
                </span>
                <h3 className="font-serif text-3xl italic mt-1">{s.en}</h3>
                <span className="block font-serif text-sm text-parchment/40 mt-0.5">
                  {s.zh}
                </span>
              </div>
            </div>
            <p className="text-sm text-fog/60 leading-relaxed font-light">{s.tone}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Game Preview --------------------------- */
function GamePreview() {
  return (
    <section className="py-32 md:py-40 bg-[#0e0c0a] border-y border-parchment/5">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="text-[10px] uppercase tracking-[0.4em] text-parchment/40 mb-12 flex items-center gap-4">
          <span>III.</span>
          <span className="h-px flex-1 bg-parchment/10" />
          <span>The Interrogation Room</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 space-y-10">
            <div>
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-parchment/40 mb-4">
                <span>Case File 047</span>
                <div className="h-px flex-1 bg-parchment/10" />
                <span className="text-blood">Medium</span>
              </div>
              <div className="bg-ink p-8 md:p-10 border-l-2 border-blood">
                <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-fog">
                  &ldquo;A man walks into a bar and orders a glass of water. The
                  bartender pulls out a shotgun and points it at him. The man says
                  &lsquo;Thank you&rsquo; and walks out. Why?&rdquo;
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <Bubble who="YOU" tone="user">
                Did the man have a medical condition?
              </Bubble>
              <Bubble who="HOST" tone="host" verdict="No" />
              <Bubble who="YOU" tone="user">
                Was the water meant to cure something physical?
              </Bubble>
              <Bubble who="HOST" tone="host" verdict="Yes and No" />
            </div>

            <div className="flex flex-col items-center gap-5 pt-8">
              <div className="flex items-center justify-center gap-2 h-14">
                {[4, 8, 12, 16, 12, 8, 4].map((h, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-blood rounded-full"
                    style={{
                      height: `${h * 3}px`,
                      opacity: 0.4 + i * 0.08,
                      animation: `pulse 1.2s ease-in-out ${i * 100}ms infinite`,
                    }}
                  />
                ))}
              </div>
              <button
                aria-label="Hold to speak"
                className="size-20 rounded-full border border-blood bg-ink flex items-center justify-center group hover:bg-blood transition-all duration-500 shadow-[0_0_40px_rgba(142,26,26,0.25)]"
              >
                <div className="size-10 rounded-full border-2 border-parchment group-hover:scale-90 transition-transform" />
              </button>
              <span className="text-[9px] uppercase tracking-[0.5em] text-parchment/40">
                Hold to Speak
              </span>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 space-y-6">
              <div className="p-8 border border-parchment/10 bg-ink">
                <h4 className="text-[10px] uppercase tracking-[0.3em] text-parchment/50 mb-6">
                  Confirmed Clues
                </h4>
                <ul className="space-y-4 text-sm">
                  <li className="flex gap-3">
                    <span className="text-blood">✓</span>
                    <span className="text-fog/90">
                      The bartender heard the man&apos;s voice clearly.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blood">✓</span>
                    <span className="text-fog/90">
                      The water was tied to something physical, indirectly.
                    </span>
                  </li>
                  <li className="flex gap-3 opacity-40">
                    <span className="text-blood">○</span>
                    <span className="italic text-fog/60">
                      Awaiting next revelation…
                    </span>
                  </li>
                </ul>

                <div className="mt-10">
                  <div className="flex justify-between text-[9px] uppercase tracking-[0.3em] mb-2 text-parchment/50">
                    <span>The Truth</span>
                    <span>2 / 4 Keys</span>
                  </div>
                  <div className="w-full h-px bg-parchment/10 overflow-hidden">
                    <div className="w-1/2 h-full bg-blood" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="p-4 border border-parchment/10 hover:border-parchment/30 text-[10px] uppercase tracking-[0.25em] transition-colors">
                  Get Hint · 3
                </button>
                <button className="p-4 border border-parchment/10 hover:border-blood hover:text-blood text-[10px] uppercase tracking-[0.25em] transition-colors">
                  Give Up
                </button>
              </div>
              <button className="w-full py-4 bg-blood/10 border border-blood/40 text-blood hover:bg-blood hover:text-parchment text-[11px] uppercase tracking-[0.3em] font-medium transition-all">
                Final Solution
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  who,
  tone,
  verdict,
  children,
}: {
  who: string;
  tone: "user" | "host";
  verdict?: string;
  children?: React.ReactNode;
}) {
  const isHost = tone === "host";
  return (
    <div className={`flex items-start gap-4 ${isHost ? "flex-row-reverse" : ""}`}>
      <div
        className={`shrink-0 size-9 rounded-full grid place-items-center text-[9px] tracking-widest font-medium border ${
          isHost
            ? "bg-blood/15 border-blood/40 text-blood"
            : "bg-parchment/5 border-parchment/20 text-parchment/70"
        }`}
      >
        {who}
      </div>
      <div
        className={`flex-1 p-4 md:p-5 border ${
          isHost
            ? "bg-blood/5 border-blood/15 rounded-bl-2xl"
            : "bg-parchment/5 border-parchment/10 rounded-br-2xl"
        }`}
      >
        {verdict ? (
          <p className="font-serif italic text-lg text-parchment">
            <span className="text-blood mr-2">⸻</span>
            {verdict}.
          </p>
        ) : (
          <p className="text-sm italic text-fog/90 leading-relaxed">{children}</p>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Hosts --------------------------- */
function Hosts() {
  const hosts = [
    {
      name: "Detective Marlow",
      role: "The Investigator",
      voice: "Gravelly baritone. Best for Red Soup.",
      initials: "DM",
    },
    {
      name: "Madame Mystery",
      role: "The Socialite",
      voice: "Sultry and languid. For the cynical.",
      initials: "MM",
    },
    {
      name: "The Old Sage",
      role: "The Archivist",
      voice: "Wispy and ancient. Patient wisdom.",
      initials: "OS",
    },
    {
      name: "The Whisperer",
      role: "The Shadow",
      voice: "Close-mic murmurs. Peak tension.",
      initials: "TW",
    },
    {
      name: "The Narrator",
      role: "The Chronicler",
      voice: "Neutral magnetic resonance.",
      initials: "TN",
    },
  ];

  return (
    <section id="hosts" className="px-6 md:px-10 py-32 max-w-7xl mx-auto">
      <div className="text-[10px] uppercase tracking-[0.4em] text-parchment/40 mb-12 flex items-center gap-4">
        <span>IV.</span>
        <span className="h-px flex-1 bg-parchment/10" />
        <span>Five Voices, One Room</span>
      </div>

      <h2 className="font-serif text-4xl md:text-6xl italic font-light mb-16 max-w-3xl">
        Choose the voice that will lead you through the dark.
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-parchment/10 border border-parchment/10">
        {hosts.map((h) => (
          <article
            key={h.name}
            className="bg-ink p-6 hover:bg-[#14110f] transition-colors group flex flex-col"
          >
            <div className="aspect-[4/5] mb-6 border border-parchment/10 relative overflow-hidden bg-gradient-to-b from-stone-900 to-ink flex items-center justify-center">
              <span className="font-serif italic text-6xl text-parchment/15 group-hover:text-blood/60 transition-colors duration-700">
                {h.initials}
              </span>
              <div className="absolute bottom-2 right-2 size-1.5 rounded-full bg-blood/60" />
            </div>
            <span className="block text-[9px] uppercase tracking-[0.3em] text-blood mb-2">
              {h.role}
            </span>
            <h3 className="font-serif text-xl italic mb-3">{h.name}</h3>
            <p className="text-[11px] leading-relaxed text-fog/60 font-light uppercase tracking-wide">
              {h.voice}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Difficulty --------------------------- */
function Difficulty() {
  const rows = [
    { tier: "Easy", keys: "2–3 Key Points", hints: "3 Hints", time: "Unlimited", tone: "" },
    { tier: "Medium", keys: "3–4 Key Points", hints: "3 Hints", time: "Unlimited", tone: "text-ember" },
    { tier: "Hard", keys: "4–5 Key Points", hints: "3 Hints", time: "15:00", tone: "text-blood" },
  ];
  return (
    <section className="px-6 md:px-10 py-32 border-t border-parchment/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.4em] text-parchment/40 mb-12 flex items-center gap-4">
          <span>V.</span>
          <span className="h-px flex-1 bg-parchment/10" />
          <span>The Difficulty Matrix</span>
        </div>

        <div className="w-full text-sm">
          <div className="grid grid-cols-4 py-4 border-b border-parchment/20 text-[10px] uppercase tracking-[0.3em] text-parchment/40">
            <span>Tier</span>
            <span>Complexity</span>
            <span>Hints</span>
            <span className="text-right">Time</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.tier}
              className={`grid grid-cols-4 py-8 border-b border-parchment/10 items-center ${r.tone}`}
            >
              <span className="font-serif italic text-2xl md:text-3xl">{r.tier}</span>
              <span className="text-fog/70 font-light">{r.keys}</span>
              <span className="text-fog/70 font-light">{r.hints}</span>
              <span className="text-right font-light">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- FAQ --------------------------- */
function Faq() {
  const items = [
    {
      q: "Do I need an account?",
      a: "Never. SoupTalk stores nothing on a server. Your LLM and ElevenLabs keys live only in your browser.",
    },
    {
      q: "Which LLMs work?",
      a: "Any OpenAI-compatible endpoint — GPT-4o, Claude (via gateway), local Llama, or your own base URL.",
    },
    {
      q: "Are puzzles ever repeated?",
      a: "No. Every case file is composed at the moment you press Begin. Your AI is the puzzle designer.",
    },
    {
      q: "Can I play in Chinese / 中文？",
      a: "Yes. Switch languages in settings — the host, the puzzles, and the voice all follow.",
    },
  ];
  return (
    <section id="faq" className="px-6 md:px-10 py-32 max-w-5xl mx-auto">
      <div className="text-[10px] uppercase tracking-[0.4em] text-parchment/40 mb-12 flex items-center gap-4">
        <span>VI.</span>
        <span className="h-px flex-1 bg-parchment/10" />
        <span>Inquiries</span>
      </div>
      <div className="divide-y divide-parchment/10 border-y border-parchment/10">
        {items.map((it) => (
          <details key={it.q} className="group py-8">
            <summary className="cursor-pointer flex justify-between items-center list-none">
              <h3 className="font-serif italic text-xl md:text-2xl pr-6">{it.q}</h3>
              <span className="text-blood text-2xl font-light transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-4 text-fog/70 font-light leading-relaxed max-w-3xl">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- CTA --------------------------- */
function Cta() {
  return (
    <section className="relative px-6 md:px-10 py-40 text-center overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(142,26,26,0.18) 0%, transparent 60%)",
        }}
      />
      <p className="text-[10px] uppercase tracking-[0.5em] text-blood mb-6">
        The Light is On
      </p>
      <h2 className="font-serif text-5xl md:text-7xl italic font-light max-w-3xl mx-auto leading-tight text-balance">
        The bowl is steaming. The host is waiting.
      </h2>
      <Link
        to="/"
        className="mt-12 inline-block px-12 py-5 bg-parchment text-ink font-medium hover:bg-blood hover:text-parchment transition-all duration-500 uppercase tracking-[0.25em] text-xs"
      >
        Begin the Descent
      </Link>
    </section>
  );
}

/* --------------------------- Footer --------------------------- */
function Footer() {
  return (
    <footer className="py-10 px-6 md:px-10 border-t border-parchment/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-parchment/30 font-light">
      <div>© 2026 SoupTalk · 海龟汤</div>
      <div className="flex gap-6 md:gap-10">
        <a href="#" className="hover:text-blood transition-colors">
          ElevenLabs
        </a>
        <a href="#" className="hover:text-blood transition-colors">
          Vercel AI SDK
        </a>
        <a href="#" className="hover:text-blood transition-colors">
          Local Only
        </a>
      </div>
      <div>Ver 1.0 · Dark Room</div>
    </footer>
  );
}
