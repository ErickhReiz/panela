import { FormEvent, useEffect, useState } from "react";
import { formatEventDate, themeVars } from "../format";
import { useConfig } from "../useConfig";

export function HomePage() {
  const [config] = useConfig();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (config) document.title = `Chá de panela - ${config.coupleNames}`;
  }, [config]);

  if (!config) return <div className="loading">Carregando…</div>;

  function openInvite(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toLowerCase();
    if (clean) window.location.href = `/convite/${encodeURIComponent(clean)}`;
  }

  return (
    <div className="public-page centered" style={themeVars(config)}>
      <main className="hero-card">
        <div className="kicker">Você está convidado para</div>
        <div className="kicker">Chá de panela</div>
        <h1 className="couple-names">{config.coupleNames}</h1>
        <p className="quote">{config.welcomeMessage}</p>
        <p className="event-info">
          📅 {formatEventDate(config)} - {config.eventTime}
        </p>

        <div className="search-box">
          <label className="search-title" htmlFor="invite-code">
            Código de convite
          </label>
          <form onSubmit={openInvite} className="input-row">
            <input
              id="invite-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Ex: familia-silva"
              required
              autoComplete="off"
            />
            <button type="submit" className="primary-btn">
              Abrir meu convite
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
