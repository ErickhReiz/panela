import { useEffect, useState } from "react";
import type { EventConfig, Invitation } from "../../shared/types";
import { Answer, answersOf, InviteView } from "../pages/InviteView";

/**
 * Prévia do convite: renderiza o MESMO componente da página pública (InviteView),
 * numa moldura do tamanho de um celular. As respostas são só locais.
 */
export function InvitePreview({ config, invite }: { config: EventConfig; invite: Invitation }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => answersOf(invite));
  const guestIds = invite.guests.map(g => g.id).join("|");

  // Mantém as respostas alinhadas quando pessoas são adicionadas/removidas no formulário.
  useEffect(() => {
    setAnswers(prev => {
      const base = answersOf(invite);
      return Object.fromEntries(Object.keys(base).map(id => [id, prev[id] || base[id]]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestIds]);

  return (
    <div className="invite-frame" aria-label="Prévia do convite">
      <InviteView
        config={config}
        invite={invite}
        answers={answers}
        onAnswer={(id, patch) => setAnswers(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))}
      />
    </div>
  );
}

/** Convite de exemplo para a prévia em Configurar. */
export function sampleInvite(familia: boolean): Invitation {
  const now = new Date().toISOString();
  const guests = (familia ? ["José Exemplo", "Júlia Exemplo"] : ["Maria Souza"]).map((name, i) => ({
    id: `preview_${i}`,
    name,
    confirmed: null,
  }));
  return {
    code: "exemplo",
    title: familia ? "Família Exemplo" : "Maria Souza",
    mode: familia ? "familia" : "pessoa",
    guests,
    createdAt: now,
    updatedAt: now,
  };
}
