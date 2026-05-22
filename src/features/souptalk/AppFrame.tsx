import { Link } from "@tanstack/react-router";
import { Languages, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "./types";
import { translate } from "./i18n";

interface AppFrameProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onOpenSettings?: () => void;
  children: ReactNode;
}

export function AppFrame({ locale, onLocaleChange, onOpenSettings, children }: AppFrameProps) {
  return (
    <main className="min-h-screen bg-ink text-parchment grain">
      <header className="sticky top-0 z-40 border-b border-parchment/10 bg-ink/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-blood/50 bg-blood/20">
              🐢
            </span>
            <div>
              <div className="font-serif text-2xl italic leading-none">SoupTalk</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-fog/60">
                {translate(locale, "appTagline")}
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-parchment hover:text-ink">
              <Link to="/history">{translate(locale, "history")}</Link>
            </Button>
            <div className="flex items-center rounded-full border border-parchment/15 bg-parchment/5 p-1 text-xs">
              <Languages className="ml-2 size-3.5 text-fog/70" />
              <button
                type="button"
                onClick={() => onLocaleChange("en")}
                className={`rounded-full px-2 py-1 ${locale === "en" ? "bg-parchment text-ink" : "text-fog"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLocaleChange("zh")}
                className={`rounded-full px-2 py-1 ${locale === "zh" ? "bg-parchment text-ink" : "text-fog"}`}
              >
                中文
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-parchment/20 bg-transparent text-parchment hover:bg-parchment hover:text-ink"
              onClick={onOpenSettings}
              aria-label={translate(locale, "settings")}
            >
              <Settings className="size-4" />
            </Button>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
