import { FormEvent, useState } from "react";
import type { EventConfig, InviteMode } from "../../shared/types";
import { api } from "../api";
import { InvitePreview } from "./InvitePreview";
import type { ShowToast } from "./useToast";

const PALETTES: Array<{ title: string; colors: [string, string, string, string] }> = [
  { title: "Azul marinho", colors: ["#142b4a", "#66809d", "#fffdf8", "#f6f2e9"] },
  { title: "Marinho e rosé", colors: ["#253f5f", "#9b7890", "#fffaf4", "#f2edf0"] },
  { title: "Verde sálvia", colors: ["#42594c", "#9d8c64", "#fffdf5", "#f2f0e7"] },
  { title: "Terracota suave", colors: ["#734e50", "#b3847f", "#fffaf6", "#f5efeb"] },
];

interface Props {
  config: EventConfig;
  showToast: ShowToast;
  onClose: () => void;
  onSaved: (config: EventConfig) => void;
}

export function SettingsDialog({ config, showToast, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<EventConfig>(config);
  const [tab, setTab] = useState<"system" | "invite">("system");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EventConfig>(key: K, value: EventConfig[K]) => setDraft(d => ({ ...d, [key]: value }));
  const text = (key: keyof EventConfig) => ({
    value: String(draft[key] ?? ""),
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { config: saved } = await api.saveSettings(draft);
      showToast("Configurações salvas");
      onSaved(saved);
    } catch {
      showToast("Não foi possível salvar as configurações");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-heading">
        <header className="dialog-head">
          <h2 id="settings-heading">Configurações</h2>
          <button className="x" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <form onSubmit={save}>
          <div className="settings-tabs">
            <button type="button" className={`settings-tab ${tab === "system" ? "active" : ""}`} onClick={() => setTab("system")}>
              Sistema
            </button>
            <button type="button" className={`settings-tab ${tab === "invite" ? "active" : ""}`} onClick={() => setTab("invite")}>
              Convite
            </button>
          </div>

          {tab === "system" ? (
            <div className="config-layout single">
              <div className="field">
                <label>Nome que aparece no convite</label>
                <input {...text("coupleNames")} />
              </div>
              <div className="editor-grid">
                <div className="field">
                  <label>Data e hora</label>
                  <input type="datetime-local" {...text("eventDate")} />
                </div>
                <div className="field">
                  <label>Texto do horário</label>
                  <input {...text("eventTime")} />
                </div>
                <div className="field">
                  <label>Nome do local</label>
                  <input {...text("venueName")} />
                </div>
                <div className="field">
                  <label>Endereço</label>
                  <input {...text("venueAddress")} />
                </div>
                <div className="field">
                  <label>Link do mapa</label>
                  <input {...text("googleMapsUrl")} />
                </div>
                <div className="field">
                  <label>Link da lista de presentes</label>
                  <input {...text("giftRegistryUrl")} placeholder="Deixe # para ocultar" />
                </div>
              </div>
              <div className="field">
                <label>Mensagem padrão do convite</label>
                <textarea rows={3} {...text("welcomeMessage")} />
              </div>
              <div className="field">
                <label>Modo de envio padrão</label>
                <div className="mode">
                  {(["familia", "pessoa"] as InviteMode[]).map(m => (
                    <label key={m}>
                      <input type="radio" name="sendMode" checked={draft.sendMode === m} onChange={() => set("sendMode", m)} />
                      {m === "familia" ? "Família" : "Pessoa"}
                    </label>
                  ))}
                </div>
                <p className="help">
                  Família reúne vários convidados em um link; pessoa cria um convite individual por contato.
                </p>
              </div>
            </div>
          ) : (
            <div className="config-layout">
              <div>
                <div className="field">
                  <label>Paletas prontas</label>
                  <div className="swatches">
                    {PALETTES.map(p => (
                      <button
                        type="button"
                        key={p.title}
                        className="swatch"
                        style={{ background: p.colors[0] }}
                        title={p.title}
                        aria-label={p.title}
                        onClick={() => {
                          const [primaryColor, secondaryColor, cardColor, pageColor] = p.colors;
                          setDraft(d => ({ ...d, primaryColor, secondaryColor, cardColor, pageColor }));
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="color-grid">
                  <ColorField label="Cor primária" value={draft.primaryColor} onChange={v => set("primaryColor", v)} />
                  <ColorField label="Cor secundária" value={draft.secondaryColor} onChange={v => set("secondaryColor", v)} />
                  <ColorField label="Fundo do convite" value={draft.cardColor} onChange={v => set("cardColor", v)} />
                  <ColorField label="Fundo da página" value={draft.pageColor} onChange={v => set("pageColor", v)} />
                </div>
                <RangeField label="Bordas arredondadas" max={36} value={draft.cornerRadius} onChange={v => set("cornerRadius", v)} />
                <RangeField label="Sombra" max={48} value={draft.shadowStrength} onChange={v => set("shadowStrength", v)} />
              </div>
              <InvitePreview config={draft} recipient="Família · Exemplo — José e Júlia" />
            </div>
          )}

          <div className="foot">
            <button type="button" className="btn" onClick={onClose}>
              Fechar
            </button>
            <button className="btn primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar configurações"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function RangeField(props: { label: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label>
        {props.label} <span className="help">{props.value}px</span>
      </label>
      <div className="range">
        <span>0</span>
        <input type="range" min={0} max={props.max} value={props.value} onChange={e => props.onChange(Number(e.target.value))} />
        <span>{props.max}</span>
      </div>
    </div>
  );
}
