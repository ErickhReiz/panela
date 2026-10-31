import { useCallback, useEffect, useMemo, useState } from "react";
import { EventConfig, Guest, Invitation, InviteMode, invitePath } from "../../shared/types";
import { api, ApiError } from "../api";
import { InviteEditor } from "./InviteEditor";
import { SettingsView } from "./SettingsView";
import { useToast } from "./useToast";

type View = "painel" | "convites" | "config";
type EditorState = { invite: Invitation | null; focusGuestId?: string } | null;

const baseUrl = window.location.origin;
const modeOf = (i: Invitation): InviteMode => i.mode || "familia";

/** Monta o link do WhatsApp; com telefone, abre direto a conversa da pessoa. */
function whatsappUrl(text: string, phone?: string) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits; // número BR sem DDI
  return `https://wa.me/${digits.length >= 12 ? digits : ""}?text=${encodeURIComponent(text)}`;
}

function statusOf(g: Guest) {
  if (g.confirmed === true) return { cls: "yes", label: "Confirmado", icon: "✓" };
  if (g.confirmed === false) return { cls: "no", label: "Não vai", icon: "✕" };
  return { cls: "wait", label: "Pendente", icon: "…" };
}

export function Dashboard({ onLogout, onUnauthorized }: { onLogout: () => void; onUnauthorized: () => void }) {
  const [invites, setInvites] = useState<Invitation[] | null>(null);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [view, setView] = useState<View>("painel");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
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
    api.config().then(setConfig).catch(() => showToast("Não foi possível carregar as configurações"));
  }, [load, showToast]);

  const mode: InviteMode = config?.sendMode || "familia";
  const isFamily = mode === "familia";

  const all = invites || [];
  const modeInvites = useMemo(() => all.filter(i => modeOf(i) === mode), [all, mode]);
  const counts = useMemo(
    () => ({
      familia: all.filter(i => modeOf(i) === "familia").length,
      pessoa: all.filter(i => modeOf(i) === "pessoa").length,
    }),
    [all]
  );
  const hiddenCount = isFamily ? counts.pessoa : counts.familia;

  const stats = useMemo(() => {
    const guests = modeInvites.flatMap(i => i.guests);
    return {
      invites: modeInvites.length,
      guests: guests.length,
      confirmed: guests.filter(g => g.confirmed === true).length,
      declined: guests.filter(g => g.confirmed === false).length,
      pending: guests.filter(g => g.confirmed !== true && g.confirmed !== false).length,
    };
  }, [modeInvites]);

  const recent = useMemo(
    () =>
      modeInvites
        .flatMap(i =>
          i.guests
            .filter(g => g.confirmed !== null && g.confirmed !== undefined)
            .map(g => ({ guest: g, title: i.title, at: g.confirmedAt || i.updatedAt }))
        )
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 10),
    [modeInvites]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modeInvites;
    return modeInvites.filter(
      x => x.title.toLowerCase().includes(q) || x.guests.some(g => g.name.toLowerCase().includes(q) || (g.phone || "").includes(q))
    );
  }, [modeInvites, search]);

  if (!config) return <div className="admin loading">Carregando…</div>;

  async function copyLink(invite: Invitation) {
    const link = baseUrl + invitePath(invite.mode, invite.code);
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copiado");
    } catch {
      showToast(link);
    }
  }

  function share(invite: Invitation) {
    const link = baseUrl + invitePath(invite.mode, invite.code);
    const guest = invite.guests[0];
    const greeting = isFamily ? invite.title : guest?.name.split(" ")[0] || invite.title;
    const text = `Oi, ${greeting}! Você está convidado(a) para o chá de panela de ${config!.coupleNames}. Confirme sua presença: ${link}`;
    window.open(whatsappUrl(text, isFamily ? undefined : guest?.phone), "_blank");
  }

  async function remove(invite: Invitation) {
    if (!confirm(`Excluir o convite de "${invite.title}"?`)) return;
    try {
      await api.deleteInvite(invite.code);
      showToast("Convite excluído");
      load();
    } catch {
      showToast("Erro ao excluir");
    }
  }

  const labels = isFamily
    ? { list: "Famílias", one: "família", newBtn: "＋ Nova família", empty: "Nenhuma família cadastrada ainda." }
    : { list: "Convidados", one: "convidado", newBtn: "＋ Novo convidado", empty: "Nenhum convidado cadastrado ainda." };

  return (
    <div className="admin">
      <header className="top">
        <div className="brand">
          <small>{isFamily ? "Modo família" : "Modo pessoa"}</small>
          Chá de panela
        </div>
        <button className="icon-btn" onClick={onLogout} aria-label="Sair" title="Sair">
          ⎋
        </button>
      </header>

      <main className="shell">
        {view === "painel" && (
          <>
            <section className="stats">
              {isFamily ? (
                <>
                  <Stat label="Famílias" value={stats.invites} />
                  <Stat label="Pessoas" value={stats.guests} />
                </>
              ) : (
                <>
                  <Stat label="Convidados" value={stats.guests} />
                  <Stat label="Não vão" value={stats.declined} />
                </>
              )}
              <Stat label="Confirmados" value={stats.confirmed} tone="yes" />
              <Stat label="Pendentes" value={stats.pending} tone="wait" />
            </section>

            {stats.guests > 0 && (
              <div className="progress" aria-label="Respostas recebidas">
                <span className="yes" style={{ width: `${(stats.confirmed / stats.guests) * 100}%` }} />
                <span className="no" style={{ width: `${(stats.declined / stats.guests) * 100}%` }} />
              </div>
            )}

            <section className="panel">
              <div className="panel-head">
                <h2>Últimas respostas</h2>
              </div>
              {!invites ? (
                <div className="empty">Carregando…</div>
              ) : recent.length ? (
                <ul className="recent-list">
                  {recent.map(r => {
                    const s = statusOf(r.guest);
                    return (
                      <li className="recent-item" key={r.guest.id}>
                        <span className={`dot ${s.cls}`}>{s.icon}</span>
                        <span className="grow">
                          <strong>{r.guest.name}</strong>
                          {isFamily && <small>{r.title}</small>}
                        </span>
                        <small>{new Date(r.at).toLocaleDateString("pt-BR")}</small>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty">Nenhuma resposta ainda.</div>
              )}
            </section>

            <button className="btn primary block" onClick={() => setEditor({ invite: null })}>
              {labels.newBtn}
            </button>
          </>
        )}

        {view === "convites" && (
          <>
            <div className="list-head">
              <h1>{labels.list}</h1>
              <a className="btn small" href="/api/admin/export">
                Exportar CSV
              </a>
            </div>
            <input
              className="search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isFamily ? "Buscar família ou pessoa" : "Buscar nome ou telefone"}
            />
            {hiddenCount > 0 && (
              <p className="notice">
                {hiddenCount} convite(s) do modo {isFamily ? "pessoa" : "família"} não aparecem aqui.{" "}
                <button className="link-btn" onClick={() => setView("config")}>
                  Trocar modo
                </button>
              </p>
            )}

            {!invites ? (
              <div className="empty">Carregando…</div>
            ) : filtered.length === 0 ? (
              <div className="empty">{search ? "Nada encontrado." : labels.empty}</div>
            ) : (
              <div className="cards">
                {filtered.map(inv =>
                  isFamily ? (
                    <FamilyCard
                      key={inv.code}
                      invite={inv}
                      onEdit={guestId => setEditor({ invite: inv, focusGuestId: guestId })}
                      onCopy={() => copyLink(inv)}
                      onShare={() => share(inv)}
                      onDelete={() => remove(inv)}
                    />
                  ) : (
                    <PersonCard
                      key={inv.code}
                      invite={inv}
                      onEdit={() => setEditor({ invite: inv })}
                      onCopy={() => copyLink(inv)}
                      onShare={() => share(inv)}
                      onDelete={() => remove(inv)}
                    />
                  )
                )}
              </div>
            )}

            <button className="fab" onClick={() => setEditor({ invite: null })} aria-label={labels.newBtn}>
              ＋
            </button>
          </>
        )}

        {view === "config" && (
          <SettingsView
            config={config}
            counts={counts}
            showToast={showToast}
            onSaved={saved => {
              setConfig(saved);
              setSearch("");
            }}
          />
        )}
      </main>

      <nav className="app-nav" aria-label="Navegação principal">
        <NavButton active={view === "painel"} label="Painel" icon="▦" onClick={() => setView("painel")} />
        <NavButton active={view === "convites"} label={labels.list} icon={isFamily ? "⌂" : "☺"} onClick={() => setView("convites")} />
        <NavButton active={view === "config"} label="Configurar" icon="⚙" onClick={() => setView("config")} />
      </nav>

      {editor && (
        <InviteEditor
          invite={editor.invite}
          mode={editor.invite ? modeOf(editor.invite) : mode}
          focusGuestId={editor.focusGuestId}
          config={config}
          allInvites={all}
          showToast={showToast}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setView("convites");
            load();
          }}
          onReload={load}
        />
      )}

      <div className={`toast ${toast ? "show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}

interface CardProps {
  invite: Invitation;
  onCopy: () => void;
  onShare: () => void;
  onDelete: () => void;
}

function FamilyCard({ invite, onEdit, onCopy, onShare, onDelete }: CardProps & { onEdit: (guestId?: string) => void }) {
  const confirmed = invite.guests.filter(g => g.confirmed === true).length;
  return (
    <article className="card">
      <header className="card-head">
        <div className="grow">
          <h3>{invite.title}</h3>
          <small>
            {confirmed}/{invite.guests.length} confirmados
          </small>
        </div>
        <button className="btn small" onClick={() => onEdit()}>
          Editar
        </button>
      </header>
      <ul className="members">
        {invite.guests.map(g => {
          const s = statusOf(g);
          return (
            <li key={g.id}>
              <button className="member" onClick={() => onEdit(g.id)} title={`Editar ${g.name}`}>
                <span className={`dot ${s.cls}`}>{s.icon}</span>
                <span className="grow">{g.name}</span>
                <small>{s.label}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <CardActions invite={invite} onCopy={onCopy} onShare={onShare} onDelete={onDelete} />
    </article>
  );
}

function PersonCard({ invite, onEdit, onCopy, onShare, onDelete }: CardProps & { onEdit: () => void }) {
  const guest = invite.guests[0];
  const s = guest ? statusOf(guest) : statusOf({ confirmed: null } as Guest);
  return (
    <article className="card">
      <header className="card-head">
        <span className={`dot big ${s.cls}`}>{s.icon}</span>
        <div className="grow">
          <h3>{guest?.name || invite.title}</h3>
          <small>{guest?.phone || "Sem telefone"}</small>
        </div>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </header>
      {guest?.dietRestrictions && <p className="note">“{guest.dietRestrictions}”</p>}
      <CardActions invite={invite} onCopy={onCopy} onShare={onShare} onDelete={onDelete} onEdit={onEdit} />
    </article>
  );
}

function CardActions({ invite, onCopy, onShare, onDelete, onEdit }: CardProps & { onEdit?: () => void }) {
  const link = invitePath(invite.mode, invite.code);
  return (
    <>
      <a className="card-link" href={link} target="_blank" rel="noopener">
        {link}
      </a>
      <div className="card-actions">
        <button className="btn small wa" onClick={onShare}>
          WhatsApp
        </button>
        <button className="btn small" onClick={onCopy}>
          Copiar link
        </button>
        {onEdit && (
          <button className="btn small" onClick={onEdit}>
            Editar
          </button>
        )}
        <button className="btn small danger" onClick={onDelete} aria-label="Excluir">
          Excluir
        </button>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "yes" | "wait" }) {
  return (
    <div className={`stat ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NavButton(props: { active: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${props.active ? "active" : ""}`} onClick={props.onClick} aria-current={props.active ? "page" : undefined}>
      <span className="nav-icon">{props.icon}</span>
      <span className="nav-label">{props.label}</span>
    </button>
  );
}
