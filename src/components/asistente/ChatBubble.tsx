import type { ReactNode } from "react";

type Props = {
  role: "bot" | "user";
  children: ReactNode;
};

export function ChatBubble({ role, children }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium shadow-sm"
          style={{ background: "var(--brand)", color: "var(--brand-foreground)" }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-soft"
        style={{ background: "var(--brand)" }}
        aria-hidden="true"
      >
        P
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 text-sm text-bubble-bot-foreground shadow-card">
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-soft"
        style={{ background: "var(--brand)" }}
        aria-hidden="true"
      >
        P
      </div>
      <div className="rounded-2xl rounded-tl-md bg-bubble-bot px-4 py-3 shadow-card">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
