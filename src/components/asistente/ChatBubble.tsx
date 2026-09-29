import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  role: "bot" | "user";
  children: ReactNode;
  /** Datos de contacto: `ph-no-capture` los deja fuera de las grabaciones y del autocapture. */
  sensitive?: boolean;
};

function BotAvatar() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-gradient shadow-brand"
      aria-hidden="true"
    >
      <img
        src="/images/isotipo-negativo.png"
        alt=""
        className="h-5 w-5 object-contain"
      />
    </div>
  );
}

export { BotAvatar };

export function ChatBubble({ role, children, sensitive = false }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div
          className={cn(
            "max-w-[85%] min-w-0 break-words rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-bubble",
            sensitive && "ph-no-capture",
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <BotAvatar />
      <div className="max-w-[85%] min-w-0 break-words rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 text-[15px] leading-relaxed text-bubble-bot-foreground shadow-bubble">
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <BotAvatar />
      <div className="rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 shadow-bubble">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
