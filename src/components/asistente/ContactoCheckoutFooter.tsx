import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, MessageCircle } from "lucide-react";
import type { AltaState } from "./types";
import {
  ALTA_CONTACT_REASSURANCE_CHIPS,
  ALTA_CONTACT_SAVE_HINT,
  ALTA_CONTACT_STRIPE_NOTE,
  ALTA_TERMS_CHECKBOX_LINK,
  ALTA_TERMS_CHECKBOX_PREFIX,
} from "@/lib/alta-copy";
import { TERMS_AND_PRIVACY_URL } from "@/lib/alta-config";
import { inputStepConfig } from "@/lib/input-step-config";
import { scrollInputIntoView } from "@/hooks/useKeyboardInset";
import { KeyboardAwareField } from "./KeyboardAwareField";
import { cn } from "@/lib/utils";

const assistantInputClass = "text-base md:text-base";

type Props = {
  alta: AltaState;
  formId: string;
  submitCta: string;
  onSubmit: (
    name: string,
    whatsapp: string,
    meta: { consent_user_agent: string },
  ) => void | Promise<void>;
  onFocusInput?: (el: HTMLElement) => void;
  keyboardInset?: number;
};

export function ContactoCheckoutFooter({
  alta,
  formId,
  submitCta,
  onSubmit,
  onFocusInput,
  keyboardInset = 0,
}: Props) {
  const [name, setName] = useState(alta.contact_name);
  const [wa, setWa] = useState(alta.whatsapp);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validName = name.trim().length >= 2;
  const validWa = /[+\d][\d\s-]{7,}/.test(wa.trim());
  const valid = validName && validWa && consent;

  return (
    <div
      className={cn(
        "safe-area-bottom w-full shrink-0 overflow-x-clip border-t border-border/60 bg-white/80 backdrop-blur",
      )}
      style={{
        transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined,
      }}
    >
      <div className="container-narrow w-full">
        <div className="rounded-t-2xl border border-b-0 border-border/60 bg-white/95 px-3 pb-3 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur sm:px-4 sm:pb-4 sm:pt-4">
          <form
            id={formId}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!valid || submitting) return;
              setSubmitting(true);
              try {
                await onSubmit(name.trim(), wa.trim(), {
                  consent_user_agent:
                    typeof navigator !== "undefined" ? navigator.userAgent : "",
                });
              } finally {
                setSubmitting(false);
              }
            }}
            className="space-y-3"
          >
            <div className="rounded-xl border border-border/70 bg-muted/25 p-2.5">
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                </div>
                <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                  Te avisamos cuando tu web de{" "}
                  <span className="font-medium text-foreground">{alta.restaurant_name}</span> esté
                  lista. Sin llamadas ni spam.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALTA_CONTACT_REASSURANCE_CHIPS.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border/60"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <KeyboardAwareField>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-xs font-medium text-foreground">
                    Tu nombre
                  </label>
                  <Input
                    id="contact-name"
                    placeholder="Ej. María"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={(e) => {
                      onFocusInput?.(e.currentTarget);
                      scrollInputIntoView(e.currentTarget);
                    }}
                    disabled={submitting}
                    className={assistantInputClass}
                    {...inputStepConfig.contactName}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="contact-whatsapp" className="text-xs font-medium text-foreground">
                    Tu WhatsApp
                  </label>
                  <Input
                    id="contact-whatsapp"
                    placeholder="+34 600 000 000"
                    value={wa}
                    onChange={(e) => setWa(e.target.value)}
                    onFocus={(e) => {
                      onFocusInput?.(e.currentTarget);
                      scrollInputIntoView(e.currentTarget);
                    }}
                    disabled={submitting}
                    className={assistantInputClass}
                    {...inputStepConfig.contactWhatsapp}
                  />
                  <p className="text-xs text-muted-foreground">{ALTA_CONTACT_SAVE_HINT}</p>
                </div>
              </div>
            </KeyboardAwareField>

            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/15 px-2.5 py-2">
              <Checkbox
                id="contact-consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked === true)}
                disabled={submitting}
                className="mt-0.5"
              />
              <Label
                htmlFor="contact-consent"
                className="cursor-pointer text-xs leading-relaxed font-normal text-muted-foreground"
              >
                {ALTA_TERMS_CHECKBOX_PREFIX}
                <a
                  href={TERMS_AND_PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ALTA_TERMS_CHECKBOX_LINK}
                </a>
                .
              </Label>
            </div>

            <Button type="submit" disabled={!valid || submitting} className="w-full" size="lg">
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {submitting ? "Guardando tu contacto…" : submitCta}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">{ALTA_CONTACT_STRIPE_NOTE}</p>
          </form>
        </div>
      </div>
    </div>
  );
}
