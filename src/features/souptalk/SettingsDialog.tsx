import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateElevenLabs, validateLlm } from "./llm";
import { hasRequiredCredentials } from "./storage";
import type { Locale, UserCredentials } from "./types";
import { translate } from "./i18n";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface FieldState {
  status: ValidationStatus;
  message?: string;
}

interface SettingsDialogProps {
  open: boolean;
  onboarding?: boolean;
  credentials: UserCredentials;
  onChange: (credentials: UserCredentials) => void;
  onOpenChange: (open: boolean) => void;
}

const initialFieldState: FieldState = { status: "idle" };

export function SettingsDialog({
  open,
  onboarding,
  credentials,
  onChange,
  onOpenChange,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState(credentials);
  const [llmState, setLlmState] = useState<FieldState>(initialFieldState);
  const [elevenState, setElevenState] = useState<FieldState>(initialFieldState);
  const locale = draft.locale;

  useEffect(() => {
    setDraft(credentials);
  }, [credentials, open]);

  function update<K extends keyof UserCredentials>(key: K, value: UserCredentials[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function runLlmValidation(nextDraft = draft) {
    if (!nextDraft.llmBaseURL || !nextDraft.llmApiKey || !nextDraft.llmModel) {
      setLlmState({ status: "invalid", message: translate(locale, "required") });
      return;
    }
    setLlmState({ status: "validating" });
    try {
      await validateLlm(nextDraft);
      setLlmState({ status: "valid" });
    } catch (error) {
      setLlmState({
        status: "invalid",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function runElevenValidation(nextDraft = draft) {
    if (!nextDraft.elevenLabsApiKey) {
      setElevenState({ status: "invalid", message: translate(locale, "required") });
      return;
    }
    setElevenState({ status: "validating" });
    try {
      await validateElevenLabs(nextDraft.elevenLabsApiKey);
      setElevenState({ status: "valid" });
    } catch (error) {
      setElevenState({
        status: "invalid",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function save() {
    onChange(draft);
    onOpenChange(false);
  }

  const canClose = !onboarding || hasRequiredCredentials(draft);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (canClose || nextOpen ? onOpenChange(nextOpen) : undefined)}
    >
      <DialogContent className="max-w-2xl border-parchment/10 bg-[#14110f] text-parchment">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl italic">
            {translate(locale, "welcomeTitle")}
          </DialogTitle>
          <DialogDescription className="text-fog/70">
            {translate(locale, "welcomeDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field
            locale={locale}
            label={translate(locale, "llmBaseURL")}
            value={draft.llmBaseURL}
            onChange={(value) => update("llmBaseURL", value)}
            onBlur={() => runLlmValidation()}
            status={llmState}
            hint={translate(locale, "llmAnyResponseOk")}
          />
          <Field
            locale={locale}
            label={translate(locale, "llmApiKey")}
            type="password"
            value={draft.llmApiKey}
            onChange={(value) => update("llmApiKey", value)}
            onBlur={() => runLlmValidation()}
            status={llmState}
          />
          <Field
            locale={locale}
            label={translate(locale, "llmModel")}
            value={draft.llmModel}
            onChange={(value) => update("llmModel", value)}
            onBlur={() => runLlmValidation()}
            status={llmState}
          />
          <Field
            locale={locale}
            label={translate(locale, "elevenLabsApiKey")}
            type="password"
            value={draft.elevenLabsApiKey}
            onChange={(value) => update("elevenLabsApiKey", value)}
            onBlur={() => runElevenValidation()}
            status={elevenState}
            hint={translate(locale, "elevenUserCheck")}
          />
          <div className="grid gap-2">
            <Label className="text-fog">{translate(locale, "language")}</Label>
            <Select
              value={draft.locale}
              onValueChange={(value) => update("locale", value as Locale)}
            >
              <SelectTrigger className="border-parchment/15 bg-ink/40 text-parchment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          {!onboarding && (
            <Button
              variant="ghost"
              className="text-fog hover:text-ink"
              onClick={() => onOpenChange(false)}
            >
              {translate(locale, "close")}
            </Button>
          )}
          <Button
            className="bg-parchment text-ink hover:bg-blood hover:text-parchment"
            onClick={save}
          >
            {translate(locale, "save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  locale,
  label,
  value,
  onChange,
  onBlur,
  status,
  hint,
  type = "text",
}: {
  locale: "en" | "zh";
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  status: FieldState;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-fog">{label}</Label>
        <ValidationBadge locale={locale} state={status} />
      </div>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="border-parchment/15 bg-ink/40 text-parchment"
      />
      {(hint || status.message) && (
        <p className="line-clamp-2 text-xs text-fog/60">{status.message ?? hint}</p>
      )}
    </div>
  );
}

function ValidationBadge({ locale, state }: { locale: "en" | "zh"; state: FieldState }) {
  if (state.status === "validating") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ember">
        <Loader2 className="size-3 animate-spin" />
        Validating
      </span>
    );
  }
  if (state.status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
        <CheckCircle2 className="size-3" />
        Verified
      </span>
    );
  }
  if (state.status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-300">
        <AlertCircle className="size-3" />
        Failed
      </span>
    );
  }
  return <span className="text-xs text-fog/40">{translate(locale, "notVerified")}</span>;
}
