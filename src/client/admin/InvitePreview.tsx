import type { CSSProperties } from "react";
import type { EventConfig } from "../../shared/types";
import { formatEventDate } from "../format";

/** Prévia do cartão do convite usando a paleta atual. */
export function InvitePreview({ config, recipient }: { config: EventConfig; recipient: string }) {
  const style = {
    "--preview-primary": config.primaryColor,
    "--preview-secondary": config.secondaryColor,
    "--preview-card": config.cardColor,
    "--preview-radius": `${config.cornerRadius}px`,
    "--preview-shadow": `${config.shadowStrength}px`,
  } as CSSProperties;

  return (
    <div className="preview-wrap" style={{ background: config.pageColor }}>
      <div className="invite-preview" style={style}>
        <div className="ornament">❧　❦　❧</div>
        <div className="preview-kicker">Você está convidado para</div>
        <h3 className="preview-title">Chá de panela</h3>
        <div className="house">⌂ ♥</div>
        <div className="preview-names">{config.coupleNames}</div>
        <div className="preview-recipient">{recipient}</div>
        <p className="preview-msg">{config.welcomeMessage}</p>
        <div className="preview-divider">— ♥ —</div>
        <div className="preview-info">
          <div>▦　{formatEventDate(config, false)}</div>
          <div>◷　Início às {config.eventTime}</div>
          <div>
            ⌖　{config.venueName} · {config.venueAddress}
          </div>
        </div>
        <div className="preview-rsvp">♡　CONFIRME SUA PRESENÇA</div>
        <div className="preview-end">Será uma alegria ter você conosco!</div>
        <div className="ornament" style={{ marginTop: 24 }}>
          ❧　♥　❧
        </div>
      </div>
    </div>
  );
}
