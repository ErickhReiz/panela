import { FormEvent, useState } from "react";
import type { EventConfig, InviteMode } from "../../shared/types";
import { havanListId } from "../../shared/types";
import { api } from "../api";
import { InvitePreview } from "./InvitePreview";
import type { ShowToast } from "./useToast";

const PALETTES: Array<{ title: string; colors: [string, string, string, string] }> = [
  { title: "Azul marinho", colors: ["#142b4a", "#66809d", "#fffdf8", "#f6f2e9"] },
  { title: "Marinho e rosé", colors: ["#253f5f", "#9b7890", "#fffaf4", "#f2edf0"] },
  { title: "Verde sálvia", colors: ["#42594c", "#9d8c64", "#fffdf5", "#f2f0e7"] },
  { title: "Terracota suave", colors: ["#734e50", "#b3847f", "#fffaf6", "#f5efeb"] },
];

const MODES: Array<{ value: InviteMode; icon: string; title: string; text: string }> = [
  {
    value: "familia",
    icon: "⌂",
    title: "Família",
    text: "Um link por família, com várias pessoas. O painel lista famílias e seus membros.",
  },
  {
    value: "pessoa",
    icon: "☺",
    title: "Pessoa",
    text: "Um link por pessoa, com telefone. O painel lista cada convidado e envia direto no WhatsApp dele.",
  },
];

interface Props {
  config: EventConfig;
  counts: Record<InviteMode, number>;
  showToast: ShowToast;
  onSaved: (config: EventConfig) => void;
}

export function SettingsView({ config, counts, showToast, onSaved }: Props) {
  const [draft, setDraft] = useState<EventConfig>(config);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  const set = <K extends keyof EventConfig>(key: K, value: EventConfig[K]) => setDraft(d => ({ ...d, [key]: value }));
  const text = (key: keyof EventConfig) => ({
    value: String(draft[key] ?? ""),
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
  });
  const dirty = (Object.keys(config) as Array<keyof EventConfig>).some(k => k !== "sendMode" && draft[k] !== config[k]);

  /** O modo muda o painel inteiro, então é salvo na hora. */
  async function switchMode(mode: InviteMode) {
    if (mode === config.sendMode || switching) return;
    setSwitching(true);
    try {
      const { config: saved } = await api.saveSettings({ sendMode: mode });
      setDraft(d => ({ ...d, sendMode: mode }));
      onSaved(saved);
      showToast(`Painel no modo ${mode === "familia" ? "Família" : "Pessoa"}`);
    } catch {
      showToast("Não foi possível trocar o modo");
    } finally {
      setSwitching(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { config: saved } = await api.saveSettings({ ...draft, sendMode: config.sendMode });
      onSaved(saved);
      setDraft(saved);
      showToast("Configurações salvas");
    } catch {
      showToast("Não foi possível salvar as configurações");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings" onSubmit={save}>
      <h1>Configurar</h1>

      <section className="panel pad">
        <h2>Modo do painel</h2>
        <p className="help">Define como você cadastra, vê e envia os convites.</p>
        <div className="mode-cards" role="radiogroup" aria-label="Modo do painel">
          {MODES.map(m => {
            const active = config.sendMode === m.value;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={active}
                key={m.value}
                className={`mode-card ${active ? "active" : ""}`}
                onClick={() => switchMode(m.value)}
                disabled={switching}
              >
                <span className="mode-icon">{m.icon}</span>
                <span className="grow">
                  <strong>
                    {m.title} <small>· {counts[m.value]} convite(s)</small>
                  </strong>
                  <span>{m.text}</span>
                </span>
                <span className="check">{active ? "●" : "○"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel pad">
        <h2>Evento</h2>
        <div className="field">
          <label>Nome que aparece no convite</label>
          <input {...text("coupleNames")} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Data e hora</label>
            <input type="datetime-local" {...text("eventDate")} />
          </div>
          <div className="field">
            <label>Texto do horário</label>
            <input {...text("eventTime")} />
          </div>
        </div>
        <div className="field">
          <label>Nome do local</label>
          <input {...text("venueName")} />
        </div>
        <div className="field">
          <label>Endereço</label>
          <input {...text("venueAddress")} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Link do mapa</label>
            <input type="url" inputMode="url" {...text("googleMapsUrl")} />
          </div>
          <div className="field">
            <label>Lista de presentes</label>
            <input inputMode="url" {...text("giftRegistryUrl")} placeholder="Deixe # para ocultar" />
            {havanListId(draft.giftRegistryUrl) && (
              <small className="field-hint">
                ✓ Lista Havan #{havanListId(draft.giftRegistryUrl)} detectada — os presentes aparecem como cards no convite.
              </small>
            )}
          </div>
        </div>
        <div className="field">
          <label>Mensagem do convite</label>
          <textarea rows={3} {...text("welcomeMessage")} />
        </div>
      </section>

      <section className="panel pad">
        <h2>Aparência</h2>
        <div className="appearance">
          <div>
            <div className="field">
              <label>Paletas prontas</label>
              <div className="swatches">
                {PALETTES.map(p => (
                  <button
                    type="button"
                    key={p.title}
                    className="swatch"
                    style={{ background: `linear-gradient(135deg, ${p.colors[0]} 50%, ${p.colors[1]} 50%)` }}
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
            <div className="grid-2 tight">
              <ColorField label="Primária" value={draft.primaryColor} onChange={v => set("primaryColor", v)} />
              <ColorField label="Secundária" value={draft.secondaryColor} onChange={v => set("secondaryColor", v)} />
              <ColorField label="Fundo do convite" value={draft.cardColor} onChange={v => set("cardColor", v)} />
              <ColorField label="Fundo da página" value={draft.pageColor} onChange={v => set("pageColor", v)} />
            </div>
            <RangeField label="Bordas arredondadas" max={36} value={draft.cornerRadius} onChange={v => set("cornerRadius", v)} />
            <RangeField label="Sombra" max={48} value={draft.shadowStrength} onChange={v => set("shadowStrength", v)} />
          </div>
          <InvitePreview
            config={draft}
            recipient={config.sendMode === "familia" ? "Família · Exemplo — José e Júlia" : "Convidado · Maria Souza"}
          />
        </div>
      </section>

      <div className={`save-bar ${dirty ? "show" : ""}`}>
        <button type="button" className="btn" onClick={() => setDraft(config)} disabled={!dirty || saving}>
          Descartar
        </button>
        <button className="btn primary grow" disabled={!dirty || saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-field">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span>{label}</span>
    </label>
  );
}

function RangeField(props: { label: string; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label>
        {props.label} <span className="help">{props.value}px</span>
      </label>
      <input type="range" min={0} max={props.max} value={props.value} onChange={e => props.onChange(Number(e.target.value))} />
    </div>
  );
}
