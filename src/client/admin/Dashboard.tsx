import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_CONFIG, EventConfig, Invitation, invitePath } from "../../shared/types";
import { api, ApiError } from "../api";
import { InviteEditor } from "./InviteEditor";
import { SettingsDialog } from "./SettingsDialog";
import { useToast } from "./useToast";

type View = "painel" | "convites";
type EditorState = { invite: Invitation | null; focusGuestId?: string } | null;

const baseUrl = window.location.origin;

export function Dashboard({ onLogout, onUnauthorized }: { onLogout: () => void; onUnauthorized: () => void }) {
  const [invites, setInvites] = useState<Invitation[] | null>(null);
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<View>("painel");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    try {
      setInvites(await api.invites());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized();
      else showToast("Não foi possível carregar os convites");
    }
  }, [onUnauthorized, showToast]);

  useEffect(() => {
    load();
    api.config().then(setConfig).catch(() => undefined);
  }, [load]);

  const all = invites || [];
  const stats = useMemo(() => {
    const guests = all.flatMap(i => i.guests);
    return {
      invites: all.length,
      guests: guests.length,
      confirmed: guests.filter(g => g.confirmed === true).length,
      pending: guests.filter(g => g.confirmed === null || g.confirmed === undefined).length,
    };
  }, [all]);

  const recent = useMemo(
    () =>
      all
        .flatMap(i =>
          i.guests.filter(g => g.confirmed === true).map(g => ({ id: g.id, name: g.name, title: i.title, at: g.confirmedAt || i.updatedAt }))
        )
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 8),
    [all]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return all.filter(x => x.title.toLowerCase().includes(q) || x.guests.some(g => g.name.toLowerCase().includes(q)));
  }, [all, search]);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(baseUrl + link);
      showToast("Link copiado");
    } catch {
      showToast(baseUrl + link);
    }
  }

  function share(invite: Invitation) {
    const link = baseUrl + invitePath(invite.mode, invite.code);
    window.open("https://wa.me/?text=" + encodeURIComponent("Oi! Você está convidado para nosso chá de panela: " + link), "_blank");
  }

  async function remove(invite: Invitation) {
    if (!confirm(`Excluir o convite "${invite.title}"?`)) return;
    try {
      await api.deleteInvite(invite.code);
      showToast("Convite excluído");
      load();
    } catch {
      showToast("Erro ao excluir");
    }
  }

  return (
    <div className="admin">
      <header className="top">
        <div className="brand">
          <small>Organização do evento</small>Chá de panela
        </div>
        <div className="actions">
          <a className="btn" href="/api/admin/export">
            Exportar
          </a>
          <button className="btn" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="shell">
        {view === "painel" ? (
          <>
            <section className="stats">
              <Stat label="Convites" value={stats.invites} />
              <Stat label="Pessoas convidadas" value={stats.guests} />
              <Stat label="Confirmados" value={stats.confirmed} />
              <Stat label="Aguardando resposta" value={stats.pending} />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Painel</h2>
                <span className="help">Confirmações recentes</span>
              </div>
              <div className="recent-list">
                {!invites ? (
                  <div className="empty">Carregando…</div>
                ) : recent.length ? (
                  recent.map(r => (
                    <div className="recent-item" key={r.id}>
                      <span>
                        <strong>{r.name}</strong>
                        <br />
                        <small>{r.title}</small>
                      </span>
                      <small>{new Date(r.at).toLocaleDateString("pt-BR")}</small>
                    </div>
                  ))
                ) : (
                  <div className="empty">Nenhuma confirmação recente ainda.</div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="intro">
              <div>
                <h1>Convites e convidados</h1>
                <p>Gerencie as chamadas e acompanhe as confirmações do seu chá.</p>
              </div>
              <button className="btn primary" onClick={() => setEditor({ invite: null })}>
                ＋ Novo convite
              </button>
            </div>
            <section className="panel">
              <div className="panel-head">
                <h2>Lista de convites</h2>
                <input
                  className="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar família ou convidado"
                />
              </div>
              <table className="rows">
                <thead>
                  <tr>
                    <th>Convite</th>
                    <th>Convidados</th>
                    <th>Link</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!invites ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        Carregando…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        Nenhum convite cadastrado. Comece criando um convite.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(inv => {
                      const link = invitePath(inv.mode, inv.code);
                      return (
                        <tr key={inv.code}>
                          <td data-label="Convite">
                            <strong>{inv.title}</strong>
                            <br />
                            <span className="pill">{inv.mode === "pessoa" ? "Pessoa" : "Família"}</span>
                          </td>
                          <td data-label="Convidados">
                            <div className="guestlist">
                              {inv.guests.map(g => (
                                <button
                                  key={g.id}
                                  className="pill guest-edit"
                                  title={`Editar ${g.name}`}
                                  onClick={() => setEditor({ invite: inv, focusGuestId: g.id })}
                                >
                                  {g.name}
                                  {g.confirmed === true ? " · ✓" : g.confirmed === false ? " · ×" : " · …"} ✎
                                </button>
                              ))}
                            </div>
                          </td>
                          <td data-label="Link">
                            <a href={link} target="_blank" rel="noopener">
                              {link}
                            </a>
                          </td>
                          <td data-label="Ações">
                            <div className="row-actions">
                              <button className="btn small" onClick={() => copyLink(link)}>
                                Copiar link
                              </button>
                              <button className="btn small" onClick={() => setEditor({ invite: inv })}>
                                Editar
                              </button>
                              <button className="btn small" onClick={() => share(inv)}>
                                WhatsApp
                              </button>
                              <button className="btn small" onClick={() => remove(inv)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>

      <nav className="app-nav" aria-label="Navegação principal">
        <NavButton active={view === "painel" && !settingsOpen} label="Painel" icon="▦" onClick={() => setView("painel")} />
        <NavButton active={view === "convites" && !settingsOpen} label="Convites" icon="✉" onClick={() => setView("convites")} />
        <NavButton active={settingsOpen} label="Configurações" icon="⚙" onClick={() => setSettingsOpen(true)} />
      </nav>

      {editor && (
        <InviteEditor
          invite={editor.invite}
          focusGuestId={editor.focusGuestId}
          config={config}
          allInvites={all}
          showToast={showToast}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load();
          }}
          onReload={load}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          config={config}
          showToast={showToast}
          onClose={() => setSettingsOpen(false)}
          onSaved={saved => {
            setConfig(saved);
            setSettingsOpen(false);
          }}
        />
      )}

      <div className={`toast ${toast ? "show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NavButton(props: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button
      className={`nav-icon ${props.active ? "active" : ""}`}
      onClick={props.onClick}
      title={props.label}
      aria-label={props.label}
    >
      {props.icon}
    </button>
  );
}
