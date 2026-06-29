import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Wrapper ligero para campos del footer (sin dropdown flotante). */
export function KeyboardAwareField({ children, className }: Props) {
  return <div className={cn("relative", className)}>{children}</div>;
}
