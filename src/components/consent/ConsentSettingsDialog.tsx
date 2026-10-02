import { useEffect, useState } from "react";
import { Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ALL_REJECTED, PRIVACY_POLICY_URL, type ConsentCategories } from "@/lib/analytics-consent";
import { cn } from "@/lib/utils";
import { useConsent } from "./ConsentProvider";

type CategoryKey = keyof ConsentCategories | "necessary";

// Mismos títulos y textos que el aviso de www.powerup.menu.
const CATEGORIES: Array<{ key: CategoryKey; title: string; description: string }> = [
  {
    key: "necessary",
    title: "Necesarias",
    description:
      "Cookies esenciales para el funcionamiento del sitio web. No se pueden desactivar.",
  },
  {
    key: "analytics",
    title: "Analíticas",
    description: "Cookies que nos ayudan a entender cómo los visitantes interactúan con el sitio.",
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Cookies utilizadas para publicidad y seguimiento en distintos sitios web.",
  },
  {
    key: "preferences",
    title: "Preferencias",
    description: "Cookies que recuerdan tu configuración y preferencias.",
  },
];

export function ConsentSettingsDialog() {
  const { settingsOpen, closeSettings, categories, save, acceptAll, rejectAll } = useConsent();
  const [draft, setDraft] = useState<ConsentCategories>(categories ?? ALL_REJECTED);

  useEffect(() => {
    if (settingsOpen) setDraft(categories ?? ALL_REJECTED);
  }, [settingsOpen, categories]);

  return (
    <Dialog open={settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <DialogTitle>Configuración de cookies</DialogTitle>
              <DialogDescription>
                Gestiona tus preferencias de cookies a continuación.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
          {CATEGORIES.map((category) => {
            const isRequired = category.key === "necessary";
            const isEnabled = category.key === "necessary" ? true : draft[category.key];

            return (
              <div
                key={category.key}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors",
                  isEnabled ? "border-primary/20 bg-primary/5" : "border-border",
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`cookie-${category.key}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {category.title}
                    </Label>
                    {isRequired ? (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Obligatorias
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <Switch
                  id={`cookie-${category.key}`}
                  checked={isEnabled}
                  disabled={isRequired}
                  onCheckedChange={(checked) => {
                    if (category.key === "necessary") return;
                    setDraft((current) => ({ ...current, [category.key]: checked }));
                  }}
                  aria-label={`Cookies de ${category.title.toLowerCase()}`}
                />
              </div>
            );
          })}
        </div>

        <Separator />

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={rejectAll}
            className="w-full bg-transparent sm:w-auto"
          >
            Rechazar todo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={acceptAll}
            className="w-full bg-transparent sm:w-auto"
          >
            Aceptar todo
          </Button>
          <Button size="sm" onClick={() => save(draft)} className="w-full gap-2 sm:w-auto">
            <Check className="h-4 w-4" />
            Guardar preferencias
          </Button>
        </DialogFooter>

        <p className="text-center text-xs text-muted-foreground">
          Consulta nuestra{" "}
          <a
            href={PRIVACY_POLICY_URL}
            className="underline underline-offset-4 transition-colors hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            política de privacidad
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
