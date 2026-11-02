import { FormEvent, useEffect, useState } from "react";
import type { EventConfig, Invitation } from "../../shared/types";
import { havanListId } from "../../shared/types";
import { formatEventDate, themeVars } from "../format";
import { GiftList } from "./GiftList";

export type Answer = { confirmed: boolean | null; diet: string };

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

export const answersOf = (invite: Invitation): Record<string, Answer> =>
  Object.fromEntries(invite.guests.map(g => [g.id, { confirmed: g.confirmed, diet: g.dietRestrictions || "" }]));

interface Props {
  config: EventConfig;
  invite: Invitation;
  answers: Record<string, Answer>;
  onAnswer: (guestId: string, patch: Partial<Answer>) => void;
  /** Ausente na prévia do painel: o botão de salvar fica inerte. */
  onSubmit?: (e: FormEvent) => void;
  saving?: boolean;
}

/**
 * Convite exatamente como o convidado vê. Usado pela página pública e pela prévia do painel,
 * então qualquer mudança visual aqui aparece nos dois lugares.
 */
export function InviteView({ config, invite, answers, onAnswer, onSubmit, saving = false }: Props) {
  const countdown = useCountdown(config.eventDate || "");
  const isPreview = !onSubmit;

  const showGifts = config.giftRegistryUrl && config.giftRegistryUrl !== "#";
  // Lista da Havan vira cards no próprio convite; outros links continuam como link simples.
  const havanGifts = showGifts && havanListId(config.giftRegistryUrl) !== null;

  const guestList = (
    <>
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
                  onClick={() => onAnswer(g.id, { confirmed: true })}
                >
                  ✓ Vou
                </button>
                <button
                  type="button"
                  className={`rsvp-btn ${answer.confirmed === false ? "selected-no" : ""}`}
                  onClick={() => onAnswer(g.id, { confirmed: false })}
                >
                  ✕ Não vou
                </button>
              </div>
              <input
                className="diet-input"
                value={answer.diet}
                onChange={e => onAnswer(g.id, { diet: e.target.value })}
                placeholder="Alguma restrição alimentar ou observação? (Opcional)"
                maxLength={500}
              />
            </div>
          );
        })}
      </div>
      <button type={isPreview ? "button" : "submit"} className="primary-btn submit-btn" disabled={saving}>
        {saving ? "⏳ Salvando..." : "✨ Salvar confirmação"}
      </button>
    </>
  );

  return (
    <div className="invite-scope">
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

            {/* A prévia fica dentro do formulário do painel: <form> aninhado não é permitido. */}
            {isPreview ? <div>{guestList}</div> : <form onSubmit={onSubmit}>{guestList}</form>}
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
              {showGifts && !havanGifts && (
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

          {havanGifts && <GiftList fallbackUrl={config.giftRegistryUrl} />}

          <footer className="footer">Com carinho, {config.coupleNames} ♡</footer>
        </div>
      </div>
    </div>
  );
}
