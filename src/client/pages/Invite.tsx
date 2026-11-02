import { FormEvent, useEffect, useState } from "react";
import type { Invitation, InviteMode } from "../../shared/types";
import { api, ApiError } from "../api";
import { useConfig } from "../useConfig";
import { Answer, answersOf, InviteView } from "./InviteView";
import { NotFound } from "./NotFound";

export function InvitePage({ code, mode }: { code: string; mode?: InviteMode }) {
  const [config] = useConfig();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api
      .invite(code, mode)
      .then(inv => {
        setInvite(inv);
        setAnswers(answersOf(inv));
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

  return (
    <>
      <InviteView config={config} invite={invite} answers={answers} onAnswer={setAnswer} onSubmit={submit} saving={saving} />
      <div className={`toast ${toast ? "show" : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}
