import type { ComponentProps } from "react";
import type { Input } from "@/components/ui/input";

type InputAttrs = Pick<
  ComponentProps<typeof Input>,
  "inputMode" | "autoComplete" | "type" | "enterKeyHint" | "name"
>;

export const inputStepConfig = {
  restaurantSearch: {
    inputMode: "search",
    autoComplete: "off",
    type: "search",
    enterKeyHint: "search",
    name: "restaurant_search",
  },
  restaurantNameManual: {
    inputMode: "text",
    autoComplete: "organization",
    type: "text",
    enterKeyHint: "next",
    name: "restaurant_name",
  },
  restaurantAddress: {
    inputMode: "text",
    autoComplete: "street-address",
    type: "text",
    enterKeyHint: "done",
    name: "restaurant_address",
  },
  websiteUrl: {
    inputMode: "url",
    autoComplete: "url",
    type: "text",
    enterKeyHint: "go",
    name: "website_url",
  },
  domain: {
    inputMode: "text",
    autoComplete: "off",
    type: "text",
    enterKeyHint: "go",
    name: "domain",
  },
  contactName: {
    inputMode: "text",
    autoComplete: "name",
    type: "text",
    enterKeyHint: "next",
    name: "contact_name",
  },
  contactWhatsapp: {
    inputMode: "tel",
    autoComplete: "tel-national",
    type: "tel",
    enterKeyHint: "done",
    name: "whatsapp",
  },
} as const satisfies Record<string, InputAttrs>;
