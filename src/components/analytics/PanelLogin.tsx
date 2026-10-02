import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginPanel, type PanelSessionStatus } from "@/lib/panel-auth.functions";

function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="panel-shell flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-[0.5px] border-panel-border bg-white p-6">
        <div className="flex items-center gap-2 text-panel-fg">
          <Lock className="h-4 w-4" aria-hidden />
          <h1 className="text-base font-medium">Panel interno · Diagnóstico Alta</h1>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function PanelLogin({
  state,
  onLoggedIn,
}: {
  state: PanelSessionStatus["state"];
  onLoggedIn: () => void;
}) {
  const loginFn = useServerFn(loginPanel);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state === "locked") {
    return (
      <LoginShell>
        <p className="text-sm text-panel-secondary">
          El panel está cerrado: a este servidor le falta la configuración de la contraseña.
        </p>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!password || submitting) return;
          setSubmitting(true);
          setError(null);
          try {
            const result = await loginFn({ data: { password } });
            if (result.ok) {
              setPassword("");
              onLoggedIn();
            } else {
              setError(
                result.state === "locked" ? "El panel está cerrado." : "Contraseña incorrecta.",
              );
            }
          } catch {
            setError("No se pudo comprobar la contraseña. Inténtalo de nuevo.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label htmlFor="panel-password" className="text-sm text-panel-secondary">
          Contraseña
        </label>
        <Input
          id="panel-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={!password || submitting}>
          {submitting ? "Comprobando…" : "Entrar"}
        </Button>
      </form>
    </LoginShell>
  );
}
