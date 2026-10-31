import { FormEvent, useEffect, useRef, useState } from "react";
import { EventConfig, Guest, Invitation, invitePath, slugify } from "../../shared/types";
import { api } from "../api";
import { Contact, hasContactPicker, parseContacts, phoneKey, pickFromAgenda } from "./contacts";
import { InvitePreview } from "./InvitePreview";
import type { ShowToast } from "./useToast";

type Row = { key: string; id: string; name: string; phone: string };

interface Props {
  invite: Invitation | null;
  focusGuestId?: string;
  config: EventConfig;
  allInvites: Invitation[];
  showToast: ShowToast;
  onClose: () => void;
  onSaved: () => void;
  onReload: () => Promise<void>;
}

let rowSeq = 0;
const newRow = (name = "", phone = "", id = ""): Row => ({ key: `r${++rowSeq}`, id, name, phone });
const newGuestId = (i: number) => `g_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;

export function InviteEditor({ invite, focusGuestId, config, allInvites, showToast, onClose, onSaved, onReload }: Props) {
  const mode = invite?.mode || config.sendMode || "familia";
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState(invite?.title || "");
  const [code, setCode] = useState(invite?.code || "");
  const [rows, setRows] = useState<Row[]>(() =>
    invite ? invite.guests.map(g => newRow(g.name, g.phone || "", g.id)) : [newRow()]
  );
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pickerAvailable = hasContactPicker();
  const parsedImport = importOpen ? parseContacts(importText) : [];

  useEffect(() => {
    if (!focusGuestId) return;
    formRef.current?.querySelector<HTMLInputElement>(`[data-guest-id="${focusGuestId}"]`)?.focus();
  }, [focusGuestId]);

  const effectiveCode = slugify(code || title);
  const link = window.location.origin + invitePath(mode, effectiveCode || "seu-convite");
  const recipient =
    (mode === "familia" ? "Família · " : "Convidado · ") +
    (title || "Seu convite") +
    " — " +
    rows.map(r => r.name.trim()).filter(Boolean).join(", ");

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  function changeTitle(value: string) {
    setTitle(value);
    if (!invite) setCode(slugify(value));
  }

  async function pickContacts() {
    try {
      await importContacts(await pickFromAgenda());
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") showToast("Não foi possível importar os contatos selecionados");
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setImportText(prev => (prev.trim() ? prev.trimEnd() + "\n" : "") + text);
  }

  async function confirmImport() {
    setImporting(true);
    try {
      if (await importContacts(parsedImport)) {
        setImportText("");
        setImportOpen(false);
      }
    } finally {
      setImporting(false);
    }
  }

  /** Adiciona contatos ao convite (família) ou cria um convite por contato (pessoa). */
  async function importContacts(selected: Contact[]): Promise<boolean> {
    try {
      if (!selected.length) {
        showToast("Nenhum contato encontrado");
        return false;
      }

      if (mode === "familia") {
        const seen = new Set(rows.map(r => phoneKey(r.phone)).filter(Boolean));
        const additions: Row[] = [];
        for (const c of selected) {
          const key = phoneKey(c.phone);
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          additions.push(newRow(c.name, c.phone));
        }
        setRows(prev => [...prev.filter(r => r.name.trim() || r.phone.trim()), ...additions]);
        showToast(`${additions.length} contato(s) adicionado(s) à família`);
        return true;
      }

      // Modo pessoa: um convite individual por contato.
      const seen = new Set(allInvites.flatMap(i => i.guests.map(g => phoneKey(g.phone))).filter(Boolean));
      const usedCodes = new Set(allInvites.map(i => i.code));
      let created = 0;
      let duplicates = 0;
      for (const c of selected) {
        const key = phoneKey(c.phone);
        if (key && seen.has(key)) {
          duplicates++;
          continue;
        }
        const base = slugify(c.name) || "convidado";
        let unique = base;
        for (let n = 2; usedCodes.has(unique); n++) unique = `${base}-${n}`;
        try {
          await api.createInvite({
            code: unique,
            title: c.name,
            mode: "pessoa",
            guests: [{ id: newGuestId(created), name: c.name, phone: c.phone, confirmed: null }],
          });
          created++;
          usedCodes.add(unique);
          if (key) seen.add(key);
        } catch {
          /* ignora contato com erro e segue */
        }
      }
      await onReload();
      showToast(
        `${created} convite(s) individual(is) criado(s)` + (duplicates ? `, ${duplicates} duplicado(s) ignorado(s)` : "")
      );
      if (created) onClose();
      return created > 0;
    } catch {
      showToast("Não foi possível importar os contatos");
      return false;
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const previous = invite?.guests || [];
    const guests: Guest[] = rows
      .map((r, i) => {
        const prior = previous.find(g => g.id === r.id);
        return {
          id: r.id || newGuestId(i),
          name: r.name.trim(),
          phone: r.phone.trim(),
          confirmed: prior ? prior.confirmed : null,
          dietRestrictions: prior?.dietRestrictions || "",
          confirmedAt: prior?.confirmedAt ?? null,
        };
      })
      .filter(g => g.name);

    if (!title.trim()) {
      setTab("edit");
      showToast("Informe o nome do convite");
      return;
    }
    if (!guests.length) {
      setTab("edit");
      showToast("Adicione ao menos uma pessoa");
      return;
    }
    if (mode === "pessoa" && guests.length > 1) {
      showToast("No modo pessoa, use a importação múltipla para criar convites individuais");
      return;
    }

    setSaving(true);
    try {
      const payload = { code: effectiveCode, title: title.trim(), mode, guests };
      if (invite) await api.updateInvite(invite.code, payload);
      else await api.createInvite(payload);
      showToast("Convite salvo");
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="invite-heading">
        <header className="dialog-head">
          <h2 id="invite-heading">{invite ? "Editar convite" : "Novo convite"}</h2>
          <button className="x" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="tabs">
          <button className={`tab ${tab === "edit" ? "active" : ""}`} onClick={() => setTab("edit")}>
            1. Dados do convite
          </button>
          <button className={`tab ${tab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>
            2. Preview
          </button>
        </div>

        <form ref={formRef} onSubmit={save} noValidate>
          {tab === "edit" ? (
            <section className="tabpane">
              <div className="field">
                <label>Modo de envio</label>
                <div className="mode-mode">
                  {mode === "familia" ? "Família · vários convidados no mesmo link" : "Pessoa · um convite por contato"}
                  {invite ? " · modo deste convite" : " · definido nas configurações"}
                </div>
                <p className="help">
                  {mode === "familia"
                    ? "Os contatos importados serão reunidos neste convite de família."
                    : "Cada contato importado cria um convite individual; números já cadastrados são ignorados."}
                </p>
              </div>

              <div className="editor-grid">
                <div className="field">
                  <label htmlFor="title">{mode === "familia" ? "Nome da família" : "Nome da pessoa"}</label>
                  <input
                    id="title"
                    value={title}
                    onChange={e => changeTitle(e.target.value)}
                    placeholder="Ex.: Família Amaral"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="code">Endereço do link (opcional)</label>
                  <input
                    id="code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="familia-amaral"
                    disabled={!!invite}
                  />
                  <p className="help">Link gerado: {link}</p>
                </div>
              </div>

              <div className="field">
                <label>Convidados</label>
                <div className="toolbar">
                  <button type="button" className="btn small" onClick={() => setRows(prev => [...prev, newRow()])}>
                    ＋ Adicionar pessoa
                  </button>
                  {pickerAvailable && (
                    <button type="button" className="btn small" onClick={pickContacts}>
                      📇 Escolher da agenda
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn small ${importOpen ? "primary" : ""}`}
                    onClick={() => setImportOpen(o => !o)}
                  >
                    📋 Colar lista ou arquivo .vcf
                  </button>
                </div>

                {importOpen && (
                  <div className="import-box">
                    <p className="help">
                      Um contato por linha, no formato <strong>Nome, telefone</strong> (o telefone é opcional). Você também
                      pode enviar um arquivo <strong>.vcf</strong> exportado da agenda do celular.
                      {mode === "pessoa" && " No modo pessoa, cada contato vira um convite individual."}
                    </p>
                    <textarea
                      rows={5}
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={"Maria Souza, (48) 99999-1234\nJoão Silva, 48 98888-0000\nAna Lima"}
                    />
                    <div className="import-actions">
                      <label className="btn small file-btn">
                        📎 Enviar arquivo
                        <input
                          type="file"
                          accept=".vcf,.vcard,.txt,.csv,text/vcard,text/x-vcard,text/plain,text/csv"
                          onChange={e => {
                            readFile(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <span className="help">{parsedImport.length} contato(s) reconhecido(s)</span>
                      <button
                        type="button"
                        className="btn small primary"
                        disabled={!parsedImport.length || importing}
                        onClick={confirmImport}
                      >
                        {importing ? "Importando…" : `Importar ${parsedImport.length || ""}`}
                      </button>
                    </div>
                  </div>
                )}
                <div className="guests">
                  {rows.map(r => (
                    <div className="guestrow" key={r.key}>
                      <input
                        className="guestname"
                        data-guest-id={r.id || undefined}
                        value={r.name}
                        onChange={e => updateRow(r.key, { name: e.target.value })}
                        placeholder="Nome completo"
                      />
                      <input
                        className="guestphone"
                        inputMode="tel"
                        value={r.phone}
                        onChange={e => updateRow(r.key, { phone: e.target.value })}
                        placeholder="Telefone"
                      />
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => setRows(prev => prev.filter(x => x.key !== r.key))}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="foot">
                <button type="button" className="btn" onClick={onClose}>
                  Cancelar
                </button>
                <button type="button" className="btn" onClick={() => setTab("preview")}>
                  Ver preview
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar convite"}
                </button>
              </div>
            </section>
          ) : (
            <section className="tabpane">
              <InvitePreview config={config} recipient={recipient} />
              <p className="help center">
                A prévia mostra a paleta atual. Edite data, local, cores, bordas e sombra em Configurações.
              </p>
              <div className="foot">
                <button type="button" className="btn" onClick={() => setTab("edit")}>
                  Voltar à edição
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar convite"}
                </button>
              </div>
            </section>
          )}
        </form>
      </section>
    </div>
  );
}
