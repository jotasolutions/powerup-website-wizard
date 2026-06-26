import { useEffect, useId, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { KeyboardAwareField } from "./KeyboardAwareField";
import { inputStepConfig } from "@/lib/input-step-config";
import { addressAutocomplete, addressResolve } from "@/lib/alta.functions";
import { scrollInputIntoView } from "@/hooks/useKeyboardInset";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onFocusInput?: (el: HTMLElement) => void;
};

function newSessionToken(): string {
  return crypto.randomUUID();
}

export function AddressAutocomplete({ value, onChange, disabled, onFocusInput }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<
    Array<{ place_id: string; label: string; simplified_address: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef(newSessionToken());
  const addressAutocompleteFn = useServerFn(addressAutocomplete);
  const addressResolveFn = useServerFn(addressResolve);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const r = await addressAutocompleteFn({
          data: { query: query.trim(), session_token: sessionTokenRef.current },
        });
        setSuggestions(r.suggestions);
      } catch (e) {
        console.error(e);
        setSuggestions([]);
        setError(
          e instanceof Error ? e.message : "No se pudo buscar la dirección. Inténtalo de nuevo.",
        );
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, addressAutocompleteFn]);

  async function pick(placeId: string, label: string) {
    try {
      const r = await addressResolveFn({ data: { place_id: placeId } });
      const value = r.simplified_address || label;
      onChange(value);
      setQuery(value);
    } catch {
      onChange(label);
      setQuery(label);
    }
    setSuggestions([]);
    sessionTokenRef.current = newSessionToken();
  }

  const attrs = inputStepConfig.restaurantAddress;
  const suggestionsOpen = !loading && suggestions.length > 0;

  return (
    <div className="space-y-1">
      <KeyboardAwareField
        suggestionsOpen={suggestionsOpen}
        suggestions={
          <ul id={listId} role="listbox">
            {suggestions.map((s) => (
              <li key={s.place_id} role="option">
                <button
                  type="button"
                  onClick={() => pick(s.place_id, s.label)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-3 text-left transition last:border-0 hover:bg-muted"
                >
                  <span className="text-sm font-medium">{s.simplified_address}</span>
                  {s.label !== s.simplified_address && (
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        }
      >
        <Input
          ref={inputRef}
          id="restaurant-address"
          placeholder="Busca calle o zona (sin número)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          disabled={disabled}
          onFocus={(e) => {
            onFocusInput?.(e.currentTarget);
            scrollInputIntoView(e.currentTarget);
          }}
          aria-autocomplete="list"
          aria-controls={suggestionsOpen ? listId : undefined}
          {...attrs}
        />
      </KeyboardAwareField>
      <p className="text-xs text-muted-foreground">
        Ejemplo: «Gran Vía, Madrid» — no hace falta el número del local.
      </p>
      {loading && (
        <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Buscando dirección…
        </div>
      )}
      {error && <p className="px-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
