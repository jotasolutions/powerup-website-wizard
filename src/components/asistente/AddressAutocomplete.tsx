import { useEffect, useId, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { SuggestionChips } from "./SuggestionChips";
import { inputStepConfig } from "@/lib/input-step-config";
import { addressAutocomplete, addressResolve } from "@/lib/alta.functions";
import { PLACES_MIN_QUERY_LENGTH, useAddressAutocomplete } from "@/hooks/usePlacesSuggestions";
import type { AddressSuggestion } from "@/lib/google-places.server";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const assistantInputClass = "text-base md:text-base";

export function AddressAutocomplete({ value, onChange, disabled }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const sessionTokenRef = useRef(newSessionToken());
  const addressAutocompleteFn = useServerFn(addressAutocomplete);
  const addressResolveFn = useServerFn(addressResolve);

  const { data, isFetching, error } = useAddressAutocomplete(
    query,
    sessionTokenRef.current,
    addressAutocompleteFn,
  );

  const suggestions = data?.suggestions ?? [];
  const searchError =
    error instanceof Error
      ? error.message
      : error
        ? "No se pudo buscar la dirección. Inténtalo de nuevo."
        : null;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  async function pick(placeId: string, label: string) {
    try {
      const r = await addressResolveFn({ data: { place_id: placeId } });
      const nextValue = r.simplified_address || label;
      onChange(nextValue);
      setQuery(nextValue);
    } catch {
      onChange(label);
      setQuery(label);
    }
    sessionTokenRef.current = newSessionToken();
  }

  const attrs = inputStepConfig.restaurantAddress;
  const showSuggestions = query.trim().length >= PLACES_MIN_QUERY_LENGTH;

  return (
    <div className="space-y-1">
      {showSuggestions && (
        <SuggestionChips
          listId={listId}
          variant="footer"
          items={suggestions.map((s) => ({
            id: s.place_id,
            primary: s.simplified_address,
            secondary: s.label !== s.simplified_address ? s.label : undefined,
          }))}
          loading={isFetching}
          error={searchError}
          onSelect={(placeId) => {
            const item = suggestions.find((s) => s.place_id === placeId);
            void pick(placeId, item?.label ?? placeId);
          }}
        />
      )}
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
        className={assistantInputClass}
        aria-autocomplete="list"
        aria-controls={suggestions.length > 0 ? listId : undefined}
        {...attrs}
      />
      <p className="text-xs text-muted-foreground">
        Ejemplo: «Gran Vía, Madrid» — no hace falta el número del local.
      </p>
    </div>
  );
}
