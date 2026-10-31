import { FormEvent, useEffect, useRef, useState } from "react";
import { EventConfig, Guest, Invitation, InviteMode, invitePath, slugify } from "../../shared/types";
import { api } from "../api";
import { Contact, hasContactPicker, parseContacts, phoneKey, pickFromAgenda } from "./contacts";
import { InvitePreview } from "./InvitePreview";
import type { ShowToast } from "./useToast";

type Row = { key: string; id: string; name: string; phone: string };

interface Props {
  invite: Invitation | null;
  mode: InviteMode;
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

export function InviteEditor({ invite, mode, focusGuestId, config, allInvites, showToast, onClose, onSaved, onReload }: Props) {
  const isFamily = mode === "familia";
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState(invite?.title || "");
  const [code, setCode] = useState(invite?.code || "");
  const [showCode, setShowCode] = useState(false);
  const [rows, setRows] = useState<Row[]>(() =>
    invite?.guests.length ? invite.guests.map(g => newRow(g.name, g.phone || "", g.id)) : [newRow()]
  );
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pickerAvailable = hasContactPicker();
  const parsedImport = importOpen ? parseContacts(importText) : [];

  useEffect(() => {
    const target = focusGuestId ? `[data-guest-id="${focusGuestId}"]` : "#title";
    formRef.current?.querySelector<HTMLInputElement>(target)?.focus();
  }, [focusGuestId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const effectiveCode = slugify(code || title);
  const link = window.location.origin + invitePath(mode, effectiveCode || "seu-convite");
  const person = rows[0];
  const recipient = isFamily
    ? `Família · ${title || "Seu convite"} — ${rows.map(r => r.name.trim()).filter(Boolean).join(", ")}`
    : `Convidado · ${title || "Nome da pessoa"}`;

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  function changeTitle(value: string) {
    setTitle(value);
    if (!invite) setCode(slugify(value));
    if (!isFamily) updateRow(person.key, { name: value });
  }

  // ---------- Importação ----------
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

  /** Família: adiciona membros a este convite. Pessoa: cria um convite por contato. */
  async function importContacts(selected: Contact[]): Promise<boolean> {
    if (!selected.length) {
      showToast("Nenhum contato encontrado");
      return false;
    }

    if (isFamily) {
      const seen = new Set(rows.map(r => phoneKey(r.phone)).filter(Boolean));
      const additions: Row[] = [];
      for (const c of selected) {
        const key = phoneKey(c.phone);
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        additions.push(newRow(c.name, c.phone));
      }
      setRows(prev => [...prev.filter(r => r.name.trim() || r.phone.trim()), ...additions]);
      showToast(`${additions.length} pessoa(s) adicionada(s) à família`);
      return true;
    }

    const seen = new Set(allInvites.flatMap(i => i.guests.map(g => phoneKey(g.phone))).filter(Boolean));
    const usedCodes = new Set(allInvites.map(i => i.code));
    let created = 0;
    let duplicates = 0;
    try {
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
          /* segue para o próximo contato */
        }
      }
    } finally {
      await onReload();
    }
    showToast(`${created} convidado(s) criado(s)` + (duplicates ? `, ${duplicates} já existiam` : ""));
    if (created) onClose();
    return created > 0;
  }

  // ---------- Salvar ----------
  async function save(e: FormEvent) {
    e.preventDefault();
    const previous = invite?.guests || [];
    const sourceRows = isFamily ? rows : [{ ...person, name: title }];
    const guests: Guest[] = sourceRows
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
      showToast(isFamily ? "Informe o nome da família" : "Informe o nome da pessoa");
      return;
    }
    if (!guests.length) {
      setTab("edit");
      showToast("Adicione ao menos uma pessoa");
      return;
    }
    if (!isFamily && !invite) {
      const key = phoneKey(person.phone);
      if (key && allInvites.some(i => i.guests.some(g => phoneKey(g.phone) === key))) {
        showToast("Já existe um convidado com este telefone");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { code: effectiveCode, title: title.trim(), mode, guests };
      if (invite) await api.updateInvite(invite.code, payload);
      else await api.createInvite(payload);
      showToast(isFamily ? "Família salva" : "Convidado salvo");
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const heading = invite ? (isFamily ? "Editar família" : "Editar convidado") : isFamily ? "Nova família" : "Novo convidado";

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="invite-heading">
        <header className="sheet-head">
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
          <h2 id="invite-heading">{heading}</h2>
          <span className="icon-btn-spacer" />
        </header>
        <div className="segmented">
          <button className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>
            Dados
          </button>
          <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
            Prévia
          </button>
        </div>

        <form ref={formRef} onSubmit={save} noValidate className="sheet-body">
          {tab === "edit" ? (
            <>
              <div className="field">
                <label htmlFor="title">{isFamily ? "Nome da família" : "Nome da pessoa"}</label>
                <input
                  id="title"
                  value={title}
                  onChange={e => changeTitle(e.target.value)}
                  placeholder={isFamily ? "Ex.: Família Amaral" : "Ex.: Maria Souza"}
                  autoComplete="off"
                  required
                />
              </div>

              {!isFamily && (
                <div className="field">
                  <label htmlFor="phone">Telefone (WhatsApp)</label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={person.phone}
                    onChange={e => updateRow(person.key, { phone: e.target.value })}
                    placeholder="(48) 99999-1234"
                    autoComplete="off"
                  />
                </div>
              )}

              <div className="field">
                <div className="link-preview">
                  <span className="help">Link: {link}</span>
                  {!invite && (
                    <button type="button" className="link-btn" onClick={() => setShowCode(s => !s)}>
                      {showCode ? "ocultar" : "personalizar"}
                    </button>
                  )}
                </div>
                {showCode && !invite && (
                  <input value={code} onChange={e => setCode(e.target.value)} placeholder="familia-amaral" aria-label="Endereço do link" />
                )}
              </div>

              {isFamily && (
                <div className="field">
                  <label>Pessoas da família</label>
                  <div className="guests">
                    {rows.map((r, i) => (
                      <div className="guestrow" key={r.key}>
                        <span className="guest-num">{i + 1}</span>
                        <div className="guest-inputs">
                          <input
                            data-guest-id={r.id || undefined}
                            value={r.name}
                            onChange={e => updateRow(r.key, { name: e.target.value })}
                            placeholder="Nome completo"
                            autoComplete="off"
                          />
                          <input
                            type="tel"
                            inputMode="tel"
                            value={r.phone}
                            onChange={e => updateRow(r.key, { phone: e.target.value })}
                            placeholder="Telefone (opcional)"
                            autoComplete="off"
                          />
                        </div>
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Remover ${r.name || "pessoa"}`}
                          onClick={() => setRows(prev => (prev.length > 1 ? prev.filter(x => x.key !== r.key) : [newRow()]))}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn block ghost" onClick={() => setRows(prev => [...prev, newRow()])}>
                    ＋ Adicionar pessoa
                  </button>
                </div>
              )}

              {(isFamily || !invite) && (
                <div className="field">
                  <label>{isFamily ? "Importar pessoas" : "Cadastrar vários de uma vez"}</label>
                  <div className="toolbar">
                    {pickerAvailable && (
                      <button type="button" className="btn small" onClick={pickContacts}>
                        📇 Da agenda
                      </button>
                    )}
                    <button type="button" className={`btn small ${importOpen ? "primary" : ""}`} onClick={() => setImportOpen(o => !o)}>
                      📋 Colar lista / .vcf
                    </button>
                  </div>
                  {importOpen && (
                    <div className="import-box">
                      <p className="help">
                        Um contato por linha: <strong>Nome, telefone</strong> (telefone opcional), ou envie um arquivo{" "}
                        <strong>.vcf</strong> exportado da agenda.
                        {!isFamily && " Cada contato vira um convite individual."}
                      </p>
                      <textarea
                        rows={5}
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder={"Maria Souza, (48) 99999-1234\nJoão Silva, 48 98888-0000\nAna Lima"}
                      />
                      <div className="import-actions">
                        <label className="btn small file-btn">
                          📎 Arquivo
                          <input
                            type="file"
                            accept=".vcf,.vcard,.txt,.csv,text/vcard,text/x-vcard,text/plain,text/csv"
                            onChange={e => {
                              readFile(e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <span className="help">{parsedImport.length} reconhecido(s)</span>
                        <button
                          type="button"
                          className="btn small primary"
                          disabled={!parsedImport.length || importing}
                          onClick={confirmImport}
                        >
                          {importing ? "Importando…" : "Importar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <InvitePreview config={config} recipient={recipient} />
              <p className="help center">Cores, data e local são editados em Configurar.</p>
            </>
          )}

          <footer className="sheet-foot">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn primary grow" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
