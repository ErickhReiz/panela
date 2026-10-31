import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { Dashboard } from "./Dashboard";
import "../styles/admin.css";

export function AdminApp() {
  const [status, setStatus] = useState<"loading" | "login" | "ready">("loading");

  useEffect(() => {
    document.title = "Painel · Chá de panela";
    api
      .session()
      .then(s => setStatus(s.authenticated ? "ready" : "login"))
      .catch(() => setStatus("login"));
  }, []);

  if (status === "loading") return <div className="admin loading">Carregando…</div>;
  if (status === "login") return <Login onSuccess={() => setStatus("ready")} />;
  return (
    <Dashboard
      onLogout={async () => {
        await api.logout().catch(() => undefined);
        setStatus("login");
      }}
      onUnauthorized={() => setStatus("login")}
    />
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin login-page">
      <main className="login-card">
        <h1>Chá de panela</h1>
        <p>Painel de organização dos convites</p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={submit}>
          <label htmlFor="password">Senha do painel</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoFocus
          />
          <button className="btn primary block" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
