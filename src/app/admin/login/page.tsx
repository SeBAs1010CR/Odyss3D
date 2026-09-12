"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { currentUser, signIn } from "@/lib/admin/api";
import { Btn, Field, Input } from "@/components/admin/ui";

export default function AdminLogin() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const current = await currentUser();
      if (current) {
        router.replace("/admin/dashboard");
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const result = await signIn(user, password);

    if (!result.ok) {
      setBusy(false);
      setError(result.message ?? "Usuario o contraseña incorrectos.");
      setPassword("");
      return;
    }

    // Dejar que las cookies se asienten antes de navegar
    setTimeout(() => {
      router.replace("/admin/dashboard");
      router.refresh();
    }, 150);
  };

  if (checking) {
    return (
      <div className="login-root" style={{ color: "var(--a-muted)" }}>
        Cargando…
      </div>
    );
  }

  return (
    <div className="login-root">
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/branding/logo-horizontal.png"
            alt="ODYSS3D"
            className="login-logo"
          />
          <span className="login-eyebrow">Panel administrativo</span>
          <span className="login-name">ODYSS3D</span>
        </div>

        {error && (
          <div className="login-error-box">{error}</div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Usuario" required>
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="cami o sebas"
              autoComplete="username"
              autoFocus
              required
            />
          </Field>

          <Field label="Contraseña" required>
            <span className="input-with-suffix">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                style={{
                  position: "absolute",
                  right: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--a-muted)",
                  cursor: "pointer",
                  padding: 6,
                  display: "flex",
                }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </Field>

          <label className="check-label" style={{ marginTop: 2 }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Mostrar contraseña
          </label>

          <Btn type="submit" loading={busy} block style={{ marginTop: 4, padding: "13px" }}>
            Iniciar sesión
          </Btn>
        </form>

        <div className="login-divider">Acceso restringido</div>
        <p className="login-hint">
          Zona privada de ODYSS3D. Solo personal autorizado.
        </p>
      </div>
    </div>
  );
}