import { FormEvent, useEffect, useState } from "react";
import type { Invitation, InviteMode } from "../../shared/types";
import { api, ApiError } from "../api";
import { formatEventDate, themeVars } from "../format";
import { useConfig } from "../useConfig";
import { NotFound } from "./NotFound";

type Answer = { confirmed: boolean | null; diet: string };

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const distance = Math.max(0, new Date(target).getTime() - now || 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    { label: "Dias", value: pad(Math.floor(distance / 86_400_000)) },
    { label: "Horas", value: pad(Math.floor((distance % 86_400_000) / 3_600_000)) },
    { label: "Min", value: pad(Math.floor((distance % 3_600_000) / 60_000)) },
    { label: "Seg", value: pad(Math.floor((distance % 60_000) / 1000)) },
  ];
}

function statusOf(confirmed: boolean | null) {
  if (confirmed === true) return { className: "confirmed", label: "Confirmado" };
  if (confirmed === false) return { className: "declined", label: "Não irá" };
  return { className: "pending", label: "Pendente" };
}

export function InvitePage({ code, mode }: { code: string; mode?: InviteMode }) {
  const [config] = useConfig();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const countdown = useCountdown(config?.eventDate || "");

  useEffect(() => {
    api
      .invite(code, mode)
      .then(inv => {
        setInvite(inv);
        setAnswers(
          Object.fromEntries(inv.guests.map(g => [g.id, { confirmed: g.confirmed, diet: g.dietRestrictions || "" }]))
        );
      })
      .catch(err => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setToast("❌ Não foi possível carregar o convite.");
      });
  }, [code, mode]);

  useEffect(() => {
    if (config && invite) document.title = `Convite para Chá de Panela - ${config.coupleNames} | ${invite.title}`;
  }, [config, invite]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  if (notFound) return <NotFound code={code} />;
  if (!config || !invite) return <div className="loading">Carregando convite…</div>;

  const setAnswer = (guestId: string, patch: Partial<Answer>) =>
    setAnswers(prev => ({ ...prev, [guestId]: { ...prev[guestId], ...patch } }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const responses = Object.entries(answers).map(([guestId, a]) => ({
        guestId,
        confirmed: a.confirmed,
        dietRestrictions: a.diet.trim(),
      }));
      const { invite: updated } = await api.rsvp(invite!.code, responses);
      setInvite(updated);
      setToast("✨ Presença atualizada com sucesso!");
      if (responses.some(r => r.confirmed === true)) {
        const { default: confetti } = await import("canvas-confetti");
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err) {
      setToast("❌ Erro ao salvar: " + (err instanceof Error ? err.message : "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  const showGifts = config.giftRegistryUrl && config.giftRegistryUrl !== "#";

  return (
    <div className="public-page" style={themeVars(config)}>
      <div className="container">
        <header className="header-card">
          <div className="kicker">Chá de panela</div>
          <h1 className="couple-names">{config.coupleNames}</h1>
          <p className="quote">"{config.welcomeMessage}"</p>
          <div className="group-badge">
            ♡ Convite para: <strong>{invite.title}</strong>
          </div>
          <div className="countdown">
            {countdown.map(c => (
              <div className="count-box" key={c.label}>
                <span className="count-num">{c.value}</span>
                <span className="count-label">{c.label}</span>
              </div>
            ))}
          </div>
        </header>

        <section className="section-card">
          <h2 className="section-title">Confirme sua presença</h2>
          <p className="section-sub">
            {invite.guests.length > 1
              ? "Por favor, confirme a presença de cada um dos convidados abaixo."
              : "Por favor, confirme sua presença abaixo."}
          </p>
          <p className="restricted">
            🔒 Este convite é nominal e restrito {invite.guests.length > 1 ? "às pessoas listadas abaixo" : "a você"}.
          </p>

          <form onSubmit={submit}>
            <div className="guest-list">
              {invite.guests.map((g, idx) => {
                const answer = answers[g.id] || { confirmed: null, diet: "" };
                const status = statusOf(answer.confirmed);
                return (
                  <div className="guest-card" key={g.id}>
                    <div className="guest-header">
                      <span className="guest-name">
                        {idx + 1}. {g.name}
                      </span>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="rsvp-options">
                      <button
                        type="button"
                        className={`rsvp-btn ${answer.confirmed === true ? "selected-yes" : ""}`}
                        onClick={() => setAnswer(g.id, { confirmed: true })}
                      >
                        ✓ Vou
                      </button>
                      <button
                        type="button"
                        className={`rsvp-btn ${answer.confirmed === false ? "selected-no" : ""}`}
                        onClick={() => setAnswer(g.id, { confirmed: false })}
                      >
                        ✕ Não vou
                      </button>
                    </div>
                    <input
                      className="diet-input"
                      value={answer.diet}
                      onChange={e => setAnswer(g.id, { diet: e.target.value })}
                      placeholder="Alguma restrição alimentar ou observação? (Opcional)"
                      maxLength={500}
                    />
                  </div>
                );
              })}
            </div>
            <button type="submit" className="primary-btn submit-btn" disabled={saving}>
              {saving ? "⏳ Salvando..." : "✨ Salvar confirmação"}
            </button>
          </form>
        </section>

        <section className="section-card">
          <h2 className="section-title">Detalhes do evento</h2>
          <div className="details-grid">
            <div className="detail-item">
              <div className="detail-icon">📅</div>
              <div className="detail-title">Data</div>
              <div className="detail-val">{formatEventDate(config)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-icon">⏰</div>
              <div className="detail-title">Horário</div>
              <div className="detail-val">{config.eventTime}</div>
            </div>
            <div className="detail-item wide">
              <div className="detail-icon">📍</div>
              <div className="detail-title">Localização</div>
              <div className="detail-val">{config.venueName}</div>
              <div className="muted small">{config.venueAddress}</div>
              {config.googleMapsUrl && (
                <a href={config.googleMapsUrl} target="_blank" rel="noopener" className="action-link">
                  🗺️ Abrir no Google Maps
                </a>
              )}
            </div>
            {showGifts && (
              <div className="detail-item wide">
                <div className="detail-icon">🎁</div>
                <div className="detail-title">Lista de Presentes</div>
                <div className="detail-val">Acesse nossa lista virtual de presentes</div>
                <a href={config.giftRegistryUrl} target="_blank" rel="noopener" className="action-link">
                  🛍️ Ver Lista de Presentes
                </a>
              </div>
            )}
          </div>
        </section>

        <footer className="footer">Com carinho, {config.coupleNames} ♡</footer>
      </div>

      <div className={`toast ${toast ? "show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
