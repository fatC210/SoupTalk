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
import {
  fingerprintElevenLabsCredentials,
  fingerprintLlmCredentials,
  hasVerifiedElevenLabsCredentials,
  hasVerifiedLlmCredentials,
} from "./storage";
import type { Locale, UserCredentials } from "./types";
import { translate } from "./i18n";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface FieldState {
  status: ValidationStatus;
  message?: string;
}

interface SettingsDialogProps {
  open: boolean;
  credentials: UserCredentials;
  onChange: (credentials: UserCredentials) => void;
  onOpenChange: (open: boolean) => void;
}

const initialFieldState: FieldState = { status: "idle" };

export function SettingsDialog({
  open,
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
    setLlmState(
      hasVerifiedLlmCredentials(credentials)
        ? { status: "valid" }
        : credentials.validation?.llm?.status === "invalid"
          ? { status: "invalid", message: credentials.validation.llm.message }
          : initialFieldState,
    );
    setElevenState(
      hasVerifiedElevenLabsCredentials(credentials)
        ? { status: "valid" }
        : credentials.validation?.elevenLabs?.status === "invalid"
          ? { status: "invalid", message: credentials.validation.elevenLabs.message }
          : initialFieldState,
    );
  }, [credentials, open]);

  function update<K extends keyof UserCredentials>(key: K, value: UserCredentials[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "llmBaseURL" || key === "llmApiKey" || key === "llmModel") {
        setLlmState({ status: "idle" });
        return { ...next, validation: { ...next.validation, llm: undefined } };
      }
      if (key === "elevenLabsApiKey") {
        setElevenState({ status: "idle" });
        return { ...next, validation: { ...next.validation, elevenLabs: undefined } };
      }
      return next;
    });
  }

  async function runLlmValidation(nextDraft = draft) {
    if (!nextDraft.llmBaseURL || !nextDraft.llmApiKey || !nextDraft.llmModel) {
      setLlmState({ status: "invalid", message: translate(locale, "required") });
      return;
    }
    setLlmState({ status: "validating" });
    try {
      await validateLlm(nextDraft);
      setDraft((current) => ({
        ...current,
        validation: {
          ...current.validation,
          llm: {
            status: "valid",
            fingerprint: fingerprintLlmCredentials(nextDraft),
            checkedAt: Date.now(),
          },
        },
      }));
      setLlmState({ status: "valid" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDraft((current) => ({
        ...current,
        validation: {
          ...current.validation,
          llm: {
            status: "invalid",
            fingerprint: fingerprintLlmCredentials(nextDraft),
            checkedAt: Date.now(),
            message,
          },
        },
      }));
      setLlmState({ status: "invalid", message });
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
      setDraft((current) => ({
        ...current,
        validation: {
          ...current.validation,
          elevenLabs: {
            status: "valid",
            fingerprint: fingerprintElevenLabsCredentials(nextDraft),
            checkedAt: Date.now(),
          },
        },
      }));
      setElevenState({ status: "valid" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDraft((current) => ({
        ...current,
        validation: {
          ...current.validation,
          elevenLabs: {
            status: "invalid",
            fingerprint: fingerprintElevenLabsCredentials(nextDraft),
            checkedAt: Date.now(),
            message,
          },
        },
      }));
      setElevenState({ status: "invalid", message });
    }
  }

  function save() {
    onChange(draft);
    onOpenChange(false);
  }

  const canSave = llmState.status !== "validating" && elevenState.status !== "validating";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-parchment/10 bg-[#14110f] text-parchment">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl italic">
            {translate(locale, "welcomeTitle")}
          </DialogTitle>
          <DialogDescription className="text-fog/70">
            {translate(locale, "welcomeDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto py-2 pr-1">
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
        <DialogFooter className="border-t border-parchment/10 pt-4">
          <Button
            variant="ghost"
            className="text-fog hover:text-ink"
            onClick={() => onOpenChange(false)}
          >
            {translate(locale, "close")}
          </Button>
          <Button
            className="bg-parchment text-ink hover:bg-blood hover:text-parchment"
            onClick={save}
            disabled={!canSave}
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
        {translate(locale, "validating")}
      </span>
    );
  }
  if (state.status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
        <CheckCircle2 className="size-3" />
        {translate(locale, "verified")}
      </span>
    );
  }
  if (state.status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-300">
        <AlertCircle className="size-3" />
        {translate(locale, "failed")}
      </span>
    );
  }
  return <span className="text-xs text-fog/40">{translate(locale, "notVerified")}</span>;
}
